import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { Ticket, HelpCircle, ShieldCheck, CreditCard, RefreshCw, Edit2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/user-nav";
import { Footer } from "@/components/footer";

export const metadata = {
  title: "Central de Ajuda",
  description: "Tire suas dúvidas, veja como comprar, formas de pagamento e políticas de cancelamento.",
};

export default async function AjudaPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  let dbUser = null;
  if (authUser) {
    dbUser = await prisma.user.findUnique({
      where: { authId: authUser.id },
      select: { name: true, email: true, role: true }
    });
  }

  return (
    <main className="min-h-dvh bg-[var(--background)] flex flex-col">
      {/* Header / Hero */}
      <header className="relative overflow-hidden bg-[var(--brand-600)] pb-12 text-white shrink-0">
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]" />
        
        {/* Top Navbar */}
        <div className="relative z-20 mx-auto flex max-w-5xl items-center justify-between px-4 py-4 mb-8">
          <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-90 transition-opacity">
            <Ticket className="h-6 w-6" />
            <span className="hidden sm:inline-block">{siteConfig.name}</span>
          </Link>
          <UserNav user={dbUser} role={dbUser?.role} />
        </div>

        <div className="relative mx-auto max-w-5xl px-4 text-center animate-fade-in mt-4">
          <h1 className="mb-4 flex items-center justify-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
            <HelpCircle className="h-8 w-8 sm:h-10 sm:w-10" />
            Central de Ajuda
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80">
            Tudo o que você precisa saber sobre compras, pagamentos e políticas do {siteConfig.name}.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-4xl px-4 py-12 flex-1 w-full space-y-12">

        {/* Como Comprar */}
        <section id="como-comprar" className="scroll-mt-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[var(--brand-100)] dark:bg-[var(--brand-900)] p-3 rounded-xl">
              <Ticket className="text-[var(--brand-600)] dark:text-[var(--brand-400)] h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Como Comprar Ingressos</h2>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm">
            <ol className="list-decimal list-inside space-y-4 text-[var(--muted-fg)] leading-relaxed">
              <li><strong>Escolha o evento:</strong> Navegue pela nossa página inicial e clique no evento desejado.</li>
              <li><strong>Selecione os ingressos:</strong> Na página do evento, escolha o lote e a quantidade de ingressos (você pode comprar múltiplos ingressos de uma só vez).</li>
              <li><strong>Identifique os participantes:</strong> No checkout, preencha o Nome Completo e o CPF de cada pessoa que irá utilizar os ingressos.</li>
              <li><strong>Pagamento Segurto:</strong> Escolha entre Pix (aprovação imediata) ou Cartão de Crédito e finalize a compra.</li>
              <li><strong>Acesse seus ingressos:</strong> Após a aprovação, seus ingressos estarão disponíveis na aba <Link href="/meus-ingressos" className="text-[var(--brand-500)] hover:underline font-medium">Meus Ingressos</Link>.</li>
            </ol>
          </div>
        </section>

        {/* Formas de Pagamento */}
        <section id="formas-de-pagamento" className="scroll-mt-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[var(--brand-100)] dark:bg-[var(--brand-900)] p-3 rounded-xl">
              <CreditCard className="text-[var(--brand-600)] dark:text-[var(--brand-400)] h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Formas de Pagamento Seguras</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[var(--foreground)] text-lg mb-2">Pix</h3>
              <p className="text-[var(--muted-fg)] text-sm mb-4">Aprovação imediata. Escaneie o QR Code ou utilize o recurso Copia e Cola no aplicativo do seu banco.</p>
              <div className="bg-[var(--muted)] px-3 py-1.5 rounded text-xs font-mono inline-block text-[var(--muted-fg)]">
                Recomendado
              </div>
            </div>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-[var(--foreground)] text-lg mb-2">Cartão de Crédito</h3>
              <p className="text-[var(--muted-fg)] text-sm mb-4">Parcele suas compras de forma segura. Aceitamos as principais bandeiras do mercado.</p>
              <div className="flex items-center gap-2 text-xs font-semibold text-[var(--success)]">
                <ShieldCheck size={16} /> Compra Protegida
              </div>
            </div>
          </div>
          <p className="text-sm text-[var(--muted-fg)] mt-4 text-center">
            Todos os pagamentos são processados pela plataforma <a href="https://www.asaas.com" target="_blank" rel="noreferrer" className="text-[var(--brand-500)] hover:underline font-medium">Asaas</a>, garantindo total segurança e criptografia de ponta a ponta.
          </p>
        </section>

        {/* Política de Cancelamento e Edição */}
        <section id="politicas" className="scroll-mt-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-[var(--brand-100)] dark:bg-[var(--brand-900)] p-3 rounded-xl">
              <RefreshCw className="text-[var(--brand-600)] dark:text-[var(--brand-400)] h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-[var(--foreground)]">Políticas da Plataforma</h2>
          </div>
          <div className="space-y-6">
            
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <RefreshCw size={20} className="text-[var(--brand-500)]" />
                <h3 className="font-bold text-[var(--foreground)] text-lg">Cancelamento e Reembolso</h3>
              </div>
              <p className="text-[var(--muted-fg)] leading-relaxed">
                De acordo com as nossas políticas e o Código de Defesa do Consumidor:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-[var(--muted-fg)]">
                <li>Cancelamentos de pedidos pagos serão aceitos em até <strong>7 dias</strong> após a compra.</li>
                <li>A solicitação de cancelamento deve ser enviada até <strong>48 horas antes</strong> do início do evento.</li>
                <li>O estorno do valor será realizado através da mesma forma de pagamento utilizada (Pix ou estorno na fatura do Cartão).</li>
              </ul>
            </div>

            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-8 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Edit2 size={20} className="text-[var(--brand-500)]" />
                <h3 className="font-bold text-[var(--foreground)] text-lg">Edição de Participante (Titularidade)</h3>
              </div>
              <p className="text-[var(--muted-fg)] leading-relaxed">
                Caso você tenha comprado um ingresso para outra pessoa ou digitado errado, você pode editar o titular:
              </p>
              <ul className="list-disc list-inside mt-3 space-y-2 text-[var(--muted-fg)]">
                <li>Você poderá editar o Nome e o CPF do participante de um ingresso apenas <strong>uma única vez</strong>.</li>
                <li>Essa opção ficará disponível na aba <Link href="/meus-ingressos" className="text-[var(--brand-500)] hover:underline font-medium">Meus Ingressos</Link> até <strong>24 horas antes</strong> do início do evento.</li>
              </ul>
            </div>

          </div>
        </section>

      </div>

      <Footer />
    </main>
  );
}
