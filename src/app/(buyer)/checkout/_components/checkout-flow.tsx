"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, QrCode, User, ShieldCheck, Loader2, ArrowRight, Tag, X } from "lucide-react";
import Image from "next/image";

interface CheckoutBatch {
  id: string;
  name: string;
  price: number;
  qty: number;
  event: { title: string; venue: string };
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
  buyer: { name: string; cpf: string };
}

export function CheckoutFlow({ batches, totalValue, buyer }: CheckoutFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ code: string; qrBase64: string } | null>(null);

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
    installmentCount: "1"
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
    const { holderName, number, expiryMonth, expiryYear, ccv } = cardInfo;
    return holderName && number.length >= 15 && expiryMonth && expiryYear && ccv.length >= 3;
  }

  // Calculate final value with coupon
  let finalValue = totalValue;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === "PERCENTAGE") {
      finalValue = totalValue - (totalValue * (appliedCoupon.discountValue / 100));
    } else {
      finalValue = totalValue - appliedCoupon.discountValue;
    }
    if (finalValue < 0) finalValue = 0;
  }

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
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          couponCode: appliedCoupon?.code
        })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Erro ao processar pagamento");
      }

      console.log("Checkout API Response:", data);

      // If PIX, we show the QR Code directly on screen.
      if (paymentMethod === "PIX" && data.pixCode && data.pixQrBase64) {
        setPixData({
          code: data.pixCode,
          qrBase64: data.pixQrBase64
        });
        setStep(3);
      } else {
        router.push(`/meus-ingressos`);
      }

    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Form Area */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* Step 1: Participantes */}
        <div className={`bg-[var(--card)] border ${step === 1 ? 'border-[var(--brand-500)]' : 'border-[var(--border)]'} rounded-2xl overflow-hidden transition-colors`}>
          <div className="bg-[var(--muted)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-bold text-lg text-[var(--foreground)] flex items-center gap-2">
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 1 ? 'bg-[var(--brand-500)] text-white' : 'bg-gray-700 text-gray-400'}`}>1</span>
              Dados dos Participantes
            </h2>
            {step === 2 && (
              <button onClick={() => setStep(1)} className="text-sm text-[var(--brand-500)] font-medium">Editar</button>
            )}
          </div>
          
          {step === 1 && (
            <div className="p-6 space-y-6">
              {participants.map((p, idx) => (
                <div key={p.id} className="bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-center gap-2 mb-4">
                    <User size={16} className="text-[var(--brand-500)]" />
                    <h3 className="font-semibold text-sm">
                      Ingresso {idx + 1}: <span className="text-[var(--brand-500)]">{p.batchName}</span>
                    </h3>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Nome Completo</label>
                      <input 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--brand-500)]"
                        placeholder="Nome de quem vai usar"
                        value={p.name}
                        onChange={(e) => handleParticipantChange(idx, "name", e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">CPF</label>
                      <input 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--brand-500)]"
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
                className="w-full sm:w-auto ml-auto flex items-center justify-center gap-2 bg-[var(--brand-500)] text-white px-6 py-2.5 rounded-xl font-bold disabled:opacity-50 transition-all hover:bg-[var(--brand-600)]"
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
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step === 2 ? 'bg-[var(--brand-500)] text-white' : 'bg-gray-700 text-gray-400'}`}>2</span>
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
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-colors ${paymentMethod === "PIX" ? 'border-[#32bcad] bg-[#32bcad]/10 text-[#32bcad]' : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'}`}
                >
                  <QrCode size={24} />
                  <span className="font-bold">Pix</span>
                </button>
                <button
                  onClick={() => setPaymentMethod("CREDIT_CARD")}
                  className={`flex-1 flex flex-col items-center justify-center gap-2 py-4 rounded-xl border-2 transition-colors ${paymentMethod === "CREDIT_CARD" ? 'border-[var(--brand-500)] bg-[var(--brand-500)]/10 text-[var(--brand-500)]' : 'border-gray-800 bg-gray-900 text-gray-400 hover:border-gray-700'}`}
                >
                  <CreditCard size={24} />
                  <span className="font-bold">Cartão de Crédito</span>
                </button>
              </div>

              {paymentMethod === "CREDIT_CARD" && (
                <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Nome no Cartão</label>
                    <input 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--brand-500)]"
                      placeholder="Igual impresso no cartão"
                      value={cardInfo.holderName}
                      onChange={(e) => setCardInfo({...cardInfo, holderName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Número do Cartão</label>
                    <input 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--brand-500)] tracking-widest"
                      placeholder="0000 0000 0000 0000"
                      value={cardInfo.number}
                      onChange={(e) => setCardInfo({...cardInfo, number: e.target.value.replace(/\D/g, '').slice(0, 16)})}
                    />
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Mês (MM)</label>
                      <input 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--brand-500)] text-center"
                        placeholder="MM"
                        value={cardInfo.expiryMonth}
                        onChange={(e) => setCardInfo({...cardInfo, expiryMonth: e.target.value.replace(/\D/g, '').slice(0, 2)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Ano (AAAA)</label>
                      <input 
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--brand-500)] text-center"
                        placeholder="AAAA"
                        value={cardInfo.expiryYear}
                        onChange={(e) => setCardInfo({...cardInfo, expiryYear: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">CVV</label>
                      <input 
                        type="password"
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--brand-500)] text-center tracking-widest"
                        placeholder="***"
                        value={cardInfo.ccv}
                        onChange={(e) => setCardInfo({...cardInfo, ccv: e.target.value.replace(/\D/g, '').slice(0, 4)})}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-fg)] mb-1">Parcelamento</label>
                    <select 
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[var(--brand-500)]"
                      value={cardInfo.installmentCount}
                      onChange={(e) => setCardInfo({...cardInfo, installmentCount: e.target.value})}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(num => {
                        const val = finalValue / num;
                        return (
                          <option key={num} value={num.toString()}>
                            {num}x de R$ {val.toFixed(2).replace(".", ",")} {num === 1 ? "sem juros" : ""}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              )}

              {paymentMethod === "PIX" && (
                <div className="bg-[#32bcad]/10 border border-[#32bcad]/30 rounded-xl p-4 flex items-start gap-4 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="bg-[#32bcad]/20 p-2 rounded-lg">
                    <QrCode size={24} className="text-[#32bcad]" />
                  </div>
                  <div className="text-sm text-[#32bcad]/80">
                    <p className="font-bold text-[#32bcad] mb-1">Pagamento Rápido e Seguro</p>
                    <p>O QR Code Pix será gerado na próxima tela. O pagamento é aprovado na hora.</p>
                  </div>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={loading || !validateStep2()}
                className="w-full mt-6 flex items-center justify-center gap-2 bg-[var(--brand-500)] text-white px-6 py-4 rounded-xl font-extrabold text-lg shadow-[0_4px_14px_0_var(--brand-500)] hover:shadow-[0_6px_20px_var(--brand-500)] hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:shadow-none disabled:transform-none"
              >
                {loading ? <Loader2 className="animate-spin" /> : "Finalizar Compra"}
              </button>

              <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
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
              <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
                <img 
                  src={`data:image/png;base64,${pixData.qrBase64}`} 
                  alt="QR Code Pix" 
                  className="w-48 h-48"
                />
              </div>
              
              <p className="text-[var(--muted-fg)] text-sm text-center mb-6 max-w-sm">
                Abra o aplicativo do seu banco, vá na opção Pix e escolha "Ler QR Code".
              </p>
              
              <div className="w-full">
                <label className="block text-xs font-medium text-[var(--muted-fg)] mb-2">Ou copie o código (Pix Copia e Cola)</label>
                <div className="flex bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
                  <input 
                    readOnly
                    value={pixData.code}
                    className="flex-1 bg-transparent px-4 py-3 text-xs text-white focus:outline-none"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(pixData.code);
                      alert("Código copiado!");
                    }}
                    className="bg-gray-800 hover:bg-gray-700 px-4 py-3 text-sm font-bold border-l border-gray-700 transition-colors"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <button
                onClick={() => router.push("/meus-ingressos")}
                className="w-full mt-8 bg-gray-800 text-white px-6 py-4 rounded-xl font-bold hover:bg-gray-700 transition-colors"
              >
                Já paguei, ir para Meus Ingressos
              </button>
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
                  <p className="font-medium text-white">{b.qty}x {b.name}</p>
                  <p className="text-gray-500 text-xs truncate max-w-[150px]">{b.event.title}</p>
                </div>
                <span className="font-semibold text-gray-300">R$ {(b.qty * b.price).toFixed(2).replace(".", ",")}</span>
              </div>
            ))}
          </div>
          
          {/* Cupom de Desconto */}
          <div className="border-t border-[var(--border)] pt-4 mb-4">
            {!appliedCoupon ? (
              <div>
                <label className="block text-xs font-medium text-[var(--muted-fg)] mb-2">Cupom de Desconto</label>
                <div className="flex gap-2">
                  <input 
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[var(--brand-500)] uppercase"
                    placeholder="Código"
                    value={couponCode}
                    onChange={(e) => setCouponCode(e.target.value)}
                  />
                  <button 
                    onClick={handleApplyCoupon}
                    disabled={couponLoading || !couponCode.trim()}
                    className="bg-gray-800 hover:bg-gray-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
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
                  className="text-gray-400 hover:text-white"
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
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-[var(--border)]">
              <span className="text-[var(--muted-fg)] font-medium">Total a pagar</span>
              <span className="text-2xl font-black text-[var(--brand-500)]">R$ {finalValue.toFixed(2).replace(".", ",")}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
