"use client";

import { useState } from "react";
import { Loader2, Check, Wallet } from "lucide-react";

interface ConfigFormProps {
  initialWalletId: string;
}

export function ConfigForm({ initialWalletId }: ConfigFormProps) {
  const [walletId, setWalletId] = useState(initialWalletId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const res = await fetch("/api/painel/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ asaasWalletId: walletId }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Erro ao salvar as configurações.");
      }

      setMessage({ type: "success", text: "Configurações salvas com sucesso!" });
    } catch (err) {
      const error = err as Error;
      setMessage({ type: "error", text: error.message });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="space-y-2">
        <label htmlFor="walletId" className="block text-sm font-medium text-foreground">
          Asaas Wallet ID (Chave da Carteira)
        </label>
        <div className="flex rounded-md shadow-sm">
          <div className="relative flex flex-grow items-stretch focus-within:z-10">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Wallet className="h-4 w-4 text-muted-fg" />
            </div>
            <input
              type="text"
              id="walletId"
              value={walletId}
              onChange={(e) => setWalletId(e.target.value)}
              className="block w-full rounded-md border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              placeholder="ex: wal_0a1b2c3d4e5f6g7h"
            />
          </div>
        </div>
        <p className="text-xs text-muted-fg">
          Você encontra seu Wallet ID na sua conta do Asaas em Minha Conta &gt; Integrações. Sem essa chave, as vendas não poderão ser processadas corretamente.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 text-sm rounded-md flex items-center gap-2 ${
            message.type === "success" ? "bg-success/15 text-success" : "bg-error/15 text-error"
          }`}
        >
          {message.type === "success" && <Check size={16} />}
          {message.text}
        </div>
      )}

      <div className="flex justify-end pt-4 border-t border-border">
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 px-5 py-2.5 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand/90 transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Salvando...
            </>
          ) : (
            "Salvar Configurações"
          )}
        </button>
      </div>
    </form>
  );
}
