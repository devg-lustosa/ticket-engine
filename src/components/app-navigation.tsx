"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Home, Search, Ticket, UserRound, X } from "lucide-react";
import { getCurrentUser } from "@/services/user.service";
import { homeForRole, navigationForRole } from "@/lib/navigation";
import { siteConfig } from "@/config/site";
import { ThemeToggle } from "@/components/theme-toggle";

type User = Awaited<ReturnType<typeof getCurrentUser>>;
const authPaths = ["/login", "/cadastro", "/recuperar-senha", "/atualizar-senha", "/completar-perfil"];

export function AppNavigation() {
  const pathname = usePathname();
  const [user, setUser] = useState<User>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const root = useRef<HTMLElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const searchButton = useRef<HTMLButtonElement>(null);
  const lastTrigger = useRef<HTMLButtonElement | null>(null);
  const hidden = authPaths.includes(pathname);
  useEffect(() => {
    const element = root.current;
    if (!element || hidden) return;
    const observer = new ResizeObserver(() => document.documentElement.style.setProperty("--app-nav-height", (element.getBoundingClientRect().height + 24) + "px"));
    observer.observe(element);
    return () => observer.disconnect();
  }, [hidden]);
  useEffect(() => {
    let active = true;
    getCurrentUser().then(value => { if (active) { setUser(value); setLoaded(true); } }).catch(() => { if (active) setLoaded(true); });
    return () => { active = false; };
  }, [pathname]);
  useEffect(() => {
    function outside(event: PointerEvent) { if (!root.current?.contains(event.target as Node)) setOpen(null); }
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape" && open) { setOpen(null); lastTrigger.current?.focus(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k" && !hidden) {
        event.preventDefault(); lastTrigger.current = searchButton.current; setOpen("Busca"); requestAnimationFrame(() => searchInput.current?.focus());
      }
    }
    document.addEventListener("pointerdown", outside); document.addEventListener("keydown", keyboard);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", keyboard); };
  }, [hidden, open]);
  if (hidden) return null;
  const groups = navigationForRole(user?.role ?? null);
  const results = groups.flatMap(group => group.links).filter(link => (link.label + " " + link.description).toLocaleLowerCase("pt-BR").includes(query.toLocaleLowerCase("pt-BR")));
  const close = () => setOpen(null);
  const toggle = (label: string) => { lastTrigger.current = document.activeElement as HTMLButtonElement; setOpen(open === label ? null : label); };
  return <header ref={root} className="app-navigation">
    <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <div className="app-navigation-top">
      <Link href="/" onClick={close} className="flex shrink-0 items-center gap-2 whitespace-nowrap font-semibold" aria-label="Voltar ao início do seu perfil" data-tooltip="Voltar ao início do seu perfil"><Ticket size={23} aria-hidden="true" /><span>{siteConfig.name}</span></Link>
      <span className="hidden text-xs text-muted-fg md:block">{!loaded ? "Carregando perfil…" : user?.role === "ORGANIZER" ? "Área do organizador" : user?.role === "STAFF" ? "Operação da portaria" : "Encontre seu próximo evento"}</span>
      <div className="flex items-center gap-1 sm:gap-2">
        <button ref={searchButton} className="nav-control" aria-label="Buscar páginas e ações. Atalho Control K" aria-expanded={open === "Busca"} aria-controls="nav-search" onClick={() => { toggle("Busca"); requestAnimationFrame(() => searchInput.current?.focus()); }} data-tooltip="Buscar páginas e ações. Atalho Control K"><Search size={18} aria-hidden="true" /><span className="hidden sm:inline">Buscar</span></button>
        <ThemeToggle />
        {loaded && (user ? <div className="relative">
          <button className="nav-control max-w-40" aria-expanded={open === "Conta"} aria-controls="nav-account" onClick={() => toggle("Conta")} aria-label={"Abrir opções da conta de " + (user.nickname || user.name)} data-tooltip={"Abrir opções da conta de " + (user.nickname || user.name)}><UserRound size={18} className="sm:hidden" aria-hidden="true" /><span className="hidden truncate sm:inline">{user.nickname || user.name}</span><ChevronDown size={15} aria-hidden="true" /></button>
          {open === "Conta" && <div id="nav-account" className="nav-popover right-0"><Link href="/minha-conta" onClick={close}>Minha conta</Link><Link href="/perfil" onClick={close}>Perfil e privacidade</Link><form action="/api/auth/signout" method="POST"><button className="w-full text-left text-error" type="submit">Sair da conta</button></form></div>}
        </div> : <Link href="/login" className="nav-control bg-brand text-white">Entrar</Link>)}
      </div>
    </div>
    <nav aria-label="Navegação principal" className="app-navigation-links">
      <Link href={homeForRole(user?.role ?? null)} onClick={close} aria-current={pathname === homeForRole(user?.role ?? null) ? "page" : undefined} className="nav-control" data-tooltip="Início"><Home size={17} aria-hidden="true" />Início</Link>
      {groups.map(group => <div key={group.label} className="relative">
        <button className="nav-control" aria-expanded={open === group.label} aria-controls={"nav-" + group.label} onClick={() => toggle(group.label)} data-tooltip={"Abrir menu " + group.label}>{group.label}<ChevronDown size={14} aria-hidden="true" /></button>
        {open === group.label && <div id={"nav-" + group.label} className="nav-popover">{group.links.map(link => <Link key={link.href} href={link.href} onClick={close} aria-current={pathname === link.href ? "page" : undefined}><span className="block font-medium">{link.label}</span><span className="block text-xs text-muted-fg">{link.description}</span></Link>)}</div>}
      </div>)}
    </nav>
    {open === "Busca" && <div id="nav-search" className="nav-search-panel">
      <div className="flex gap-2"><label className="sr-only" htmlFor="nav-query">Buscar páginas e ações disponíveis</label><input ref={searchInput} id="nav-query" className="ui-input" placeholder="Buscar páginas e ações…" value={query} onChange={event => setQuery(event.target.value)} /><button className="nav-control" aria-label="Fechar busca" onClick={close} data-tooltip="Fechar busca"><X size={19} /></button></div>
      <ul aria-label="Resultados da busca" className="mt-2 max-h-72 overflow-auto">{results.map((link, index) => <li key={link.href + index}><Link href={link.href} className="block rounded-lg p-3 hover:bg-muted" onClick={close}>{link.label}<span className="block text-xs text-muted-fg">{link.description}</span></Link></li>)}</ul>
      {!results.length && <p className="p-3 text-sm text-muted-fg" role="status">Nenhuma página encontrada. Tente evento, ingresso ou ajuda.</p>}
    </div>}
  </header>;
}
