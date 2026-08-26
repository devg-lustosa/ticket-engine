# 📋 Plano de Projeto: Plataforma de Ingressos White-Label Regional

## 1. Visão Geral
Desenvolvimento de uma plataforma moderna, leve e white-label para venda e validação de ingressos em casas de eventos locais e regionais[cite: 1]. O objetivo principal é substituir intermediários tradicionais (ex: Sympla, Eventbrite), reduzindo taxas operacionais e oferecendo controle total sobre dados, marca e faturamento[cite: 1].

---

## 2. Stack Tecnológica Oficial

- **Framework Full Stack:** Next.js (App Router) + TypeScript
- **Estilização & UI:** Tailwind CSS + shadcn/ui (design system ágil, mobile-first e customizável)
- **Banco de Dados & Auth:** PostgreSQL via Supabase (com Supabase Auth / JWT e RLS)[cite: 1, 2]
- **ORM:** Prisma ou Drizzle ORM (schema com tipagem estrita e migrations)
- **Gateway de Pagamentos:** Asaas API / Mercado Pago (foco em Pix Copia e Cola / QR Code dinâmico via Webhooks)[cite: 1, 2]
- **Leitor de Check-in (Portaria):** `html5-qrcode` (leitura direta via câmera do navegador/PWA)[cite: 1, 2]
- **Geração de QR Code:** `qrcode.react` (renderização dinâmica no painel do usuário)
- **Visualização de Dados:** `Recharts` (gráficos de vendas e faturamento no dashboard)[cite: 1, 2]

---

## 3. Pilares de Arquitetura & Módulos do Sistema

### 3.1 Área do Comprador (Frontend Público)
- **Vitrine do Evento:** Exibição da festa, local, atrações e informações de acesso[cite: 1].
- **Seleção de Ingressos:** Escolha de tipos/lotes com atualização dinâmica de disponibilidade[cite: 1].
- **Autenticação Descomplicada:** Cadastro e login rápido (Supabase Auth)[cite: 1].
- **Meus Ingressos:** Painel do usuário para visualização de ingressos adquiridos e exibição do QR Code[cite: 1].

### 3.2 Checkout & Pagamento
- **Foco em Pix:** Geração instantânea de QR Code dinâmico e código Copia e Cola via API[cite: 1].
- **Cartão de Crédito:** Suporte a pagamentos parcelados como método secundário[cite: 1].
- **Processamento Assíncrono:** Webhooks com validação e confirmação atômica para emissão do ticket[cite: 1].
- **Gateways Integrados:** Asaas API ou Mercado Pago[cite: 1, 2].

### 3.3 Módulo de Portaria & Validação (Check-in)
- **Scanner via Câmera:** Leitor de QR Code direto no navegador (Web App / PWA) via `html5-qrcode`[cite: 1, 2].
- **Hash Criptográfico Seguro:** Validação atômica de payload (`ticket_id` + `event_id` + `user_id` + `secret_hash`)[cite: 1].
- **Prevenção de Duplicidade:** Registro de status `UTILIZADO` com timestamp para evitar reutilização de fotos/prints[cite: 1].
- **Modo Contingência:** Busca nominal manual por Nome ou CPF para casos de falha de conexão/câmera[cite: 1].

### 3.4 Painel do Organizador (Dashboard)
- **Gestão de Eventos:** Criação de eventos, configuração de datas, locais e lotes com controle de estoque concorrente[cite: 1].
- **Dashboard Financeiro:** Acompanhamento de faturamento bruto, líquido, taxas e conversão em tempo real (`Recharts`)[cite: 1, 2].
- **Gestão de Presença:** Exportação de listas de convidados e métricas de check-in na portaria[cite: 1].

---

## 4. Diretrizes White-Label & Customização
- **Arquivos Centrais de Tema:** Modularização de cores (Tailwind), logotipo, favicon e nome da casa em arquivo de configuração global (ex: `config/site.ts`).
- **Isolamento de Domínio:** Estrutura pronta para mapear subdomínios (ex: `ingressos.nomedacasa.com.br`).

---

## 5. Roteiro de Implementação (Roadmap)

- [ ] **Fase 1: Modelagem & Setup do Projeto**[cite: 1]
  - Inicialização do projeto Next.js com Tailwind CSS, TypeScript e shadcn/ui.
  - Modelagem do banco relacional no Supabase / Prisma (Usuários, Eventos, Lotes, Ingressos, Pagamentos)[cite: 1].
  - Configuração de autenticação e proteção de rotas (Comprador vs. Organizador/Staff)[cite: 1].

- [ ] **Fase 2: Gateway & Webhook de Pagamento**[cite: 1]
  - Integração da API de emissão de Pix (Asaas / Mercado Pago)[cite: 1, 2].
  - Rota de webhook com idempotência e emissão automática do ingresso com hash de segurança[cite: 1].

- [ ] **Fase 3: Interface do Comprador & Ingressos**[cite: 1]
  - Vitrine e página de checkout com feedback em tempo real para confirmação de pagamento[cite: 1].
  - Tela "Meus Ingressos" com renderização do QR Code (`qrcode.react`)[cite: 1].

- [ ] **Fase 4: Validador de Portaria & Dashboard**[cite: 1]
  - Interface do scanner de QR Code pela câmera (`html5-qrcode`)[cite: 1, 2].
  - Painel administrativo com métricas e gráficos de faturamento (`Recharts`)[cite: 1, 2].
  - Testes integrados e validação de fluxo de ponta a ponta[cite: 1].