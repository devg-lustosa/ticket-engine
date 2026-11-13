import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import EventsPage from "@/app/eventos/page";
import { prisma } from "@/lib/prisma";
import { GET as bordero } from "@/app/api/painel/eventos/[id]/bordero/route";
import { POST as checkin } from "@/app/api/checkin/route";
import { POST as refund } from "@/app/api/tickets/[ticketId]/refund/route";
import { POST as webhook } from "@/app/api/webhooks/asaas/route";
import { PATCH as editEvent, PUT as updateEvent, DELETE as removeEvent } from "@/app/api/painel/eventos/[id]/route";
import { DELETE as deleteCoupon } from "@/app/api/painel/eventos/[id]/cupons/[couponId]/route";
import { POST as courtesy } from "@/app/api/painel/eventos/[id]/cortesias/route";
import { PATCH as transfer } from "@/app/api/tickets/[ticketId]/participant/route";
import { GET as sync } from "@/app/api/portaria/sync/route";
import { GET as paymentStatus } from "@/app/api/payments/[paymentId]/route";
import { GET as diagnosticEnv } from "@/app/api/test-env/route";
import { GET as diagnosticEmail } from "@/app/api/test-email/route";
import { checkout, checkoutInput, type CheckoutInput } from "@/services/checkout.service";
import { confirmPayment } from "@/services/payment.service";
import { reconcileRefunds } from "@/services/refund.service";
import { generateTicketHash } from "@/lib/ticket/hash";
import { salesForEvents } from "@/services/sales.service";

const gateway = vi.hoisted(() => ({ refundCharge: vi.fn(), cancelCharge: vi.fn(), getCharge: vi.fn(), createOrFindCustomer: vi.fn(), createPixCharge: vi.fn(), createCreditCardCharge: vi.fn(), getPixQrCode: vi.fn() }));
const email = vi.hoisted(() => ({ sendTicketEmail: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: { id: "auth-current" } } }) },
}) }));
vi.mock("@/lib/asaas/client", () => gateway);
vi.mock("@/services/email.service", () => email);
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn(), unstable_cache: (fn: (...args: unknown[]) => unknown) => async (...args: unknown[]) => JSON.parse(JSON.stringify(await fn(...args))) }));

const now = new Date("2026-11-11T12:00:00.000Z");

async function fixture(quantity = 3, total = 150, role: "BUYER" | "ORGANIZER" | "STAFF" = "ORGANIZER") {
  const user = await prisma.user.create({ data: { authId: "auth-current", email: "current@example.test", name: "Operador", cpf: "52998224725", role } });
  const event = await prisma.event.create({ data: { slug: "evento-teste", title: "Evento de Teste", venue: "Local", date: new Date("2026-12-11T12:00:00Z"), status: "PUBLISHED", organizerId: user.id } });
  const batch = await prisma.batch.create({ data: { eventId: event.id, name: "Pista", price: 50, totalQty: 100, soldQty: quantity } });
  const payment = await prisma.payment.create({ data: {
    amount: total, method: "PIX", status: "PAID", gatewayId: "pay_test", paidAt: now,
    tickets: { create: Array.from({ length: quantity }, (_, index) => ({
      batchId: batch.id, userId: user.id, participantName: "Participante", participantCpf: "52998224725",
      qrHash: "qr-fixture-" + index, status: "ACTIVE" as const, unitPrice: 50, paidAmount: total / quantity, createdAt: now,
    })) },
  }, include: { tickets: true } });
  return { user, event, batch, payment, ticket: payment.tickets[0] };
}

