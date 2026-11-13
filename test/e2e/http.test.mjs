import fs from "node:fs";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, afterEach, before, test } from "node:test";
import { createServerClient } from "@supabase/ssr";
import { PrismaClient } from "@prisma/client";

process.loadEnvFile(".env");
const state = JSON.parse(fs.readFileSync("supabase/.temp/e2e-state.json", "utf8"));
if (state.phase !== "pronto" || new URL(state.databaseUrl).pathname !== "/ticket_engine_e2e" || state.appUrl !== "http://localhost:3101") throw new Error("Inicie o servidor E2E descartável antes desta suíte.");
const prisma = new PrismaClient({ datasources: { db: { url: state.databaseUrl } } });
const [buyer, organizer, staff, otherOrganizer] = state.actors;
const sessions = new Map(), cases = [];

before(async () => {
  for (const actor of state.actors) {
    let cookies = [];
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      cookies: { getAll: () => cookies, setAll: values => { cookies = values; } },
    });
    const { error } = await client.auth.signInWithPassword({ email: actor.email, password: state.password });
    assert.equal(error, null, "Login da identidade sintética deve funcionar.");
    sessions.set(actor.id, cookies.map(cookie => cookie.name + "=" + cookie.value).join("; "));
  }
});
afterEach(async () => {
  const ids = cases.splice(0);
  const payments = await prisma.payment.findMany({ where: { tickets: { some: { batch: { eventId: { in: ids } } } } }, select: { id: true } });
  await prisma.refund.deleteMany({ where: { paymentId: { in: payments.map(payment => payment.id) } } });
  await prisma.ticket.deleteMany({ where: { batch: { eventId: { in: ids } } } });
  await prisma.payment.deleteMany({ where: { id: { in: payments.map(payment => payment.id) } } });
  await prisma.event.deleteMany({ where: { id: { in: ids } } });
});
after(() => prisma.$disconnect());

async function api(actor, path, method = "GET", body, extraHeaders = {}) {
  const response = await fetch(state.appUrl + path, { method, redirect: "manual", headers: {
    ...(actor ? { Cookie: sessions.get(actor.id) } : {}), Origin: state.appUrl,
    ...(body !== undefined ? { "Content-Type": "application/json" } : {}), ...extraHeaders,
  }, ...(body !== undefined ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });
  const type = response.headers.get("content-type");
  const data = type?.includes("application/json") ? await response.json() : null;
  return { status: response.status, data, location: response.headers.get("location") };
}
async function control(path = "/gateway", body) {
  const response = await fetch(state.controlUrl + path, { method: body ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-e2e-control": state.token }, ...(body ? { body: JSON.stringify(body) } : {}) });
  assert.equal(response.status, 200, "Controle do simulador deve responder."); return response.json();
}
async function fixture(totalQty = 30, owner = organizer) {
  const event = await prisma.event.create({ data: { slug: "http-" + randomUUID(), title: "Evento HTTP QA", venue: "Local sintético", date: new Date("2030-12-20T23:00:00Z"), status: "PUBLISHED", organizerId: owner.id } });
  cases.push(event.id);
  const batch = await prisma.batch.create({ data: { eventId: event.id, name: "Pista", price: 50, totalQty } });
  return { event, batch };
}
function order(batch, quantity = 1, extra = {}) {
  return { acceptedTerms: true, paymentMethod: "PIX", tickets: Array.from({ length: quantity }, (_, index) => ({ batchId: batch.id, participantName: "Participante QA " + index, participantCpf: buyer.cpf })), ...extra };
}
const card = { holderName: "Titular Sintético", holderCpf: buyer.cpf, number: "4111111111111111", expiryMonth: "12", expiryYear: "2030", ccv: "123", installmentCount: 1, postalCode: "01001000", address: "Praça da Sé", addressNumber: "100", phone: "11987654321" };
function purchase(body, key = randomUUID()) { return api(buyer, "/api/checkout", "POST", body, { "Idempotency-Key": key }); }
async function pay(result) {
  assert.ok([200, 202].includes(result.status), JSON.stringify(result.data));
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: result.data.paymentId } });
  const remote = payment.gatewayId ? { id: payment.gatewayId } : (await control()).payments.find(item => item.externalReference === "ticket-engine:" + payment.id);
  const response = await control("/webhook", { id: remote.id, status: "RECEIVED", event: "PAYMENT_RECEIVED" });
  assert.equal(response.status, 200, JSON.stringify(response));
  return prisma.payment.findUniqueOrThrow({ where: { id: payment.id }, include: { tickets: true } });
}
async function activeTicket(batch, status = "ACTIVE") {
  return prisma.ticket.create({ data: { batchId: batch.id, userId: buyer.id, participantName: "Pessoa QA", participantCpf: buyer.cpf, qrHash: randomUUID(), status } });
}

