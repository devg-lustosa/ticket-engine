import Link from "next/link";
import { siteConfig } from "@/config/site";

export function Footer() {
  return <footer className="mt-12 border-t border-border bg-muted px-4 py-8 text-foreground">
    <div className="mx-auto flex max-w-6xl flex-wrap justify-between gap-6">
      <div><p className="font-semibold">{siteConfig.name}</p><p className="mt-1 text-sm text-muted-fg">Programação, ingressos e acesso ao evento.</p></div>
      <nav aria-label="Informações e ajuda" className="flex flex-wrap gap-4 text-sm"><Link href="/ajuda#comprador" className="underline">Como comprar</Link><Link href="/ajuda#reembolso" className="underline">Transferência e reembolso</Link><Link href="/ajuda#acessibilidade" className="underline">Acessibilidade</Link><Link href="/termos" className="underline">Termos de uso</Link></nav>
      <p className="text-xs text-muted-fg">Pagamentos processados pelo Asaas.</p>
    </div>
  </footer>;
}
