import sqlite3
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path

from .domain import utc_now

SCHEMA = """
CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    requester TEXT NOT NULL,
    category TEXT NOT NULL CHECK(category IN ('Aplicações','Infraestrutura','Acessos','Dados')),
    priority TEXT NOT NULL CHECK(priority IN ('low','normal','high','urgent')),
    status TEXT NOT NULL DEFAULT 'open' CHECK(status IN ('open','in_progress','resolved')),
    assignee TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    resolved_at TEXT,
    version INTEGER NOT NULL DEFAULT 1 CHECK(version > 0)
);
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY,
    ticket_id INTEGER NOT NULL REFERENCES tickets(id),
    kind TEXT NOT NULL,
    note TEXT NOT NULL,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tickets_status_priority ON tickets(status,priority);
CREATE INDEX IF NOT EXISTS idx_events_ticket ON events(ticket_id,id);
PRAGMA user_version = 1;
"""


@contextmanager
def connection(path):
    db = sqlite3.connect(path, timeout=10)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    try:
        yield db
        db.commit()
    except BaseException:
        db.rollback()
        raise
    finally:
        db.close()


def initialize(path, seed=True):
    Path(path).parent.mkdir(parents=True, exist_ok=True)
    with connection(path) as db:
        version = db.execute("PRAGMA user_version").fetchone()[0]
        if version not in (0, 1):
            raise RuntimeError("Banco de dados incompatível; restaure uma cópia compatível.")
        db.execute("PRAGMA journal_mode=WAL")
        db.executescript(SCHEMA)
        if seed and not db.execute("SELECT 1 FROM tickets LIMIT 1").fetchone():
            examples = [
                (
                    "Integração de pedidos indisponível",
                    "Erro 502 ao sincronizar pedidos no ambiente de demonstração.",
                    "Comercial",
                    "Aplicações",
                    "urgent",
                    "in_progress",
                    "Equipe Aplicações",
                    6,
                ),
                (
                    "Permissão para relatório de compras",
                    "Solicitação de acesso de leitura ao relatório de compras.",
                    "Compras",
                    "Acessos",
                    "normal",
                    "open",
                    "",
                    2,
                ),
                (
                    "Divergência no total de vendas",
                    "Investigar filtro de pedidos cancelados no indicador de receita.",
                    "Financeiro",
                    "Dados",
                    "high",
                    "open",
                    "",
                    3,
                ),
                (
                    "Impressora sem conexão",
                    "Impressora do laboratório de demonstração sem conexão de rede.",
                    "Operações",
                    "Infraestrutura",
                    "low",
                    "in_progress",
                    "Equipe Infraestrutura",
                    10,
                ),
                (
                    "Atualizar exportação CSV",
                    "Ajustar nomes das colunas de exportação conforme especificação.",
                    "Financeiro",
                    "Aplicações",
                    "normal",
                    "resolved",
                    "Equipe Aplicações",
                    15,
                ),
                (
                    "Revisar formulário de cadastro",
                    "Campos obrigatórios devem exibir mensagem de validação.",
                    "Comercial",
                    "Aplicações",
                    "normal",
                    "open",
                    "",
                    1,
                ),
            ]
            for title, desc, requester, category, priority, status, assignee, hours in examples:
                created = (datetime.now(UTC) - timedelta(hours=hours)).isoformat(timespec="seconds")
                resolved = utc_now() if status == "resolved" else None
                ticket_id = db.execute(
                    """INSERT INTO tickets
                    (title,description,requester,category,priority,status,assignee,created_at,updated_at,resolved_at)
                    VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (
                        title,
                        desc,
                        requester,
                        category,
                        priority,
                        status,
                        assignee,
                        created,
                        utc_now(),
                        resolved,
                    ),
                ).lastrowid
                db.execute(
                    "INSERT INTO events(ticket_id,kind,note,created_at) VALUES (?,?,?,?)",
                    (ticket_id, "created", "Cenário sintético para demonstração.", created),
                )