test("deveDirecionarCadaPerfilParaSuaTelaInicial", async () => {
  for (const [actor, home] of [[buyer, "/eventos"], [organizer, "/painel"], [staff, "/portaria"], [otherOrganizer, "/painel"]]) {
    const response = await api(actor, "/"); assert.equal(response.status, 307); assert.equal(response.location, home);
  }
});

test("deveExigirSessaoEPerfilNaPortaria", async () => {
  assert.equal((await api(null, "/api/portaria/events")).status, 401);
  assert.equal((await api(buyer, "/api/portaria/events")).status, 403);
  assert.equal((await api(staff, "/api/portaria/events")).status, 200);
  assert.equal((await api(null, "/api/test-env")).status, 404);
  assert.equal((await api(null, "/api/test-email?to=synthetic@example.test")).status, 404);
});

test("deveRecusarJsonInvalidoCpfFalsoParcelamentoEExcessoDeIngressos", async () => {
  const { batch } = await fixture();
  assert.equal((await purchase("{")).status, 400);
  assert.equal((await purchase(order(batch, 11))).status, 400);
  assert.equal((await purchase(order(batch, 1, { tickets: [{ batchId: batch.id, participantName: "QA", participantCpf: "11111111111" }] }))).status, 400);
  assert.equal((await purchase(order(batch, 1, { acceptedTerms: false }))).status, 400);
  assert.equal((await purchase(order(batch, 1, { paymentMethod: "CREDIT_CARD", creditCardInfo: { ...card, installmentCount: 2 } }))).status, 400);
  assert.equal((await purchase(order(batch), randomUUID())).status, 200);
});

test("deveRecusarPedidoQueMisturaEventos", async () => {
  const a = await fixture(), b = await fixture();
  const body = order(a.batch); body.tickets.push(order(b.batch).tickets[0]);
  assert.equal((await purchase(body)).status, 400);
  assert.equal(await prisma.ticket.count({ where: { batchId: { in: [a.batch.id, b.batch.id] } } }), 0);
});

test("deveCalcularPrecoNoServidorESomar150ParaTresIngressosDe50", async () => {
  const { event, batch } = await fixture();
  const body = order(batch, 3, { amount: 1 }); body.tickets.forEach(ticket => { ticket.price = 1; });
  const payment = await pay(await purchase(body));
  assert.equal(Number(payment.amount), 150);
  const bordero = await api(organizer, "/api/painel/eventos/" + event.id + "/bordero");
  assert.equal(bordero.status, 200); assert.equal(bordero.data.summary.grossRevenue, 150);
  assert.equal(bordero.data.summary.totalPaidTickets, 3);
});

test("deveCriarUmaCobrancaParaVinteReenviosHttpDaMesmaChave", async () => {
  const { batch } = await fixture(); const key = randomUUID(), before = await control();
  const responses = await Promise.all(Array.from({ length: 20 }, () => purchase(order(batch), key)));
  assert.ok(responses.every(response => [200, 202].includes(response.status)), JSON.stringify(responses.map(response => ({ status: response.status, data: response.data?.code }))));
  assert.equal(new Set(responses.map(response => response.data.paymentId)).size, 1);
  assert.equal((await control()).charges - before.charges, 1);
  assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).soldQty, 1);
});

