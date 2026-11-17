# Ambiente local e testes de navegador

Use Node 24 e Docker Desktop com a engine Linux aberta. Execute os comandos na raiz do repositório. Supabase fica no Docker; Next roda no Node do host.

## Iniciar, consultar e parar

Na primeira instalação, execute `npm ci --include=dev`. Depois:

| Comando | Resultado |
|---|---|
| `npm run local:up` | Inicia o Supabase deste projeto, valida o destino local, aplica migrations e gera Prisma quando inicia um novo front. Aguarda resposta da aplicação |
| `npm run local:status` | Informa disponibilidade de Docker, Auth e processo do front |
| `npm run local:down` | Para o front reconhecido e o Supabase deste projeto, preservando os dados |

Aplicação: <http://localhost:3000>. Supabase Studio: <http://localhost:54323>. Caixa de e-mails do Auth: <http://localhost:54324>. PostgreSQL deste projeto: porta `54322`; não usar a porta `5432` de outro projeto.

O processo do front continua após o comando terminar ou o terminal fechar. Subir novamente reutiliza o processo reconhecido, sem regenerar a DLL do Prisma em uso. `npm run dev` continua disponível para quem prefere manter o terminal interativo.

O gerenciador não inicia o Docker Desktop nem se registra como serviço do Windows. Após reiniciar o computador ou a engine, execute `local:up` novamente. A sobrevivência ao encerramento do comando foi verificada; não foi feito um reinício forçado do T3 como ensaio.

## Preservação e diagnóstico

- O `.env` existente é preservado, incluindo o segredo dos QR já emitidos. Somente um clone sem esse arquivo recebe configuração gerada a partir do Supabase local, com Asaas sandbox e chave de cobrança vazia.
- URLs de banco/Auth precisam corresponder aos serviços locais deste projeto. O gerenciador recusa destino remoto, outra porta de banco e Asaas de produção.
- A atualização usa `prisma migrate deploy`; não executa reset, seed ou preenchimento de eventos. Banco antigo sem baseline exige conciliar o histórico antes de repetir a operação.
- Porta 3000 ocupada por processo externo produz erro. Pare esse processo no terminal original. O gerenciador não assume nem encerra processos externos por PID.
- O controle do processo usa porta dinâmica em loopback, token e identificador de execução. Estado e log ficam em `supabase/.temp/local-next-state.json` e `local-next.log`, ignorados pelo Git. Trate esses arquivos como privados.
- `local:down` usa a parada normal do Supabase, sem `--no-backup`, e não encerra Docker Desktop ou stacks de outros projetos.

O ciclo de subida, reutilização, parada e nova subida preservou 12 usuários, 13 eventos, 321 ingressos, 201 pagamentos e o conteúdo do `.env` desta máquina. São dados sintéticos já existentes, não conteúdo exigido para um clone novo.

## Executar a suíte de navegador

Com `local:up` pronto, instale Chromium uma vez com `npx playwright install chromium` e execute `npm run test:browser`. Para um caso específico: `npm run test:browser -- --project=desktop --grep 'limpar o formulário'`.

O comando cria PostgreSQL descartável e quatro identidades exclusivas no Supabase Auth local. Compila produção em `.next-e2e`, inicia a aplicação em `3101`, roda a suíte HTTP e depois Playwright. Usa cookies e Auth reais; simula apenas Asaas, sem envio de e-mail externo. Não aponta as escritas para o banco da porta 54322.

O controle de fixtures em `3102` exige token e identificador da execução. O simulador Asaas ocupa `3103`. As três portas precisam estar livres. Ao concluir ou falhar um teste, o comando aguarda a parada do servidor e a remoção do banco e das identidades próprias. Se o host for encerrado à força, confira `supabase/.temp/e2e-state.json`. Use `npm run test:e2e:stop` se o controle ainda responder; caso contrário, a limpeza exige inspeção dos recursos exclusivos do run. Esse arquivo não é uma autorização para matar outro processo.

Os cenários cobrem início e menus por perfil, busca por teclado, Escape/foco, tema salvo diferente do sistema, catálogo vazio, erro/retentativa, equipe, compra Pix e evento errado na portaria. Rodam em Chromium nas larguras 1440 e 375, com um worker e sem retries. Os cenários de catálogo usam SQL estático somente no banco descartável; nenhuma rota de teste foi adicionada à aplicação.

O relatório HTML fica em `playwright-report/index.html`. Falhas geram captura em `test-results`. Traces de rede e vídeos ficam desligados para não armazenar sessões ou payloads sensíveis. O job `browser` no GitHub Actions prepara Supabase próprio, executa a mesma suíte e retém apenas relatório/capturas por sete dias.

## Trade-offs e limites

| Escolha | Benefício | Custo/limite |
|---|---|---|
| Controller Node destacado | Independe do terminal temporário e só encerra seu processo filho | Não é serviço com inicialização automática ou recuperação de crash |
| Supabase CLI fixado no lockfile | Mesmo comando local/CI e Auth real | Primeiro uso baixa imagens e exige Docker; falha não aciona reset automático |
| Um worker e fixtures compartilhadas | Falha/retorno do catálogo não disputa estado entre testes | Menos paralelismo. Aumentar workers exige fixtures e portas independentes |
| Build de produção e gateway simulado | Exercita bundle, cookies e banco sem transações financeiras externas | Custa uma compilação por execução; não homologa Asaas |
| Chromium com dois tamanhos | Regressões reproduzíveis de layout e navegação | Não equivale a Safari, Firefox, aparelho físico, câmera ou leitor de tela |
| Sem trace/vídeo | Reduz persistência de segredos no CI | Diagnóstico usa asserções, capturas e log local privado |

Resultados e pendências: [testes locais](testes-locais.md) e [revisão técnica](revisao-tecnica.md).
