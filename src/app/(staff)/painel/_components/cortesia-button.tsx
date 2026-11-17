"use client";

import { useEffect, useRef, useState } from "react";
import { Gift, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function CortesiaButton({ 
  eventId, 
  eventTitle, 
  batches 
}: { 
  eventId: string; 
  eventTitle: string; 
  batches: { id: string, name: string }[] 
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [batchId, setBatchId] = useState(batches[0]?.id || "");
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const dialog = dialogRef.current;
    const trigger = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    return () => { dialog?.close(); trigger?.focus(); };
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) {
      alert("Nenhum lote disponível. Crie um lote primeiro.");
      return;
    }
    
    setLoading(true);
    setSuccess(false);

    try {
      const res = await fetch(`/api/painel/eventos/${eventId}/cortesias`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity, name, email, batchId }),
      });
      if (res.ok) {
        setSuccess(true);
        setName("");
        setEmail("");
        setQuantity(1);
        router.refresh();
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 3000);
      } else {
        const data = await res.json();
        alert("Erro ao emitir cortesias: " + (data.error || ""));
      }
    } catch (e) {
      alert("Erro de conexão ao emitir cortesias.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="nav-control text-muted-fg"
        data-tooltip="Emitir Cortesias" aria-label="Emitir Cortesias"
      >
        <Gift size={16} /><span className="ml-1 text-xs">Cortesias</span>
      </button>

      {isOpen && (
        <dialog ref={dialogRef} aria-labelledby={"courtesy-title-" + eventId} onCancel={() => setIsOpen(false)} className="fixed inset-0 m-auto max-h-[calc(100dvh-32px)] w-[calc(100%-32px)] max-w-md overflow-y-auto rounded-xl border border-border bg-card text-foreground shadow-2xl backdrop:bg-black/60 backdrop:backdrop-blur-sm">
          <div className="p-6 relative text-left">
            <button onClick={() => setIsOpen(false)} className="absolute top-4 right-4 text-muted-fg hover:text-foreground" aria-label="Fechar janela" data-tooltip="Fechar janela">
              <X size={20} />
            </button>
            <div className="flex items-center gap-3 mb-2">
               <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center text-brand">
                 <Gift size={20} />
               </div>
               <h2 id={"courtesy-title-" + eventId} className="text-xl font-bold">Emitir Cortesias</h2>
            </div>
            
            <p className="text-sm text-muted-fg mb-6 pl-13">Para: {eventTitle}</p>
            
            {success ? (
              <div className="bg-success/10 text-success p-4 rounded-xl text-center font-medium border border-success/30">
                ✅ Cortesias emitidas. O envio de e-mail depende do provedor.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor={"courtesy-batch-" + eventId} className="block text-sm font-medium mb-1">Selecione o Lote</label>
                  <select id={"courtesy-batch-" + eventId} required value={batchId} onChange={e => setBatchId(e.target.value)} className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand">
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor={"courtesy-quantity-" + eventId} className="block text-sm font-medium mb-1">Quantidade de Ingressos</label>
                  <input id={"courtesy-quantity-" + eventId} type="number" min={1} max={10} required value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label htmlFor={"courtesy-name-" + eventId} className="block text-sm font-medium mb-1">Nome do Convidado</label>
                  <input id={"courtesy-name-" + eventId} type="text" placeholder="Ex: João Silva" required value={name} onChange={e => setName(e.target.value)} className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand" />
                </div>
                <div>
                  <label htmlFor={"courtesy-email-" + eventId} className="block text-sm font-medium mb-1">E-mail de Destino</label>
                  <input id={"courtesy-email-" + eventId} type="email" placeholder="O QR Code será enviado para este e-mail" required value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-muted border border-border rounded-lg p-2.5 text-sm focus:outline-none focus:border-brand" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-brand text-white font-medium p-3 rounded-lg hover:bg-brand-dark transition-colors disabled:opacity-50 mt-2">
                  {loading ? "Emitindo..." : "Emitir e Enviar por E-mail"}
                </button>
              </form>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