beforeEach(async () => {
  if (new URL(process.env.DATABASE_URL!).pathname !== "/ticket_engine_test") throw new Error("Banco descartável obrigatório.");
  await prisma.$executeRaw`TRUNCATE TABLE refunds, tickets, payments, coupons, batches, events, users CASCADE`;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(now);
  vi.stubEnv("ENABLE_CREDIT_CARD", "true");
  gateway.refundCharge.mockReset().mockImplementation(async (id, value, description) => ({ id, status: "RECEIVED", refunds: [{ status: "DONE", value, description }] }));
  gateway.getCharge.mockReset().mockImplementation(async (id) => {
    const payment = await prisma.payment.findUniqueOrThrow({ where: { gatewayId: id } });
    return { id, status: "RECEIVED", value: Number(payment.amount), refunds: [] };
  });
  gateway.cancelCharge.mockReset().mockImplementation(async id => ({ id, deleted: true }));
  gateway.createOrFindCustomer.mockReset().mockResolvedValue({ id: "cus_test" });
  gateway.createPixCharge.mockReset().mockImplementation(async input => ({ id: "pay_" + input.externalReference.replace(/[^\w]/g, "_"), status: "PENDING", value: input.value, netValue: input.value }));
  gateway.createCreditCardCharge.mockReset().mockImplementation(async input => ({ id: "card_" + input.externalReference.replace(/[^\w]/g, "_"), status: "CONFIRMED", value: input.value, netValue: input.value }));
  gateway.getPixQrCode.mockReset().mockResolvedValue({ payload: "PIX_TEST", encodedImage: "TEST_IMAGE", expirationDate: "2026-11-12T12:00:00Z" });
  email.sendTicketEmail.mockReset().mockResolvedValue(undefined);
});

function key(index = 1) { return "00000000-0000-4000-8000-" + String(index).padStart(12, "0"); }
function cpf(index: number) {
  const digits = String(100000000 + index).split("").map(Number);
  const digit = (values: number[]) => { const result = values.reduce((sum, value, i) => sum + value * (values.length + 1 - i), 0) * 10 % 11; return result === 10 ? 0 : result; };
  digits.push(digit(digits)); digits.push(digit(digits)); return digits.join("");
}
async function buyer(index: number) {
  return prisma.user.create({ data: { authId: "buyer-" + index, email: `buyer-${index}@example.test`, name: "Comprador " + index, role: "BUYER", cpf: cpf(index) } });
}
function order(batchId: string, couponCode?: string): CheckoutInput {
  return { tickets: [{ batchId, participantName: "Participante", participantCpf: "52998224725" }], paymentMethod: "PIX", couponCode };
}
function refundRequest(ticketId: string) {
  return refund(new NextRequest("http://localhost/api/tickets/" + ticketId + "/refund", { method: "POST" }), { params: Promise.resolve({ ticketId }) });
}

describe("concorrência e reconciliação financeira", () => {
  it("deveEnviarUmUnicoEstornoEmVinteSolicitacoesDoMesmoIngresso", async () => {
    const data = await fixture(2, 80, "BUYER");
    const responses = await Promise.all(Array.from({ length: 20 }, () => refundRequest(data.ticket.id)));
    expect(responses.every(response => response.status === 200 || response.status === 202)).toBe(true);
    expect(gateway.refundCharge).toHaveBeenCalledTimes(1);
    expect(await prisma.refund.count()).toBe(1);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
  });

  it("deveLimitarEstornosDosDoisIngressosAoTotalPago", async () => {
    const data = await fixture(2, 80, "BUYER");
    await Promise.all(data.payment.tickets.map(ticket => refundRequest(ticket.id)));
    expect(gateway.refundCharge.mock.calls.map(call => call[1])).toEqual([40, 40]);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: data.payment.id } })).status).toBe("REFUNDED");
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(0);
  });

  it("deveManterEstornoIncertoSemRepetirChamadaAoGateway", async () => {
    const data = await fixture(1, 40, "STAFF");
    gateway.refundCharge.mockRejectedValueOnce(new Error("socket timeout"));
    const first = await refundRequest(data.ticket.id);
    const replay = await refundRequest(data.ticket.id);
    expect(first.status).toBe(202); expect(replay.status).toBe(202);
    expect(gateway.refundCharge).toHaveBeenCalledTimes(1);
    expect((await prisma.refund.findUniqueOrThrow({ where: { ticketId: data.ticket.id } })).status).toBe("UNKNOWN");
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: data.ticket.id } })).status).toBe("CANCELLED");
  });

  it("deveRestaurarIngressoQuandoGatewayRecusarEstorno", async () => {
    const data = await fixture(1, 40, "BUYER");
    gateway.refundCharge.mockRejectedValueOnce({ response: { status: 400 } });
    const response = await refundRequest(data.ticket.id);
    expect(response.status).toBe(400);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: data.ticket.id } })).status).toBe("ACTIVE");
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
  });

  it("deveConcluirEstornoPendenteSomenteQuandoGatewayInformarDone", async () => {
    const data = await fixture(1, 40, "BUYER");
    gateway.refundCharge.mockImplementationOnce(async (id, value, description) => ({ id, refunds: [{ status: "PENDING", value, description }] }));
    expect((await refundRequest(data.ticket.id)).status).toBe(202);
    const record = await prisma.refund.findUniqueOrThrow({ where: { ticketId: data.ticket.id } });
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
    await Promise.all(Array.from({ length: 10 }, () => reconcileRefunds(data.payment.id, [{ status: "DONE", value: 40, description: `ticket-refund:${record.id}` }])));
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(0);
  });

  it("deveBloquearEstornoSemSnapshotHistoricoEmVezDeUsarPrecoAtual", async () => {
    const data = await fixture(1, 40, "BUYER");
    await prisma.ticket.update({ where: { id: data.ticket.id }, data: { paidAmount: null } });
    expect((await refundRequest(data.ticket.id)).status).toBe(409);
    expect(gateway.refundCharge).not.toHaveBeenCalled();
  });

  it("deveRejeitarEstornoQueSomadoAOutroExternoUltrapassePagamento", async () => {
    const data = await fixture(2, 80, "BUYER");
    gateway.getCharge.mockResolvedValueOnce({ id: "pay_test", value: 80, refunds: [{ status: "DONE", value: 60, description: "externo" }] });
    expect((await refundRequest(data.ticket.id)).status).toBe(409);
    expect(gateway.refundCharge).not.toHaveBeenCalled();
  });
});

