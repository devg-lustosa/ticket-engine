import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { CheckoutFlow } from "./_components/checkout-flow";
import { siteConfig } from "@/config/site";
import Link from "next/link";
import { Ticket } from "lucide-react";

interface CheckoutPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  
  // Extrai IDs dos lotes e quantidades da querystring
  const batchEntries = Object.entries(params)
    .filter(([key]) => key.length === 36) // simples filtro por formato UUID
    .map(([id, qty]) => ({
      id,
      qty: parseInt(Array.isArray(qty) ? qty[0] : (qty || "0"), 10)
    }))
    .filter(e => e.qty > 0 && !isNaN(e.qty));

  if (batchEntries.length === 0) {
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Nenhum ingresso selecionado</h1>
          <Link href="/" className="text-[var(--brand-500)] hover:underline">Voltar para os eventos</Link>
        </div>
      </main>
    );
  }

  // Busca os lotes no banco
  const batchIds = batchEntries.map(e => e.id);
  const batches = await prisma.batch.findMany({
    where: { id: { in: batchIds } },
    include: { event: true },
  });

  if (batches.length === 0) {
    notFound();
  }

  // Auth e validação de perfil
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // Redireciona para login se não estiver logado, com a URL de retorno
    return (
      <main className="min-h-dvh flex items-center justify-center bg-[var(--background)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Faça login para continuar</h1>
          <Link href="/login" className="text-[var(--brand-500)] hover:underline">Ir para Login</Link>
        </div>
      </main>
    );
  }

  let dbUser = await prisma.user.findUnique({ where: { authId: user.id } });
  
  // Monta a estrutura para o client component
  const selectedBatches = batches.map(b => {
    const qty = batchEntries.find(e => e.id === b.id)?.qty || 0;
    return {
      id: b.id,
      name: b.name,
      price: Number(b.price),
      event: { id: b.event.id, title: b.event.title, venue: b.event.venue },
      qty
    };
  });

  const totalValue = selectedBatches.reduce((acc, b) => acc + (b.price * b.qty), 0);
  const totalQty = selectedBatches.reduce((acc, b) => acc + b.qty, 0);

  return (
    <main className="min-h-dvh bg-[var(--background)] flex flex-col">
      {/* Header simples */}
      <div className="bg-[var(--card)] border-b border-[var(--border)] py-4">
        <div className="mx-auto max-w-4xl px-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-[var(--foreground)] hover:opacity-90">
            <Ticket className="h-6 w-6 text-[var(--brand-500)]" />
            <span>{siteConfig.name}</span>
          </Link>
        </div>
      </div>

      <div className="flex-1 mx-auto max-w-4xl w-full px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]">Finalizar Compra</h1>
          <p className="text-[var(--muted-fg)]">Você está comprando {totalQty} ingresso(s)</p>
        </div>

        <CheckoutFlow 
          batches={selectedBatches} 
          totalValue={totalValue}
          buyer={{ name: dbUser?.name || user.user_metadata?.name || "", cpf: dbUser?.cpf || user.user_metadata?.cpf || "" }}
        />
      </div>
    </main>
  );
}
