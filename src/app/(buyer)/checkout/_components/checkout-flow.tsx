"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, QrCode, User, ShieldCheck, Loader2, ArrowRight, Tag, X } from "lucide-react";
import Image from "next/image";
import { discountedTotal, toCents } from "@/lib/money";

interface CheckoutBatch {
  id: string;
  name: string;
  price: number;
  qty: number;
  event: { id: string; title: string; venue: string };
}

interface Participant {
  id: string;
  batchId: string;
  batchName: string;
  eventName: string;
  name: string;
  cpf: string;
}

interface CheckoutFlowProps {
  batches: CheckoutBatch[];
  totalValue: number;
  cardEnabled: boolean;
  buyer: { id: string; name: string; cpf: string };
}

export function CheckoutFlow({ batches, totalValue, buyer, cardEnabled }: CheckoutFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ code: string; qrBase64: string } | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(false);
  const requestKey = useRef<string | null>(null);
  const paymentId = useRef<string | null>(null);
  const attemptKey = `checkout:${buyer.id}:${batches.map(batch => batch.id + ":" + batch.qty).sort().join(",")}`;

  const receivePayment = useCallback((data: { paymentId: string; pending: boolean; status?: string; paymentMethod?: string; pixCode?: string; pixQrBase64?: string }) => {
    paymentId.current = data.paymentId;
    sessionStorage.setItem(attemptKey, JSON.stringify({ key: requestKey.current, paymentId: data.paymentId }));
    if (data.status === "FAILED") {
      sessionStorage.removeItem(attemptKey); requestKey.current = null; paymentId.current = null;
      setProcessingPayment(false); setError("Pedido recusado. Você pode iniciar outra tentativa."); return;
    }
    if (data.status === "PAID" || data.status === "REFUNDED") {
      sessionStorage.removeItem(attemptKey); router.push("/meus-ingressos"); return;
    }
    if (data.pending) { setProcessingPayment(true); setError("Seu pagamento está em verificação. Consulte este pedido, sem iniciar outra cobrança."); return; }
    setProcessingPayment(false);
    if (data.paymentMethod === "PIX" && data.pixCode && data.pixQrBase64) { setPixData({ code: data.pixCode, qrBase64: data.pixQrBase64 }); setStep(3); }
    else router.push("/meus-ingressos");
  }, [attemptKey, router]);

  const refreshPayment = useCallback(async () => {
    if (!paymentId.current) return;
    const response = await fetch(`/api/payments/${paymentId.current}`, { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível consultar o pedido.");
    receivePayment(data);
  }, [receivePayment]);

  useEffect(() => {
    const stored = sessionStorage.getItem(attemptKey);
    if (!stored) return;
    try {
      const value = JSON.parse(stored);
      requestKey.current = value.key; paymentId.current = value.paymentId;
      if (value.paymentId) void refreshPayment().catch(error => setError(error.message));
    } catch { sessionStorage.removeItem(attemptKey); }
  }, [attemptKey, refreshPayment]);

  // Coupon state
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discountType: string; discountValue: number } | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState("");

  // Initialize participants array based on quantities
  const [participants, setParticipants] = useState<Participant[]>(() => {
    const list: Participant[] = [];
    batches.forEach(b => {
      for (let i = 0; i < b.qty; i++) {
        list.push({
          id: `${b.id}-${i}`,
          batchId: b.id,
          batchName: b.name,
          eventName: b.event.title,
          // Pre-fill the first ticket with buyer's info as a convenience
          name: list.length === 0 ? buyer.name : "",
          cpf: list.length === 0 ? buyer.cpf : "",
        });
      }
    });
    return list;
  });

  const [paymentMethod, setPaymentMethod] = useState<"PIX" | "CREDIT_CARD">("PIX");
  const [cardInfo, setCardInfo] = useState({
    holderName: "",
    number: "",
    expiryMonth: "",
    expiryYear: "",
    ccv: "",
    installmentCount: "1",
    holderCpf: buyer.cpf, postalCode: "", address: "", addressNumber: "", phone: ""
  });

  function handleParticipantChange(idx: number, field: "name" | "cpf", value: string) {
    const next = [...participants];
    next[idx][field] = value;
    setParticipants(next);
  }

  function validateStep1() {
    for (const p of participants) {
      if (!p.name.trim() || !p.cpf.trim() || p.cpf.replace(/\D/g, '').length !== 11) {
        return false;
      }
    }
    return true;
  }

  function validateStep2() {
    if (paymentMethod === "PIX") return true;
    const { holderName, number, expiryMonth, expiryYear, ccv, holderCpf, postalCode, address, addressNumber, phone } = cardInfo;
    return holderName && number.length >= 13 && expiryMonth && expiryYear && ccv.length >= 3 && holderCpf && postalCode && address && addressNumber && phone;
  }

  const finalValue = (appliedCoupon ? discountedTotal(toCents(totalValue.toFixed(2)), appliedCoupon.discountType as "PERCENTAGE" | "FIXED", appliedCoupon.discountValue) : toCents(totalValue.toFixed(2))) / 100;

  async function handleApplyCoupon() {
    if (!couponCode.trim()) return;
    setCouponLoading(true);
    setCouponError("");
    setAppliedCoupon(null);

    try {
      const res = await fetch("/api/checkout/validate-coupon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponCode, eventId: batches[0]?.event?.id || "" })
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || "Cupom inválido");
      
      setAppliedCoupon(data.coupon);
    } catch (err: any) {
      setCouponError(err.message);
    } finally {
      setCouponLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);
    setLoading(true);

    try {
      if (paymentId.current) { await refreshPayment(); return; }
      requestKey.current ??= crypto.randomUUID();
      sessionStorage.setItem(attemptKey, JSON.stringify({ key: requestKey.current }));
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": requestKey.current },
        body: JSON.stringify({
          tickets: participants.map(p => ({
            batchId: p.batchId,
            participantName: p.name,
            participantCpf: p.cpf.replace(/\D/g, '')
          })),
          paymentMethod,
          creditCardInfo: paymentMethod === "CREDIT_CARD" ? {
            ...cardInfo,
            installmentCount: parseInt(cardInfo.installmentCount, 10)
          } : undefined,
          couponCode: appliedCoupon?.code,
          acceptedTerms
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "CHARGE_REJECTED" || res.status === 400) { requestKey.current = null; sessionStorage.removeItem(attemptKey); }
        throw new Error(data.error || "Erro ao processar pagamento");
      }
      receivePayment(data);

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
    {processingPayment && <div role="status" className="rounded-lg border border-border p-4"><p>Pagamento em verificação. Aguarde ou consulte o mesmo pedido.</p><button className="mt-2 underline" onClick={handleSubmit} disabled={loading}>Consultar pedido</button></div>}
    <fieldset disabled={loading || processingPayment} className="grid min-w-0 grid-cols-1 gap-8 border-0 p-0 lg:grid-cols-3">
      {/* Form Area */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Step 1: Participantes */}
        <div className={`bg-[var(--card)] border ${step === 1 ? 'border-[var(--brand-500)]' : 'border-[var(--border)]'} rounded-2xl overflow-hidden transition-colors`}>
          <div className="bg-[var(--muted)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-bold text-lg text-[var(--foreground)] flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-[var(--brand-500)] text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>1</span>
              Dados dos Participantes
            </h2>
            {step === 2 && (
              <button onClick={() => setStep(1)} className="text-sm text-[var(--brand-500)] font-medium">Editar</button>
            )}
          </div>
          
          {step === 1 && (
            <div className="p-6 space-y-6">
              {participants.map((p, idx) => (
                <div key={p.id} className="bg-[var(--muted)] p-4 rounded-xl border border-[var(--border)]">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={16} className="text-[var(--brand-500)]" />
                    <h3 className="font-semibold text-sm">
                      Ingresso {idx + 1}: <span className="text-[var(--brand-500)]">{p.batchName}</span>
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor={"participant-name-" + p.id} className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Nome Completo</label>
                      <input 
                        id={"participant-name-" + p.id}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)]"
                        placeholder="Nome de quem vai usar"
                        value={p.name}
                        onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label htmlFor={"participant-cpf-" + p.id} className="block text-xs font-medium text-[var(--muted-fg)] mb-1">CPF</label>
                      <input 
                        id={"participant-cpf-" + p.id}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)]"
                        placeholder="000.000.000-00"
                        value={p.cpf}
                        onChange={(e) => handleParticipantChange(idx, "cpf", e.target.value)}
                        maxLength={14}
                      />
                    </div>
                  </div>
                </div>
              ))}
              
              <button
                onClick={() => setStep(2)}
                disabled={!validateStep1()}
                className="w-full sm:w-auto ml-auto flex items-center justify-center gap-2 bg-[var(--brand-500)] text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-[var(--brand-600)]" data-tooltip="Ir para o Pagamento"
              >
                Ir para o Pagamento <ArrowRight size={16} />
              </button>
            </div>
          )}
        </div>

        {/* Step 2: Pagamento */}
        <div className={`bg-[var(--card)] border ${step === 2 ? 'border-[var(--brand-500)]' : 'border-[var(--border)]'} rounded-2xl overflow-hidden transition-colors`}>
          <div className="bg-[var(--muted)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-bold text-lg text-[var(--foreground)] flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-[var(--brand-500)] text-white' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'}`}>2</span>
              Pagamento
            </h2>
          </div>

          {step === 2 && (
            <div className="p-6">
              {error && (
                <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                  <span>❌</span> {error}
                </div>
              )}

              <div className="flex gap-4 mb-6">
                <button
                  onClick={() => setPaymentMethod("PIX")}
                  aria-pressed={paymentMethod === "PIX"}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-colors ${paymentMethod === "PIX" ? 'border-[var(--success)] bg-[var(--success)]/10 text-[var(--success)]' : 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)] hover:border-gray-300 dark:hover:border-gray-700'}`} data-tooltip="Pix"
                >
                  <QrCode size={24} />
                  <span className="font-bold">Pix</span>
                </button>
                {cardEnabled && <button
                  onClick={() => setPaymentMethod("CREDIT_CARD")}
                  aria-pressed={paymentMethod === "CREDIT_CARD"}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-colors ${paymentMethod === "CREDIT_CARD" ? 'border-[var(--brand-500)] bg-[var(--brand-500)]/10 text-[var(--brand-500)]' : 'border-[var(--border)] bg-[var(--muted)] text-[var(--muted-fg)] hover:border-gray-300 dark:hover:border-gray-700'}`} data-tooltip="Cartão de Crédito · à vista"
                >
                  <CreditCard size={24} />
                  <span className="font-bold">Cartão de Crédito · à vista</span>
                </button>}
              </div>

              {paymentMethod === "CREDIT_CARD" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div>
                    <label htmlFor="card-holder-name" className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Nome no Cartão</label>
                    <input 
                      id="card-holder-name"
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)]"
                      placeholder="Igual impresso no cartão"
                      value={cardInfo.holderName}
                      onChange={(e) => setCardInfo({...cardInfo, holderName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label htmlFor="card-number" className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Número do Cartão</label>
                    <input 
                      id="card-number" inputMode="numeric" autoComplete="cc-number"
                      className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)] tracking-widest"
                      placeholder="0000 0000 0000 0000"
                      value={cardInfo.number}
                      onChange={(e) => setCardInfo({...cardInfo, number: e.target.value.replace(/\D/g, '').slice(0, 19)})}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="card-expiry-month" className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Mês (MM)</label>
                      <input 
                        id="card-expiry-month" inputMode="numeric" autoComplete="cc-exp-month"
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)] text-center"
                        placeholder="MM"
                        value={cardInfo.expiryMonth}
                        onChange={(e) => setCardInfo({...cardInfo, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2)})}
                      />
                    </div>
                    <div>
                      <label htmlFor="card-expiry-year" className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Ano (AAAA)</label>
                      <input 
                        id="card-expiry-year" inputMode="numeric" autoComplete="cc-exp-year"
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)] text-center"
                        placeholder="AAAA"
                        value={cardInfo.expiryYear}
                        onChange={(e) => setCardInfo({...cardInfo, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                      />
                    </div>
                    <div>
                      <label htmlFor="card-cvv" className="block text-xs font-medium text-[var(--muted-fg)] mb-1">CVV</label>
                      <input 
                        id="card-cvv" inputMode="numeric" autoComplete="cc-csc"
                        type="password"
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)] text-center tracking-widest"
                        placeholder="***"
                        value={cardInfo.ccv}
                        onChange={(e) => setCardInfo({...cardInfo, ccv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {([["holderCpf", "CPF do titular"], ["postalCode", "CEP da cobrança"], ["address", "Logradouro (rua/avenida)"], ["addressNumber", "Número do endereço"], ["phone", "Telefone do titular"]] as const).map(([key, label]) => <div key={key}>
                      <label htmlFor={"card-" + key} className="block text-xs font-medium text-[var(--muted-fg)] mb-1">{label}</label>
                      <input id={"card-" + key} className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm" value={cardInfo[key]} maxLength={key === "address" ? 120 : 20}
                        onChange={event => setCardInfo({ ...cardInfo, [key]: key === "addressNumber" || key === "address" ? event.target.value : event.target.value.replace(/\D/g, "") })} />
                    </div>)}
                  </div>
                  <p className="text-sm text-muted-fg">Cartão à vista. Informe os dados reais do titular para análise da cobrança.</p>
                </div>
              )}

              {paymentMethod === "PIX" && (
                <div className="bg-[var(--success)]/10 border border-[var(--success)]/30 rounded-xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-[var(--success)]/20 p-2 rounded-lg">
                    <QrCode size={24} className="text-[var(--success)]" />
                  </div>
                  <div className="text-sm text-[var(--success)]">
                    <p className="font-bold mb-1">Pagamento por Pix</p>
                    <p>O QR Code será gerado na próxima tela. O ingresso será liberado após a confirmação do pagamento.</p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex items-start gap-3 text-left bg-[var(--muted)] p-4 rounded-xl border border-[var(--border)] transition-colors hover:border-[var(--brand-500)]/50">
                <input 
                  type="checkbox" 
                  id="terms" 
                  className="mt-1 shrink-0 w-4 h-4 accent-[var(--brand-500)] cursor-pointer"
                  checked={acceptedTerms}
                  onChange={(e) => {
                    setAcceptedTerms(e.target.checked);
                    if (e.target.checked) setError(null);
                  }}
                />
                <label htmlFor="terms" className="text-sm text-[var(--muted-fg)] leading-snug cursor-pointer">
                  Li e concordo com os <a href="/termos" target="_blank" className="text-[var(--brand-500)] hover:underline font-bold">Termos de Uso e Privacidade</a>. Entendo que compras efetuadas não são reembolsáveis no dia do evento.
                </label>
              </div>

              <button
                onClick={handleSubmit}
                disabled={loading || !validateStep2()}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-[var(--brand-500)] text-white px-6 py-4 rounded-xl font-extrabold text-lg shadow-[0_4px_14px_0_var(--brand-500)] hover:shadow-[0_6px_20px_var(--brand-500)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:transform-none" aria-label="Gerar o pagamento deste pedido" data-tooltip="Gerar o pagamento deste pedido"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Finalizar Compra"}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-muted-fg">
                <ShieldCheck size={14} />
                Transação processada com segurança pelo Asaas.
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Pagamento Pix (Somente se for Pix) */}
        {step === 3 && pixData && (
          <div className="bg-[var(--card)] border border-[var(--brand-500)] rounded-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-[0_0_30px_-5px_var(--brand-500)]">
            <div className="bg-[var(--brand-500)] px-6 py-4 border-b border-[var(--border)] text-center">
              <h2 className="font-bold text-lg text-white">Escaneie o QR Code</h2>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="max-w-full bg-white p-4 rounded-xl shadow-lg mb-6">
                <img 
                  src={`data:image/png;base64,${pixData.qrBase64}`} 
                  alt="QR Code Pix" 
                  className="w-48 max-w-full h-auto aspect-square"
                />
              </div>
              
              <p className="text-[var(--muted-fg)] text-sm text-center mb-6 max-w-sm">
                Abra o aplicativo do seu banco, vá na opção Pix e escolha &quot;Ler QR Code&quot;.
              </p>
              
              <div className="w-full">
                <label htmlFor="pix-code" className="block text-xs font-medium text-[var(--muted-fg)] mb-2">Ou copie o código (Pix Copia e Cola)</label>
                <div className="flex bg-[var(--background)] border border-[var(--border)] rounded-lg overflow-hidden">
                  <input 
                    id="pix-code"
                    readOnly
                    value={pixData.code}
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-xs text-[var(--foreground)] focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.code);
                      alert("Código copiado!");
                    }}
                    className="bg-[var(--muted)] hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-[var(--foreground)] px-4 py-3 text-sm font-bold border-l border-[var(--border)] transition-colors"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <button
                disabled={loading}
                onClick={async () => {
                  setLoading(true); setError(null);
                  try { await refreshPayment(); router.push("/meus-ingressos"); }
                  catch (error) { setError(error instanceof Error ? error.message : "Não foi possível consultar o pedido."); }
                  finally { setLoading(false); }
                }}
                className="w-full mt-8 bg-gray-200 text-gray-900 hover:bg-gray-300 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700 px-6 py-4 rounded-xl font-bold transition-colors"
              >
                Já paguei, ir para Meus Ingressos
              </button>
              {error && <p role="alert" className="mt-4 text-sm text-error">{error}</p>}
            </div>
          </div>
        )}
      </div>

      {/* Resumo Area */}
      <div className="lg:col-span-1">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sticky top-6">
          <h3 className="font-bold text-lg mb-4 text-[var(--foreground)] border-b border-[var(--border)] pb-4">Resumo da Compra</h3>
          
          <div className="space-y-4 mb-6">
            {batches.map(b => (
              <div key={b.id} className="flex justify-between items-start text-sm">
                <div>
                  <p className="font-medium text-[var(--foreground)]">{b.qty}x {b.name}</p>
                  <p className="text-[var(--muted-fg)] text-xs truncate max-w-[150px]">{b.event.title}</p>
                </div>
                <span className="font-semibold text-[var(--foreground)]">R$ {(b.qty * b.price).toFixed(2).replace(".", ",")}</span>
              </div>
            ))}
          </div>
          
          {/* Cupom de Desconto */}
          <div className="border-t border-[var(--border)] pt-4 mb-4">
            {!appliedCoupon ? (
              <div>
                <label htmlFor="coupon-code" className="block text-xs font-medium text-[var(--muted-fg)] mb-2">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input 
                    id="coupon-code"
                    className="flex-1 min-w-0 bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--brand-500)] uppercase"
                    placeholder="Código"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="bg-[var(--brand-500)] hover:bg-[var(--brand-600)] text-white disabled:bg-[var(--muted)] disabled:text-[var(--muted-fg)] px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-100 flex items-center justify-center min-w-[80px]" aria-label="Aplicar cupom de desconto" data-tooltip="Aplicar cupom de desconto"
                  >
                    {couponLoading ? <Loader2 size={16} className="animate-spin" /> : "Aplicar"}
                  </button>
                </div>
                {couponError && <p className="text-red-400 text-xs mt-2">{couponError}</p>}
              </div>
            ) : (
              <div className="flex items-center justify-between bg-[var(--brand-500)]/10 border border-[var(--brand-500)]/30 p-3 rounded-lg">
                <div className="flex items-center gap-2 text-[var(--brand-500)]">
                  <Tag size={16} />
                  <span className="font-bold font-mono text-sm">{appliedCoupon.code}</span>
                </div>
                <button 
                  onClick={() => { setAppliedCoupon(null); setCouponCode(""); }}
                  className="text-gray-400 hover:text-white" aria-label="Remover cupom de desconto" data-tooltip="Remover cupom de desconto"
                >
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-[var(--border)] pt-4 flex flex-col gap-1">
            <div className="flex justify-between items-center text-[var(--muted-fg)]">
              <span>Subtotal</span>
              <span>R$ {totalValue.toFixed(2).replace(".", ",")}</span>
            </div>
            {appliedCoupon && (
              <div className="flex justify-between items-center text-[var(--brand-500)] font-medium">
                <span>Desconto ({appliedCoupon.code})</span>
                <span>- R$ {(totalValue - finalValue).toFixed(2).replace(".", ",")}</span>
              </div>
            )}
            <div className="flex flex-wrap justify-between items-center mt-2 pt-2 gap-2 border-t border-[var(--border)]">
              <span className="text-[var(--muted-fg)] font-medium">Total a pagar</span>
              <span className="text-2xl font-black text-[var(--brand-500)] whitespace-nowrap">R$ {finalValue.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        </div>
      </div>
    </fieldset>
    </div>
  );
}
