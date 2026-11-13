<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Ticket Engine

Leia o [guia do diretório pai](../AGENTS.md) e a [visão geral](../agent_docs/overview.md) antes de alterar o projeto. A documentação para agentes fica no diretório pai, conforme solicitado pelo usuário.

Contratos que acompanham este repositório: [Design System](docs/design-system.md), [System Design](docs/system-design.md) e [relatório da implementação](docs/relatorio-implementacao.md).

Node 24. Instalação: `npm ci --include=dev`. Desenvolvimento: `npm run dev`. Verificação: `npm run lint`, `npm run check:ui`, `npm test`, `npm run test:integration`, `npm run build`. Integração exige Docker e usa PostgreSQL descartável; não use os seeds como suíte.

E2E HTTP com Auth real: `npm run test:e2e:server` → aguardar pronto → `npm run test:e2e:http` → `npm run test:e2e:stop`. Exige Supabase local; usa outro PostgreSQL e identidades exclusivas. Consulte [evidências e limites](docs/testes-locais.md).

No Windows, se Testcontainers não encontrar o Docker Desktop: `$env:DOCKER_HOST='npipe:////./pipe/dockerDesktopLinuxEngine'`. Não use o banco local do usuário para testes destrutivos. Não altere serviços Docker de outros projetos.

Trabalho atual fica local. Commit, push, PR e publicação dependem de pedido explícito do usuário.
