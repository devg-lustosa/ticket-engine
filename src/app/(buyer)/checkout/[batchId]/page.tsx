"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, QrCode, CheckCircle2, Copy } from "lucide-react";
import Image from "next/image";

export default function CheckoutPage(props: { params: Promise<{ batchId: string }> }) {
  const params = use(props.params);
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Dados recebidos após gerar o Pix
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [pixQrBase64, setPixQrBase64] = useState<string | null>(null);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [amount, setAmount] = useState<number | null>(null);

  // Status de pagamento e cópia
  const [paymentStatus, setPaymentStatus] = useState<"PENDING" | "ACTIVE">("PENDING");
  const [copied, setCopied] = useState(false);

  // 1. Inicia o checkout (gera o Pix via API)
  const handleCheckout = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batchId: params.batchId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao gerar pagamento.");
      }

      setTicketId(data.ticketId);
      setPixQrBase64(data.pixQrBase64);
      setPixCode(data.pixCode);
      setAmount(data.amount);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Polling para verificar status do ingresso a cada 3 segundos
  useEffect(() => {
    if (!ticketId || paymentStatus === "ACTIVE") return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/tickets/${ticketId}/status`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "ACTIVE") {
            setPaymentStatus("ACTIVE");
            clearInterval(interval);
            // Redireciona após 2 segundos para dar tempo de ler o "Sucesso!"
            setTimeout(() => {
              router.push("/meus-ingressos");
            }, 2000);
          }
        }
      } catch (e) {
        console.error("Erro no polling", e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [ticketId, paymentStatus, router]);

  // Handler de cópia
  const copyToClipboard = () => {
    if (!pixCode) return;
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <main className="min-h-dvh flex items-center justify-center bg-[var(--background)] px-4 py-12">
      <div className="w-full max-w-md animate-fade-in">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Finalizar Compra</h1>
          <p className="mt-2 text-sm text-[var(--muted-fg)]">
            Pagamento via Pix. Aprovação instantânea.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border bg-[var(--card)] shadow-xl border-[var(--card-border)]">
          {error && (
            <div className="bg-red-50 p-4 text-sm text-red-600 border-b border-red-100">
              {error}
            </div>
          )}

          <div className="p-6 sm:p-8">
            {/* ETAPA 1: Confirmação e Botão */}
            {!pixQrBase64 && (
              <div className="text-center">
                <QrCode className="mx-auto h-16 w-16 text-[var(--brand-500)] mb-4" />
                <p className="text-[var(--foreground)] mb-6">
                  Você está prestes a reservar seu ingresso. O pagamento é feito via Pix.
                </p>
                <button
                  onClick={handleCheckout}
                  disabled={loading}
                  className="
                    flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--brand-500)]
                    px-4 py-3 text-sm font-semibold text-white transition hover:bg-[var(--brand-600)]
                    disabled:opacity-70 disabled:cursor-not-allowed
                  "
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Gerando QR Code...
                    </>
                  ) : (
                    "Gerar Pagamento Pix"
                  )}
                </button>
              </div>
            )}

            {/* ETAPA 2: Pix Gerado */}
            {pixQrBase64 && paymentStatus === "PENDING" && (
              <div className="flex flex-col items-center animate-fade-in">
                <div className="mb-4 text-center">
                  <span className="block text-sm text-[var(--muted-fg)]">Valor a pagar</span>
                  <span className="text-3xl font-bold text-[var(--foreground)]">
                    R$ {amount?.toFixed(2).replace(".", ",")}
                  </span>
                </div>

                {/* QR Code Image */}
                <div className="mb-6 rounded-xl border-2 border-dashed border-[var(--border)] p-4 bg-white">
                  <Image
                    src={`data:image/png;base64,${pixQrBase64}`}
                    alt="QR Code Pix"
                    width={200}
                    height={200}
                    className="aspect-square w-48 object-contain"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm text-[var(--muted-fg)] mb-6">
                  <Loader2 className="h-4 w-4 animate-spin text-[var(--brand-500)]" />
                  Aguardando pagamento...
                </div>

                {/* Pix Copia e Cola */}
                <div className="w-full space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-fg)]">
                    Pix Copia e Cola
                  </label>
                  <div className="flex gap-2">
                    <input
                      readOnly
                      value={pixCode || ""}
                      className="flex-1 rounded-lg border bg-[var(--muted)] px-3 py-2 text-sm text-[var(--foreground)] outline-none font-mono truncate border-[var(--border)]"
                    />
                    <button
                      onClick={copyToClipboard}
                      className="flex items-center justify-center rounded-lg bg-[var(--brand-500)] px-3 py-2 text-white transition hover:bg-[var(--brand-600)]"
                    >
                      {copied ? <CheckCircle2 className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ETAPA 3: Pagamento Confirmado */}
            {paymentStatus === "ACTIVE" && (
              <div className="flex flex-col items-center py-6 animate-fade-in text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
                  <CheckCircle2 className="h-10 w-10" />
                </div>
                <h2 className="text-2xl font-bold text-[var(--foreground)] mb-2">Pagamento Aprovado!</h2>
                <p className="text-[var(--muted-fg)]">
                  Seu ingresso foi emitido com sucesso. Redirecionando...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
