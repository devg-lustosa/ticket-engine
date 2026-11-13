# Design System do Ticket Engine

Contrato de interface para comprador, organizador e portaria. Leia antes de criar uma tela ou componente. Atualizado em 12/11/2026. A base descrita aqui está no código; a adoção em formulários antigos ainda é parcial.

## Produto e tarefas

| Perfil | Início | Tarefa principal | Caminhos secundários |
|---|---|---|---|
| Visitante e comprador | `/eventos` | Escolher evento e ingresso | Meus ingressos, ajuda, conta |
| Organizador | `/painel` | Preparar evento e acompanhar vendas | Cupons, cortesias, borderô, equipe, portaria |
| Porteiro (`STAFF`) | `/portaria` | Escolher evento e registrar entrada | Sincronização, busca nominal, ajuda, conta |

`/` resolve a sessão e encaminha conforme `homeForRole`. Um organizador também pode comprar e operar a portaria. O schema tem uma role por usuário; não há perfil `ADMIN` nem seletor que aumente permissões. Fonte: [navigation.ts](../src/lib/navigation.ts), [page.tsx](../src/app/page.tsx).

## Navegação

[AppNavigation](../src/components/app-navigation.tsx) oferece marca, identificação do perfil, tema, conta e menus por tarefa. A referência recebida orientou a hierarquia de duas linhas; não foram copiados módulos que o produto não possui.

- Barra flutuante centralizada, com largura limitada e itens centralizados. Em telas pequenas, menus quebram linha e a conta usa ícone com nome acessível; a altura medida atualiza o deslocamento dos painéis e âncoras. A rodada local verificou 320 px sem transbordamento.
- Menus abrem por clique, Enter ou Espaço. Links usam a navegação normal de Tab; não são um widget ARIA `menu` com atalhos inventados.
- Escape fecha e devolve foco ao acionador. Clique externo fecha o painel.
- Busca filtra páginas e ações permitidas ao perfil; não pesquisa registros do banco. Atalho Control+K ou Command+K.
- `aria-expanded`, `aria-controls`, `aria-current`, rótulos e foco visível comunicam estado. Esconder um link não substitui autorização no servidor.
- A navegação não aparece nos formulários de autenticação. As páginas mantêm seus títulos e ações locais.
- `/dashboard` e `/dashboard/novo` encaminham aos fluxos canônicos do painel. Não criar outro painel com cálculos próprios.

## Tokens e composição

Fonte visual: [globals.css](../src/app/globals.css). Marca e metadados: [site.ts](../src/config/site.ts). Troca de marca precisa manter esses dois arquivos consistentes; o objeto TypeScript não injeta cores automaticamente no CSS.

| Elemento | Regra implementada |
|---|---|
| Tipografia | Inter pelo `next/font`; fallback do sistema. Evitar outro download de fonte no CSS |
| Ação primária | `--brand-500: #4f46e5`; hover `--brand-600: #4338ca`; texto branco |
| Superfícies | `background`, `card`, `muted`; bordas `border` e `card-border` |
| Texto | `foreground` para conteúdo; `muted-fg` para apoio |
| Resultado | `success`, `error`, `warning`, com versões próprias no tema escuro |
| Marca no texto escuro | `text-brand` e texto `--brand-500` usam `--brand-400`; fundos de ação mantêm a cor primária |
| Forma | Tokens de raio existentes, de 4 a 24 px; 10 px nos controles novos |
| Espaço | Escala Tailwind em múltiplos de 4 px; conteúdo com respiro de 16 px no celular |
| Largura | Até 1152 px na navegação e catálogo; formulários e ajuda mais estreitos |
| Alvos | Controles novos com altura mínima de 44 px |

Classes compartilhadas: `ui-button`, `ui-input`, `nav-control`, `nav-popover`. Elas cobrem a navegação e as novas superfícies. Não há biblioteca completa de componentes nem Storybook. Só extrair outro componente quando houver reaproveitamento real.

