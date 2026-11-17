import Link from "next/link";

export const metadata = { title: "Central de ajuda" };

const topics = [
  { id: "comprador", title: "Comprar e acessar ingressos", steps: ["Abra Próximos eventos, escolha o evento e selecione lote e quantidade.", "Informe nome e CPF de cada participante. Confira o total e o desconto antes de pagar.", "Após a confirmação do pagamento, abra Meus ingressos para apresentar o QR Code.", "Se o pagamento estiver em verificação, consulte o mesmo pedido. Evite gerar outra cobrança."] },
  { id: "organizador", title: "Administrar um evento", steps: ["Sua tela inicial é Meus eventos. Crie o evento e prepare os lotes antes de publicar.", "Em cada evento, acesse edição, cupons, cortesias e o borderô. Cortesias também consomem capacidade.", "O borderô separa vendas e estornos. Comissão e líquido estimados não substituem o extrato do Asaas.", "Use o menu Operação para abrir a portaria do evento escolhido."] },
  { id: "portaria", title: "Operar a portaria", steps: ["Selecione o evento do dia antes de iniciar a câmera. Confira nome e data.", "Uma entrada confirmada mostra mensagem de sucesso. Uma recusa explica o motivo e emite som de erro quando o aparelho permite.", "Antes de perder a conexão, baixe os ingressos deste evento neste aparelho e mantenha a página aberta.", "Offline, a entrada fica pendente de sincronização. Aparelhos desconectados não compartilham os registros: use uma única fila de contingência para evitar entradas duplicadas.", "Ao reconectar, confira as pendências. Conflitos exigem revisão; não são descartados automaticamente."] },
  { id: "reembolso", title: "Transferir participante ou pedir reembolso", steps: ["Abra Meus ingressos. A transferência é permitida uma vez, em ingresso ativo, até 24 horas antes do evento.", "O pedido de reembolso segue a janela informada na compra: menos de sete dias desde a compra e pelo menos 48 horas antes do evento.", "O valor de reembolso considera o desconto da compra. O ingresso fica indisponível durante a análise do estorno.", "Um estorno em análise ainda depende da confirmação do gateway. Pedidos antigos sem valor individual comprovado precisam de conciliação."] },
  { id: "acessibilidade", title: "Navegar com acessibilidade", steps: ["Use Tab e Shift+Tab para percorrer os controles. Enter ou Espaço abre os menus; Escape fecha o menu e devolve o foco.", "O primeiro link permite pular a navegação e ir ao conteúdo. O menu Buscar também abre com Control+K ou Command+K.", "Alterne o tema pelo botão de sol/lua. A preferência de reduzir movimento do seu sistema é respeitada.", "As confirmações usam texto além de cor e som. O código do ingresso pode ser digitado quando a câmera não estiver disponível."] },
];

export default function HelpPage() {
  return <main className="mx-auto max-w-5xl px-4 py-10">
    <p className="text-sm text-muted-fg">Ajuda para cada etapa</p><h1 className="mt-2 text-3xl font-bold">Como podemos ajudar?</h1><p className="mt-3 text-muted-fg">Escolha sua tarefa e confira os próximos passos.</p>
    <nav aria-label="Tópicos de ajuda" className="my-7 flex flex-wrap gap-2">{topics.map(topic => <a href={"#" + topic.id} key={topic.id} className="nav-control border border-border">{topic.title}</a>)}</nav>
    <div className="space-y-5">{topics.map(topic => <section key={topic.id} id={topic.id} className="rounded-2xl border border-border bg-card p-5 sm:p-7"><h2 className="text-xl font-semibold">{topic.title}</h2><ol className="mt-4 list-decimal space-y-3 pl-5 text-muted-fg">{topic.steps.map(step => <li key={step}>{step}</li>)}</ol></section>)}</div>
    <p className="mt-7 text-sm text-muted-fg">Ainda precisa de ajuda? Procure a organização responsável pelo evento. <Link href="/eventos" className="underline">Ver programação</Link>.</p>
  </main>;
}
