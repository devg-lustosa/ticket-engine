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
    const form = e.currentTarget;
    setLoading(true);
    setError("");

    const formData = new FormData(form);
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

      form.reset();
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
        <div className="p-3 bg-red-500/10 border border-red-500/20 text-error text-sm rounded-lg">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="coupon-admin-code" className="block text-sm font-medium text-foreground mb-1">
          Código do Cupom
        </label>
        <input
          type="text"
          name="code"
          id="coupon-admin-code"
          required
          placeholder="Ex: VIP20"
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none uppercase font-mono"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="coupon-admin-type" className="block text-sm font-medium text-foreground mb-1">
            Tipo
          </label>
          <select
            name="discountType"
            id="coupon-admin-type"
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
          >
            <option value="PERCENTAGE">Porcentagem (%)</option>
            <option value="FIXED">Valor Fixo (R$)</option>
          </select>
        </div>
        <div>
          <label htmlFor="coupon-admin-value" className="block text-sm font-medium text-foreground mb-1">
            Valor
          </label>
          <input
            type="number"
            name="discountValue"
            id="coupon-admin-value"
            step="0.01"
            min="0"
            required
            placeholder="Ex: 20"
            className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
          />
        </div>
      </div>

      <div>
        <label htmlFor="coupon-admin-limit" className="block text-sm font-medium text-foreground mb-1">
          Limite de Usos <span className="text-muted-fg font-normal">(Opcional)</span>
        </label>
        <input
          type="number"
          name="maxUses"
          id="coupon-admin-limit"
          min="1"
          placeholder="Ex: 50"
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none"
        />
      </div>

      <div>
        <label htmlFor="coupon-admin-expiry" className="block text-sm font-medium text-foreground mb-1">
          Válido até <span className="text-muted-fg font-normal">(Opcional)</span>
        </label>
        <input
          type="datetime-local"
          name="validUntil"
          id="coupon-admin-expiry"
          className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-foreground focus:text-foreground focus:border-brand focus:ring-1 focus:ring-brand outline-none [color-scheme:light_dark]"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-brand text-white font-medium rounded-lg px-4 py-2.5 hover:bg-brand/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2" data-tooltip="Criar Cupom"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />}
        Criar Cupom
      </button>
    </form>
  );
}
