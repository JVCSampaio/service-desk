# Killer: central de chamados (web)

**Nível** T2, com regiões C (resolver chamado, mudar prioridade) · **Nota** 88/100 · **Veredito** portão aberto; Playwright e a suíte de QA passam

Método: skill `visant-killer` (github.com/pedrojaques99/visant-skills-public) com `visant-frontend` e o `slop-catalog`. Rodaram de verdade:

- `killer-scan` nos quatro detectores: impeccable, tokens, copy e ruído;
- `impeccable` na página renderizada e em 12 estados salvos (1440 e 390 px, claro e escuro);
- os 6 testes Playwright deste repositório;
- os 59 cenários Cypress do `service-desk-qa`, contra esta versão.

## Surfaces

| File | Surface (A/B/C) | Business variable it moves | Notes |
| --- | --- | --- | --- |
| web/src/App.tsx | B | chamados resolvidos dentro do prazo por atendente | fila, chamado aberto e registro; "Resolver chamado" e a troca de prioridade mexem no prazo (região C) |
| web/src/main.tsx | B | o mesmo da central (só monta o App) | ponto de entrada, sem interface própria |

## Screen seen

- `/`, 1440 e 390 px, claro e escuro: fila com 6 chamados, chamado #1 aberto (urgente, prazo vencido) e formulário de novo chamado. 0 px de estouro lateral nas 12 fotos.
- A primeira versão do layout novo estourava 240 px a 390 px: a linha de navegação, que não quebra, alargava a coluna da grade. Corrigido com `minmax(0, 1fr)`.
- Servidor: `uvicorn app.main:app` com `APP_DB` num banco temporário e os dados de demonstração.
- `corta-scan` e `ritmo-scan` no chamado aberto, a 390 e 1440 px: 0 achados.

## Portão

| Detector | Antes | Depois |
| --- | --- | --- |
| impeccable na página (1440 + 390) | 171 problemas e 14 avisos | 0 |
| impeccable nos 12 estados salvos | 1.384 achados | 0 |
| contraste baixo (cinza sobre branco) | 2,6:1 a 3,6:1 em rótulos, metadados e paginação | 6,3:1 ou mais nos dois temas |
| texto funcional abaixo de 11 px | 9 e 10 px em status, prioridade, número do chamado e equipe | 13 px no mínimo |
| cores cruas no CSS (token) | 88 | 0 |
| setas e símbolos como ícone (noise) | 4 (↓, ↻, →, e ◫ ⌘ ◎ na mesma família) | 0: ícones `@phosphor-icons/react` |
| CSS morto de outro projeto | `.stock-theme`, `.inventory-layout`, tabelas e barras de estoque | removido |
| Playwright (6 testes) | passam | passam |
| Cypress do service-desk-qa (59 cenários) | passam | passam |

## Slop corrigido

| # | Catálogo | Onde estava | Correção |
| --- | --- | --- | --- |
| 1 | Rótulos gritando (13) | "CENTRAL DE SERVIÇOS", "WORKSPACE", "OPERAÇÕES DE TI", "CHAMADO #1" e os quatro indicadores em caixa-alta de 9 px | frase normal, 13 a 14 px |
| 2 | Título de marketing numa tela de trabalho (4, 20) | "Atendimento com contexto." + subtítulo, repetindo o menu e a trilha | "Central de chamados", o nome da seção |
| 3 | Borda lateral grossa no item aberto (impeccable) | fila | fundo da marca no item aberto |
| 4 | Caixa dentro de caixa (53) | fatos do chamado num quadro tingido dentro do painel | grade de rótulo e valor entre duas linhas |
| 5 | Símbolo de fonte como ícone | ◫ ↓ ⌘ no menu, ↻ em Atualizar, ◎ e "Aberto → … → Resolvido" no vazio | biblioteca Phosphor; o vazio diz o que fazer |
| 6 | Contraste e tamanho | cinzas claros e textos de 9 px por toda a fila | tokens com AA medido e escala mínima de 13 px |
| 7 | Cor crua (15) | 88 hexadecimais fora dos tokens | tokens HSL, tema claro e escuro |
| 8 | Duas famílias de fonte para o mesmo papel | DM Sans e Manrope | só DM Sans |
| 9 | Cromo antes do conteúdo no celular (`work-surface`) | marca e três links empilhados (~130 px antes do título) | ícones na linha da marca, com o nome para leitor de tela |
| 10 | Texto cortado | "Todas as prioridades" cortado no filtro (computador e celular) | busca numa linha e filtros embaixo; no celular, um por linha |

## Mantido de propósito

| O quê | Por quê |
| --- | --- |
| "+ Novo chamado" com o "+" escrito | é o nome acessível que a suíte de QA usa (`findByRole('button', { name: '+ Novo chamado' })`); trocar exige mudar os dois repositórios juntos |
| Quatro indicadores no topo | "Prazos vencidos" é o alerta que decide a ordem do dia; os quatro leem números reais |
| Separador `·` em "Comercial · Aplicações" | linha de metadado da fila; o copy-lint não acusou |

## Interrogatório (T2)

- **Q2. O que decide?** O prazo vencido (vermelho na fila e no prazo do chamado) e a prioridade. O resto recua para o cinza.
- **Q4. Qual ação é rara?** Mudar a prioridade e reabrir o chamado. Ficam dentro do chamado aberto, não na fila.
- **Q6. O que decide é o mais pesado?** Antes, o título de marketing em 28 px era a maior coisa da tela. Agora o maior número é o de prazos vencidos, e a fila é a maior área.
- **Q9. Estado vazio?** "Nenhum chamado aberto" com a instrução, e "Nenhum chamado encontrado" na busca (este é usado pela suíte).
- **Q12. Backend fora?** O aviso em português continua ("Não foi possível carregar a fila.", coberto pelo teste de regressão #2).
- **Q14. Teclado?** Anel de foco em todos os controles; a fila é feita de botões.
- **Q17. Onde vai faltar?** Título longo quebra a linha dentro do item; os filtros ganharam uma segunda linha para "Todas as prioridades" caber.
- **Q26. Quem mantém?** Tokens no topo do `style.css`; a suíte de QA e o Playwright travam os nomes acessíveis.

### Bloco fixo

- **F1 Reuso:** mesmos componentes e classes; uma dependência nova, só de ícones.
- **F2 Consistência:** uma família de fonte, uma cor de marca, três botões (cheio, secundário, fantasma).
- **F3 Responsivo:** 0 px de estouro nas 12 fotos. O JS cresceu 14 KB (ícones) e o CSS caiu para 11 KB.
- **F4 Fluxo:** abrir o chamado, atribuir a equipe, comentar e resolver, numa coluna só. O ponto de queda é achar o chamado vencido numa fila longa (ver F6).
- **F5 Escondido ou compactado:** o slogan, o subtítulo, o rótulo "WORKSPACE" e o diagrama de fluxo do vazio.
- **F6 Nível Vale do Silício:** filtro de um toque para "prazo vencido", atalho de teclado entre chamados e ordenação por prazo. Nenhum existe hoje.

## Não verificado

- Leitor de tela real.
- Navegadores além do Chromium (a suíte de QA roda no Chrome).
