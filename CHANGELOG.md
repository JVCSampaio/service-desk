# Registro de alterações

## 2026-10-02 — Primeira versão funcional

- Aplicação de portfólio service-desk com API Python, React, SQLite, dados sintéticos e documentação de requisitos.
- Testes das regras, integração HTTP, persistência e fluxos de navegador.
- Container com usuário sem privilégios e CI para testes, build e verificação HTTP da imagem.
- CSVs de exemplo gerados pela API e material de integração com Power BI.
- Avisos conhecidos: TestClient/Starlette informa depreciação de httpx; não é falha de teste.
- Ruff corrigiu imports sem uso antes da validação final.
- Rodada conjunta de navegador inicialmente falhou com requisições pendentes; iniciar o servidor de teste sem access log resolveu o bloqueio, e os dois fluxos passaram novamente.
- Verificados schema desconhecido sem substituição do arquivo e resolução fora do prazo.

As verificações finais e limites estão em docs/VERIFICACAO.md.