describe("estoque e pedidos sob disputa", () => {
  it("deveReservarUltimoIngressoParaApenasUmDeVinteCompradores", async () => {
    const data = await fixture(0, 0);
    await prisma.batch.update({ where: { id: data.batch.id }, data: { totalQty: 1 } });
    const buyers = await Promise.all(Array.from({ length: 20 }, (_, index) => buyer(index)));
    const results = await Promise.allSettled(buyers.map((actor, index) => checkout(actor, order(data.batch.id), key(index), null, now)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect(gateway.createPixCharge).toHaveBeenCalledTimes(1);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
  });

  it("deveCriarUmaCobrancaParaVinteReenviosDaMesmaChave", async () => {
    const data = await fixture(0, 0);
    const responses = await Promise.all(Array.from({ length: 20 }, () => checkout(data.user, order(data.batch.id), key(), null, now)));
    expect(new Set(responses.map(response => response.paymentId)).size).toBe(1);
    expect(gateway.createPixCharge).toHaveBeenCalledTimes(1);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
  });

  it("deveRecusarReusoDaChaveComParticipanteDiferente", async () => {
    const data = await fixture(0, 0);
    await checkout(data.user, order(data.batch.id), key(), null, now);
    const changed = order(data.batch.id); changed.tickets[0].participantName = "Outro Participante";
    await expect(checkout(data.user, changed, key(), null, now)).rejects.toMatchObject({ status: 409, code: "IDEMPOTENCY_CONFLICT" });
    expect(gateway.createPixCharge).toHaveBeenCalledTimes(1);
  });

  it("deveReservarUltimoUsoDoCupomParaUmUnicoPedido", async () => {
    const data = await fixture(0, 0);
    const coupon = await prisma.coupon.create({ data: { eventId: data.event.id, code: "UNICO", discountType: "PERCENTAGE", discountValue: 20, maxUses: 1 } });
    const buyers = await Promise.all(Array.from({ length: 10 }, (_, index) => buyer(index)));
    const results = await Promise.allSettled(buyers.map((actor, index) => checkout(actor, order(data.batch.id, "UNICO"), key(index), null, now)));
    expect(results.filter(result => result.status === "fulfilled")).toHaveLength(1);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).reservedCount).toBe(1);
  });

  it("deveLiberarReservaQuandoGatewayRecusarCobranca", async () => {
    const data = await fixture(0, 0);
    gateway.createPixCharge.mockRejectedValueOnce({ response: { status: 400 } });
    await expect(checkout(data.user, order(data.batch.id), key(), null, now)).rejects.toMatchObject({ status: 400 });
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(0);
    expect(await prisma.ticket.count({ where: { status: "ACTIVE" } })).toBe(0);
  });

  it("devePreservarReservaSemRepetirCobrancaAposTimeout", async () => {
    const data = await fixture(0, 0);
    gateway.createPixCharge.mockRejectedValueOnce(new Error("timeout"));
    const result = await checkout(data.user, order(data.batch.id), key(), null, now);
    expect(result.pending).toBe(true);
    expect((await checkout(data.user, order(data.batch.id), key(), null, now)).paymentId).toBe(result.paymentId);
    expect(gateway.createPixCharge).toHaveBeenCalledTimes(1);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
  });

  it("deveConcluirCompraGratuitaSemCriarCobrancaDeValorZero", async () => {
    const data = await fixture(0, 0);
    await prisma.coupon.create({ data: { eventId: data.event.id, code: "GRATIS", discountType: "PERCENTAGE", discountValue: 100 } });
    const result = await checkout(data.user, order(data.batch.id, "GRATIS"), key(), null, now);
    expect(result).toMatchObject({ status: "PAID", paymentMethod: "FREE" });
    expect(gateway.createPixCharge).not.toHaveBeenCalled();
  });

  it("deveAtivarQrECupomUmaVezEmVinteWebhooksSimultaneos", async () => {
    const data = await fixture(1, 50);
    const coupon = await prisma.coupon.create({ data: { eventId: data.event.id, code: "PAGO", discountValue: 1, reservedCount: 1 } });
    await prisma.payment.update({ where: { id: data.payment.id }, data: { status: "PENDING", couponId: coupon.id, couponReserved: true } });
    await prisma.ticket.update({ where: { id: data.ticket.id }, data: { status: "PENDING" } });
    const responses = await Promise.all(Array.from({ length: 20 }, () => webhook(new NextRequest("http://localhost/api/webhooks/asaas", { method: "POST", headers: { "Content-Type": "application/json", "asaas-access-token": process.env.ASAAS_WEBHOOK_SECRET! }, body: JSON.stringify({ event: "PAYMENT_CONFIRMED", payment: { id: "pay_test", value: 50, netValue: 48 } }) }))));
    expect(responses.every(response => response.status === 200)).toBe(true);
    expect((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).usedCount).toBe(1);
    expect(email.sendTicketEmail).toHaveBeenCalledTimes(1);
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: data.ticket.id } })).qrHash).toBe(generateTicketHash(data.ticket.id, data.event.id, data.user.id));
  });
});

