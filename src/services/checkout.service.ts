import { createHash, randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { ApiError, uuid, type Actor } from "@/lib/api";
import { allocateCents, discountedTotal, fromCents, toCents } from "@/lib/money";
import { isValidCPF } from "@/lib/cpf";
import { creditCardEnabled } from "@/lib/payment-methods";
import { generateTicketHash } from "@/lib/ticket/hash";
import { createOrFindCustomer, createPixCharge, createCreditCardCharge, getPixQrCode } from "@/lib/asaas/client";
import { confirmPayment, releaseFailedCheckout } from "@/services/payment.service";
import { sendTicketEmail } from "@/services/email.service";
import { format } from "date-fns";

type Card = { holderName: string; holderCpf: string; number: string; expiryMonth: string; expiryYear: string; ccv: string; installmentCount: number; postalCode: string; address: string; addressNumber: string; phone: string };
export type CheckoutInput = { tickets: { batchId: string; participantName: string; participantCpf: string }[]; paymentMethod: "PIX" | "CREDIT_CARD"; couponCode?: string; creditCardInfo?: Card };

export function checkoutInput(body: Record<string, unknown>): CheckoutInput {
  if (body.acceptedTerms !== true) throw new ApiError(400, "Você deve aceitar os Termos de Uso.");
  if (!Array.isArray(body.tickets) || body.tickets.length < 1 || body.tickets.length > 10) throw new ApiError(400, "Selecione de 1 a 10 ingressos por pedido.");
  if (body.paymentMethod !== "PIX" && body.paymentMethod !== "CREDIT_CARD") throw new ApiError(400, "Método de pagamento inválido.");
  const tickets = body.tickets.map(item => {
    if (!item || typeof item !== "object") throw new ApiError(400, "Participante inválido.");
    const record = item as Record<string, unknown>;
    const batchId = uuid(record.batchId, "Lote");
    if (typeof record.participantName !== "string" || record.participantName.trim().length < 2 || record.participantName.length > 120 || typeof record.participantCpf !== "string" || !isValidCPF(record.participantCpf)) throw new ApiError(400, "Nome ou CPF do participante inválido.");
    return { batchId, participantName: record.participantName.trim(), participantCpf: record.participantCpf.replace(/\D/g, "") };
  });
  let couponCode: string | undefined;
  if (body.couponCode !== undefined) {
    if (typeof body.couponCode !== "string" || body.couponCode.length > 64) throw new ApiError(400, "Cupom inválido.");
    couponCode = body.couponCode.toUpperCase().replace(/\s/g, "");
  }
  let creditCardInfo: Card | undefined;
  if (body.paymentMethod === "CREDIT_CARD") {
    if (!creditCardEnabled()) throw new ApiError(400, "A casa oferece somente Pix nesta etapa.", "PAYMENT_METHOD_DISABLED");
    const card = body.creditCardInfo as Record<string, unknown> | undefined;
    const required = ["holderName", "holderCpf", "number", "expiryMonth", "expiryYear", "ccv", "postalCode", "address", "addressNumber", "phone"];
    if (!card || required.some(key => typeof card[key] !== "string" || !String(card[key]).trim() || String(card[key]).length > 120) || !Number.isInteger(card.installmentCount) || Number(card.installmentCount) < 1 || Number(card.installmentCount) > 12) throw new ApiError(400, "Preencha os dados do titular e do cartão.");
    creditCardInfo = card as Card;
    if (creditCardInfo.installmentCount !== 1) throw new ApiError(400, "Cartão disponível somente à vista.");
    creditCardInfo = { ...creditCardInfo, number: creditCardInfo.number.replace(/\D/g, ""), holderCpf: creditCardInfo.holderCpf.replace(/\D/g, ""), postalCode: creditCardInfo.postalCode.replace(/\D/g, ""), phone: creditCardInfo.phone.replace(/\D/g, "") };
    if (!isValidCPF(creditCardInfo.holderCpf) || !/^\d{13,19}$/.test(creditCardInfo.number) || !/^\d{3,4}$/.test(creditCardInfo.ccv) || !/^\d{8}$/.test(creditCardInfo.postalCode) || !/^\d{10,11}$/.test(creditCardInfo.phone) || !/^\d{4}$/.test(creditCardInfo.expiryYear) || !/^(0?[1-9]|1[0-2])$/.test(creditCardInfo.expiryMonth)) throw new ApiError(400, "Dados de cobrança inválidos.");
  }
  return { tickets, paymentMethod: body.paymentMethod, couponCode, creditCardInfo };
}

async function reserveCheckout(actor: Actor, input: CheckoutInput, checkoutKey: string, requestHash: string, buyerIp: string | null, now: Date) {
  return prisma.$transaction(async tx => {
    // Serializes requests for the same buyer, including distinct retry keys.
    await tx.$queryRaw`SELECT id FROM users WHERE id = ${actor.id} FOR UPDATE`;
    const existing = await tx.payment.findUnique({ where: { checkoutKey } });
    if (existing) {
      if (existing.requestHash !== requestHash) throw new ApiError(409, "A chave deste pedido já foi usada com outros dados.", "IDEMPOTENCY_CONFLICT");
      return { payment: existing, created: false };
    }
    const pending = await tx.payment.count({ where: { status: "PENDING", tickets: { some: { userId: actor.id } } } });
    if (pending >= 3) throw new ApiError(429, "Você já possui três pedidos pendentes. Aguarde ou conclua um deles.", "PENDING_ORDER_LIMIT");
    const ids = [...new Set(input.tickets.map(item => item.batchId))].sort();
    await tx.$queryRaw(Prisma.sql`SELECT id FROM batches WHERE id IN (${Prisma.join(ids)}) ORDER BY id FOR UPDATE`);
    const batches = await tx.batch.findMany({ where: { id: { in: ids } }, include: { event: { include: { organizer: true } } } });
    if (batches.length !== ids.length) throw new ApiError(404, "Lote não encontrado.");
    if (new Set(batches.map(batch => batch.eventId)).size !== 1) throw new ApiError(400, "Compre ingressos de um único evento por pedido.");
    for (const batch of batches) {
      const quantity = input.tickets.filter(item => item.batchId === batch.id).length;
      if (batch.event.status !== "PUBLISHED" || (batch.startAt && batch.startAt > now) || (batch.endAt && batch.endAt < now)) throw new ApiError(409, "Lote indisponível para venda.");
      if (batch.soldQty + quantity > batch.totalQty) throw new ApiError(409, "Quantidade insuficiente no lote.", "INSUFFICIENT_STOCK");
    }
    const weights = input.tickets.map(ticket => toCents(batches.find(batch => batch.id === ticket.batchId)!.price));
    let total = weights.reduce((sum, value) => sum + value, 0);
    let couponId: string | undefined;
    if (input.couponCode) {
      const coupon = await tx.coupon.findUnique({ where: { eventId_code: { eventId: batches[0].eventId, code: input.couponCode } } });
      if (!coupon) throw new ApiError(400, "Cupom não encontrado.");
      await tx.$queryRaw`SELECT id FROM coupons WHERE id = ${coupon.id} FOR UPDATE`;
      const current = await tx.coupon.findUniqueOrThrow({ where: { id: coupon.id } });
      if (!current.active || (current.validUntil && current.validUntil < now) || (current.maxUses !== null && current.usedCount + current.reservedCount >= current.maxUses)) throw new ApiError(409, "Cupom inválido, expirado ou esgotado.");
      try { total = discountedTotal(total, current.discountType, current.discountValue); } catch { throw new ApiError(400, "Desconto inválido."); }
      couponId = coupon.id;
      await tx.coupon.update({ where: { id: coupon.id }, data: { reservedCount: { increment: 1 } } });
    }
    const allocation = allocateCents(total, weights);
    const paymentId = randomUUID();
    const payment = await tx.payment.create({ data: { id: paymentId, amount: fromCents(total), method: total === 0 ? "FREE" : input.paymentMethod,
      gateway: total === 0 ? "manual" : "asaas", checkoutKey, requestHash, checkoutState: "CREATING", stockReserved: true,
      couponId, couponReserved: Boolean(couponId), acceptedTermsAt: now, buyerIp, platformFeeBps: 1000 } });
    await tx.ticket.createMany({ data: input.tickets.map((ticket, index) => {
      const id = randomUUID();
      return { id, ...ticket, userId: actor.id, paymentId, unitPrice: fromCents(weights[index]), paidAmount: fromCents(allocation[index]), qrHash: generateTicketHash(id, batches[0].eventId, actor.id) };
    }) });
    for (const batch of batches) await tx.batch.update({ where: { id: batch.id }, data: { soldQty: { increment: input.tickets.filter(ticket => ticket.batchId === batch.id).length } } });
    return { payment, created: true };
  }, { maxWait: 5000, timeout: 5000 });
}

export async function notifyPaidTickets(tickets: Awaited<ReturnType<typeof confirmPayment>>) {
  for (const ticket of tickets) await sendTicketEmail(ticket.user.email, { participantName: ticket.participantName, eventName: ticket.batch.event.title,
    eventDate: format(ticket.batch.event.date, "dd/MM/yyyy HH:mm"), venue: ticket.batch.event.venue, qrHash: ticket.qrHash });
}

export async function checkout(actor: Actor, input: CheckoutInput, requestKey: string, buyerIp: string | null, now = new Date()) {
  if (input.paymentMethod === "CREDIT_CARD" && (!creditCardEnabled() || input.creditCardInfo?.installmentCount !== 1)) throw new ApiError(400, "Cartão indisponível ou parcelamento não permitido.");
  uuid(requestKey, "Chave do pedido");
  if (!actor.cpf || !isValidCPF(actor.cpf)) throw new ApiError(400, "Preencha um CPF válido no seu perfil antes de comprar.");
  const checkoutKey = createHash("sha256").update(`${actor.id}:${requestKey}`).digest("hex");
  // Card number and CVV never enter persistence, logs or the idempotency fingerprint.
  const requestHash = createHash("sha256").update(JSON.stringify({ tickets: input.tickets, method: input.paymentMethod, coupon: input.couponCode, installments: input.creditCardInfo?.installmentCount })).digest("hex");
  const reservation = await reserveCheckout(actor, input, checkoutKey, requestHash, buyerIp, now);
  let payment = reservation.payment;
  if (reservation.created) {
    let chargeStarted = false;
    try {
      if (payment.method === "FREE") {
        await notifyPaidTickets(await confirmPayment(payment.id, { id: `FREE_${payment.id}`, value: 0 }, now));
      } else {
        const customer = await createOrFindCustomer({ name: actor.name, email: actor.email, cpfCnpj: actor.cpf, externalReference: actor.id });
        const ticket = await prisma.ticket.findFirstOrThrow({ where: { paymentId: payment.id }, include: { batch: { include: { event: { include: { organizer: true } } } } } });
        const wallet = ticket.batch.event.organizer.asaasWalletId;
        const common = { customer: customer.id, value: Number(payment.amount), dueDate: format(new Date(now.getTime() + 86400000), "yyyy-MM-dd"),
          description: ticket.batch.event.title, externalReference: `ticket-engine:${payment.id}`, split: wallet ? [{ walletId: wallet, percentualValue: 90 }] : undefined };
        chargeStarted = true;
        const card = input.creditCardInfo;
        const charge = payment.method === "CREDIT_CARD" && card
          ? await createCreditCardCharge({ ...common, billingType: "CREDIT_CARD",
            creditCard: { holderName: card.holderName, number: card.number, expiryMonth: card.expiryMonth, expiryYear: card.expiryYear, ccv: card.ccv },
            creditCardHolderInfo: { name: card.holderName, email: actor.email, cpfCnpj: card.holderCpf, postalCode: card.postalCode, address: card.address, addressNumber: card.addressNumber, addressComplement: null, phone: card.phone, mobilePhone: card.phone } })
          : await createPixCharge({ ...common, billingType: "PIX" });
        await prisma.payment.update({ where: { id: payment.id }, data: { gatewayId: charge.id, checkoutState: "READY", ...(charge.netValue !== undefined ? { gatewayNetAmount: charge.netValue } : {}) } });
        if (["CONFIRMED", "RECEIVED"].includes(charge.status)) await notifyPaidTickets(await confirmPayment(payment.id, charge, now));
      }
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      const rejected = !chargeStarted || (status !== undefined && status >= 400 && status < 500 && ![408, 409, 429].includes(status));
      if (rejected) { await releaseFailedCheckout(payment.id); throw new ApiError(400, "Não foi possível criar a cobrança. Nenhum estoque foi consumido.", "CHARGE_REJECTED"); }
      await prisma.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { checkoutState: "UNKNOWN" } });
    }
  }
  payment = await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } });
  if (payment.status === "FAILED") throw new ApiError(409, "Pedido recusado. Inicie uma nova tentativa.", "CHARGE_REJECTED");
  if (payment.checkoutState === "CREATING" || payment.checkoutState === "UNKNOWN" || (payment.method === "CREDIT_CARD" && payment.status === "PENDING")) return { success: false, pending: true, paymentId: payment.id, error: "Pagamento em verificação. Não crie outra cobrança; consulte este pedido novamente.", code: "PAYMENT_PROCESSING" };
  if (payment.method === "PIX" && payment.gatewayId && !payment.pixCode && payment.status === "PENDING") {
    const qr = await getPixQrCode(payment.gatewayId);
    payment = await prisma.payment.update({ where: { id: payment.id }, data: { pixCode: qr.payload, pixQrUrl: qr.encodedImage, expiresAt: new Date(qr.expirationDate) } });
  }
  return { success: true, pending: false, paymentId: payment.id, paymentMethod: payment.method, status: payment.status, pixCode: payment.pixCode, pixQrBase64: payment.pixQrUrl };
}
