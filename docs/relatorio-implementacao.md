# Relatório de implementação — Ticket Engine

Implementação e validação local em 12/11/2026. O usuário autorizou commit, push e abertura do MR após os testes, incluindo capturas antes/depois da correção de tema. A implantação permanece adiada; não houve túnel ou pagamento real.

## Avaliação para revisão

**Pode seguir para revisão técnica pelo MR. Não considero liberado para produção.** As correções têm regressões e build aprovado; gateway real, conciliação de extrato, operação com aparelhos e capacidade de pico ainda não foram comprovados.

A [revisão técnica de 13/11](revisao-tecnica.md) registra as falhas adicionais de gestão da equipe, suas regressões, impacto e trade-offs.

O [guia de desenvolvimento local](desenvolvimento-local.md) documenta a execução independente do terminal e a suíte Chromium com Auth/banco reais. A [rodada atual de validação](testes-locais.md#rodada-atual-revisão-ambiente-e-navegador-automatizado) reúne os resultados desta etapa; as contagens posteriores deste relatório são históricas.

O diff reúne dinheiro/portaria, navegação e documentação. A entrega usa a branch `refactor/refatoracao-geral`, com o conjunto integrado que passou pelos testes. Em uma revisão futura, avaliar esses blocos separadamente ajuda a conferir permissões, migrations e comportamento visual. A massa local e as contas existentes foram preservadas; testes destrutivos usam outro banco. O seed preparado separadamente e a documentação de agentes no diretório pai ficam fora deste commit.

## O que cada correção significa

| Situação | Problema anterior | Resultado implementado | Por que importa |
|---|---|---|---|
| Pedido com três ingressos de R$ 50 | Somava o pagamento de R$ 150 para cada ingresso: R$ 450 | Painel e borderô agregam R$ 150 | Fechamento não inventa faturamento |
| Dois operadores leem o mesmo QR | Ambos podiam observar `ACTIVE` antes de atualizar | Uma transição no banco vence; as demais recebem conflito | Evita duas liberações online do mesmo ingresso |
| Ingresso de sábado na portaria de sexta | Um ingresso ativo de qualquer evento podia entrar | Evento obrigatório; recusa informa o evento correto | O QR precisa valer para a noite escolhida |
| Dois ingressos de R$ 50 com R$ 20 de desconto no pedido | Estornava R$ 50 usando o preço atual | R$ 40 pagos por ingresso, com controle dos estornos do pedido | Devolve o que foi pago e preserva o saldo original |
| Instalação de produção | Client Prisma estava em dependências de desenvolvimento | Client em runtime e geração no build | O servidor continua acessando o banco quando ferramentas de desenvolvimento são omitidas |
| Pix vencido ou removido | A reserva podia continuar ocupando o lote | Confirma cancelamento remoto e libera uma vez | Vagas não ficam presas em cobranças canceladas, sem liberar uma cobrança ainda pagável |
| Cartão e antifraude | Usava CEP/telefone fixos e não coletava endereço real | Titular informa CPF, CEP, logradouro, número e telefone | O gateway recebe os dados reais; isso não garante aprovação do antifraude |
| Mesma tela para todos e ícones sem explicação | Compra, gestão e portaria se misturavam | Início por perfil, barra centralizada, ajuda e tooltips | Cada pessoa encontra seu trabalho sem adivinhar ícones |
| Editar evento marcado para 20h | O formulário mostrava 23h e salvar deslocava o instante | Converte a entrada de Brasília e envia ISO com fuso explícito | Editar título/lote não desloca o horário pela configuração do servidor |

Não haver dinheiro real no banco local é adequado para esses testes: os cenários são sintéticos. O que eles provam é a regra do sistema; não comprovam um repasse ou uma devolução bancária real.

## Como foi implementado

### Faturamento e PDF

[sales.service.ts:42](../src/services/sales.service.ts#L42) agrega no PostgreSQL, sem carregar todos os ingressos no Node. Usa snapshots quando comprovados e rateia legado sem multiplicar o total do pagamento. Painel e API de borderô compartilham a regra. O PDF mostra vendas e estornos separadamente e identifica comissão/líquido estimados.

**Trade-off:** centraliza a regra e reduz memória de aplicação, mas a consulta SQL é mais especializada. Dados antigos sem snapshot têm estimativa identificada. **O aceite de conferir rigorosamente com extrato real do Asaas continua pendente**; corrigir a duplicação não transforma comissão comercial em taxa bancária efetiva.

### Check-in, evento e offline

[gate.service.ts:13](../src/services/gate.service.ts#L13) verifica papel, propriedade quando aplicável, evento e estado. A atualização inclui `status=ACTIVE`; o PostgreSQL decide o vencedor. A portaria exige seleção, informa evento errado e usa som como apoio ao resultado escrito.

Download pagina mil ingressos por chamada e restringe o evento. O cache separa operador/evento. O diário grava entrada e pendência juntos no IndexedDB e mantém conflitos para revisão. A câmera consulta o estado atual, evitando repetir uma leitura com uma closure antiga.

**Trade-off:** há coordenação entre servidores online, com pequena contenção por ingresso. Dois aparelhos desconectados não compartilham essa garantia. Contingência exige uma única fila offline, lista preparada e revisão ao reconectar. Pendências antigas sem contexto não são descartadas automaticamente. Não foi implementada PWA nem sincronização distribuída entre aparelhos offline.

### Reserva, cupom e cobrança

[checkout.service.ts:100](../src/services/checkout.service.ts#L100) reserva antes de chamar o gateway. Transações curtas travam comprador, lotes e cupom em ordem; cada pedido contém até dez ingressos de um evento. A chave da tentativa evita cobrar novamente em reenvios do mesmo pedido. O conteúdo é comparado sem persistir cartão/CVV.

Confirmação imediata e webhook usam [payment.service.ts:7](../src/services/payment.service.ts#L7). Webhooks repetidos não ativam/cobram/contabilizam cupom duas vezes. Recusa definitiva devolve reserva; resultado incerto preserva o pedido e orienta consultar a mesma operação. Cartão ainda em análise também permanece no mesmo pedido.

**Trade-off:** evita segurar uma conexão SQL durante o HTTP e impede repetição cega de cobrança. Em contrapartida, `UNKNOWN` pode reter estoque até conciliação. Limite de três pedidos pendentes por comprador reduz reserva abusiva simples, mas não é um rate limit distribuído nem proteção completa contra bots. Não foi adicionada fila ou Redis sem medição que justifique essa operação.

### Reembolso proporcional

[refund.service.ts:48](../src/services/refund.service.ts#L48) usa a parcela paga em centavos. Registra estorno único por ingresso, trava pagamento e considera outros estornos locais e externos conhecidos. O ingresso fica indisponível antes do HTTP, impedindo entrada concorrente. `DONE` devolve capacidade uma vez; recusa/cancelamento definitivo restaura o ingresso; timeout não dispara outro estorno automaticamente.

**Trade-off:** preserva trilha e saldo original, com novos campos, tabela e estados. Ingresso antigo sem snapshot exige revisão; usar o preço atual seria arriscar devolver valor indevido. Casos incertos precisam de acompanhamento operacional. Não houve backfill baseado em valores presumidos.

### Pix vencido e cancelado

[pix-expiration.service.ts](../src/services/pix-expiration.service.ts) trata `PAYMENT_OVERDUE` e `PAYMENT_DELETED`, confere o estado remoto e só libera após confirmar cancelamento. Se já pago, confirma o pedido. A transação marca `FAILED`, cancela pendentes e devolve estoque/reserva de cupom uma vez.

**Trade-off:** segurança da capacidade depende de mais uma consulta/cancelamento no gateway. Falha conserva reserva e pede repetição/conciliação. Reserva antiga sem flag não é alterada cegamente. Cron opcional não foi criado; os eventos precisam ser habilitados no Asaas. Vencimento sozinho não torna o QR impagável, conforme a [documentação do Asaas](https://docs.asaas.com/docs/cobrancas-via-pix).

### Pix e cartão à vista

A decisão final do usuário foi oferecer os dois. `ENABLE_CREDIT_CARD=true` está configurado localmente. Cartão coleta dados reais do titular e encaminha `creditCardHolderInfo`; parcelamento é recusado na API e não é anunciado na interface.

**Trade-off:** há menos opções que a promessa antiga de doze parcelas, mas o pedido continua correspondendo a uma cobrança e a seus estornos. Parcelamento exige outro modelo. O servidor ainda recebe os dados do cartão em memória; tokenização/3DS e requisitos operacionais de cartão não foram implementados ou certificados. O sandbox precisa validar aprovação, análise pendente, recusa e estorno. [Fluxo oficial de cartão](https://docs.asaas.com/docs/cobrancas-via-cartao-de-credito).

### Navegação, acessibilidade e ajuda

[navigation.ts](../src/lib/navigation.ts) define comprador em `/eventos`, organizador em `/painel` e staff em `/portaria`. O catálogo público continua em cache; a raiz que escolhe o perfil é dinâmica. Os dashboards antigos encaminham aos caminhos canônicos.

[AppNavigation](../src/components/app-navigation.tsx) fornece barra flutuante centralizada, áreas por perfil, busca de páginas, tema e conta. O perfil tem um único cabeçalho. Ações de gestão têm texto, além do ícone. [TooltipLayer](../src/components/tooltip-layer.tsx) atende hover/foco por uma camada compartilhada. Há link para pular ao conteúdo, foco visível, Escape, redução de movimento e ajuda por tarefa.

**Trade-off:** a base fica consistente e evita três sistemas visuais distintos; parte da navegação carrega o perfil após hidratação. A checagem de 81 controles comprova presença de tooltip no código. Não certifica WCAG, leitura de tela ou ausência de problema visual em todos os modais antigos. Busca navega páginas; não é pesquisa global dos dados.

O teste HTTP encontrou uma falha nova do catálogo ao reutilizar cache: datas viravam strings. Ela foi corrigida com DTO explícito de datas ISO/preços numéricos e reconstrução das datas na página. Uma regressão com PostgreSQL e serialização do cache cobre data e preço disponível. A atualização posterior também removeu a conversão de falha de consulta em lista vazia: [error.tsx](../src/app/eventos/error.tsx) informa indisponibilidade e permite refazer a consulta.

O usuário encontrou depois um aviso de hidratação ao carregar o tema escuro. O rótulo do botão dependia de uma preferência que só o navegador conhece. O controle agora usa uma descrição estável, preservando ícones e alternância. **Trade-off:** a descrição explica a ação, sem anunciar qual tema virá a seguir; evita estado adicional e um render só para liberar o botão. [Contrato](design-system.md#tema), [três regressões e capturas antes/depois](testes-locais.md#correção-posterior-hidratação-do-tema). Esse cenário não estava coberto na rodada inicial.

O rodapé do catálogo ficava no meio da janela quando havia pouco conteúdo. Documento e conteúdo agora usam colunas flexíveis; o [layout da rota](../src/app/eventos/layout.tsx) preserva o rodapé fora de `main` nos estados de lista, vazio e erro. **Trade-off:** altera a base vertical compartilhada, exigindo regressão de páginas e larguras pequenas, mas dispensa posição fixa e cálculos dependentes da altura do menu. As variantes `dark:` também foram alinhadas à classe do tema escolhido, corrigindo ícones e utilitários que antes seguiam apenas o sistema operacional. [Métricas, recuperação real de falha e capturas](testes-locais.md#atualização-catálogo-rodapé-e-tema-escolhido).

O cache de sucesso mantém os 30 segundos. **Trade-off do erro explícito:** uma consulta indisponível mostra recuperação em vez de fingir ausência de eventos; resultados válidos já em cache continuam sujeitos às regras do Next. Não foram removidos filtros de data/publicação nem alterados os eventos do usuário.

### Dependências, diagnósticos e e-mail

Client Prisma está em `dependencies`; dev/build geram o client explicitamente. O lock foi corrigido. Next e eslint-config-next estão fixados em 16.4.6; transitivas com correção disponível foram atualizadas. O audit final de produção não apontou avisos altos/críticos; ficaram quatro baixos na cadeia de e-mail, sem correção indicada.

Diagnósticos não ficam públicos em produção. O teste de e-mail deixou de aceitar GET com destinatário arbitrário; em desenvolvimento exige organizador e envia apenas à própria conta. Erros das APIs alteradas não serializam objetos Axios com cartão/headers.

O QR do e-mail agora é PNG gerado no servidor, anexado por CID ao Resend. O teste verifica HTML e assinatura do PNG, sem enviar mensagem real. [Suporte oficial a CID](https://resend.com/changelog/embed-images-using-cid).

**Trade-off:** atualização de framework exige regressões e leitura dos guias locais. PNG adiciona pequena dependência/custo por mensagem, evitando compartilhar o ingresso com gerador público. O envio segue depois do commit, sem outbox ou retentativa durável; entrega e renderização real do e-mail não foram comprovadas.

## Correções relacionadas demonstradas

- Organizador não altera/exclui evento alheio por `PATCH`, `PUT` ou `DELETE`.
- Cupom precisa pertencer ao evento da URL e ao organizador autorizado.
- Transferência exige ingresso ativo e acontece uma vez; ingresso usado é recusado.
- Cortesia respeita capacidade sob trava, com limite de dez por requisição.
- Origem externa é recusada nas mutações alteradas; isso não representa auditoria de todas as APIs antigas.
- Exceção interna de renderização do Next não é engolida pelo serviço de usuário. A regressão confirma o rethrow, preservando o fallback para falhas comuns.

## Verificações executadas

| Check | Resultado |
|---|---|
| Instalação limpa `npm ci --include=dev`, com lock final | Passou em cópia isolada |
| `npm run lint` | Passou |
| `npm run check:ui` | 81 controles com ícones possuem tooltip |
| `npm test` | 32 testes em oito arquivos passaram, incluindo hidratação e falha do catálogo |
| `npm run test:integration` | 44 testes passaram, com PostgreSQL descartável e migrations reais |
| `npm run test:e2e:http` | 16 testes passaram com servidor compilado e sessão real no Supabase local |
| `prisma migrate status` local | Duas migrations aplicadas; schema atualizado |
| `NODE_ENV=production` com `npm run build` | Passou na cópia isolada |
| Compilação final com `NODE_ENV=production node node_modules/next/dist/bin/next build` | Passou no launcher E2E após os ajustes finais de catálogo, rodapé e tema; schema/client Prisma não mudaram |
| Runtime após `npm prune --omit=dev --ignore-scripts` | Iniciou na porta 3100, sem TypeScript, Vitest ou ESLint; Prisma e QR disponíveis |
| Login e início das quatro contas locais | Destinos corretos por perfil |
| Perfil autenticado por HTTP | 200, com um cabeçalho nas quatro contas |
| API de eventos da portaria | Comprador 403; organizadores/staff 200 |
| Catálogo em dev e runtime de produção | 200; regressão cobre serialização do cache |
| GET do diagnóstico de e-mail | 404 em dev e produção, sem enviar mensagem |
| Audit de produção | Zero alto/crítico; quatro baixos na cadeia de e-mail |
| Jornadas de navegador | Pix, cartão/cupom/estorno, transferência, gestão, QR por imagem e fila offline simulada exercitados |
| PDF baixado | Extração e renderização conferidas; valores iguais à API/painel no cenário sintético |

Os ensaios concorrentes incluem vinte leituras do mesmo ingresso, vinte reenvios da mesma chave, disputa de vinte compradores pela última vaga, último uso do cupom e webhooks/estornos repetidos. **Isso comprova invariantes desses cenários, não capacidade em requisições por segundo.**

Integração chama handlers/serviços com banco real, mas simula Supabase/gateway/e-mail. A suíte E2E HTTP e as jornadas de navegador usam Auth local real e aplicação compilada, com Asaas interceptado e envio externo desabilitado. A rodada inicial executou 86 testes; as correções posteriores acrescentaram hidratação, falha do catálogo e filtro de publicações. Na validação de 12–13/11, os 92 casos passaram: 32 unitários, 44 de integração e 16 HTTP. O check remoto `verify` do commit anterior `4dfea4e` também passou; a nova atualização do MR exige conferir seus próprios checks. [Evidências, capturas e limites](testes-locais.md) registram as etapas e os avisos de dependências, inclusive os de desenvolvimento.

## Migrations e operação

Baseline e expansão financeira são aditivas. O banco local existente foi reconhecido após comparação e recebeu a expansão sem reset. Contas, senhas e massa manual foram preservadas. Banco novo usa `prisma migrate deploy`; banco existente precisa do procedimento de baseline. Não usar seed destrutivo como atualização.

O runtime foi exercitado com devDependencies omitidas. A instância temporária da porta 3100 foi encerrada, mantendo o front de desenvolvimento na porta 3000. A revisão automática bloqueou a limpeza dos arquivos temporários com a mensagem `blocked by policy`, sem motivo mais detalhado. A cópia de validação, incluindo seu .env local, permanece em `C:/Users/joaov/AppData/Local/Temp/ticket-engine-production-dlOiVx`; o script de smoke permanece em `supabase/.temp/verify-http.mjs`, ignorado pelo Git. Não contém credencial de produção. O npm pode manter a CLI Prisma como peer do client; isso não substitui instalar ferramentas de compilação na etapa de build. Não apagar o client gerado ao empacotar o runtime.

## O que ainda impede declarar produção pronta

1. Validar Pix/cartão/reembolso e eventos de webhook no Asaas sandbox; conferir o PDF com extrato, taxas e splits.
2. Definir monitoramento e conciliação para pedidos/estornos incertos e webhooks perdidos; cron e outbox não estão implementados.
3. Repetir câmera, áudio, fila offline, teclado, leitor de tela, zoom e modais em aparelhos reais, com operadores. A rodada local já cobriu imagem QR, teclado, diálogos nativos e reconciliação offline simulada.
4. Medir pico esperado em infraestrutura equivalente, incluindo pool SQL, contenção por lote, latência do gateway e recuperação de falhas. Não foi feito teste de carga sustentada.
5. Validar remetente e entrega de e-mail. Quatro avisos baixos de dependências seguem registrados; não foram forçados overrides incompatíveis.
6. Inspecionar hospedagem, segredos, backup/restauração e permissões de produção. Não há isolamento multicasas nem vínculo de equipe por evento; não apresentar o modelo atual como SaaS multitenant.

Não houve auditoria completa de XSS, SQL injection, upload, rate limit ou todas as rotas legadas. Foram corrigidas as falhas reproduzidas e fronteiras diretamente envolvidas; build verde não significa sistema inviolável.

## Documentos para entender o sistema

- [System Design](system-design.md): stack, entidades, o que chama o quê, fluxogramas e infraestrutura.
- [Design System](design-system.md): jornadas, navegação, tokens, estados, ajuda e acessibilidade.
- [Guia de agentes](../../AGENTS.md), [banco](../../agent_docs/database.md) e [decisões](../../agent_docs/decisoes.md) no diretório pai, conforme solicitado.

**Recomendação final:** revisão técnica pelo MR, sim; aprovação para produção, ainda não. A abertura do MR não inclui implantação. A próxima validação deve ser guiada pelas lacunas acima, preservando a massa local.