describe("autorização e limites de confiança", () => {
  it("deveOcultarDiagnosticoDeVariaveisEmProducao", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect((await diagnosticEnv()).status).toBe(404);
  });

  it("deveImpedirEnvioDeEmailPorGetPublico", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const response = await diagnosticEmail(new NextRequest("http://localhost/api/test-email?to=outro@example.test"));
    expect(response.status).toBe(404);
    expect(email.sendTicketEmail).not.toHaveBeenCalled();
  });

  it("deveBaixarSomenteIngressosDoEventoSelecionado", async () => {
    const data = await fixture(1, 50, "STAFF");
    const other = await prisma.event.create({ data: { slug: "outro", title: "Outro", venue: "Local", date: data.event.date, organizerId: data.user.id, status: "PUBLISHED" } });
    const response = await sync(new NextRequest("http://localhost/api/portaria/sync?eventId=" + other.id));
    expect((await response.json()).tickets).toEqual([]);
  });

  it("deveRecusarOrganizadorNaPortariaDeOutroOrganizador", async () => {
    const data = await fixture(1, 50);
    const otherOwner = await buyer(1);
    await prisma.event.update({ where: { id: data.event.id }, data: { organizerId: otherOwner.id } });
    expect((await sync(new NextRequest("http://localhost/api/portaria/sync?eventId=" + data.event.id))).status).toBe(404);
  });

  it.each([["PATCH", editEvent], ["PUT", updateEvent], ["DELETE", removeEvent]] as const)("deveImpedir%sDeEventoDeOutroOrganizador", async (method, handler) => {
    const data = await fixture(1, 50);
    const other = await buyer(1);
    await prisma.event.update({ where: { id: data.event.id }, data: { organizerId: other.id } });
    const response = await handler(new NextRequest("http://localhost/api/painel/eventos/" + data.event.id, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "CANCELLED" }) }), { params: Promise.resolve({ id: data.event.id }) });
    expect(response.status).toBe(404);
    expect((await prisma.event.findUniqueOrThrow({ where: { id: data.event.id } })).status).toBe("PUBLISHED");
  });

  it("deveImpedirExclusaoDeCupomQueNaoPertenceAoEventoDaUrl", async () => {
    const data = await fixture(1, 50);
    const other = await prisma.event.create({ data: { slug: "outro", title: "Outro", venue: "Local", date: data.event.date, organizerId: data.user.id } });
    const coupon = await prisma.coupon.create({ data: { eventId: other.id, code: "OUTRO", discountValue: 10 } });
    const response = await deleteCoupon(new NextRequest("http://localhost/api/painel/eventos/" + data.event.id + "/cupons/" + coupon.id), { params: Promise.resolve({ id: data.event.id, couponId: coupon.id }) });
    expect(response.status).toBe(404);
    expect(await prisma.coupon.count({ where: { id: coupon.id } })).toBe(1);
  });

  it("deveImpedirTransferenciaDeIngressoJaUsado", async () => {
    const data = await fixture(1, 50);
    await prisma.ticket.update({ where: { id: data.ticket.id }, data: { status: "USED" } });
    const response = await transfer(new NextRequest("http://localhost/api/tickets/" + data.ticket.id + "/participant", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantName: "Outro Nome", participantCpf: "52998224725", participantEmail: "outro@example.test" }) }), { params: Promise.resolve({ ticketId: data.ticket.id }) });
    expect(response.status).toBe(409);
  });

  it("deveImpedirCortesiaAcimaDaCapacidadeDoLote", async () => {
    const data = await fixture(0, 0);
    await prisma.batch.update({ where: { id: data.batch.id }, data: { totalQty: 1 } });
    const response = await courtesy(new NextRequest("http://localhost/api/painel/eventos/" + data.event.id + "/cortesias", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ quantity: 5, name: "Convidado", email: "convidado@example.test", batchId: data.batch.id }) }), { params: Promise.resolve({ id: data.event.id }) });
    expect(response.status).toBe(409);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(0);
  });

  it("deveRecusarReembolsoEnviadoPorOutraOrigemSemMudarSaldo", async () => {
    const data = await fixture(1, 40, "BUYER");
    const response = await refund(new NextRequest("http://localhost/api/tickets/" + data.ticket.id + "/refund", { method: "POST", headers: { Origin: "https://outro.example" } }), { params: Promise.resolve({ ticketId: data.ticket.id }) });
    expect(response.status).toBe(403);
    expect(gateway.refundCharge).not.toHaveBeenCalled();
  });

  it("deveRecusarConsultaDePagamentoDeOutroComprador", async () => {
    const data = await fixture(1, 50);
    const other = await buyer(1);
    await prisma.ticket.update({ where: { id: data.ticket.id }, data: { userId: other.id } });
    expect((await paymentStatus(new NextRequest("http://localhost/api/payments/" + data.payment.id), { params: Promise.resolve({ paymentId: data.payment.id }) })).status).toBe(404);
  });
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
afterAll(() => prisma.$disconnect());

