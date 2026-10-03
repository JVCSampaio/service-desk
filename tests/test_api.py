from datetime import UTC, datetime, timedelta

import pytest
from fastapi.testclient import TestClient

from app.db import connection
from app.domain import deadline
from app.main import create_app


@pytest.fixture
def client(tmp_path):
    path = tmp_path / "test.db"
    with TestClient(create_app(path, seed=False)) as test_client:
        test_client.db_path = path
        yield test_client


def create(client, **values):
    payload = {
        "title": "Falha ao exportar dados",
        "description": "A exportação retorna erro ao filtrar os pedidos.",
        "requester": "Financeiro",
        "category": "Aplicações",
        "priority": "normal",
    } | values
    response = client.post("/api/tickets", json=payload)
    assert response.status_code == 201, response.text
    return response.json()


def test_ticket_lifecycle_and_history(client):
    ticket = create(client)
    url = f"/api/tickets/{ticket['id']}"
    updated = client.patch(url, json={"version": 1, "assignee": "Equipe Aplicações"}).json()
    assert updated["version"] == 2
    started = client.post(
        url + "/transitions", json={"version": 2, "status": "in_progress", "note": "Investigação iniciada."}
    )
    assert started.status_code == 200
    assert (
        client.post(url + "/comments", json={"note": "Falha reproduzida com o filtro de status."}).status_code
        == 201
    )
    solved = client.post(
        url + "/transitions",
        json={"version": 3, "status": "resolved", "note": "Filtro corrigido e exportação validada."},
    )
    assert solved.status_code == 200
    assert solved.json()["resolved_at"] is not None
    assert solved.json()["sla_met"] is True
    reopened = client.post(
        url + "/transitions",
        json={"version": 4, "status": "in_progress", "note": "Novo cenário de reprodução."},
    )
    assert reopened.status_code == 200
    assert reopened.json()["resolved_at"] is None
    assert reopened.json()["due_at"] == ticket["due_at"]
    events = client.get(url).json()["events"]
    assert [e["kind"] for e in events] == [
        "created",
        "updated",
        "transition",
        "comment",
        "transition",
        "transition",
    ]


def test_invalid_transition_and_missing_team_are_atomic(client):
    ticket = create(client)
    url = f"/api/tickets/{ticket['id']}"
    for target in ["resolved", "in_progress"]:
        result = client.post(
            url + "/transitions", json={"version": 1, "status": target, "note": "Solução detalhada."}
        )
        assert result.status_code == 409
    detail = client.get(url).json()
    assert detail["ticket"]["version"] == 1
    assert len(detail["events"]) == 1


def test_optimistic_version_blocks_lost_update(client):
    ticket = create(client)
    url = f"/api/tickets/{ticket['id']}"
    assert client.patch(url, json={"version": 1, "priority": "high"}).status_code == 200
    assert client.patch(url, json={"version": 1, "assignee": "Equipe Dados"}).status_code == 409
    detail = client.get(url).json()
    assert detail["ticket"]["priority"] == "high"
    assert detail["ticket"]["assignee"] == ""
    assert len(detail["events"]) == 2


def test_resolution_requires_detail_and_team_cannot_be_removed(client):
    ticket = create(client)
    url = f"/api/tickets/{ticket['id']}"
    client.patch(url, json={"version": 1, "assignee": "Equipe Dados"})
    client.post(url + "/transitions", json={"version": 2, "status": "in_progress"})
    assert client.patch(url, json={"version": 3, "assignee": ""}).status_code == 409
    assert (
        client.post(url + "/transitions", json={"version": 3, "status": "resolved", "note": "ok"}).status_code
        == 409
    )
    assert client.get(url).json()["ticket"]["version"] == 3


def test_filters_pagination_and_literal_search(client):
    create(client, title="Erro no relatório 100% pronto", priority="high")
    create(client, title="Outra demanda normal")
    assert client.get("/api/tickets?priority=high").json()["total"] == 1
    assert client.get("/api/tickets", params={"q": "%"}).json()["total"] == 1
    assert client.get("/api/tickets", params={"q": "' OR 1=1 --"}).json()["total"] == 0
    first = client.get("/api/tickets?limit=1").json()
    second = client.get("/api/tickets?limit=1&offset=1").json()
    assert first["total"] == 2
    assert first["items"][0]["id"] != second["items"][0]["id"]
    assert client.get("/api/tickets?limit=101").status_code == 422


def test_validation_and_not_found(client):
    assert (
        client.post("/api/tickets", json={"title": "x", "description": "short", "requester": "a"}).status_code
        == 422
    )
    assert client.get("/api/tickets/999").status_code == 404
    assert client.post("/api/tickets/999/comments", json={"note": "Detalhe válido."}).status_code == 404
    assert client.get("/api/tickets?status=unknown").status_code == 422


def test_sla_uses_creation_time_and_resolved_tickets_are_not_overdue(client):
    ticket = create(client, priority="urgent")
    old = (datetime.now(UTC) - timedelta(hours=6)).isoformat(timespec="seconds")
    with connection(client.db_path) as db:
        db.execute("UPDATE tickets SET created_at=? WHERE id=?", (old, ticket["id"]))
    assert client.get(f"/api/tickets/{ticket['id']}").json()["ticket"]["overdue"] is True
    assert client.get("/api/metrics").json()["overdue"] == 1
    url = f"/api/tickets/{ticket['id']}"
    client.patch(url, json={"version": 1, "assignee": "Equipe Aplicações"})
    client.post(url + "/transitions", json={"version": 2, "status": "in_progress"})
    response = client.post(
        url + "/transitions",
        json={"version": 3, "status": "resolved", "note": "Correção concluída depois do prazo."},
    )
    assert response.status_code == 200
    assert response.json()["overdue"] is False
    assert response.json()["sla_met"] is False
    assert client.get("/api/metrics").json()["sla_rate"] == 0
    assert deadline("2026-10-02T12:00:00+00:00", "urgent") == "2026-10-02T16:00:00+00:00"


def test_csv_protects_spreadsheet_formulas(client):
    create(client, title='=HYPERLINK("https://example.invalid")')
    response = client.get("/api/export/tickets.csv")
    assert response.status_code == 200
    assert "'=HYPERLINK" in response.content.decode("utf-8-sig")
    assert "attachment" in response.headers["content-disposition"]


def test_restart_preserves_tickets_and_seed_is_not_repeated(tmp_path):
    path = tmp_path / "persistent.db"
    with TestClient(create_app(path)) as first:
        count = first.get("/api/metrics").json()["total"]
        ticket = create(first)
    with TestClient(create_app(path)) as second:
        assert second.get("/api/metrics").json()["total"] == count + 1
        assert second.get(f"/api/tickets/{ticket['id']}").json()["ticket"]["title"] == ticket["title"]


def test_unknown_schema_preserves_database(tmp_path):
    path = tmp_path / "future.db"
    with connection(path) as db:
        db.execute("PRAGMA user_version=9")
    original = path.read_bytes()
    with pytest.raises(RuntimeError, match="incompatível"), TestClient(create_app(path)):
        pass
    assert path.read_bytes() == original
