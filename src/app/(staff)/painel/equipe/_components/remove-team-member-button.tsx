"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";

export function RemoveTeamMemberButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleRemove = async () => {
    if (!confirm("Tem certeza que deseja remover este membro da equipe? Ele voltará a ser um comprador comum.")) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/painel/equipe?userId=${userId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Erro ao remover membro");
      router.refresh();
    } catch (error) {
      alert("Erro ao remover membro da equipe.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleRemove}
      disabled={loading}
      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
      title="Remover da equipe"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  );
}
