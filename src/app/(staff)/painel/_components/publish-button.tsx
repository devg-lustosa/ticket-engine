"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, EyeOff, Loader2 } from "lucide-react";

interface PublishButtonProps {
  eventId: string;
  status: string;
}

export function PublishButton({ eventId, status }: PublishButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const isPublished = status === "PUBLISHED";
  const nextStatus = isPublished ? "DRAFT" : "PUBLISHED";

  async function toggle() {
    setLoading(true);
    try {
      await fetch(`/api/painel/eventos/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      title={isPublished ? "Despublicar evento" : "Publicar evento"}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed
        ${isPublished
          ? "bg-green-900/30 text-green-400 hover:bg-red-900/30 hover:text-red-400 border border-green-800/50 hover:border-red-800/50"
          : "bg-gray-800 text-gray-400 hover:bg-green-900/30 hover:text-green-400 border border-gray-700 hover:border-green-800/50"
        }`}
    >
      {loading ? (
        <Loader2 size={13} className="animate-spin" />
      ) : isPublished ? (
        <Globe size={13} />
      ) : (
        <EyeOff size={13} />
      )}
      {isPublished ? "Publicado" : "Rascunho"}
    </button>
  );
}
