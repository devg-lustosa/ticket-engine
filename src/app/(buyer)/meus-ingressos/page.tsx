import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { TicketCard } from "@/components/ticket-card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function MeusIngressosPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Busca os ingressos do usuário que não estão PENDING
  const tickets = await prisma.ticket.findMany({
    where: {
      user: { authId: user.id },
      status: { not: "PENDING" },
    },
    include: {
      batch: {
        include: { event: true },
      },
      user: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-dvh bg-[var(--background)] px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 animate-fade-in">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-medium text-[var(--muted-fg)] hover:text-[var(--foreground)] transition-colors">
            <ArrowLeft size={16} />
            Voltar para a loja
          </Link>
        </div>

        <div className="mb-10 text-center animate-fade-in">
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Meus Ingressos</h1>
          <p className="mt-2 text-[var(--muted-fg)]">
            Apresente o QR Code na portaria do evento.
          </p>
        </div>

        {tickets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] p-12 text-center text-[var(--muted-fg)]">
            Você ainda não possui ingressos confirmados.
          </div>
        ) : (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {tickets.map((ticket) => {
              const serializableTicket = {
                ...ticket,
                batch: {
                  ...ticket.batch,
                  price: ticket.batch.price.toNumber(),
                }
              };
              return (
                <div key={ticket.id} className="animate-fade-in">
                  <TicketCard ticket={serializableTicket as any} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
