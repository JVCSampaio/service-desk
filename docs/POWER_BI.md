# Indicadores de atendimento no Power BI

O CSV `tickets.csv` é um snapshot dos chamados; não contém o histórico completo de eventos.
Exporte `/api/export/tickets.csv` ou use o exemplo sintético em `samples/`.
Para regerar o exemplo: `python -m scripts.export_examples`, na raiz, com requirements-dev instalado.

Em **Obter dados → Texto/CSV**, use UTF-8 e vírgula. Renomeie a consulta para `tickets`.
Defina ID como inteiro, os campos descritivos como texto, datas como data/hora/fuso e
`overdue`/`sla_met` como valores lógicos. `sla_met` vazio significa chamado ainda não resolvido.

```dax
Chamados = COUNTROWS ( tickets )

Ativos = CALCULATE ( [Chamados], tickets[status] <> "resolved" )

Vencidos = CALCULATE ( [Chamados], tickets[overdue] = TRUE () )

Resolvidos = CALCULATE ( [Chamados], tickets[status] = "resolved" )

Resolvidos no Prazo =
CALCULATE ( [Chamados], tickets[status] = "resolved", tickets[sla_met] = TRUE () )

Resolução no Prazo % = DIVIDE ( [Resolvidos no Prazo], [Resolvidos] )
```

Página sugerida: cartões de ativos, vencidos e resolução no prazo, barras por categoria/prioridade e
tabela de equipe, status e prazo. Compare com `/api/metrics` no mesmo instante de exportação e sem filtros.
O arquivo não é uma série histórica de produtividade; esse objetivo precisaria de uma tabela de eventos.

As medidas são exemplos de integração, sem execução no Power BI Desktop nesta sessão.
Para um relatório completo já versionado em PBIP/TMDL, veja o
[projeto E-commerce Analytics](https://github.com/JVCSampaio/ecommerce-analytics-react-powerbi).
