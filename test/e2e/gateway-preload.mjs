import http from "node:http";
import nock from "nock";
import QRCode from "qrcode";

if (process.env.TICKET_ENGINE_E2E !== "1" || new URL(process.env.DATABASE_URL).pathname !== "/ticket_engine_e2e") throw new Error("Simulador permitido somente no banco descartável E2E.");

nock.disableNetConnect();
nock.enableNetConnect(host => /^(127\.0\.0\.1|localhost)(:\d+)?$/.test(host));
const payments = new Map(), customers = new Map();
const state = { charges: 0, refunds: 0, cancellations: 0, nextCharge: "normal", nextRefund: "DONE", lastHolder: null };
const api = nock("https://api-sandbox.asaas.com").persist();
const idFrom = request => new URL(request.url).pathname.split("/")[3];

api.get("/v3/customers").query(true).reply(request => {
  const email = new URL(request.url).searchParams.get("email");
  return [200, { data: customers.has(email) ? [customers.get(email)] : [] }];
});
api.post("/v3/customers").reply(async request => {
  const input = await request.json();
  const customer = { id: "cus_e2e_" + (customers.size + 1), email: input.email, name: input.name };
  customers.set(input.email, customer); return [200, customer];
});
api.post("/v3/payments").reply(async request => {
  const input = await request.json();
  const mode = state.nextCharge; state.nextCharge = "normal"; state.charges++;
  if (mode === "decline") return [400, { errors: [{ description: "Recusa sintética de teste" }] }];
  const payment = { id: "pay_e2e_" + state.charges, customer: input.customer, value: input.value, originalValue: input.value,
    netValue: input.value, status: input.billingType === "CREDIT_CARD" ? (mode === "analysis" ? "AWAITING_RISK_ANALYSIS" : "CONFIRMED") : "PENDING",
    billingType: input.billingType, dueDate: input.dueDate, externalReference: input.externalReference, deleted: false, refunds: [] };
  if (input.creditCardHolderInfo) state.lastHolder = input.creditCardHolderInfo;
  payments.set(payment.id, payment);
  return mode === "accepted-500" ? [500, { error: "Resposta sintética perdida após criar cobrança" }] : [200, payment];
});
api.get(/^\/v3\/payments\/pay_e2e_\d+\/pixQrCode$/).reply(async uri => [200, {
  payload: "PIX-SINTETICO-SEM-VALOR-" + idFrom(uri), encodedImage: (await QRCode.toDataURL("pix-local:" + idFrom(uri))).split(",")[1], expirationDate: "2030-12-31T23:59:59Z",
}]);
api.get(/^\/v3\/payments\/pay_e2e_\d+$/).reply(uri => payments.has(idFrom(uri)) ? [200, payments.get(idFrom(uri))] : [404, {}]);
api.delete(/^\/v3\/payments\/pay_e2e_\d+$/).reply(uri => {
  const payment = payments.get(idFrom(uri));
  if (!payment || ["RECEIVED", "CONFIRMED"].includes(payment.status)) return [400, {}];
  payment.deleted = true; state.cancellations++; return [200, { id: payment.id, deleted: true }];
});
api.post(/^\/v3\/payments\/pay_e2e_\d+\/refund$/).reply(async request => {
  const input = await request.json();
  const payment = payments.get(idFrom(request));
  if (!payment) return [404, {}];
  state.refunds++;
  payment.refunds.push({ value: input.value, description: input.description, status: state.nextRefund });
  state.nextRefund = "DONE"; return [200, payment];
});

const control = http.createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  if (request.headers["x-e2e-control"] !== process.env.E2E_CONTROL_TOKEN) { response.writeHead(403); response.end("{}"); return; }
  try {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    if (request.method === "POST" && request.url === "/mode") {
      if (body.charge) state.nextCharge = body.charge;
      if (body.refund) state.nextRefund = body.refund;
    }
    if (request.method === "POST" && request.url === "/settle") {
      const payment = payments.get(body.id);
      if (!payment) throw new Error("Cobrança sintética não encontrada.");
      if (body.status) payment.status = body.status;
      if (body.deleted !== undefined) payment.deleted = body.deleted;
      if (body.refundStatus) payment.refunds.forEach(refund => { refund.status = body.refundStatus; });
    }
    response.end(JSON.stringify({ ...state, payments: [...payments.values()] }));
  } catch (error) { response.writeHead(400); response.end(JSON.stringify({ error: error.message })); }
});
control.listen(Number(process.env.E2E_GATEWAY_PORT), "127.0.0.1");
