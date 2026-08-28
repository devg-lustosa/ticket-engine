import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { siteConfig } from "@/config/site";
import { Calendar, MapPin, Ticket } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { createClient } from "@/lib/supabase/server";
import { UserNav } from "@/components/user-nav";

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
    <main className="min-h-dvh bg-[var(--background)]">
      {/* Header / Hero */}
      <header className="relative overflow-hidden bg-[var(--brand-600)] pb-16 text-white sm:pb-24">
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
          <span className="mb-4 flex items-center justify-center gap-2 text-3xl font-extrabold tracking-tight sm:text-5xl">
            <Ticket className="h-10 w-10 sm:h-12 sm:w-12" />
            {siteConfig.name}
          </span>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-white/80 sm:text-xl">
            A plataforma oficial para comprar seus ingressos com segurança, rapidez e sem taxas abusivas.
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-5xl px-4 py-12">
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
                  className="group flex flex-col overflow-hidden rounded-2xl border bg-[var(--card)] shadow-sm transition hover:shadow-md border-[var(--card-border)]"
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
    </main>
  );
}
