import { ArrowLeft, FileText, Shield } from "lucide-react";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata = {
  title: "Termos de Uso e Política de Privacidade",
  description: "Leia nossos termos de uso e políticas de cancelamento.",
};

export default function TermosPage() {
  return (
    <main className="min-h-dvh bg-[var(--background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--border)] bg-[var(--card)] sticky top-0 z-10">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-[var(--muted-fg)] hover:text-[var(--foreground)] transition-colors"
          >
            <ArrowLeft size={16} />
            Voltar para a Home
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-12 flex-1 w-full">
        <div className="mb-8 text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[var(--brand-100)] dark:bg-[var(--brand-900)] text-[var(--brand-600)] dark:text-[var(--brand-400)] mb-4">
            <FileText size={32} />
          </div>ID). O Asaas é feito sob medida para
          <h1 className="text-3xl font-extrabold text-[var(--foreground)] tracking-tight">
            Termos de Uso e Privacidade
          </h1>
          <p className="mt-2 text-[var(--muted-fg)]">
            Última atualização: {new Date().toLocaleDateString("pt-BR")}
          </p>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 md:p-10 shadow-sm space-y-8 animate-fade-in text-[var(--muted-fg)] leading-relaxed">

          <section>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3 flex items-center gap-2">
              <Shield size={20} className="text-[var(--brand-500)]" />
              1. Aceitação dos Termos
            </h2>
            <p>
              Ao utilizar a plataforma <strong>{siteConfig.name}</strong> e adquirir ingressos, você concorda expressamente com os termos descritos neste documento. Nossa plataforma atua exclusivamente como intermediária na venda de ingressos, fornecendo a tecnologia de processamento e emissão.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
              2. Política de Cancelamento e Reembolso
            </h2>
            <p className="mb-3">
              Em conformidade com o Artigo 49 do Código de Defesa do Consumidor (CDC), você tem o direito de solicitar o cancelamento e reembolso da sua compra sob as seguintes condições:
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>O pedido de cancelamento deve ser feito em até <strong>7 dias corridos</strong> após a data da compra.</li>
              <li>A solicitação deve ser feita com no máximo <strong>48 horas de antecedência</strong> do horário de início do evento.</li>
              <li>Ingressos comprados no dia do evento ou véspera não são reembolsáveis.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
              3. Responsabilidade do Organizador
            </h2>
            <p>
              O <strong>{siteConfig.name}</strong> não organiza os eventos. Todas as responsabilidades relativas à produção, estrutura, horário, atrações, adiamento, cancelamento do evento em si, bem como eventuais devoluções por cancelamento do evento, são de inteira e exclusiva responsabilidade da produtora (Organizador do Evento).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
              4. Transferência de Titularidade
            </h2>
            <p>
              A troca de titularidade do ingresso, quando permitida pelo organizador, só poderá ser realizada uma única vez. A solicitação deve ser feita pelo usuário titular diretamente no painel de controle da plataforma até 24 horas antes do início do evento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
              5. Privacidade e Proteção de Dados (LGPD)
            </h2>
            <p className="mb-3">
              Levamos sua privacidade a sério. Para processar sua compra e emitir seu ingresso de forma segura, coletamos dados obrigatórios como Nome Completo, CPF e E-mail.
            </p>
            <ul className="list-disc list-inside space-y-2 ml-2">
              <li>Seus dados são armazenados de forma criptografada em nosso banco de dados.</li>
              <li>Não armazenamos os dados do seu Cartão de Crédito. Todo o processamento financeiro é feito de forma segura e tokenizada através do gateway de pagamento parceiro (Asaas).</li>
              <li>O Organizador do evento terá acesso apenas ao seu Nome e CPF para validação de entrada na portaria.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">
              6. Contestações (Chargeback)
            </h2>
            <p>
              As compras realizadas estão sujeitas a análise de risco e fraude. Ao aceitar estes termos, você reconhece a transação e autoriza a cobrança. A tentativa de fraude através de contestação indevida de cartão de crédito (chargeback) após a utilização do serviço constituirá crime de estelionato e os dados registrados (IP, horário e logs de acesso) serão encaminhados às autoridades competentes.
            </p>
          </section>

        </div>
      </div>
    </main>
  );
}
