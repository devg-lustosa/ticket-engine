"use client";

import { useState } from "react";
import { format, isBefore, subHours } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import {
  ChevronDown,
  Calendar,
  MapPin,
  CheckCircle2,
  Edit2,
  X,
  Loader2,
  Ticket as TicketIcon,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface TicketRowProps {
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

export function TicketRow({ ticket }: TicketRowProps) {
  const router = useRouter();
  const eventDateObj = new Date(ticket.batch.event.date);
  const eventDateStr = format(eventDateObj, "dd 'de' MMMM yyyy", { locale: ptBR });
  const eventTimeStr = format(eventDateObj, "HH:mm");

  const limitDate = subHours(eventDateObj, 24);
  const isBeforeLimit = isBefore(new Date(), limitDate);
  const canEdit = !ticket.isParticipantEdited && isBeforeLimit && ticket.status === "ACTIVE";

  const [open, setOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState(ticket.participantName);
  const [cpf, setCpf] = useState(ticket.participantCpf || "");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cpf.trim()) { setError("Preencha todos os campos."); return; }
    const cleanCpf = cpf.replace(/\D/g, "");
    if (cleanCpf.length !== 11) { setError("CPF inválido."); return; }
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

  const statusMeta = {
    ACTIVE: { label: "Ativo", dot: "bg-success" },
    USED: { label: "Utilizado", dot: "bg-muted-fg" },
    CANCELLED: { label: "Cancelado", dot: "bg-error" },
    PENDING: { label: "Pendente", dot: "bg-warning" },
  }[ticket.status];

  return (
    <>
      <div className="bg-card border border-card-border rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
        {/* Linha principal — clicável */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-full flex items-center gap-4 px-5 py-4 text-left"
        >
          {/* Ícone de status */}
          <div className={`w-2 h-2 rounded-full shrink-0 ${statusMeta.dot}`} />

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm truncate">
              {ticket.batch.event.title}
            </p>
            <p className="text-xs text-muted-fg mt-0.5 truncate">
              {ticket.batch.name} · {ticket.participantName}
            </p>
          </div>

          {/* Data */}
          <p className="text-xs text-muted-fg shrink-0 hidden sm:block">
            {eventDateStr}
          </p>

          {/* Badge status */}
          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
            ticket.status === "ACTIVE" ? "bg-success/10 text-success" :
            ticket.status === "USED"   ? "bg-muted text-muted-fg" :
            ticket.status === "CANCELLED" ? "bg-error/10 text-error" :
            "bg-warning/10 text-warning"
          }`}>
            {statusMeta.label}
          </span>

          {/* Seta */}
          <ChevronDown
            size={16}
            className={`text-muted-fg shrink-0 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Painel expandido */}
        {open && (
          <div className="border-t border-border px-5 py-5 animate-fade-in">
            <div className="flex flex-col sm:flex-row gap-6 items-start">

              {/* QR Code / Status */}
              <div className="flex flex-col items-center gap-3 shrink-0 mx-auto sm:mx-0">
                {ticket.status === "ACTIVE" ? (
                  <>
                    <div className="p-2.5 border-2 border-brand rounded-xl bg-white shadow-sm">
                      <QRCodeSVG
                        value={ticket.qrHash}
                        size={140}
                        level="H"
                        includeMargin={false}
                        imageSettings={{
                          src: "/favicon.ico",
                          x: undefined,
                          y: undefined,
                          height: 26,
                          width: 26,
                          excavate: true,
                        }}
                      />
                    </div>
                    <p className="font-mono text-sm font-bold tracking-widest text-foreground">
                      {ticket.id.split("-")[0].toUpperCase()}
                    </p>
                    <p className="text-[11px] text-muted-fg text-center max-w-[160px]">
                      Apresente na portaria
                    </p>
                  </>
                ) : ticket.status === "USED" ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <CheckCircle2 className="h-12 w-12 text-success" />
                    <p className="text-sm font-semibold text-foreground">Utilizado</p>
                    <p className="text-xs text-muted-fg">Check-in realizado</p>
                  </div>
                ) : ticket.status === "CANCELLED" ? (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <XCircle className="h-12 w-12 text-error" />
                    <p className="text-sm font-semibold text-foreground">Cancelado</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2 py-4 opacity-50">
                    <TicketIcon className="h-12 w-12 text-muted-fg" />
                    <p className="text-sm text-muted-fg">Indisponível</p>
                  </div>
                )}
              </div>

              {/* Detalhes */}
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-start gap-2 text-sm">
                  <Calendar size={14} className="mt-0.5 text-brand shrink-0" />
                  <div>
                    <p className="text-foreground font-medium">{eventDateStr}</p>
                    <p className="text-xs text-muted-fg">Abertura: {eventTimeStr}</p>
                  </div>
                </div>

                <div className="flex items-start gap-2 text-sm">
                  <MapPin size={14} className="mt-0.5 text-brand shrink-0" />
                  <p className="text-foreground">{ticket.batch.event.venue}</p>
                </div>

                {/* Titular */}
                <div className="bg-muted rounded-lg p-3 mt-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-[10px] text-muted-fg uppercase tracking-wider mb-0.5">
                        Titular do ingresso
                      </p>
                      <p className="text-sm font-semibold text-foreground">{ticket.participantName}</p>
                      {ticket.participantCpf && (
                        <p className="text-xs text-muted-fg">
                          CPF: {ticket.participantCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")}
                        </p>
                      )}
                    </div>
                    {canEdit && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsModalOpen(true); }}
                        className="p-1.5 text-muted-fg hover:text-brand transition-colors rounded-md hover:bg-background"
                        title="Editar titular"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                  {ticket.isParticipantEdited && (
                    <p className="text-[10px] text-muted-fg mt-1.5">Titular já foi editado (limite atingido).</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal editar titular */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-card border border-card-border w-full max-w-md rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-semibold text-foreground">Editar Titular</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-fg hover:text-foreground transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              <div className="bg-warning/10 border border-warning/20 text-warning p-3 rounded-lg text-xs">
                <strong>Atenção:</strong> Você só pode alterar o titular <strong>1 única vez</strong>.
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Nome Completo</label>
                <input
                  type="text" required value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2 text-sm text-foreground placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">CPF</label>
                <input
                  type="text" required value={cpf} maxLength={14}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    let f = val;
                    if (val.length > 9) f = val.replace(/(\d{3})(\d{3})(\d{3})(\d{2}).*/, "$1.$2.$3-$4");
                    else if (val.length > 6) f = val.replace(/(\d{3})(\d{3})(\d{1,3}).*/, "$1.$2.$3");
                    else if (val.length > 3) f = val.replace(/(\d{3})(\d{1,3}).*/, "$1.$2");
                    setCpf(f);
                  }}
                  className="w-full rounded-xl border border-border bg-muted px-4 py-2 text-sm text-foreground placeholder:text-muted-fg focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
              {error && <p className="text-sm text-error">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setIsModalOpen(false)}
                  className="flex-1 rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit" disabled={isLoading}
                  className="flex-1 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-brand-dark transition-colors disabled:opacity-50 flex justify-center items-center"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