test("deveManterPedidoIncertoSemRepetirCobrancaERecuperarPorWebhook", async () => {
  const { batch } = await fixture(); const key = randomUUID(), before = await control();
  await control("/mode", { charge: "accepted-500" });
  const first = await purchase(order(batch), key); assert.equal(first.status, 202);
  assert.equal((await purchase(order(batch), key)).status, 202);
  assert.equal((await control()).charges - before.charges, 1);
  const payment = await pay(first); assert.equal(payment.status, "PAID");
  assert.equal((await api(buyer, "/api/payments/" + payment.id)).data.status, "PAID");
  assert.equal((await api(otherOrganizer, "/api/payments/" + payment.id)).status, 404);
});

test("deveEnviarEnderecoRealDoTitularEAguardarAnaliseDoCartao", async () => {
  const { batch } = await fixture(); await control("/mode", { charge: "analysis" });
  const response = await purchase(order(batch, 1, { paymentMethod: "CREDIT_CARD", creditCardInfo: card }));
  assert.equal(response.status, 202); assert.equal(response.data.pending, true);
  const payment = await prisma.payment.findUniqueOrThrow({ where: { id: response.data.paymentId }, include: { tickets: true } });
  assert.equal(payment.tickets[0].status, "PENDING");
  const holder = (await control()).lastHolder;
  assert.equal(holder.postalCode, card.postalCode); assert.equal(holder.address, card.address);
  assert.equal(holder.addressNumber, card.addressNumber); assert.equal(holder.phone, card.phone); assert.equal(holder.cpfCnpj, buyer.cpf);
  assert.equal(JSON.stringify(payment).includes(card.number), false);
  await pay(response);
});

test("deveLiberarReservaQuandoCartaoForRecusado", async () => {
  const { batch } = await fixture(); await control("/mode", { charge: "decline" });
  assert.equal((await purchase(order(batch, 1, { paymentMethod: "CREDIT_CARD", creditCardInfo: card }))).status, 400);
  assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).soldQty, 0);
  assert.equal((await prisma.ticket.findFirstOrThrow({ where: { batchId: batch.id }, include: { payment: true } })).payment.status, "FAILED");
});

test("deveEstornar40PorIngressoNumPedidoDe100ComCupomDe20PorCento", async () => {
  const { event, batch } = await fixture();
  await prisma.coupon.create({ data: { eventId: event.id, code: "HTTP20", discountValue: 20 } });
  const payment = await pay(await purchase(order(batch, 2, { couponCode: "HTTP20" })));
  assert.equal(Number(payment.amount), 80); assert.deepEqual(payment.tickets.map(ticket => Number(ticket.paidAmount)), [40, 40]);
  const before = await control();
  const repeated = await Promise.all(Array.from({ length: 20 }, () => api(buyer, "/api/tickets/" + payment.tickets[0].id + "/refund", "POST")));
  assert.ok(repeated.every(response => [200, 202].includes(response.status)));
  assert.equal((await control()).refunds - before.refunds, 1);
  assert.equal((await api(buyer, "/api/tickets/" + payment.tickets[1].id + "/refund", "POST")).status, 200);
  const charge = (await control()).payments.find(item => item.id === payment.gatewayId);
  assert.deepEqual(charge.refunds.map(item => item.value), [40, 40]);
  const summary = (await api(organizer, "/api/painel/eventos/" + event.id + "/bordero")).data.summary;
  assert.equal(summary.grossRevenue, 80); assert.equal(summary.refundedAmount, 80); assert.equal(summary.netSales, 0);
});

