"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, ShoppingBag } from "lucide-react";

interface Batch {
  id: string;
  name: string;
  description: string | null;
  price: { toNumber: () => number } | number | string;
  totalQty: number;
  soldQty: number;
  startAt: Date | string | null;
  endAt: Date | string | null;
}

interface TicketsBoxProps {
  batches: Batch[];
}

function toNum(price: Batch["price"]): number {
  if (typeof price === "object" && price !== null && "toNumber" in price) {
    return price.toNumber();
  }
  return Number(price);
}

export function TicketsBox({ batches }: TicketsBoxProps) {
  const router = useRouter();
  const [quantities, setQuantities] = useState<Record<string, number>>(
    Object.fromEntries(batches.map((b) => [b.id, 0]))
  );

  const now = new Date();
  
  // Disponíveis para compra: não esgotados, e dentro do período (se definido)
  const availableBatches = batches.filter((b) => {
    if (b.soldQty >= b.totalQty) return false;
    if (b.startAt && now < new Date(b.startAt)) return false;
    if (b.endAt && now > new Date(b.endAt)) return false;
    return true;
  });

  function change(id: string, delta: number) {
    const batch = batches.find((b) => b.id === id)!;
    const max = batch.totalQty - batch.soldQty;
    setQuantities((prev) => ({
      ...prev,
      [id]: Math.max(0, Math.min(max, (prev[id] ?? 0) + delta)),
    }));
  }

  const selected = batches.filter((b) => (quantities[b.id] ?? 0) > 0);
  const totalItems = selected.reduce((s, b) => s + quantities[b.id], 0);
  const totalPrice = selected.reduce(
    (s, b) => s + quantities[b.id] * toNum(b.price),
    0
  );

  function handleBuy() {
    if (selected.length === 0) return;
    // Monta query string com batchId=qty
    const params = selected
      .map((b) => `${b.id}=${quantities[b.id]}`)
      .join("&");
    router.push(`/checkout?${params}`);
  }

  return (
    <div className="sticky top-6 bg-[var(--card)] rounded-2xl shadow-xl border border-[var(--border)] overflow-hidden">
      {/* Header */}
      <div className="bg-[var(--brand-500)] p-4 text-white text-center">
        <h3 className="font-bold text-lg">Ingressos</h3>
      </div>

      {/* Batch list */}
      <div className="divide-y divide-[var(--border)]">
        {batches.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--muted-fg)]">
            Nenhum ingresso disponível no momento.
          </div>
        ) : (
          batches.map((batch) => {
            const available = batch.totalQty - batch.soldQty;
            const isSoldOut = available <= 0;
            const isBeforeStart = batch.startAt ? now < new Date(batch.startAt) : false;
            const isAfterEnd = batch.endAt ? now > new Date(batch.endAt) : false;
            const canBuy = !isSoldOut && !isBeforeStart && !isAfterEnd;
            const qty = quantities[batch.id] ?? 0;

            return (
              <div key={batch.id} className={`p-5 ${!canBuy ? 'opacity-70' : ''}`}>
                <div className="flex items-center justify-between gap-3">
                  {/* Info */}
                  <div className="min-w-0">
                    <h4 className="font-bold text-[var(--foreground)] truncate">
                      {batch.name}
                    </h4>
                    {batch.description && (
                      <p className="text-xs text-[var(--muted-fg)] mt-0.5 truncate">
                        {batch.description}
                      </p>
                    )}
                    <p className="text-[var(--brand-500)] font-extrabold text-lg mt-1">
                      R$ {toNum(batch.price).toFixed(2).replace(".", ",")}
                    </p>
                    {isAfterEnd ? (
                      <span className="text-xs text-red-500 font-medium">Encerrado</span>
                    ) : isSoldOut ? (
                      <span className="text-xs text-red-500 font-medium">Esgotado</span>
                    ) : isBeforeStart ? (
                      <span className="text-xs text-[var(--brand-500)] font-medium">
                        Disponível em {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(batch.startAt!))}
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--muted-fg)]">
                        {available} disponíveis
                      </span>
                    )}
                  </div>

                  {/* Quantity selector or Status */}
                  {canBuy ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => change(batch.id, -1)}
                        disabled={qty === 0}
                        className="w-8 h-8 rounded-full border border-[var(--border)] flex items-center justify-center text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="w-6 text-center font-bold text-[var(--foreground)] tabular-nums">
                        {qty}
                      </span>
                      <button
                        onClick={() => change(batch.id, +1)}
                        disabled={qty >= available}
                        className="w-8 h-8 rounded-full border border-[var(--brand-500)] bg-[var(--brand-500)] flex items-center justify-center text-white hover:bg-[var(--brand-600)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="shrink-0 text-sm font-semibold text-[var(--muted-fg)]">
                      {isBeforeStart ? "Em breve" : isAfterEnd ? "Encerrado" : "Esgotado"}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: total + buy button */}
      {availableBatches.length > 0 && (
        <div className="p-4 border-t border-[var(--border)] space-y-3">
          {/* Resumo */}
          {totalItems > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-[var(--muted-fg)]">
                {totalItems} ingresso{totalItems !== 1 ? "s" : ""}
              </span>
              <span className="font-bold text-[var(--foreground)]">
                R$ {totalPrice.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}

          <button
            onClick={handleBuy}
            disabled={totalItems === 0}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-[var(--brand-500)] px-4 py-3 text-sm font-bold text-white transition hover:bg-[var(--brand-600)] active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            <ShoppingBag size={16} />
            {totalItems === 0 ? "Selecione um ingresso" : "Comprar"}
          </button>
        </div>
      )}

      {/* Security note */}
      <div className="bg-[var(--muted)] p-3 text-xs text-[var(--muted-fg)] text-center border-t border-[var(--border)]">
        Compras processadas via <strong>Asaas</strong> com Pix. Segurança 100% garantida.
      </div>
    </div>
  );
}