describe("regressões dos tickets", () => {
  it("deveSomarPagamentoUmaVezMesmoComTresIngressos", async () => {
    const data = await fixture();
    const response = await bordero(new NextRequest("http://localhost/api/painel/eventos/" + data.event.id + "/bordero"), { params: Promise.resolve({ id: data.event.id }) });
    const body = await response.json();
    expect(body.summary.grossRevenue).toBe(150);
    expect(body.batches[0].revenue).toBe(150);
    expect(body.summary.totalPaidTickets).toBe(3);
  });

  it("deveEstornarSomenteAParcelaPagaComDesconto", async () => {
    const data = await fixture(2, 80, "BUYER");
    const response = await refund(new NextRequest("http://localhost/api/tickets/" + data.ticket.id + "/refund", { method: "POST" }), { params: Promise.resolve({ ticketId: data.ticket.id }) });
    expect(response.status).toBe(200);
    expect(gateway.refundCharge.mock.calls[0][1]).toBe(40);
  });

  it("deveRecusarIngressoDeOutroEventoSemConsumirEntrada", async () => {
    const data = await fixture(1, 50, "STAFF");
    const other = await prisma.event.create({ data: { slug: "outro", title: "Outro Evento", venue: "Local", date: data.event.date, status: "PUBLISHED", organizerId: data.user.id } });
    const response = await checkin(new NextRequest("http://localhost/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qrHash: data.ticket.qrHash, eventId: other.id }) }));
    expect(response.status).toBe(409);
    expect((await response.json()).error).toBe("Ingresso inválido para este evento (Válido para: Evento de Teste)");
    expect((await prisma.ticket.findUniqueOrThrow({ where: { id: data.ticket.id } })).status).toBe("ACTIVE");
  });

  it("deveExigirEventoNoCheckin", async () => {
    const data = await fixture(1, 50, "STAFF");
    const response = await checkin(new NextRequest("http://localhost/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qrHash: data.ticket.qrHash }) }));
    expect(response.status).toBe(400);
  });

  it("devePermitirApenasUmaEntradaEmVinteLeiturasConcorrentes", async () => {
    const data = await fixture(1, 50, "STAFF");
    const responses = await Promise.all(Array.from({ length: 20 }, () => checkin(new NextRequest("http://localhost/api/checkin", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ qrHash: data.ticket.qrHash, eventId: data.event.id }) }))));
    expect(responses.filter(response => response.status === 200)).toHaveLength(1);
    expect(responses.filter(response => response.status === 409)).toHaveLength(19);
  });
});

function pixWebhook(event: string, gatewayId: string) {
  return webhook(new NextRequest('http://localhost/api/webhooks/asaas', { method: 'POST', headers: { 'Content-Type': 'application/json', 'asaas-access-token': process.env.ASAAS_WEBHOOK_SECRET! }, body: JSON.stringify({ event, payment: { id: gatewayId, value: 50 } }) }));
}

describe('cancelamento seguro de Pix', () => {
  it('deveCancelarCobrancaVencidaAntesDeDevolverEstoque', async () => {
    const data = await fixture(0, 0);
    const result = await checkout(data.user, order(data.batch.id), key(), null, now);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: result.paymentId } });
    gateway.getCharge.mockResolvedValue({ id: payment.gatewayId, value: 50, status: 'OVERDUE', deleted: false });
    expect((await pixWebhook('PAYMENT_OVERDUE', payment.gatewayId!)).status).toBe(200);
    expect(gateway.cancelCharge).toHaveBeenCalledWith(payment.gatewayId);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(0);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('FAILED');
  });
  it('deveLiberarReservaUmaVezEmCancelamentosRepetidos', async () => {
    const data = await fixture(0, 0);
    const result = await checkout(data.user, order(data.batch.id), key(), null, now);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: result.paymentId } });
    gateway.getCharge.mockResolvedValue({ id: payment.gatewayId, value: 50, status: 'PENDING', deleted: true });
    await Promise.all(Array.from({ length: 10 }, () => pixWebhook('PAYMENT_DELETED', payment.gatewayId!)));
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(0);
    expect(await prisma.ticket.count({ where: { paymentId: payment.id, status: 'CANCELLED' } })).toBe(1);
  });
  it('devePreservarEstoqueQuandoCancelamentoNoGatewayForIncerto', async () => {
    const data = await fixture(0, 0);
    const result = await checkout(data.user, order(data.batch.id), key(), null, now);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: result.paymentId } });
    gateway.getCharge.mockResolvedValue({ id: payment.gatewayId, value: 50, status: 'OVERDUE', deleted: false });
    gateway.cancelCharge.mockRejectedValueOnce(new Error('timeout'));
    expect((await pixWebhook('PAYMENT_OVERDUE', payment.gatewayId!)).status).toBe(503);
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
  });
  it('deveConfirmarPixPagoAntesDeProcessarAvisoAntigoDeVencimento', async () => {
    const data = await fixture(0, 0);
    const result = await checkout(data.user, order(data.batch.id), key(), null, now);
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: result.paymentId } });
    gateway.getCharge.mockResolvedValue({ id: payment.gatewayId, value: 50, status: 'RECEIVED' });
    expect((await pixWebhook('PAYMENT_OVERDUE', payment.gatewayId!)).status).toBe(200);
    expect(gateway.cancelCharge).not.toHaveBeenCalled();
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status).toBe('PAID');
    expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
  });
});