test("deveLiberarEstoqueUmaVezEmWebhooksRepetidosDePixVencidoOuDeletado", async () => {
  for (const eventName of ["PAYMENT_OVERDUE", "PAYMENT_DELETED"]) {
    const { event, batch } = await fixture();
    const coupon = await prisma.coupon.create({ data: { eventId: event.id, code: "EXPIRA", discountValue: 10 } });
    const response = await purchase(order(batch, 2, { couponCode: coupon.code }));
    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: response.data.paymentId } });
    const results = await Promise.all(Array.from({ length: 10 }, () => control("/webhook", { id: payment.gatewayId, status: "OVERDUE", event: eventName, ...(eventName === "PAYMENT_DELETED" ? { deleted: true } : {}) })));
    assert.ok(results.every(result => result.status === 200), JSON.stringify(results));
    assert.equal((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).status, "FAILED");
    assert.equal((await prisma.batch.findUniqueOrThrow({ where: { id: batch.id } })).soldQty, 0);
    assert.equal((await prisma.coupon.findUniqueOrThrow({ where: { id: coupon.id } })).reservedCount, 0);
    assert.equal(await prisma.ticket.count({ where: { batchId: batch.id, status: "CANCELLED" } }), 2);
  }
});

test("deveRecusarOutroEventoEFiltrarManifestoSemConsumirIngresso", async () => {
  const a = await fixture(), b = await fixture();
  const own = await activeTicket(a.batch), foreign = await activeTicket(b.batch);
  assert.equal((await api(staff, "/api/checkin", "POST", { qrHash: foreign.qrHash })).status, 400);
  const wrong = await api(staff, "/api/checkin", "POST", { eventId: a.event.id, qrHash: foreign.qrHash });
  assert.equal(wrong.status, 409); assert.equal(wrong.data.code, "WRONG_EVENT"); assert.match(wrong.data.error, /Válido para: Evento HTTP QA/);
  const sync = await api(staff, "/api/portaria/sync?eventId=" + a.event.id);
  assert.equal(sync.status, 200); assert.deepEqual(sync.data.tickets.map(ticket => ticket.id), [own.id]);
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: foreign.id } })).status, "ACTIVE");
});

test("deveValidarUmUnicoCheckinEmVinteLeiturasHttpSimultaneas", async () => {
  const { event, batch } = await fixture(); const ticket = await activeTicket(batch);
  const responses = await Promise.all(Array.from({ length: 20 }, () => api(staff, "/api/checkin", "POST", { eventId: event.id, qrHash: ticket.qrHash })));
  assert.equal(responses.filter(response => response.status === 200).length, 1);
  assert.equal(responses.filter(response => response.status === 409).length, 19);
  assert.equal((await prisma.ticket.findUniqueOrThrow({ where: { id: ticket.id } })).checkedBy, staff.id);
});

test("deveImpedirAlteracaoDeEventoECupomDeOutroOrganizador", async () => {
  const a = await fixture(), b = await fixture(10, otherOrganizer);
  for (const method of ["PATCH", "PUT", "DELETE"]) assert.equal((await api(organizer, "/api/painel/eventos/" + b.event.id, method, method === "DELETE" ? undefined : { status: "CANCELLED" })).status, 404);
  const coupon = await prisma.coupon.create({ data: { eventId: b.event.id, code: "OUTRO", discountValue: 10 } });
  assert.equal((await api(organizer, "/api/painel/eventos/" + a.event.id + "/cupons/" + coupon.id, "DELETE")).status, 404);
  assert.equal((await prisma.event.findUniqueOrThrow({ where: { id: b.event.id } })).status, "PUBLISHED");
});

test("deveRecusarCortesiaAcimaDaCapacidadeETransferenciaDeIngressoUsado", async () => {
  const { event, batch } = await fixture(1); const used = await activeTicket(batch, "USED");
  await prisma.batch.update({ where: { id: batch.id }, data: { soldQty: 1 } });
  assert.equal((await api(organizer, "/api/painel/eventos/" + event.id + "/cortesias", "POST", { batchId: batch.id, quantity: 1, name: "Convidado QA", email: "guest@example.test" })).status, 409);
  assert.equal((await api(buyer, "/api/tickets/" + used.id + "/participant", "PATCH", { participantName: "Outro QA", participantCpf: staff.cpf, participantEmail: "guest@example.test" })).status, 409);
});

