import fs from "node:fs";
import path from "node:path";
import http from "node:http";
import { randomUUID } from "node:crypto";
import { spawn, execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { PrismaClient } from "@prisma/client";
import { createClient } from "@supabase/supabase-js";

process.loadEnvFile(".env");
if (process.argv.includes("--stop")) {
  const owned = JSON.parse(fs.readFileSync("supabase/.temp/e2e-state.json", "utf8"));
  if (owned.phase === "encerrado") { console.log("Ambiente E2E já encerrado."); process.exit(0); }
  if (owned.controlUrl !== "http://127.0.0.1:3102" || new URL(owned.databaseUrl).pathname !== "/ticket_engine_e2e") throw new Error("Estado E2E inválido.");
  const response = await fetch(owned.controlUrl + "/stop", { method: "POST", headers: { "x-e2e-control": owned.token } });
  if (!response.ok) throw new Error("Não foi possível encerrar o ambiente E2E.");
  console.log("Encerramento solicitado ao ambiente E2E local.");
  process.exit(0);
}
if (!["127.0.0.1", "localhost"].includes(new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname)) throw new Error("Auth deve ser local.");
const require = createRequire(import.meta.url);
const runId = process.env.TICKET_ENGINE_E2E_RUN_ID || randomUUID().slice(0, 8), token = randomUUID(), password = "Local-E2E-Only!2026";
if (!/^[a-f0-9]{8}$/i.test(runId)) throw new Error("Identificador E2E inválido.");
const appUrl = "http://localhost:3101", gatewayUrl = "http://127.0.0.1:3103";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const stateFile = path.resolve("supabase/.temp/e2e-state.json");
let phase = "preparando", database, prisma, app, fixture, catalogFault = false;
const actors = [], authIds = [];
const log = fs.openSync("supabase/.temp/e2e-app.log", "w");
const runtimeEnv = { ...process.env, TICKET_ENGINE_E2E: "1", NODE_ENV: "production", NEXT_PUBLIC_SITE_URL: appUrl,
  ASAAS_ENV: "sandbox", ASAAS_API_KEY: "synthetic-e2e-only", ASAAS_WEBHOOK_SECRET: "synthetic-e2e-webhook", RESEND_API_KEY: "",
  NEXT_PUBLIC_MAPBOX_TOKEN: "", ENABLE_CREDIT_CARD: "true", E2E_CONTROL_TOKEN: token, E2E_GATEWAY_PORT: "3103" };

function cpf(index) {
  const digits = String(300000000 + index).split("").map(Number);
  const next = values => { const result = values.reduce((sum, value, i) => sum + value * (values.length + 1 - i), 0) * 10 % 11; return result === 10 ? 0 : result; };
  digits.push(next(digits)); digits.push(next(digits)); return digits.join("");
}
function publicState() { return { runId, phase, appUrl, controlUrl: "http://127.0.0.1:3102", gatewayUrl, token, password, databaseUrl: database?.getConnectionUri(), actors, fixture }; }
function writeState(value = publicState()) { const temp = stateFile + ".tmp"; fs.writeFileSync(temp, JSON.stringify(value, null, 2), { mode: 0o600 }); fs.renameSync(temp, stateFile); }
async function gateway(action = "", data) {
  const response = await fetch(gatewayUrl + action, { method: data ? "POST" : "GET", headers: { "Content-Type": "application/json", "x-e2e-control": token }, ...(data ? { body: JSON.stringify(data) } : {}) });
  if (!response.ok) throw new Error("Simulador recusou comando.");
  return response.json();
}
async function cleanup() {
  phase = "encerrando";
  const issues = [];
  async function attempt(label, action) { try { await action(); } catch { issues.push(label); } }
  await attempt("servidor", async () => {
    if (app && app.exitCode === null) {
      const exited = new Promise(resolve => app.once("exit", resolve));
      app.kill();
      let timer;
      await Promise.race([exited, new Promise((_, reject) => { timer = setTimeout(() => { app.kill("SIGKILL"); reject(new Error("Next não encerrou.")); }, 10000); })]).finally(() => clearTimeout(timer));
    }
  });
  if (prisma) await attempt("client SQL", () => prisma.$disconnect());
  for (const id of authIds) {
    await attempt("identidade de teste", async () => {
      const { data, error } = await admin.auth.admin.getUserById(id);
      if (error && error.status !== 404) throw new Error("Auth indisponível.");
      if (data.user?.user_metadata?.localE2eRun === runId) {
        const removed = await admin.auth.admin.deleteUser(id);
        if (removed.error) throw new Error("Auth não confirmou exclusão.");
      }
    });
  }
  if (database) await attempt("container SQL", () => database.stop());
  if (issues.length) { phase = "cleanup_failed"; writeState(); throw new Error("Limpeza E2E incompleta: " + issues.join(", ")); }
  phase = "encerrado";
  writeState({ runId, phase, appUrl });
  console.log("E2E encerrado; banco descartável e identidades exclusivas removidos.");
}

const control = http.createServer(async (request, response) => {
  const origin = request.headers.origin;
  if (["http://localhost:3000", appUrl, "http://127.0.0.1:3101"].includes(origin)) response.setHeader("Access-Control-Allow-Origin", origin);
  response.setHeader("Access-Control-Allow-Headers", "Content-Type, x-e2e-control");
  if (request.method === "OPTIONS") { response.writeHead(204); response.end(); return; }
  if (request.url === "/axe.js") { response.setHeader("Content-Type", "application/javascript"); response.end(fs.readFileSync(require.resolve("axe-core/axe.min.js"))); return; }
  response.setHeader("Content-Type", "application/json");
  if (request.headers["x-e2e-control"] !== token) { response.writeHead(403); response.end("{}"); return; }
  try {
    const chunks = []; for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length ? JSON.parse(Buffer.concat(chunks).toString()) : {};
    if (request.url === "/state") { response.end(JSON.stringify(publicState())); return; }
    if (request.url === "/catalog" && request.method === "POST") {
      if (!["empty", "restore", "fault"].includes(body.mode) || new URL(runtimeEnv.DATABASE_URL).pathname !== "/ticket_engine_e2e") throw new Error("Cenário de catálogo inválido.");
      if (body.mode === "fault") {
        if (!catalogFault) { await prisma.$executeRawUnsafe('ALTER TABLE events RENAME TO events_e2e_unavailable'); catalogFault = true; }
      } else {
        if (catalogFault) { await prisma.$executeRawUnsafe('ALTER TABLE events_e2e_unavailable RENAME TO events'); catalogFault = false; }
        await prisma.event.updateMany({ where: { id: { in: [fixture.event.id, fixture.otherEvent.id] } }, data: { status: body.mode === "empty" ? "DRAFT" : "PUBLISHED" } });
      }
      response.end(JSON.stringify({ mode: body.mode })); return;
    }
    if (request.url === "/gateway" || request.url === "/mode") { response.end(JSON.stringify(await gateway(request.url === "/mode" ? "/mode" : "", request.url === "/mode" ? body : undefined))); return; }
    if (request.url === "/webhook") {
      const changed = await gateway("/settle", body), payment = changed.payments.find(item => item.id === body.id);
      const result = await fetch(appUrl + "/api/webhooks/asaas", { method: "POST", headers: { "Content-Type": "application/json", "asaas-access-token": runtimeEnv.ASAAS_WEBHOOK_SECRET }, body: JSON.stringify({ event: body.event, payment }) });
      response.end(JSON.stringify({ status: result.status, body: await result.json() })); return;
    }
    if (request.url === "/snapshot") {
      response.end(JSON.stringify({ tickets: await prisma.ticket.findMany({ include: { refund: true } }), payments: await prisma.payment.findMany(), batches: await prisma.batch.findMany(), coupons: await prisma.coupon.findMany() })); return;
    }
    if (request.url === "/cancel-ticket") {
      await prisma.ticket.update({ where: { id: body.ticketId }, data: { status: "CANCELLED" } }); response.end("{}"); return;
    }
    if (request.url === "/stop" && request.method === "POST") { await cleanup(); response.end("{}"); control.close(); fs.closeSync(log); return; }
    response.writeHead(404); response.end("{}");
  } catch (error) {
    if (!response.headersSent) { response.writeHead(500); response.end(JSON.stringify({ error: error.message })); }
    if (request.url === "/stop") { control.close(); process.exitCode = 1; }
  }
});

try {
  await new Promise((resolve, reject) => { control.once("error", reject); control.listen(3102, "127.0.0.1", resolve); });
  database = await new PostgreSqlContainer("postgres:17.11-alpine3.24").withDatabase("ticket_engine_e2e").start();
  runtimeEnv.DATABASE_URL = database.getConnectionUri(); runtimeEnv.DIRECT_URL = runtimeEnv.DATABASE_URL;
  if (new URL(runtimeEnv.DATABASE_URL).pathname !== "/ticket_engine_e2e") throw new Error("Banco E2E obrigatório.");
  execFileSync(process.execPath, ["node_modules/prisma/build/index.js", "migrate", "deploy"], { env: runtimeEnv, stdio: "pipe" });
  prisma = new PrismaClient({ datasources: { db: { url: runtimeEnv.DATABASE_URL } } });
  for (const [index, role] of ["BUYER", "ORGANIZER", "STAFF", "ORGANIZER"].entries()) {
    const email = "e2e-" + runId + "-" + index + "@ticket-engine.test";
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: "QA " + index, localE2eRun: runId } });
    if (error) throw new Error(error.code || "Falha ao criar identidade exclusiva.");
    authIds.push(data.user.id);
    const actor = await prisma.user.create({ data: { authId: data.user.id, email, name: ["Comprador QA", "Organizador QA", "Portaria QA", "Outro Organizador QA"][index], nickname: "qa_" + runId + "_" + index, cpf: cpf(index), phone: "11987654321", birthDate: new Date("1990-01-01"), role, hideFromAttendees: true } });
    actors.push({ id: actor.id, authId: actor.authId, email, name: actor.name, role, cpf: actor.cpf });
  }
  const event = await prisma.event.create({ data: { slug: "e2e-" + runId, title: "Noite QA · Teste local", venue: "Casa de Teste", address: "Rua dos Testes, 100", city: "São Paulo", state: "SP", description: "Evento sintético para validação local.", date: new Date("2030-12-15T23:00:00Z"), status: "PUBLISHED", organizerId: actors[1].id } });
  const otherEvent = await prisma.event.create({ data: { slug: "e2e-outro-" + runId, title: "Outra Noite QA", venue: "Outro Local", date: event.date, status: "PUBLISHED", organizerId: actors[3].id } });
  const batch = await prisma.batch.create({ data: { eventId: event.id, name: "Pista", price: 50, totalQty: 100 } });
  const otherBatch = await prisma.batch.create({ data: { eventId: otherEvent.id, name: "Outro lote", price: 50, totalQty: 10 } });
  await prisma.coupon.create({ data: { eventId: event.id, code: "QA20", discountType: "PERCENTAGE", discountValue: 20, maxUses: 20 } });
  await prisma.coupon.create({ data: { eventId: event.id, code: "QAGRATIS", discountType: "PERCENTAGE", discountValue: 100, maxUses: 20 } });
  fixture = { event, otherEvent, batch, otherBatch };
  phase = "compilando"; writeState();
  await new Promise((resolve, reject) => { const build = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], { env: runtimeEnv, stdio: ["ignore", log, log] }); build.once("exit", code => code === 0 ? resolve() : reject(new Error("Build E2E falhou; consulte e2e-app.log."))); });
  phase = "iniciando";
  const options = [process.env.NODE_OPTIONS, "--import=" + pathToFileURL(path.resolve("test/e2e/gateway-preload.mjs")).href].filter(Boolean).join(" ");
  app = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "--hostname", "127.0.0.1", "--port", "3101"], { env: { ...runtimeEnv, NODE_OPTIONS: options }, stdio: ["ignore", log, log] });
  app.once("exit", code => { if (phase !== "encerrando" && phase !== "encerrado") { phase = "falhou"; console.error("Servidor E2E encerrou:", code); } });
  for (let attempt = 0; attempt < 60; attempt++) {
    try { const response = await fetch(appUrl + "/eventos"); if (response.ok) { phase = "pronto"; break; } } catch { /* Aguarda o processo iniciar, sem tocar no servidor principal. */ }
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (phase !== "pronto") throw new Error("Servidor E2E não ficou pronto.");
  writeState();
  console.log("E2E pronto na porta 3101. Banco descartável e Asaas simulado; controle local na porta 3102.");
} catch (error) {
  console.error(error.message);
  try { await cleanup(); } catch (cleanupError) { console.error(cleanupError.message); }
  control.close(); process.exitCode = 1;
}