describe('titular do cartão e confirmação imediata', () => {
  function cardOrder(batchId: string) {
    return { ...order(batchId), acceptedTerms: true, paymentMethod: 'CREDIT_CARD', creditCardInfo: { holderName: 'Titular Teste', holderCpf: '52998224725', number: '4111111111111111', expiryMonth: '12', expiryYear: '2028', ccv: '123', installmentCount: 1, postalCode: '01310100', address: 'Avenida Paulista', addressNumber: '100', phone: '11987654321' } };
  }
  it('deveEnviarEnderecoRealDoTitularEAtivarQrNoCartaoConfirmado', async () => {
    const data = await fixture(0, 0);
    const result = await checkout(data.user, checkoutInput(cardOrder(data.batch.id)), key(), null, now);
    expect(result.status).toBe('PAID');
    expect(gateway.createCreditCardCharge.mock.calls[0][0].creditCardHolderInfo).toMatchObject({ postalCode: '01310100', address: 'Avenida Paulista', addressNumber: '100', phone: '11987654321' });
    expect(email.sendTicketEmail).toHaveBeenCalledTimes(1);
    expect(await prisma.ticket.count({ where: { paymentId: result.paymentId, status: 'ACTIVE' } })).toBe(1);
  });
  it('deveRecusarCartaoSemLogradouroEmVezDeEnviarEnderecoFicticio', async () => {
    const data = await fixture(0, 0);
    const input = cardOrder(data.batch.id); input.creditCardInfo.address = '';
    expect(() => checkoutInput(input)).toThrow();
    expect(gateway.createCreditCardCharge).not.toHaveBeenCalled();
  });
  it('deveRecusarParcelamentoAntesDeReservarEstoque', async () => {
    const data = await fixture(0, 0);
    const input = cardOrder(data.batch.id); input.creditCardInfo.installmentCount = 2;
    expect(() => checkoutInput(input)).toThrow();
    expect(gateway.createCreditCardCharge).not.toHaveBeenCalled();
  });
  it('deveManterCartaoEmAnaliseNoMesmoPedidoAteConfirmacao', async () => {
    const data = await fixture(0, 0);
    gateway.createCreditCardCharge.mockImplementationOnce(async input => ({ id: 'card_risk_analysis', status: 'AWAITING_RISK_ANALYSIS', value: input.value, netValue: input.value }));
    const input = checkoutInput(cardOrder(data.batch.id));
    const result = await checkout(data.user, input, key(), null, now);
    expect(result.pending).toBe(true);
    expect((await checkout(data.user, input, key(), null, now)).paymentId).toBe(result.paymentId);
    expect(gateway.createCreditCardCharge).toHaveBeenCalledTimes(1);
    const response = await paymentStatus(new NextRequest('http://localhost/api/payments/' + result.paymentId), { params: Promise.resolve({ paymentId: result.paymentId }) });
    expect((await response.json()).pending).toBe(true);
    expect(await prisma.ticket.count({ where: { paymentId: result.paymentId, status: 'ACTIVE' } })).toBe(0);
  });

  it('deveRecusarCartaoQuandoACasaOferecerSomentePix', async () => {
    const data = await fixture(0, 0);
    vi.stubEnv('ENABLE_CREDIT_CARD', 'false');
    expect(() => checkoutInput(cardOrder(data.batch.id))).toThrow();
    expect(gateway.createCreditCardCharge).not.toHaveBeenCalled();
  });
});

