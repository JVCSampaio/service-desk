"""Regras do atendimento, independentes das rotas HTTP."""

from datetime import UTC, datetime, timedelta
from enum import StrEnum


class Status(StrEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"


class Priority(StrEnum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


SLA_HOURS = {"low": 48, "normal": 24, "high": 8, "urgent": 4}
TRANSITIONS = {"open": {"in_progress"}, "in_progress": {"resolved"}, "resolved": {"in_progress"}}


def utc_now():
    return datetime.now(UTC).isoformat(timespec="seconds")


def deadline(created_at: str, priority: str):
    return (datetime.fromisoformat(created_at) + timedelta(hours=SLA_HOURS[priority])).isoformat(
        timespec="seconds"
    )


def enrich(row):
    ticket = dict(row)
    ticket["due_at"] = deadline(ticket["created_at"], ticket["priority"])
    ticket["overdue"] = ticket["status"] != "resolved" and ticket["due_at"] < utc_now()
    ticket["sla_met"] = (ticket["resolved_at"] <= ticket["due_at"]) if ticket["resolved_at"] else None
    return ticket


def check_transition(current, target: str, note: str):
    if target not in TRANSITIONS[current["status"]]:
        raise ValueError("Transição inválida para o estado atual do chamado.")
    if not current["assignee"]:
        raise ValueError("Atribua uma equipe antes de iniciar ou retomar o atendimento.")
    if target == "resolved" and len(note.strip()) < 10:
        raise ValueError("Descreva a solução com pelo menos 10 caracteres.")


def safe_cell(value):
    text = str(value or "")
    return "'" + text if text.lstrip().startswith(("=", "+", "-", "@")) else text
