import { test, expect } from '@playwright/test'

// Regressões dos defeitos #1, #2, #3, #5 e #6 encontrados pela suíte de QA (service-desk-qa).

test('busca aceita até 120 caracteres, o mesmo limite da API (#1)', async ({ page }) => {
  await page.goto('/')
  const busca = page.getByRole('textbox', { name: 'Buscar chamados', exact: true })
  await busca.fill('a'.repeat(121))
  await expect(busca).toHaveValue('a'.repeat(120))
  await expect(page.getByText('Nenhum chamado encontrado', { exact: false })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('falha de rede mostra aviso em português, que some quando a fila volta (#2 e #6)', async ({
  page,
}) => {
  let semRede = true
  await page.route(
    (url) => url.pathname === '/api/tickets',
    (route) => (semRede ? route.abort() : route.continue()),
  )
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('Sem conexão com o servidor')
  await expect(page.getByText('Não foi possível carregar a fila.', { exact: true })).toBeVisible()
  semRede = false
  await page.getByLabel('Filtrar status', { exact: true }).selectOption('open')
  await expect(page.getByRole('button', { name: /^Abrir chamado / }).first()).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('validação da API indica o campo inválido (#3)', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo chamado', exact: true }).click()
  await page.getByLabel('Título', { exact: true }).fill('    a')
  await page.getByLabel('Solicitante', { exact: true }).fill('Compras')
  await page.getByLabel('Descrição', { exact: true }).fill('Acesso negado ao relatório de compras.')
  await page.getByRole('button', { name: 'Criar chamado', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Título precisa de pelo menos 5 caracteres')
})

test('salvar atribuição só fica disponível quando algo mudou (#5)', async ({ page }) => {
  const title = `Atribuição sem mudança ${Date.now()}`
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo chamado', exact: true }).click()
  await page.getByLabel('Título', { exact: true }).fill(title)
  await page.getByLabel('Solicitante', { exact: true }).fill('Financeiro')
  await page.getByLabel('Descrição', { exact: true }).fill('Conferir o fechamento do mês.')
  await page.getByRole('button', { name: 'Criar chamado', exact: true }).click()
  const salvar = page.getByRole('button', { name: 'Salvar atribuição', exact: true })
  await expect(salvar).toBeDisabled()
  await page.getByLabel('Equipe responsável', { exact: true }).selectOption('Equipe Dados')
  await expect(salvar).toBeEnabled()
})
