import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/user-nav";
import { Footer } from "@/components/footer";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function HomePage() {
  // Busca os eventos publicados
  const events = await prisma.event.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { date: "asc" },
  });

  // Busca o usuário logado (se houver)
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
    <main className="min-h-dvh bg-gray-50 dark:bg-[var(--background)] flex flex-col">
      {/* Header / Hero */}
      <header className="relative overflow-hidden pb-20 sm:pb-32 shrink-0 bg-slate-950">
        {/* Background Image & Overlays */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src="https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=2070&auto=format&fit=crop" 
            alt="Festa" 
            className="w-full h-full object-cover opacity-50"
          />
          <div className="absolute inset-0 bg-slate-950/60" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--brand-600)]/30 to-purple-600/30 mix-blend-overlay" />
        </div>
        
        {/* Top Navbar */}
        <div className="relative z-50 mx-auto flex max-w-5xl items-center justify-between px-4 py-6 mb-4 sm:mb-8">
          <Link href="/" className="flex items-center gap-2 font-bold hover:opacity-90 transition-opacity">
            <div className="bg-gradient-to-br from-[var(--brand-500)] to-purple-600 p-2 rounded-xl shadow-lg shadow-[var(--brand-500)]/20">
              <Ticket className="h-5 w-5 text-white" />
            </div>
            <span className="hidden sm:inline-block text-xl tracking-tight text-white">{siteConfig.name}</span>
          </Link>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <UserNav user={dbUser} role={dbUser?.role} />
          </div>
        </div>

        <div className="relative z-20 mx-auto max-w-5xl px-4 text-center mt-6 sm:mt-12 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md text-xs font-medium text-white mb-6">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-400)] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-500)]"></span>
            </span>
            Os melhores eventos estão aqui
          </div>
          
          <h1 className="mb-6 text-4xl font-black tracking-tighter sm:text-6xl md:text-7xl flex flex-col items-center justify-center">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-white to-white/80 drop-shadow-sm">
              Viva momentos
            </span>
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-[var(--brand-400)] to-purple-400 drop-shadow-md">
              inesquecíveis
            </span>
          </h1>
          
          <p className="mx-auto mt-4 max-w-2xl text-base text-slate-300 sm:text-xl font-medium leading-relaxed">
            A plataforma definitiva para descobrir e comprar ingressos para os melhores shows e festas com segurança e sem taxas abusivas.
          </p>
          
        </div>
        
        {/* Glow effects */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--brand-500)]/20 blur-[120px] rounded-full pointer-events-none" />
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 py-12 flex-1 w-full">
        <h2 className="mb-8 text-2xl font-bold text-[var(--foreground)]">
          Eventos em Destaque
        </h2>

        {events.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-fg)]">
            Nenhum evento disponível no momento.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => {
              const eventDate = format(new Date(event.date), "dd 'de' MMMM, 'às' HH:mm", { locale: ptBR });

              return (
                <div
                  key={event.id}
                  className="group flex flex-col overflow-hidden rounded-2xl bg-[var(--card)] shadow-xl shadow-black/5 hover:shadow-2xl hover:shadow-[var(--brand-500)]/10 hover:-translate-y-1 border border-[var(--card-border)] transition-all duration-300"
                >
                  <div className="aspect-video bg-[var(--muted)] p-6 flex flex-col justify-end relative overflow-hidden">
                    {event.coverImage ? (
                      <img 
                        src={event.coverImage} 
                        alt={event.title}
                        className="absolute inset-0 h-full w-full object-cover z-0"
                      />
                    ) : null}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent z-10" />
                    <div className="relative z-20 text-white">
                      <h3 className="text-xl font-bold drop-shadow-md">{event.title}</h3>
                    </div>
                  </div>

                  <div className="flex flex-1 flex-col p-5">
                    <div className="mb-4 space-y-2 text-sm text-[var(--muted-fg)]">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 shrink-0" />
                        <span>{eventDate}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        <span className="truncate">{event.venue}</span>
                      </div>
                    </div>

                    <div className="mt-auto border-t border-[var(--border)] pt-4">
                      <Link
                        href={`/evento/${event.slug}`}
                        className="
                          block w-full rounded-lg bg-[var(--brand-500)] px-4 py-2.5 text-center
                          text-sm font-semibold text-white transition hover:bg-[var(--brand-600)]
                          active:scale-[0.98]
                        "
                      >
                        Ver Detalhes
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <Footer />
    </main>
  );
}
