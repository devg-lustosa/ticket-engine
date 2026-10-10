"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { Users, X } from "lucide-react";

interface Attendee {
  id: string;
  name: string;
  nickname: string | null;
  avatarUrl: string | null;
}

export function EventAttendees({ attendees }: { attendees: Attendee[] }) {
  const [showAll, setShowAll] = useState(false);

  // Prevenir scroll do body quando o modal estiver aberto
  useEffect(() => {
    if (showAll) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAll]);

  if (attendees.length === 0) return null;

  const MAX_PREVIEW = 6;
  const hasMore = attendees.length > MAX_PREVIEW;
  const previewAttendees = attendees.slice(0, MAX_PREVIEW);

  return (
    <>
      <section className="bg-[var(--muted)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="p-6">
          <h3 className="font-bold text-[var(--foreground)] mb-6 flex items-center gap-2">
            <Users size={20} className="text-[var(--brand-500)]" />
            Quem vai
          </h3>

          <div className="flex flex-col gap-6">
            <div className="flex items-center">
              <div className="flex -space-x-3 overflow-hidden">
                {previewAttendees.map((att) => (
                  <div key={att.id} className="relative w-12 h-12 rounded-full border-2 border-[var(--muted)] bg-[var(--background)] flex items-center justify-center overflow-hidden shrink-0">
                    {att.avatarUrl ? (
                      <Image src={att.avatarUrl} alt={att.name} fill className="object-cover" />
                    ) : (
                      <span className="text-sm font-bold text-[var(--muted-fg)]">
                        {att.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                ))}
                {hasMore && (
                  <div className="relative w-12 h-12 rounded-full border-2 border-[var(--muted)] bg-[var(--brand-500)]/10 flex items-center justify-center shrink-0 z-10">
                    <span className="text-sm font-medium text-[var(--foreground)]">+{attendees.length - MAX_PREVIEW}</span>
                  </div>
                )}
              </div>
            </div>
            
            <button 
              onClick={() => setShowAll(true)}
              className="w-full sm:w-auto bg-[var(--brand-600)] text-white font-medium py-3 px-6 rounded-xl hover:bg-[var(--brand-700)] transition-colors inline-flex items-center justify-center gap-2"
            >
              <Users size={18} />
              Ver todos os participantes
            </button>
          </div>
        </div>
      </section>

      {/* Modal / Popup */}
      {showAll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6" onClick={() => setShowAll(false)}>
          <div 
            className="bg-[var(--background)] w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
              <h3 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
                <Users size={24} className="text-[var(--brand-500)]" />
                Todos os participantes
              </h3>
              <button 
                onClick={() => setShowAll(false)}
                className="p-2 rounded-full hover:bg-[var(--muted)] text-[var(--muted-fg)] hover:text-[var(--foreground)] transition-colors"
              >
                <X size={24} />
              </button>
            </div>

            {/* Conteúdo (Scrollável) */}
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {attendees.map((att) => (
                  <div key={att.id} className="bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden hover:border-[var(--brand-500)]/30 transition-colors">
                    <div className="relative w-full aspect-square bg-[var(--muted)]">
                      {att.avatarUrl ? (
                        <Image src={att.avatarUrl} alt={att.name} fill className="object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <Users size={32} className="text-[var(--muted-fg)]/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3">
                      <p className="font-bold text-[var(--foreground)] text-sm truncate" title={att.nickname || att.name.split(' ')[0]}>
                        {att.nickname || att.name.split(' ')[0]}
                      </p>
                      <p className="text-xs text-[var(--muted-fg)] truncate" title={att.name.split(' ')[0]}>
                        {att.name.split(' ')[0]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