## Tooltips

[TooltipLayer](../src/components/tooltip-layer.tsx) atende controles com `data-tooltip` por uma camada única, sem uma instância por ícone. Mostra descrição por hover e foco, aceita Escape e permite mover o ponteiro ao texto. Renderiza em portal para não cortar o texto em cards com `overflow: hidden`; dentro de diálogo nativo, hospeda o portal no próprio diálogo para permanecer acima do fundo inerte. Ações principais também mantêm texto visível. Ícones decorativos junto de títulos não são controles.

`npm run check:ui` confere botões e links com Lucide/SVG; foram identificados 81 controles. A checagem comprova presença da descrição no código. A [rodada de navegador](testes-locais.md) verificou tooltips e estados selecionados; isso não garante a qualidade de toda legenda.

## Hierarquia e linguagem

- Um `h1` nomeia a tarefa da página; `h2` organiza seções. A ação principal usa verbo: “Escolher ingressos”, “Criar evento”, “Validar”.
- Cards de eventos mostram nome, data de Brasília, local, menor preço disponível e ação. A disponibilidade é confirmada no servidor ao reservar.
- Informar o que ocorreu e o próximo passo. Não prometer “100% seguro”, aprovação garantida ou prazo instantâneo do gateway.
- Não mostrar nomes de variáveis, `.env`, SQL ou stack trace para o comprador. Exemplo: mapa indisponível orienta a consultar o endereço.
- Não criar contatos, documentos da empresa ou links `#` fictícios. Rodapé aponta para ajuda e termos existentes.
- Valores usam BRL e duas casas; cálculos de negócio usam centavos. “Líquido estimado” deve continuar identificado como estimativa.

## Estados obrigatórios

| Estado | Tratamento |
|---|---|
| Carregando | Desabilitar repetição da ação e manter contexto |
| Vazio | Explicar ausência e oferecer próximo passo possível |
| Inválido | Dizer qual dado corrigir; preservar dados já informados |
| Em verificação | Consultar o mesmo pedido; não sugerir gerar outra cobrança |
| Entrada confirmada | Nome, evento e confirmação em texto; som como apoio |
| Entrada recusada | Motivo em texto; bip de erro quando permitido pelo navegador |
| Offline | Evento, data da lista e quantidade de pendências visíveis |
| Conflito offline | Preservar ocorrência até revisão do operador |

## Acessibilidade

O primeiro link pula para `#conteudo`, que recebe foco. Há foco visível, idioma `pt-BR`, nomes acessíveis nos controles novos e preferência `prefers-reduced-motion`. Resultados de portaria usam `status` ou `alert`; cor e áudio não são o único sinal.

Transferência, reembolso e cortesia usam diálogo nativo, com nome, fundo inerte, Escape e retorno de foco. Os formulários de checkout/evento/cupons associam os rótulos aos campos. QR de ingresso tem nome acessível; QR Pix preserva a proporção quadrada em tela estreita.

Isso não certifica conformidade WCAG do produto inteiro. Faltam auditoria com leitor de tela, uso com zoom de 200%/400%, medições de todos os estados e teste com operadores em aparelhos reais. Outros modais legados e o leitor de terceiros ainda precisam dessa revisão; consulte os limites da validação local.

## Ajuda e evolução

[Central de ajuda](../src/app/ajuda/page.tsx): compra, organização, portaria, reembolso e acessibilidade. Cada regra de interface deve apontar para uma regra real do servidor.

Próxima revisão de produto: observar uma compra, uma publicação e uma entrada com usuários dos três perfis. Medir tarefa concluída, erros e pontos de hesitação. Só depois ampliar identidade visual, filtros, atalhos e personalização.

Arquitetura e limites operacionais: [System Design](system-design.md). Resultado dos checks e trade-offs: [relatório](relatorio-implementacao.md).
