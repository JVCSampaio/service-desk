from pydantic import BaseModel

from .domain import Priority, Status


class TicketView(BaseModel):
    id: int
    title: str
    description: str
    requester: str
    category: str
    priority: Priority
    status: Status
    assignee: str
    created_at: str
    updated_at: str
    resolved_at: str | None
    version: int
    due_at: str
    overdue: bool
    sla_met: bool | None


class EventView(BaseModel):
    id: int
    ticket_id: int
    kind: str
    note: str
    created_at: str


class TicketList(BaseModel):
    items: list[TicketView]
    total: int
    limit: int
    offset: int


class TicketDetail(BaseModel):
    ticket: TicketView
    events: list[EventView]


class MetricsView(BaseModel):
    total: int
    active: int
    urgent: int
    overdue: int
    resolved: int
    sla_rate: float | None
