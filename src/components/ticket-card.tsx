import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { QRCodeSVG } from "qrcode.react";
import { Calendar, MapPin, CheckCircle2, Ticket as TicketIcon } from "lucide-react";
import { siteConfig } from "@/config/site";

interface TicketCardProps {
  ticket: {
    id: string;
    qrHash: string;
    status: "PENDING" | "ACTIVE" | "USED" | "CANCELLED";
    batch: {
      name: string;
      event: {
        title: string;
        venue: string;
        date: Date;
      };
    };
    user: {
      name: string;
      cpf: string | null;
    };
  };
}

export function TicketCard({ ticket }: TicketCardProps) {
  const eventDate = format(new Date(ticket.batch.event.date), "dd 'de' MMMM yyyy", { locale: ptBR });
  const eventTime = format(new Date(ticket.batch.event.date), "HH:mm");

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white shadow-lg border border-[var(--border)] max-w-sm mx-auto">
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
              <p className="text-sm font-medium text-[var(--foreground)]">{eventDate}</p>
              <p className="text-xs text-[var(--muted-fg)]">Abertura: {eventTime}</p>
            </div>
          </div>
          
          <div className="flex items-start gap-3">
            <MapPin className="mt-0.5 h-5 w-5 text-[var(--brand-500)] shrink-0" />
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">{ticket.batch.event.venue}</p>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-[var(--muted)] p-3">
            <p className="text-xs text-[var(--muted-fg)] uppercase">Titular do Ingresso</p>
            <p className="font-semibold text-[var(--foreground)]">{ticket.user.name}</p>
            {ticket.user.cpf && (
              <p className="text-sm text-[var(--muted-fg)]">CPF: {ticket.user.cpf}</p>
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
                  src: "/favicon.ico", // Opcional: logo no centro
                  x: undefined,
                  y: undefined,
                  height: 32,
                  width: 32,
                  excavate: true,
                }}
              />
            </div>
            <p className="text-[10px] text-[var(--muted-fg)] font-mono text-center break-all w-full mt-2">
              {ticket.qrHash}
            </p>
            <p className="mt-2 text-xs text-center text-[var(--foreground)]/60 max-w-[200px]">
              Apresente este código na portaria para entrar no evento.
            </p>
          </>
        ) : ticket.status === "USED" ? (
          <div className="flex flex-col items-center text-center py-6">
            <CheckCircle2 className="h-16 w-16 text-[var(--success)] mb-2" />
            <h4 className="text-lg font-bold text-[var(--foreground)]">Ingresso Utilizado</h4>
            <p className="text-sm text-[var(--muted-fg)]">Este ingresso já fez check-in.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center py-6 opacity-60">
            <TicketIcon className="h-12 w-12 text-[var(--muted-fg)] mb-2" />
            <p className="text-sm font-medium text-[var(--foreground)]">Ingresso Indisponível</p>
            <p className="text-xs text-[var(--muted-fg)]">Status: {ticket.status}</p>
          </div>
        )}
      </div>

      <div className="bg-[var(--muted)] text-center py-2 text-[10px] text-[var(--muted-fg)] uppercase tracking-widest font-semibold border-t border-[var(--border)]">
        {siteConfig.name}
      </div>
    </div>
  );
}
