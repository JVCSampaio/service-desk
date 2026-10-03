import { test, expect } from '@playwright/test'

test('registra, atribui, resolve e persiste um chamado pela interface', async ({ page }) => {
  const title = `Exportação de teste ${Date.now()}`
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo chamado', exact: true }).click()
  await page.getByLabel('Título', { exact: true }).fill(title)
  await page.getByLabel('Solicitante', { exact: true }).fill('Equipe de QA')
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('O filtro de pedidos falha ao exportar o relatório.')
  await page.getByRole('button', { name: 'Criar chamado', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('criado')
  await page.getByLabel('Equipe responsável', { exact: true }).selectOption('Equipe Aplicações')
  await page.getByRole('button', { name: 'Salvar atribuição', exact: true }).click()
  await expect(page.getByRole('status')).toContainText('atualizadas')
  await page.getByRole('button', { name: 'Iniciar atendimento', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Resolver chamado', exact: true })).toBeVisible()
  await page
    .getByLabel('Comentário ou solução', { exact: true })
    .fill('Filtro corrigido e testes de regressão executados.')
  await page.getByRole('button', { name: 'Resolver chamado', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retomar atendimento', exact: true })).toBeVisible()
  await page.reload()
  await page.getByRole('textbox', { name: 'Buscar chamados', exact: true }).fill(title)
  await page.getByRole('button', { name: `Abrir chamado ${title}`, exact: true }).click()
  await expect(page.getByRole('button', { name: 'Retomar atendimento', exact: true })).toBeVisible()
  await expect(
    page.getByText('Filtro corrigido e testes de regressão executados.', { exact: false }),
  ).toBeVisible()
})

test('exibe erro de regra de negócio e layout móvel sem overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  const title = `Sem equipe ${Date.now()}`
  await page.goto('/')
  await page.getByRole('button', { name: '+ Novo chamado', exact: true }).click()
  await page.getByLabel('Título', { exact: true }).fill(title)
  await page.getByLabel('Solicitante', { exact: true }).fill('Compras')
  await page
    .getByLabel('Descrição', { exact: true })
    .fill('Verificar acesso ao relatório de compras.')
  await page.getByRole('button', { name: 'Criar chamado', exact: true }).click()
  await page.getByRole('button', { name: 'Iniciar atendimento', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Atribua uma equipe')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})
