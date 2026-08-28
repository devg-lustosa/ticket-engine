import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Mail, Phone, ExternalLink } from "lucide-react";

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
            <div className="flex items-center gap-1.5 mt-2 overflow-hidden">
              {/* Visa */}
              <div className="flex h-7 w-12 items-center justify-center rounded" style={{ backgroundColor: "#1434CB" }}>
                <svg viewBox="0 0 24 24" className="h-4 w-auto" style={{ fill: "#FFFFFF" }} xmlns="http://www.w3.org/2000/svg">
                  <path d="M9.112 8.262L5.97 15.758H3.92L2.374 9.775c-.094-.368-.175-.503-.461-.658C1.447 8.864.677 8.627 0 8.479l.046-.217h3.3a.904.904 0 01.894.764l.817 4.338 2.018-5.102zm8.033 5.049c.008-1.979-2.736-2.088-2.717-2.972.006-.269.262-.555.822-.628a3.66 3.66 0 011.913.336l.34-1.59a5.207 5.207 0 00-1.814-.333c-1.917 0-3.266 1.02-3.278 2.479-.012 1.079.963 1.68 1.698 2.04.756.367 1.01.603 1.006.931-.005.504-.602.725-1.16.734-.975.015-1.54-.263-1.992-.473l-.351 1.642c.453.208 1.289.39 2.156.398 2.037 0 3.37-1.006 3.377-2.564m5.061 2.447H24l-1.565-7.496h-1.656a.883.883 0 00-.826.55l-2.909 6.946h2.036l.405-1.12h2.488zm-2.163-2.656l1.02-2.815.588 2.815zm-8.16-4.84l-1.603 7.496H8.34l1.605-7.496z"/>
                </svg>
              </div>
              
              {/* Mastercard */}
              <div className="flex h-7 w-12 items-center justify-center rounded" style={{ backgroundColor: "#1C1C1F" }}>
                <svg viewBox="0 0 36 24" className="h-5 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="7.5" fill="#EB001B" />
                  <circle cx="24" cy="12" r="7.5" fill="#F79E1B" />
                  <path d="M18 17.85A7.476 7.476 0 0 0 21.5 12 7.476 7.476 0 0 0 18 6.15a7.476 7.476 0 0 0-3.5 5.85 7.476 7.476 0 0 0 3.5 5.85z" fill="#FF5F00" />
                </svg>
              </div>

              {/* Elo */}
              <div className="flex h-7 w-12 items-center justify-center rounded" style={{ backgroundColor: "#000000" }}>
                <svg viewBox="0 0 40 40" className="h-6 w-auto" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="20" cy="20" r="16" fill="#00A4E0" />
                  <path d="M12 18h8v2h-8zM12 22h8v2h-8zM24 16a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM24 22a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm0 2a1 1 0 1 1 0-2 1 1 0 0 1 0 2z" fill="#FFFFFF" />
                  <text x="50%" y="54%" dominantBaseline="middle" textAnchor="middle" fill="#FFFFFF" fontSize="14" fontWeight="bold" fontStyle="italic" letterSpacing="-1">elo</text>
                </svg>
              </div>

              {/* Amex */}
              <div className="flex h-7 w-12 items-center justify-center rounded" style={{ backgroundColor: "#006FCF" }}>
                <span className="text-[10px] font-extrabold text-white tracking-wider" style={{ fontFamily: "Arial, sans-serif" }}>AMEX</span>
              </div>

              {/* Pix */}
              <div className="flex h-7 items-center gap-1.5 px-2 rounded border" style={{ backgroundColor: "rgba(50,188,173,0.1)", borderColor: "rgba(50,188,173,0.3)" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4" style={{ fill: "#32bcad" }} xmlns="http://www.w3.org/2000/svg">
                  <path d="M5.283 18.36a3.505 3.505 0 0 0 2.493-1.032l3.6-3.6a.684.684 0 0 1 .946 0l3.613 3.613a3.504 3.504 0 0 0 2.493 1.032h.71l-4.56 4.56a3.647 3.647 0 0 1-5.156 0L4.85 18.36ZM18.428 5.627a3.505 3.505 0 0 0-2.493 1.032l-3.613 3.614a.67.67 0 0 1-.946 0l-3.6-3.6A3.505 3.505 0 0 0 5.283 5.64h-.434l4.573-4.572a3.646 3.646 0 0 1 5.156 0l4.559 4.559ZM1.068 9.422 3.79 6.699h1.492a2.483 2.483 0 0 1 1.744.722l3.6 3.6a1.73 1.73 0 0 0 2.443 0l3.614-3.613a2.482 2.482 0 0 1 1.744-.723h1.767l2.737 2.737a3.646 3.646 0 0 1 0 5.156l-2.736 2.736h-1.768a2.482 2.482 0 0 1-1.744-.722l-3.613-3.613a1.77 1.77 0 0 0-2.444 0l-3.6 3.6a2.483 2.483 0 0 1-1.744.722H3.791l-2.723-2.723a3.646 3.646 0 0 1 0-5.156"/>
                </svg>
                <span className="text-[13px] font-bold" style={{ color: "#32bcad" }}>Pix</span>
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
