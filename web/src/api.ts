type ValidationIssue = { type: string; loc: (string | number)[]; ctx?: Record<string, unknown> }

const fields: Record<string, string> = {
  title: 'Título',
  description: 'Descrição',
  requester: 'Solicitante',
  category: 'Categoria',
  priority: 'Prioridade',
  assignee: 'Equipe',
  status: 'Status',
  note: 'Comentário ou solução',
  q: 'Busca',
}

/** Traduz um item do erro 422 da API, ex.: "Título precisa de pelo menos 5 caracteres". */
function describe({ type, loc, ctx }: ValidationIssue) {
  const field = fields[String(loc.at(-1))] ?? String(loc.at(-1))
  if (type === 'string_too_short')
    return `${field} precisa de pelo menos ${ctx?.min_length} caracteres`
  if (type === 'string_too_long') return `${field} aceita no máximo ${ctx?.max_length} caracteres`
  if (type === 'missing') return `${field} é obrigatório`
  return `${field} tem um valor inválido`
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      headers: { 'Content-Type': 'application/json', ...options.headers },
    })
  } catch {
    throw new Error('Sem conexão com o servidor. Verifique a rede e tente novamente.')
  }
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const detail = data?.detail
    if (typeof detail === 'string') throw new Error(detail)
    if (Array.isArray(detail) && detail.length) {
      throw new Error(`Revise os campos: ${detail.map(describe).join('; ')}.`)
    }
    throw new Error(
      response.status >= 500
        ? 'O servidor não respondeu como esperado. Tente novamente em instantes.'
        : 'Não foi possível concluir a operação. Tente novamente.',
    )
  }
  return data as T
}
export const money = (cents: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100)
export const dateTime = (value: string) =>
  new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
