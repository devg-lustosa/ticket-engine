import path from "node:path";

const loopback = new Set(["localhost", "127.0.0.1", "[::1]"]);

function localUrl(value, label) {
  let url;
  try { url = new URL(value); } catch { throw new Error(`${label} inválida.`); }
  if (!loopback.has(url.hostname)) throw new Error(`${label} precisa apontar ao ambiente local.`);
  return url;
}

function sameTarget(value, expected, label) {
  const actual = localUrl(value, label), target = localUrl(expected, label);
  if (actual.port !== target.port || actual.pathname !== target.pathname || actual.protocol !== target.protocol) throw new Error(`${label} não corresponde ao Supabase deste projeto.`);
}

export function localEnvironment(status, secrets) {
  for (const key of ["API_URL", "DB_URL", "ANON_KEY", "SERVICE_ROLE_KEY"]) if (typeof status[key] !== "string" || !status[key]) throw new Error(`Supabase não informou ${key}.`);
  return {
    NEXT_PUBLIC_SUPABASE_URL: status.API_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY: status.ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: status.SERVICE_ROLE_KEY, DATABASE_URL: status.DB_URL, DIRECT_URL: status.DB_URL,
    NEXT_PUBLIC_SITE_URL: "http://localhost:3000", TICKET_SECRET_HASH: secrets.ticket,
    ASAAS_WEBHOOK_SECRET: secrets.webhook, ASAAS_ENV: "sandbox", ASAAS_API_KEY: "", ENABLE_CREDIT_CARD: "true",
    RESEND_API_KEY: "", NEXT_PUBLIC_MAPBOX_TOKEN: "",
  };
}

export function assertLocalEnvironment(env, status) {
  sameTarget(env.DATABASE_URL, status.DB_URL, "DATABASE_URL");
  sameTarget(env.DIRECT_URL, status.DB_URL, "DIRECT_URL");
  sameTarget(env.NEXT_PUBLIC_SUPABASE_URL, status.API_URL, "NEXT_PUBLIC_SUPABASE_URL");
  const site = localUrl(env.NEXT_PUBLIC_SITE_URL, "NEXT_PUBLIC_SITE_URL");
  if (site.protocol !== "http:" || site.port !== "3000" || site.pathname !== "/" || env.ASAAS_ENV === "production") throw new Error("O gerenciador aceita somente o front local na porta 3000 e Asaas sandbox.");
}

export function assertManagedState(state, projectRoot) {
  if (!state || path.resolve(state.projectRoot ?? "") !== path.resolve(projectRoot)) throw new Error("O estado pertence a outro projeto.");
  const control = localUrl(state.controlUrl, "Controle");
  if (control.protocol !== "http:" || control.hostname !== "127.0.0.1" || !control.port || control.pathname !== "/" || !state.runId || !state.token || state.appUrl !== "http://localhost:3000") throw new Error("Estado do processo local inválido.");
  return state;
}

export function startDecision({ managed, portBusy }) {
  if (managed) return "reuse";
  if (portBusy) throw new Error("A porta 3000 pertence a um processo não gerenciado. Pare-o no terminal original; nenhum processo foi encerrado.");
  return "start";
}
