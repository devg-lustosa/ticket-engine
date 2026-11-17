import fs from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { expect, type Page } from "@playwright/test";

type Actor = { id: string; email: string; name: string; cpf: string; role: string };
type Event = { id: string; slug: string; title: string };
type State = {
  runId: string; phase: string; appUrl: string; controlUrl: string; token: string;
  password: string; databaseUrl: string; actors: Actor[];
  fixture: { event: Event; otherEvent: Event; batch: { id: string } };
};
export const state: State = JSON.parse(fs.readFileSync("supabase/.temp/e2e-state.json", "utf8"));
if (state.runId !== process.env.TICKET_ENGINE_BROWSER_RUN || state.phase !== "pronto" ||
    state.appUrl !== "http://localhost:3101" || state.controlUrl !== "http://127.0.0.1:3102" ||
    new URL(state.databaseUrl).pathname !== "/ticket_engine_e2e") {
  throw new Error("O navegador exige o ambiente descartável desta execução.");
}
const sessions = new Map<number, string>();

export async function login(page: Page, actorIndex: number, home: string) {
  await page.goto("/login");
  await page.getByLabel("E-mail", { exact: true }).fill(state.actors[actorIndex].email);
  await page.getByLabel("Senha", { exact: true }).fill(state.password);
  await page.getByRole("button", { name: "Entrar na plataforma" }).click();
  await expect(page).toHaveURL(state.appUrl + home);
  await expect(page.getByRole("button", { name: /Abrir opções da conta/ })).toBeVisible();
}

export async function apiAs(actorIndex: number, route: string, method = "GET", body?: unknown, extraHeaders: Record<string, string> = {}) {
  if (!sessions.has(actorIndex)) {
    let cookies: { name: string; value: string }[] = [];
    const client = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: { getAll: () => cookies, setAll: values => { cookies = values; } },
    });
    const { error } = await client.auth.signInWithPassword({ email: state.actors[actorIndex].email, password: state.password });
    if (error) throw new Error("Login sintético da preparação falhou.");
    sessions.set(actorIndex, cookies.map(cookie => cookie.name + "=" + cookie.value).join("; "));
  }
  const response = await fetch(state.appUrl + route, {
    method, headers: { Cookie: sessions.get(actorIndex)!, Origin: state.appUrl, "Content-Type": "application/json", ...extraHeaders },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  expect(response.ok, `A API ${method} ${route} deve preparar o cenário isolado (HTTP ${response.status}).`).toBeTruthy();
  return response.json();
}

export async function control(route: string, body?: unknown) {
  const response = await fetch(state.controlUrl + route, {
    method: body === undefined ? "GET" : "POST",
    headers: { "x-e2e-control": state.token, "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  expect(response.ok, "O controle deve alterar somente o cenário descartável.").toBeTruthy();
  return response.json();
}

export async function restoreCatalog() {
  await control("/catalog", { mode: "restore" });
  await apiAs(1, "/api/painel/eventos/" + state.fixture.event.id, "PATCH", { status: "PUBLISHED" });
}

export async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, content: document.documentElement.scrollWidth }));
  expect(dimensions.content).toBeLessThanOrEqual(dimensions.width + 1);
}
