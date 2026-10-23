# Registro de alterações

## 2026-10-23 — Correções apontadas pela suíte de QA

Defeitos encontrados pela [suíte de QA](https://github.com/JVCSampaio/service-desk-qa) e registrados nas issues #1 a #6.

- #1: a busca aceita até 120 caracteres, o mesmo limite da API, em vez de mostrar erro genérico.
- #2: a falha ao carregar a fila fica separada dos erros das ações e some quando a fila volta a carregar.
- #3: erros de validação (422) indicam o campo, por exemplo "Título precisa de pelo menos 5 caracteres".
- #4: o histórico usa os nomes da tela ("Aberto → Em atendimento", "prioridade: Alta"). Eventos gravados antes continuam com os códigos antigos.
- #5: salvar equipe e prioridade iguais às atuais não cria versão nem evento; o botão só é liberado quando algo mudou.
- #6: falha de rede e erro do servidor têm mensagens próprias em português, e a fila informa que não pôde ser carregada.
- Testes: 2 cenários novos no Pytest e 4 regressões no Playwright.

## 2026-10-02 — Primeira versão funcional

- Primeiro CI: imagem Docker compilada; o smoke no runner falhou por Python anterior a 3.14 e sintaxe de exceções. Corrigido fixando Python 3.14 também no job de container; evidência final no Actions.
- Aplicação de portfólio service-desk com API Python, React, SQLite, dados sintéticos e documentação de requisitos.
- Testes das regras, integração HTTP, persistência e fluxos de navegador.
- Container com usuário sem privilégios e CI para testes, build e verificação HTTP da imagem.
- CSVs de exemplo gerados pela API e material de integração com Power BI.
- Avisos conhecidos: TestClient/Starlette informa depreciação de httpx; não é falha de teste.
- Ruff corrigiu imports sem uso antes da validação final.
- Rodada conjunta de navegador inicialmente falhou com requisições pendentes; iniciar o servidor de teste sem access log resolveu o bloqueio, e os dois fluxos passaram novamente.
- Verificados schema desconhecido sem substituição do arquivo e resolução fora do prazo.

As verificações finais e limites estão em docs/VERIFICACAO.md.
