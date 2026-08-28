"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";

export function CreateCouponForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const data = {
      code: formData.get("code"),
      discountType: formData.get("discountType"),
      discountValue: formData.get("discountValue"),
      maxUses: formData.get("maxUses") || null,
      validUntil: formData.get("validUntil") || null,
    };

    try {
      const res = await fetch(`/api/painel/eventos/${eventId}/cupons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Erro ao criar cupom");

      e.currentTarget.reset();
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Código do Cupom
        </label>
        <input
          type="text"
          name="code"
          required
          placeholder="Ex: VIP20"
          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none uppercase font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Tipo
          </label>
          <select
            name="discountType"
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
          >
            <option value="PERCENTAGE">Porcentagem (%)</option>
            <option value="FIXED">Valor Fixo (R$)</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1">
            Valor
          </label>
          <input
            type="number"
            name="discountValue"
            step="0.01"
            min="0"
            required
            placeholder="Ex: 20"
            className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Limite de Usos <span className="text-gray-500 font-normal">(Opcional)</span>
        </label>
        <input
          type="number"
          name="maxUses"
          min="1"
          placeholder="Ex: 50"
          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">
          Válido até <span className="text-gray-500 font-normal">(Opcional)</span>
        </label>
        <input
          type="datetime-local"
          name="validUntil"
          className="w-full bg-gray-950 border border-gray-800 rounded-lg px-4 py-2.5 text-gray-300 focus:text-white focus:border-brand focus:ring-1 focus:ring-brand outline-none [color-scheme:dark]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white font-medium rounded-lg px-4 py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        Criar Cupom
      </button>
    </form>
  );
}
