import Link from "next/link";
import { siteConfig } from "@/config/site";
import { CreditCard, QrCode, Mail, Phone, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-300 pt-16 pb-8 border-t border-slate-900 mt-20">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          
          {/* Brand & About */}
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">
              {siteConfig.name}
            </h3>
            <p className="text-sm text-slate-400 leading-relaxed max-w-xs">
              Sua plataforma definitiva para descobrir e comprar ingressos para os melhores eventos, shows e festas do Brasil.
            </p>
          </div>

          {/* Guias de Ajuda */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold tracking-wide uppercase text-sm">Guias de Ajuda</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/ajuda#como-comprar" className="hover:text-[var(--brand-400)] transition-colors flex items-center gap-1">
                  Como Comprar Ingressos
                </Link>
              </li>
              <li>
                <Link href="/ajuda#politicas" className="hover:text-[var(--brand-400)] transition-colors flex items-center gap-1">
                  Política de Cancelamento e Reembolso
                </Link>
              </li>
              <li>
                <Link href="/ajuda" className="hover:text-[var(--brand-400)] transition-colors flex items-center gap-1">
                  Dúvidas Frequentes (FAQ)
                </Link>
              </li>
              <li>
                <Link href="/ajuda#formas-de-pagamento" className="hover:text-[var(--brand-400)] transition-colors flex items-center gap-1">
                  Segurança na Compra <ExternalLink size={14} className="opacity-50" />
                </Link>
              </li>
            </ul>
          </div>

          {/* Formas de Pagamento */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold tracking-wide uppercase text-sm">Formas de Pagamento</h4>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors">
                <QrCode className="text-[var(--brand-500)] mb-2" size={24} />
                <span className="text-xs font-medium">Pix</span>
              </div>
              <div className="flex flex-col items-center justify-center bg-slate-900 border border-slate-800 rounded-lg p-3 hover:border-slate-700 transition-colors">
                <CreditCard className="text-[var(--brand-500)] mb-2" size={24} />
                <span className="text-xs font-medium text-center">Cartão de Crédito</span>
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3 leading-relaxed">
              Pagamentos processados com segurança máxima e criptografia de ponta a ponta pela Asaas.
            </p>
          </div>

          {/* Atendimento */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold tracking-wide uppercase text-sm">Atendimento</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-start gap-3">
                <Mail className="mt-0.5 text-[var(--brand-500)]" size={18} />
                <div>
                  <p className="font-medium text-white">E-mail</p>
                  <a href="mailto:suporte@ticketengine.com.br" className="text-slate-400 hover:text-white transition-colors">suporte@ticketengine.com.br</a>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <Phone className="mt-0.5 text-[var(--brand-500)]" size={18} />
                <div>
                  <p className="font-medium text-white">WhatsApp</p>
                  <a href="#" className="text-slate-400 hover:text-white transition-colors">(11) 99999-9999</a>
                </div>
              </li>
            </ul>
          </div>
        </div>

        {/* Linha Divisória */}
        <div className="border-t border-slate-800 pt-8 mt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-xs text-slate-500 text-center md:text-left">
            &copy; {new Date().getFullYear()} {siteConfig.name}. Todos os direitos reservados. <br className="md:hidden" />
            CNPJ: 00.000.000/0000-00
          </p>
          <div className="flex gap-4 text-xs text-slate-500">
            <Link href="#" className="hover:text-white transition-colors">Termos de Uso</Link>
            <Link href="#" className="hover:text-white transition-colors">Política de Privacidade</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
