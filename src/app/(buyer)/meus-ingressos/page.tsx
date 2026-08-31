import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TicketRow } from "@/components/ticket-row";
import Link from "next/link";
import { ArrowLeft, Ticket } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export default async function MeusIngressosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const tickets = await prisma.ticket.findMany({
    where: {
      user: { authId: user.id },
      status: { not: "PENDING" },
    },
    include: {
      batch: { include: { event: true } },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-dvh bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-muted-fg hover:text-foreground transition-colors"
          >
            <ArrowLeft size={15} />
            Voltar à loja
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* Conteúdo */}
      <div className="max-w-2xl mx-auto w-full px-4 py-8 flex-1">
        {/* Título */}
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-2 mb-1">
            <Ticket size={18} className="text-brand" />
            <h1 className="text-xl font-bold text-foreground">Meus Ingressos</h1>
          </div>
          <p className="text-sm text-muted-fg">
            Toque em um ingresso para ver o QR Code.
          </p>
        </div>

        {/* Lista */}
        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-12 text-center text-muted-fg animate-fade-in">
            <Ticket size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium text-foreground text-sm">Nenhum ingresso encontrado</p>
            <p className="text-xs mt-1">Seus ingressos confirmados aparecerão aqui.</p>
          </div>
        ) : (
          <div className="space-y-2 animate-fade-in">
            {tickets.map((ticket) => {
              const serializableTicket = {
                ...ticket,
                batch: {
                  ...ticket.batch,
                  price: ticket.batch.price.toNumber(),
                },
              };
              return (
                <TicketRow key={ticket.id} ticket={serializableTicket as any} />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
