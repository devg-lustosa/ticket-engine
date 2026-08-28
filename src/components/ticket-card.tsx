"use client";

import { useState } from "react";
import { format, isBefore, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, CheckCircle2, Ticket as TicketIcon, Edit2, X, Loader2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import { useRouter } from "next/navigation";

interface TicketCardProps {
  ticket: {
    id: string;
    qrHash: string;
    status: "PENDING" | "ACTIVE" | "USED" | "CANCELLED";
    participantName: string;
    participantCpf: string | null;
    isParticipantEdited: boolean;
    batch: {
      name: string;
      event: {
        title: string;
        venue: string;
        date: Date;
      };
    };
  };
}

export function TicketCard({ ticket }: TicketCardProps) {
  const router = useRouter();
  const eventDateObj = new Date(ticket.batch.event.date);
  const eventDateStr = format(eventDateObj, "dd 'de' MMMM yyyy", { locale: ptBR });
  const eventTimeStr = format(eventDateObj, "HH:mm");

  const limitDate = subHours(eventDateObj, 24);
  const isBeforeLimit = isBefore(new Date(), limitDate);
  const canEdit = !ticket.isParticipantEdited && isBeforeLimit && ticket.status === "ACTIVE";

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState(ticket.participantName);
  const [cpf, setCpf] = useState(ticket.participantCpf || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cpf.trim()) {
      setError("Preencha todos os campos.");
      return;
    }
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) {
      setError("CPF inválido.");
      return;
    }

    setIsLoading(true);
    setError("");
    
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/participant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantName: name, participantCpf: cleanCpf }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao editar titular.");

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg border border-[var(--border)] max-w-sm mx-auto text-slate-900">
        {/* Círculos laterais para simular recorte de ingresso */}
        <div className="absolute top-[280px] -left-4 h-8 w-8 rounded-full bg-[var(--background)] border-r border-[var(--border)]" />
        <div className="absolute top-[280px] -right-4 h-8 w-8 rounded-full bg-[var(--background)] border-l border-[var(--border)]" />

        {/* Header do Ingresso (Cores da Marca) */}
        <div className="bg-[var(--brand-500)] p-6 text-white text-center">
          <h3 className="text-xl font-bold line-clamp-2">{ticket.batch.event.title}</h3>
          <p className="mt-1 text-sm font-medium text-white/80 uppercase tracking-wider">{ticket.batch.name}</p>
        </div>

        {/* Corpo (Info) */}
        <div className="p-6 pb-8 border-b-2 border-dashed border-[var(--border)]">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Calendar className="mt-0.5 h-5 w-5 text-[var(--brand-500)] shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">{eventDateStr}</p>
                <p className="text-xs text-slate-500">Abertura: {eventTimeStr}</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <MapPin className="mt-0.5 h-5 w-5 text-[var(--brand-500)] shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-900">{ticket.batch.event.venue}</p>
              </div>
            </div>

            <div className="mt-4 rounded-lg bg-slate-100 p-3 relative">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs text-slate-500 uppercase mb-1">Titular do Ingresso</p>
                  <p className="font-semibold text-slate-900 truncate">{ticket.participantName}</p>
                  {ticket.participantCpf && (
                    <p className="text-sm text-slate-500">CPF: {ticket.participantCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}</p>
                  )}
                </div>
                {canEdit && (
                  <button
                    onClick={() => setIsModalOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-[var(--brand-500)] transition-colors rounded-md hover:bg-white"
                    title="Editar titular"
                  >
                    <Edit2 size={16} />
                  </button>
                )}
              </div>
              {ticket.isParticipantEdited && (
                <p className="text-[10px] text-slate-400 mt-2 font-medium">Titular já editado. Limite atingido.</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer (QR Code) */}
        <div className="bg-white p-6 pt-8 flex flex-col items-center justify-center">
          {ticket.status === "ACTIVE" ? (
            <>
              <div className="p-2 border-4 border-[var(--brand-500)] rounded-xl bg-white mb-4 shadow-sm">
                <QRCodeSVG
                  value={ticket.qrHash}
                  size={180}
                  level="H"
                  includeMargin={false}
                  imageSettings={{
                    src: "/favicon.ico",
                    x: undefined,
                    y: undefined,
                    height: 32,
                    width: 32,
                    excavate: true,
                  }}
                />
              </div>
              <p className="text-lg font-bold text-slate-700 tracking-[0.2em] font-mono text-center mt-2">
                {ticket.id.split("-")[0].toUpperCase()}
              </p>
              <p className="mt-1 text-[11px] text-center text-slate-400 max-w-[200px]">
                Apresente o QR Code ou informe o código acima na portaria.
              </p>
            </>
          ) : ticket.status === "USED" ? (
            <div className="flex flex-col items-center text-center py-6">
              <CheckCircle2 className="h-16 w-16 text-[var(--success)] mb-2" />
              <h4 className="text-lg font-bold text-slate-900">Ingresso Utilizado</h4>
              <p className="text-sm text-slate-500">Este ingresso já fez check-in.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center text-center py-6 opacity-60">
              <TicketIcon className="h-12 w-12 text-slate-400 mb-2" />
              <p className="text-sm font-medium text-slate-900">Ingresso Indisponível</p>
              <p className="text-xs text-slate-500">Status: {ticket.status}</p>
            </div>
          )}
        </div>

        <div className="bg-slate-100 text-center py-2 text-[10px] text-slate-400 uppercase tracking-widest font-semibold border-t border-[var(--border)]">
          {siteConfig.name}
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-[var(--card)] border border-[var(--border)] w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
              <h3 className="font-semibold text-lg text-[var(--foreground)]">Editar Titular</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[var(--muted-fg)] hover:text-[var(--foreground)] transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleEdit} className="p-6">
              <div className="space-y-4">
                <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-600 dark:text-yellow-500 p-3 rounded-lg text-sm mb-4">
                  <strong>Atenção:</strong> Você só pode alterar o titular de um ingresso <strong>1 única vez</strong>.
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    Nome Completo
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-500)]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-1">
                    CPF
                  </label>
                  <input
                    type="text"
                    required
                    value={cpf}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      let formatted = val;
                      if (val.length > 9) {
                        formatted = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
                      } else if (val.length > 6) {
                        formatted = val.replace(/(\d{3})(\d{3})(\d{1,3}).*/, "$1.$2.$3");
                      } else if (val.length > 3) {
                        formatted = val.replace(/(\d{3})(\d{1,3}).*/, "$1.$2");
                      }
                      setCpf(formatted);
                    }}
                    maxLength={14}
                    className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] px-4 py-2 text-[var(--foreground)] focus:border-[var(--brand-500)] focus:outline-none focus:ring-1 focus:ring-[var(--brand-500)]"
                  />
                </div>
                {error && <p className="text-sm text-[var(--destructive)]">{error}</p>}
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1 rounded-xl bg-[var(--brand-500)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--brand-600)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Salvar Titular"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
