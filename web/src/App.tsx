import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { api, dateTime } from './api'

type Status = 'open' | 'in_progress' | 'resolved'
type Priority = 'low' | 'normal' | 'high' | 'urgent'
type Ticket = {
  id: number
  title: string
  description: string
  requester: string
  category: string
  priority: Priority
  status: Status
  assignee: string
  created_at: string
  due_at: string
  overdue: boolean
  version: number
}
type TicketEvent = { id: number; kind: string; note: string; created_at: string }
type Detail = { ticket: Ticket; events: TicketEvent[] }
type Metrics = {
  total: number
  active: number
  urgent: number
  overdue: number
  resolved: number
  sla_rate: number | null
}
const statuses: Record<Status, string> = {
  open: 'Aberto',
  in_progress: 'Em atendimento',
  resolved: 'Resolvido',
}
const priorities: Record<Priority, string> = {
  low: 'Baixa',
  normal: 'Normal',
  high: 'Alta',
  urgent: 'Urgente',
}
const teams = ['', 'Equipe Aplicações', 'Equipe Infraestrutura', 'Equipe Dados']

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [total, setTotal] = useState(0)
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('')
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [detail, setDetail] = useState<Detail | null>(null)
  const [team, setTeam] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('normal')
  const [note, setNote] = useState('')
  const [newTicket, setNewTicket] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const reload = () => setRefresh((n) => n + 1)

  useEffect(() => {
    let active = true
    setLoading(true)
    const params = new URLSearchParams({ q: query, limit: '8', offset: String(page * 8) })
    if (status) params.set('status', status)
    if (priority) params.set('priority', priority)
    Promise.all([
      api<{ items: Ticket[]; total: number }>(`/tickets?${params}`),
      api<Metrics>('/metrics'),
    ])
      .then(([list, m]) => {
        if (active) {
          setTickets(list.items)
          setTotal(list.total)
          setMetrics(m)
        }
      })
      .catch((e) => {
        if (active) setError(e.message)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [query, status, priority, page, refresh])

  useEffect(() => {
    let active = true
    setDetail(null)
    if (selected !== null)
      api<Detail>(`/tickets/${selected}`)
        .then((value) => {
          if (active) {
            setDetail(value)
            setTeam(value.ticket.assignee)
            setEditPriority(value.ticket.priority)
          }
        })
        .catch((e) => {
          if (active) setError(e.message)
        })
    return () => {
      active = false
    }
  }, [selected, refresh])

  async function mutate(
    path: string,
    body: unknown,
    method = 'POST',
    success = 'Alteração registrada.',
  ) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await api(path, { method, body: JSON.stringify(body) })
      setNotice(success)
      setNote('')
      reload()
    } catch (e) {
      setError((e as Error).message)
      reload()
    } finally {
      setBusy(false)
    }
  }

  async function create(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const data = Object.fromEntries(new FormData(event.currentTarget))
    setBusy(true)
    setError('')
    setNotice('')
    try {
      const ticket = await api<Ticket>('/tickets', { method: 'POST', body: JSON.stringify(data) })
      setSelected(ticket.id)
      setNewTicket(false)
      setNotice(`Chamado #${ticket.id} criado.`)
      setPage(0)
      reload()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const ticket = detail?.ticket
  return (
    <div className="workspace">
      <aside className="sidebar">
        <a className="brand" href="/" aria-label="ServiceDesk início">
          <span className="brand-icon">S</span>
          <span>
            ServiceDesk<small>OPERAÇÕES DE TI</small>
          </span>
        </a>
        <div className="nav-label">WORKSPACE</div>
        <div className="nav-item active">
          <span>◫</span> Central de chamados
        </div>
        <a className="nav-item" href="/api/export/tickets.csv">
          <span>↓</span> Exportar chamados
        </a>
        <a className="nav-item" href="/docs" target="_blank" rel="noreferrer">
          <span>⌘</span> Documentação da API
        </a>
        <div className="sidebar-foot">
          <span className="avatar">JS</span>
          <div>
            John Sampaio<small>Projeto de portfólio</small>
          </div>
        </div>
      </aside>
      <div className="content">
        <header className="topbar">
          <span>
            Operações <span className="muted">/</span> Atendimento
          </span>
          <span className="demo-tag">
            <i /> Dados de demonstração
          </span>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">CENTRAL DE SERVIÇOS</p>
              <h1>Atendimento com contexto.</h1>
              <p className="muted">
                Organize a demanda, acompanhe os prazos e registre cada solução.
              </p>
            </div>
            <button className="primary" onClick={() => setNewTicket(!newTicket)}>
              {newTicket ? 'Cancelar cadastro' : '+ Novo chamado'}
            </button>
          </div>
          {error && (
            <div className="alert error" role="alert">
              {error}
              <button
                onClick={() => {
                  setError('')
                  reload()
                }}
              >
                Recarregar
              </button>
            </div>
          )}
          {notice && (
            <div className="alert success" role="status">
              {notice}
            </div>
          )}
          <div className="metrics">
            <Metric
              label="CHAMADOS ATIVOS"
              value={metrics?.active}
              hint="Abertos e em atendimento"
            />
            <Metric
              label="PRAZOS VENCIDOS"
              value={metrics?.overdue}
              hint="Prazo corrido por prioridade"
              warning
            />
            <Metric
              label="PRIORIDADE URGENTE"
              value={metrics?.urgent}
              hint="Prazo de atendimento: 4 horas"
            />
            <Metric
              label="RESOLVIDOS"
              value={metrics?.resolved}
              hint={
                metrics?.sla_rate == null
                  ? 'Ainda sem avaliação de prazo'
                  : `${Math.round(metrics.sla_rate * 100)}% resolvidos dentro do prazo`
              }
            />
          </div>
          {newTicket && (
            <section className="panel form-panel">
              <div className="panel-heading">
                <h2>Registrar chamado</h2>
                <span>Todos os campos são obrigatórios</span>
              </div>
              <form onSubmit={create} className="form-grid">
                <label className="span-2">
                  Título
                  <input
                    name="title"
                    required
                    minLength={5}
                    maxLength={120}
                    placeholder="Descreva o problema em uma frase"
                  />
                </label>
                <label>
                  Solicitante
                  <input
                    name="requester"
                    required
                    minLength={2}
                    maxLength={80}
                    placeholder="Área ou equipe solicitante"
                  />
                </label>
                <label>
                  Categoria
                  <select name="category">
                    {['Aplicações', 'Infraestrutura', 'Acessos', 'Dados'].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Prioridade
                  <select name="priority" defaultValue="normal">
                    {Object.entries(priorities).map(([k, v]) => (
                      <option key={k} value={k}>
                        {v}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="span-2">
                  Descrição
                  <textarea
                    name="description"
                    required
                    minLength={10}
                    maxLength={3000}
                    rows={3}
                    placeholder="O que aconteceu, impacto e passos para reproduzir"
                  />
                </label>
                <div className="form-actions span-2">
                  <span className="muted">O histórico será criado junto com o chamado.</span>
                  <button className="primary" disabled={busy}>
                    {busy ? 'Salvando…' : 'Criar chamado'}
                  </button>
                </div>
              </form>
            </section>
          )}
          <div className="split-layout">
            <section className="panel queue">
              <div className="panel-heading">
                <div>
                  <h2>Fila de atendimento</h2>
                  <span>{total} chamado(s) no filtro</span>
                </div>
                <button className="ghost" onClick={reload} aria-label="Atualizar fila">
                  ↻ Atualizar
                </button>
              </div>
              <div className="filters">
                <label className="search-label">
                  <span className="sr-only">Buscar chamados</span>
                  <input
                    placeholder="Buscar título ou solicitante…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value)
                      setPage(0)
                    }}
                  />
                </label>
                <select
                  aria-label="Filtrar status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="">Todos os status</option>
                  {Object.entries(statuses).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filtrar prioridade"
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value)
                    setPage(0)
                  }}
                >
                  <option value="">Todas as prioridades</option>
                  {Object.entries(priorities).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
              {loading ? (
                <div className="empty">Carregando chamados…</div>
              ) : tickets.length === 0 ? (
                <div className="empty">
                  Nenhum chamado encontrado. Ajuste os filtros ou registre uma nova demanda.
                </div>
              ) : (
                <div className="ticket-list">
                  {tickets.map((t) => (
                    <button
                      className={`ticket-row ${selected === t.id ? 'selected' : ''}`}
                      key={t.id}
                      onClick={() => {
                        setSelected(t.id)
                        setNote('')
                      }}
                      aria-label={`Abrir chamado ${t.title}`}
                    >
                      <div className="ticket-id">
                        #{String(t.id).padStart(4, '0')}{' '}
                        <span className={`badge ${t.priority}`}>{priorities[t.priority]}</span>
                      </div>
                      <div className="ticket-title">{t.title}</div>
                      <div className="ticket-meta">
                        {t.requester} <span>·</span> {t.category}
                      </div>
                      <div className="ticket-bottom">
                        <span className={`status ${t.status}`}>
                          <i />
                          {statuses[t.status]}
                        </span>
                        <span className={t.overdue ? 'overdue' : 'muted'}>
                          {t.overdue ? 'Prazo vencido' : t.assignee || 'Aguardando atribuição'}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="pagination">
                <button
                  className="ghost"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Anterior
                </button>
                <span>Página {page + 1}</span>
                <button
                  className="ghost"
                  disabled={(page + 1) * 8 >= total || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Próxima
                </button>
              </div>
            </section>
            <section className="panel detail" aria-label="Detalhes do chamado">
              {!ticket ? (
                <div className="detail-placeholder">
                  <span className="placeholder-icon">◎</span>
                  <h2>
                    {selected === null ? 'Cada demanda tem uma história.' : 'Carregando detalhes…'}
                  </h2>
                  <p>
                    Selecione um chamado para ver o contexto, atribuir uma equipe e acompanhar o
                    histórico.
                  </p>
                  <div className="workflow-mini">
                    Aberto <span>→</span> Em atendimento <span>→</span> Resolvido
                  </div>
                </div>
              ) : (
                <>
                  <div className="panel-heading">
                    <span className="eyebrow">CHAMADO #{ticket.id}</span>
                    <span className={`badge ${ticket.priority}`}>
                      {priorities[ticket.priority]}
                    </span>
                  </div>
                  <div className="detail-body">
                    <h2>{ticket.title}</h2>
                    <p className="description">{ticket.description}</p>
                    <dl className="facts">
                      <div>
                        <dt>Solicitante</dt>
                        <dd>{ticket.requester}</dd>
                      </div>
                      <div>
                        <dt>Categoria</dt>
                        <dd>{ticket.category}</dd>
                      </div>
                      <div>
                        <dt>Prazo</dt>
                        <dd className={ticket.overdue ? 'overdue' : ''}>
                          {dateTime(ticket.due_at)}
                        </dd>
                      </div>
                      <div>
                        <dt>Status</dt>
                        <dd>{statuses[ticket.status]}</dd>
                      </div>
                    </dl>
                    <div className="assignment">
                      <label>
                        Equipe responsável
                        <select
                          aria-label="Equipe responsável"
                          value={team}
                          onChange={(e) => setTeam(e.target.value)}
                          disabled={ticket.status === 'resolved'}
                        >
                          {teams.map((t) => (
                            <option key={t} value={t}>
                              {t || 'Não atribuída'}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Prioridade do chamado
                        <select
                          value={editPriority}
                          onChange={(e) => setEditPriority(e.target.value as Priority)}
                          disabled={ticket.status === 'resolved'}
                        >
                          {Object.entries(priorities).map(([k, v]) => (
                            <option key={k} value={k}>
                              {v}
                            </option>
                          ))}
                        </select>
                      </label>
                      {ticket.status !== 'resolved' && (
                        <button
                          className="secondary"
                          disabled={busy}
                          onClick={() =>
                            mutate(
                              `/tickets/${ticket.id}`,
                              { version: ticket.version, assignee: team, priority: editPriority },
                              'PATCH',
                              'Equipe e prioridade atualizadas.',
                            )
                          }
                        >
                          Salvar atribuição
                        </button>
                      )}
                    </div>
                    <label>
                      Comentário ou solução
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={3000}
                        placeholder="Registre a investigação ou explique a solução…"
                        rows={3}
                      />
                    </label>
                    <div className="detail-actions">
                      <button
                        className="secondary"
                        disabled={busy || note.trim().length < 3}
                        onClick={() =>
                          mutate(
                            `/tickets/${ticket.id}/comments`,
                            { note },
                            'POST',
                            'Comentário registrado.',
                          )
                        }
                      >
                        Comentar
                      </button>
                      <button
                        className="primary"
                        disabled={busy}
                        onClick={() =>
                          mutate(`/tickets/${ticket.id}/transitions`, {
                            version: ticket.version,
                            status: ticket.status === 'in_progress' ? 'resolved' : 'in_progress',
                            note,
                          })
                        }
                      >
                        {ticket.status === 'open'
                          ? 'Iniciar atendimento'
                          : ticket.status === 'in_progress'
                            ? 'Resolver chamado'
                            : 'Retomar atendimento'}
                      </button>
                    </div>
                    <div className="history">
                      <h3>Histórico de atendimento</h3>
                      {detail?.events.map((e) => (
                        <div className="history-event" key={e.id}>
                          <i />
                          <div>
                            <p>{e.note}</p>
                            <small>{dateTime(e.created_at)}</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </section>
          </div>
          <footer className="page-footer">
            ServiceDesk · Dados sintéticos · Prazos em horas corridas, sem calendário de expediente.
          </footer>
        </main>
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  hint,
  warning = false,
}: {
  label: string
  value: number | undefined
  hint: string
  warning?: boolean
}) {
  return (
    <section className={`metric ${warning ? 'warning' : ''}`}>
      <div>{label}</div>
      <strong>{value ?? '—'}</strong>
      <small>{hint}</small>
    </section>
  )
}
