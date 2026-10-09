# Backlog de Funcionalidades Futuras (Trello Cards)

Aqui estão as próximas funcionalidades planejadas para o Ticket Engine, separadas no formato de "User Story" para facilitar a organização em colunas (To Do, Doing, Done) e a priorização técnica.

---

### 🏷️ TAGS SUGERIDAS: `[Identidade]`, `[Banco de Dados]`
**História**
Como Usuário, quero poder escolher um "Nickname" (@apelido) único durante ou após o meu cadastro, para ter uma identidade exclusiva dentro da plataforma.

**Critérios de aceite**
- Adicionar o campo `nickname` (único) na tabela `User` no Prisma.
- O sistema deve validar no momento da digitação se o nick já está em uso por outra pessoa.
- O nickname deve aceitar apenas letras, números e underlines (sem espaços ou caracteres especiais).

**Depende de**
- Atualização do schema do Prisma (`npx prisma migrate dev`).

---

### 🏷️ TAGS SUGERIDAS: `[Autenticação]`, `[Segurança]`
**História**
Como Usuário, quero poder fazer login ou criar minha conta clicando em "Entrar com Google", para não precisar criar e memorizar mais uma senha.

**Critérios de aceite**
- Habilitar o provedor do Google no painel do Supabase Auth.
- Criar o botão "Entrar com Google" na tela de `/login` e `/cadastro`.
- O sistema deve puxar automaticamente o e-mail e o nome completo da conta Google do usuário.
- Se for a primeira vez, criar o registro na nossa tabela `User`.

**Depende de**
- Configuração de credenciais e chaves na API do Google Cloud Console.

---

### 🏷️ TAGS SUGERIDAS: `[Identidade]`, `[Storage]`
**História**
Como Usuário, quero poder fazer o upload de uma foto de perfil, para personalizar minha conta e ser reconhecido por outros usuários.

**Critérios de aceite**
- Criar um "Storage Bucket" público no Supabase chamado `avatars`.
- Adicionar uma aba "Meu Perfil" onde o usuário pode selecionar uma foto do celular/PC.
- O componente de upload deve permitir recorte básico (Crop) antes de enviar.
- Limitar o tamanho da foto a no máximo 5MB (ex: `.jpg`, `.png` e `.webp`).
- Salvar a URL gerada no campo `avatarUrl` da tabela `User`.

**Depende de**
- Card de Nickname concluído (para compor a tela do perfil unificada).

---

### 🏷️ TAGS SUGERIDAS: `[Social]`, `[Frontend]`
**História**
Como Participante, quero ver uma lista com a foto e o nickname das pessoas que compraram ingresso para a mesma festa, para saber quem estará lá ou encontrar alguém que conheci no evento.

**Critérios de aceite**
- Adicionar uma aba "Quem vai" na página pública do evento (`/evento/[slug]`).
- A lista deve buscar do banco os usuários que possuem um ingresso ativo (`ACTIVE` ou `USED`) para aquele evento.
- A exibição deve ser em formato de grade (Grid), mostrando apenas Foto de Perfil, Nickname e Primeiro Nome.
- **Regra de LGPD:** Criar uma chave nas configurações da conta ("Ocultar meu perfil de eventos públicos") para o usuário poder optar por ficar invisível na lista.

**Depende de**
- Card de Nickname.
- Card de Upload de Foto de Perfil.

---

### 🏷️ TAGS SUGERIDAS: `[Autenticação]`, `[E-mail]`
**História**
Como Usuário, quero poder clicar em "Esqueci minha senha" e receber um link seguro por e-mail, para recuperar meu acesso caso eu não lembre minha credencial.

**Critérios de aceite**
- Adicionar botão "Esqueci a senha" na tela de `/login`.
- A tela deve pedir apenas o e-mail e disparar o fluxo de "Reset Password" do Supabase.
- O e-mail de recuperação deve ser disparado (usando o template configurado no Supabase).
- O link do e-mail deve redirecionar o usuário para a tela `/atualizar-senha`, onde ele insere a nova credencial e confirma.

**Depende de**
- Configuração de templates de Auth no painel do Supabase.

---

### 🏷️ TAGS SUGERIDAS: `[Inovação/Premium]`, `[Frontend 3D]`
**História**
Como Organizador, quero poder disponibilizar um mapa 3D interativo do local da festa, para que o usuário possa visualizar onde ficam os palcos, bares, banheiros e camarotes antes de comprar o ingresso.

**Critérios de aceite**
- Integrar uma biblioteca como `Three.js`, `@react-three/fiber` ou iFrame do `Spline`.
- A página do evento deve ter um botão "Abrir Mapa 3D" ou renderizar o modelo interativo diretamente no card de "Local".
- O mapa deve poder ser girado e com recurso de zoom via mouse ou touch.
- (Opcional) Pins/Botões flutuantes 3D nas áreas importantes (ex: clicar no palco mostra nome da atração).

**Depende de**
- Modelagem do mapa 3D do local (feita por um designer).

---

### 🏷️ TAGS SUGERIDAS: `[Core]`, `[Painel Organizador]`
**História**
Como Organizador, quero poder criar e editar perguntas frequentes (FAQ) específicas para o meu evento, para reduzir as dúvidas no meu suporte (Instagram/WhatsApp).

**Critérios de aceite**
- Adicionar a tabela `Faq` no schema do Prisma (`id`, `pergunta`, `resposta`, `eventId`).
- Na tela interna do painel (`/painel/eventos/[id]/editar`), adicionar uma aba ou seção "FAQ" com botões de adicionar, editar e excluir perguntas.
- Na página de vendas pública do evento, exibir a seção "Dúvidas Frequentes" renderizando os itens em formato de sanfona expansível (Accordion).

**Depende de**
- Nenhuma dependência externa.
