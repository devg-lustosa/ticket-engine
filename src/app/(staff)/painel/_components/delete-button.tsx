"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle, X } from "lucide-react";

interface DeleteButtonProps {
  eventId: string;
}

export function DeleteButton({ eventId }: DeleteButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  async function handleDelete() {
    setLoading(true);
    try {
      await fetch(`/api/painel/eventos/${eventId}`, {
        method: "DELETE",
      });
      setShowModal(false);
      router.refresh();
    } catch (error) {
      console.error("Erro ao excluir evento", error);
      alert("Ocorreu um erro ao excluir o evento.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        disabled={loading}
        className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors disabled:opacity-50"
        title="Remover evento"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between mb-5">
                <div className="flex items-center gap-3 text-red-400">
                  <div className="p-2 bg-red-400/10 rounded-lg">
                    <AlertTriangle size={24} />
                  </div>
                  <h2 className="text-lg font-semibold text-white">Excluir Evento</h2>
                </div>
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="text-gray-500 hover:text-white transition-colors disabled:opacity-50"
                >
                  <X size={20} />
                </button>
              </div>
              
              <p className="text-gray-300 text-sm mb-6 leading-relaxed">
                Tem certeza que deseja excluir este evento? Todos os lotes e ingressos associados também serão removidos. <strong className="text-white">Esta ação é irreversível.</strong>
              </p>
              
              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-70"
                >
                  {loading && <Loader2 size={14} className="animate-spin" />}
                  {loading ? "Excluindo..." : "Sim, excluir evento"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
