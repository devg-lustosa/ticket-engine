import { resolve } from "node:path";
import { expect, it } from "vitest";
import { assertLocalEnvironment, assertManagedState, localEnvironment, startDecision } from "../../scripts/local-environment.mjs";

const projectRoot = resolve("fixture-project");
const status = { API_URL: "http://127.0.0.1:54321", DB_URL: "postgresql://postgres:test@127.0.0.1:54322/postgres", ANON_KEY: "synthetic-anon", SERVICE_ROLE_KEY: "synthetic-service" };
const env = localEnvironment(status, { ticket: "synthetic-ticket", webhook: "synthetic-webhook" });
const managed = { projectRoot, phase: "ready", runId: "run-local", token: "synthetic-control-token", controlUrl: "http://127.0.0.1:49152", appUrl: "http://localhost:3000" };

it("deveCriarAmbienteLocalSemHabilitarCobrancaReal", () => {
  expect(env).toMatchObject({ DATABASE_URL: status.DB_URL, NEXT_PUBLIC_SUPABASE_URL: status.API_URL, ASAAS_ENV: "sandbox", ASAAS_API_KEY: "", ENABLE_CREDIT_CARD: "true" });
});

it("deveAceitarBancoEAuthDoProjetoLocal", () => {
  expect(() => assertLocalEnvironment(env, status)).not.toThrow();
});

it.each([
  { name: "banco remoto", override: { DATABASE_URL: "postgresql://user:test@remote.example.test:54322/postgres" } },
  { name: "banco de outro projeto", override: { DATABASE_URL: "postgresql://postgres:test@127.0.0.1:5432/postgres" } },
  { name: "conexão direta remota", override: { DIRECT_URL: "postgresql://user:test@remote.example.test:54322/postgres" } },
  { name: "Auth remoto", override: { NEXT_PUBLIC_SUPABASE_URL: "https://remote.example.test" } },
  { name: "cobrança de produção", override: { ASAAS_ENV: "production" } },
])("deveRecusarInicializacaoCom_$name", ({ override }) => {
  expect(() => assertLocalEnvironment({ ...env, ...override }, status)).toThrow();
});

it("deveReconhecerSomenteOControleDoProjeto", () => {
  expect(assertManagedState(managed, projectRoot)).toBe(managed);
});

it.each([
  { name: "outro diretório", override: { projectRoot: resolve("another-project") } },
  { name: "controle remoto", override: { controlUrl: "http://remote.example.test:49152" } },
  { name: "porta diferente do front", override: { appUrl: "http://localhost:4200" } },
])("deveRecusarEstadoDe_$name", ({ override }) => {
  expect(() => assertManagedState({ ...managed, ...override }, projectRoot)).toThrow();
});

it("deveReutilizarRunnerAtivoSemRegenerarPrisma", () => {
  expect(startDecision({ managed: true, portBusy: true })).toBe("reuse");
});

it("deveRecusarPortaOcupadaSemAssumirControleDoProcesso", () => {
  expect(() => startDecision({ managed: false, portBusy: true })).toThrow();
});

it("deveIniciarSomenteQuandoAPortaEstiverLivre", () => {
  expect(startDecision({ managed: false, portBusy: false })).toBe("start");
});
