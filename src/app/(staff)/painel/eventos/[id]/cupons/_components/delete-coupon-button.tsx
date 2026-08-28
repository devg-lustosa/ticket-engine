"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, Power, PowerOff } from "lucide-react";

export function DeleteCouponButton({ couponId, eventId }: { couponId: string; eventId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleDelete = async () => {
    if (!confirm("Tem certeza que deseja excluir este cupom?")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/painel/eventos/${eventId}/cupons/${couponId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao excluir cupom");
      router.refresh();
    } catch (error) {
      alert("Erro ao excluir cupom.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/painel/eventos/${eventId}/cupons/${couponId}`, {
        method: "PATCH",
      });
      if (!res.ok) throw new Error("Erro ao alterar cupom");
      router.refresh();
    } catch (error) {
      alert("Erro ao alterar status do cupom.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={handleToggle}
        disabled={loading}
        className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50"
        title="Ativar/Desativar cupom"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
        title="Excluir cupom"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>
    </div>
  );
}
