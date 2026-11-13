# Ticket Engine

Venda e validação de ingressos com áreas de comprador, organizador e portaria. Next.js 16, React 19, TypeScript, Prisma/PostgreSQL e Supabase. Asaas processa pagamentos; Resend envia ingressos.

## Documentação

- [System Design](docs/system-design.md): stack, entidades, chamadas, fluxos, infraestrutura e limites.
- [Design System](docs/design-system.md): jornadas por perfil, navegação, componentes e acessibilidade.
- [Relatório da implementação](docs/relatorio-implementacao.md): correções, testes, trade-offs e pendências de produção.
- [Validação local](docs/testes-locais.md): resultados, jornadas no navegador e comandos E2E com ambiente descartável.
- [Rodar localmente](../agent_docs/rodar-local.md): Docker, Node, variáveis e contas desta máquina.
- [Guia para agentes](../AGENTS.md): comandos, convenções e módulos.

O guia de ambiente e `agent_docs` ficam no diretório pai por solicitação do usuário; não acompanham um clone isolado deste repositório. Os contratos em `docs/` acompanham o código.

## Ambiente atual

Aplicação: <http://localhost:3000>. Supabase Auth, PostgreSQL e Storage rodam localmente no Docker. Next roda no Node 24 do host. Pix e cartão à vista estão habilitados na interface; integração real depende de configurar o gateway. O ambiente não envia e-mail sem chave Resend.

Testes usam banco descartável e provedores simulados. Build aprovado não significa produção homologada. O [relatório](docs/relatorio-implementacao.md) registra o que foi exercitado e o que falta.