it('deveReativarIngressoQuandoEstornoPendenteForCanceladoNoGateway', async () => {
  const data = await fixture(1, 40, 'BUYER');
  gateway.refundCharge.mockImplementationOnce(async (id, value, description) => ({ id, refunds: [{ status: 'PENDING', value, description }] }));
  await refundRequest(data.ticket.id);
  const record = await prisma.refund.findUniqueOrThrow({ where: { ticketId: data.ticket.id } });
  await reconcileRefunds(data.payment.id, [{ status: 'CANCELLED', value: 40, description: 'ticket-refund:' + record.id }]);
  expect((await prisma.ticket.findUniqueOrThrow({ where: { id: data.ticket.id } })).status).toBe('ACTIVE');
  expect((await prisma.refund.findUniqueOrThrow({ where: { id: record.id } })).status).toBe('FAILED');
  expect((await prisma.batch.findUniqueOrThrow({ where: { id: data.batch.id } })).soldQty).toBe(1);
});

it('deveRenderizarCatalogoComPrecoDisponivelAposSerializacaoDoCache', async () => {
  const data = await fixture(0, 0);
  await prisma.batch.update({ where: { id: data.batch.id }, data: { startAt: new Date('2026-11-11T11:00:00Z'), endAt: new Date('2026-11-12T12:00:00Z') } });
  const html = renderToStaticMarkup(await EventsPage());
  expect(html).toContain('Evento de Teste');
  expect(html).toContain('A partir de');
  expect(html).toContain('50,00');
});
