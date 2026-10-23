# Evidências de verificação

Verificação local em 23/10/2026, Windows, Python 3.14 e Node.js 24, depois das correções das issues #1 a #6.

| Verificação | Resultado |
|---|---|
| Pytest: integração HTTP e regras | 12 cenários passaram. |
| Ruff: análise e formatação | Sem erros. |
| TypeScript e Prettier | Verificação passou. |
| Build React | Compilação de produção passou. |
| Playwright com API real | 6 testes passaram: ciclo de atendimento, validação/layout de 390 px e 4 regressões das issues. |
| Suíte de QA externa ([service-desk-qa](https://github.com/JVCSampaio/service-desk-qa)) | 59 cenários Cypress passaram, incluindo os 6 que reproduziam os defeitos. |
| Aplicação compilada servida pela API | Página, health, OpenAPI, seed e CSV verificados por `scripts/smoke.py`. |
| Capturas de tela | `overview.png` e `mobile.png`, obtidas da aplicação compilada. |

Os testes usam arquivos SQLite temporários ou `.data/e2e.db`. O teste de schema incompatível
verifica que uma versão desconhecida é recusada sem substituir o arquivo original.
O contrato em `openapi.json` e os CSVs em `samples/` são gerados pela API com `scripts/export_examples.py`.

Na rodada conjunta de navegador, requisições ficaram pendentes com o log de acesso do servidor
no processo de teste. A configuração passou a iniciar Uvicorn com `--no-access-log`;
os mesmos fluxos passaram em nova execução conjunta. As regras de negócio não foram afrouxadas.

O TestClient de Starlette emite um aviso de depreciação sobre httpx. Os testes passam com as versões fixadas.
O Docker Desktop não estava disponível localmente: build e smoke do container são etapas do
[GitHub Actions](https://github.com/JVCSampaio/service-desk/actions/workflows/ci.yml), cujo resultado deve ser consultado na execução correspondente.
Não foram executados testes de carga, auditoria de acessibilidade ou validação no Power BI Desktop.
