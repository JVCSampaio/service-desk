import csv
import io
import os
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Literal

from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from .contracts import MetricsView, TicketDetail, TicketList, TicketView
from .db import connection, initialize
from .domain import Priority, Status, check_transition, enrich, safe_cell, utc_now

Category = Literal["Aplicações", "Infraestrutura", "Acessos", "Dados"]
Team = Literal["", "Equipe Aplicações", "Equipe Infraestrutura", "Equipe Dados"]


class Input(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")


class TicketCreate(Input):
    title: str = Field(min_length=5, max_length=120)
    description: str = Field(min_length=10, max_length=3000)
    requester: str = Field(min_length=2, max_length=80)
    category: Category = "Aplicações"
    priority: Priority = Priority.NORMAL


class TicketPatch(Input):
    version: int = Field(ge=1)
    assignee: Team | None = None
    priority: Priority | None = None


class Transition(Input):
    version: int = Field(ge=1)
    status: Status
    note: str = Field(default="", max_length=3000)


class Comment(Input):
    note: str = Field(min_length=3, max_length=3000)


def find(db, ticket_id):
    row = db.execute("SELECT * FROM tickets WHERE id=?", (ticket_id,)).fetchone()
    if row is None:
        raise HTTPException(404, "Chamado não encontrado.")
    return row


def assert_version(ticket, version):
    if ticket["version"] != version:
        raise HTTPException(409, "Este chamado foi alterado. Recarregue antes de salvar novamente.")


def add_event(db, ticket_id, kind, note):
    db.execute(
        "INSERT INTO events(ticket_id,kind,note,created_at) VALUES (?,?,?,?)",
        (ticket_id, kind, note, utc_now()),
    )


def create_app(db_path=None, seed=True):
    path = str(db_path or os.getenv("APP_DB", ".data/service-desk.db"))

    @asynccontextmanager
    async def lifespan(app):
        initialize(path, seed)
        yield

    app = FastAPI(
        title="ServiceDesk API",
        version="1.0.0",
        lifespan=lifespan,
        description="Sistema de chamados de portfólio. Dados sintéticos; operação local sem autenticação.",
    )

    @app.get("/api/health")
    def health():
        with connection(path) as db:
            db.execute("SELECT 1").fetchone()
        return {"status": "ok", "schema_version": 1}

    @app.get("/api/tickets", response_model=TicketList)
    def list_tickets(
        q: str = Query("", max_length=120),
        status: Status | None = None,
        priority: Priority | None = None,
        limit: int = Query(50, ge=1, le=100),
        offset: int = Query(0, ge=0),
    ):
        clauses, values = [], []
        if q:
            clauses.append("(title LIKE ? ESCAPE '\\' OR requester LIKE ? ESCAPE '\\')")
            literal = q.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
            values.extend([f"%{literal}%", f"%{literal}%"])
        for key, value in [("status", status), ("priority", priority)]:
            if value:
                clauses.append(f"{key}=?")
                values.append(value)
        where = " WHERE " + " AND ".join(clauses) if clauses else ""
        with connection(path) as db:
            total = db.execute("SELECT COUNT(*) FROM tickets" + where, values).fetchone()[0]
            rows = db.execute(
                "SELECT * FROM tickets" + where + " ORDER BY id DESC LIMIT ? OFFSET ?",
                [*values, limit, offset],
            ).fetchall()
        return {"items": [enrich(r) for r in rows], "total": total, "limit": limit, "offset": offset}

    @app.post("/api/tickets", status_code=201, response_model=TicketView)
    def create_ticket(body: TicketCreate):
        now = utc_now()
        with connection(path) as db:
            ticket_id = db.execute(
                """INSERT INTO tickets
                (title,description,requester,category,priority,created_at,updated_at)
                VALUES (?,?,?,?,?,?,?)""",
                (body.title, body.description, body.requester, body.category, body.priority, now, now),
            ).lastrowid
            add_event(db, ticket_id, "created", "Chamado registrado.")
            result = enrich(find(db, ticket_id))
        return result

    @app.get("/api/tickets/{ticket_id}", response_model=TicketDetail)
    def detail(ticket_id: int):
        with connection(path) as db:
            ticket = enrich(find(db, ticket_id))
            events = [
                dict(r)
                for r in db.execute("SELECT * FROM events WHERE ticket_id=? ORDER BY id", (ticket_id,))
            ]
        return {"ticket": ticket, "events": events}

    @app.patch("/api/tickets/{ticket_id}", response_model=TicketView)
    def update_ticket(ticket_id: int, body: TicketPatch):
        changes = body.model_dump(exclude_none=True, exclude={"version"})
        if not changes:
            raise HTTPException(422, "Informe a equipe ou a prioridade.")
        with connection(path) as db:
            db.execute("BEGIN IMMEDIATE")
            row = find(db, ticket_id)
            assert_version(row, body.version)
            if row["status"] == "resolved":
                raise HTTPException(409, "Retome o chamado antes de alterar equipe ou prioridade.")
            assignee = changes.get("assignee", row["assignee"])
            if row["status"] == "in_progress" and not assignee:
                raise HTTPException(409, "Um chamado em atendimento precisa ter equipe atribuída.")
            priority = changes.get("priority", row["priority"])
            db.execute(
                "UPDATE tickets SET assignee=?,priority=?,version=version+1,updated_at=? WHERE id=?",
                (assignee, priority, utc_now(), ticket_id),
            )
            add_event(
                db, ticket_id, "updated", f"Equipe: {assignee or 'Não atribuída'}; prioridade: {priority}."
            )
            result = enrich(find(db, ticket_id))
        return result

    @app.post("/api/tickets/{ticket_id}/transitions", response_model=TicketView)
    def transition(ticket_id: int, body: Transition):
        with connection(path) as db:
            db.execute("BEGIN IMMEDIATE")
            row = find(db, ticket_id)
            assert_version(row, body.version)
            try:
                check_transition(row, body.status, body.note)
            except ValueError as error:
                raise HTTPException(409, str(error)) from error
            resolved_at = utc_now() if body.status == Status.RESOLVED else None
            db.execute(
                "UPDATE tickets SET status=?,resolved_at=?,version=version+1,updated_at=? WHERE id=?",
                (body.status, resolved_at, utc_now(), ticket_id),
            )
            add_event(db, ticket_id, "transition", f"{row['status']} → {body.status}. {body.note}")
            result = enrich(find(db, ticket_id))
        return result

    @app.post("/api/tickets/{ticket_id}/comments", status_code=201)
    def comment(ticket_id: int, body: Comment):
        with connection(path) as db:
            find(db, ticket_id)
            add_event(db, ticket_id, "comment", body.note)
        return {"message": "Comentário registrado."}

    @app.get("/api/metrics", response_model=MetricsView)
    def metrics():
        with connection(path) as db:
            tickets = [enrich(r) for r in db.execute("SELECT * FROM tickets")]
        resolved = [t for t in tickets if t["status"] == "resolved"]
        return {
            "total": len(tickets),
            "active": sum(t["status"] != "resolved" for t in tickets),
            "urgent": sum(t["priority"] == "urgent" and t["status"] != "resolved" for t in tickets),
            "overdue": sum(t["overdue"] for t in tickets),
            "resolved": len(resolved),
            "sla_rate": sum(t["sla_met"] for t in resolved) / len(resolved) if resolved else None,
        }

    @app.get("/api/export/tickets.csv")
    def export():
        columns = [
            "id",
            "title",
            "requester",
            "category",
            "priority",
            "status",
            "assignee",
            "created_at",
            "resolved_at",
            "due_at",
            "overdue",
            "sla_met",
        ]
        output = io.StringIO(newline="")
        writer = csv.writer(output)
        writer.writerow(columns)
        with connection(path) as db:
            for row in db.execute("SELECT * FROM tickets ORDER BY id"):
                ticket = enrich(row)
                writer.writerow(
                    [
                        safe_cell(ticket[c]) if c in ("title", "requester", "assignee") else ticket[c]
                        for c in columns
                    ]
                )
        return Response(
            output.getvalue().encode("utf-8-sig"),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="chamados.csv"'},
        )

    dist = Path(__file__).resolve().parents[1] / "web" / "dist"
    if dist.exists():
        app.mount("/", StaticFiles(directory=dist, html=True), name="web")
    return app


app = create_app()
