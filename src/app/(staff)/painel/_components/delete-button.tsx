"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";

interface DeleteButtonProps {
  eventId: string;
}

export function DeleteButton({ eventId }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!window.confirm("Tem certeza que deseja excluir este evento? Esta ação não pode ser desfeita.")) {
      return;
    }
    
    setLoading(true);
    try {
      await fetch(`/api/painel/eventos/${eventId}`, {
        method: "DELETE",
      });
      router.refresh();
    } catch (error) {
      console.error("Erro ao excluir evento", error);
      alert("Ocorreu um erro ao excluir o evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={loading}
      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
      title="Remover evento"
    >
      {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
    </button>
  );
}
