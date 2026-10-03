# Evidências de verificação

Verificação local em 02/10/2026, Windows, Python 3.14 e Node.js 24.

| Verificação | Resultado |
|---|---|
| Pytest: integração HTTP e regras | 10 cenários passaram. |
| Ruff: análise e formatação | Sem erros após correção dos imports e contextos de teste. |
| TypeScript e Prettier | Verificação passou. |
| Build React | Compilação de produção passou. |
| Playwright com API real | 2 fluxos passaram: ciclo de atendimento e validação/layout de 390 px. |
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