test("deveRecusarReembolsoDeOutraOrigemEWebhookSemToken", async () => {
  const { batch } = await fixture(); const payment = await pay(await purchase(order(batch)));
  const before = await control();
  assert.equal((await api(buyer, "/api/tickets/" + payment.tickets[0].id + "/refund", "POST", undefined, { Origin: "https://outro.example", "Sec-Fetch-Site": "cross-site" })).status, 403);
  assert.equal((await control()).refunds, before.refunds);
  assert.equal((await api(null, "/api/webhooks/asaas", "POST", { event: "PAYMENT_RECEIVED", payment: { id: payment.gatewayId, value: 50 } })).status, 401);
});

test("deveAdicionarERemoverMembroComSessaoEOrigemLegitimas", async () => {
  try {
    assert.equal((await api(organizer, "/api/painel/equipe", "POST", { email: buyer.email, role: "STAFF" })).status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).role, "STAFF");
    assert.equal((await api(organizer, "/api/painel/equipe?userId=" + buyer.id, "DELETE")).status, 200);
    assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).role, "BUYER");
  } finally { await prisma.user.update({ where: { id: buyer.id }, data: { role: "BUYER" } }); }
});

for (const [method, body, initialRole] of [
  ["POST", { email: buyer.email, role: "STAFF" }, "BUYER"],
  ["DELETE", { userId: buyer.id }, "STAFF"],
]) {
  test("deveRecusarAlteracaoDeEquipeDeOutraOrigemPor_" + method, async () => {
    try {
      await prisma.user.update({ where: { id: buyer.id }, data: { role: initialRole } });
      const response = await api(organizer, "/api/painel/equipe?userId=" + buyer.id, method, body, { Origin: "http://outro.localhost:3101", "Sec-Fetch-Site": "same-site", "Content-Type": "text/plain" });
      assert.equal(response.status, 403);
      assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: buyer.id } })).role, initialRole);
    } finally { await prisma.user.update({ where: { id: buyer.id }, data: { role: "BUYER" } }); }
  });
}

test("deveImpedirQueOrganizadorRebaixeOProprioCargo", async () => {
  assert.equal((await api(organizer, "/api/painel/equipe", "POST", { email: organizer.email, role: "STAFF" })).status, 400);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: organizer.id } })).role, "ORGANIZER");
});

test("deveNegarGestaoDeEquipeACompradorEPortaria", async () => {
  assert.equal((await api(buyer, "/api/painel/equipe", "POST", { email: otherOrganizer.email, role: "STAFF" })).status, 403);
  assert.equal((await api(staff, "/api/painel/equipe?userId=" + otherOrganizer.id, "DELETE")).status, 403);
  assert.equal((await prisma.user.findUniqueOrThrow({ where: { id: otherOrganizer.id } })).role, "ORGANIZER");
});

test("devePreservarUmOrganizadorEmRemocoesHttpSimultaneas", async () => {
  try {
    const responses = await Promise.all([
      api(organizer, "/api/painel/equipe?userId=" + otherOrganizer.id, "DELETE"),
      api(otherOrganizer, "/api/painel/equipe?userId=" + organizer.id, "DELETE"),
    ]);
    assert.deepEqual(responses.map(response => response.status).sort(), [200, 403]);
    assert.equal(await prisma.user.count({ where: { id: { in: [organizer.id, otherOrganizer.id] }, role: "ORGANIZER" } }), 1);
  } finally { await prisma.user.updateMany({ where: { id: { in: [organizer.id, otherOrganizer.id] } }, data: { role: "ORGANIZER" } }); }
});
