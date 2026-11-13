import { test, expect } from "@playwright/test";
import { apiAs, control, expectNoHorizontalOverflow, login, restoreCatalog, state } from "./helpers";

for (const profile of [
  { name: "comprador", actor: 0, home: "/eventos", groups: ["Ingressos", "Ajuda"] },
  { name: "organizador", actor: 1, home: "/painel", groups: ["Gestão", "Operação", "Ingressos", "Ajuda"] },
  { name: "portaria", actor: 2, home: "/portaria", groups: ["Operação", "Ingressos", "Ajuda"] },
]) {
  test("deve abrir o início e os menus do " + profile.name, async ({ page }) => {
    await login(page, profile.actor, profile.home);
    const navigation = page.getByRole("navigation", { name: "Navegação principal" });
    await expect(navigation.getByRole("link", { name: "Início", exact: true })).toHaveAttribute("href", profile.home);
    await expect(navigation.getByRole("button")).toHaveText(profile.groups);
    await page.goto("/");
    await expect(page).toHaveURL(state.appUrl + profile.home);
    await expectNoHorizontalOverflow(page);
  });
}

test("deve buscar páginas pelo teclado e devolver o foco ao fechar", async ({ page }, testInfo) => {
  await login(page, 1, "/painel");
  const trigger = page.getByRole("button", { name: "Buscar páginas e ações. Atalho Control K" });
  await trigger.hover();
  await expect(page.getByRole("tooltip", { name: "Buscar páginas e ações. Atalho Control K" })).toBeVisible();
  await page.keyboard.press("Control+k");
  const search = page.getByLabel("Buscar páginas e ações disponíveis");
  await expect(search).toBeFocused();
  await search.fill("Equipe");
  await expect(page.getByRole("list", { name: "Resultados da busca" }).getByRole("link")).toHaveCount(1);
  await search.press("Escape");
  await expect(search).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(page.getByRole("tooltip", { name: "Buscar páginas e ações. Atalho Control K" })).toBeHidden();
  const help = page.getByRole("navigation", { name: "Navegação principal" }).getByRole("button", { name: "Ajuda", exact: true });
  await help.click({ timeout: 5000 });
  await expect(page.getByRole("tooltip")).toBeHidden();
  const screenshot = testInfo.outputPath("navegacao-tooltip-depois.png");
  await page.screenshot({ path: screenshot });
  await testInfo.attach("menu-apos-escape", { path: screenshot, contentType: "image/png" });
  await page.getByRole("link", { name: /Central de ajuda/ }).click();
  await expect(page).toHaveURL(state.appUrl + "/ajuda");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

for (const theme of [
  { saved: "dark", system: "light", visible: "theme-dark-icon", hidden: "theme-light-icon", next: "light" },
  { saved: "light", system: "dark", visible: "theme-light-icon", hidden: "theme-dark-icon", next: "dark" },
] as const) {
  test("deve hidratar e persistir o tema " + theme.saved + " com sistema " + theme.system, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    await page.emulateMedia({ colorScheme: theme.system });
    await page.goto("/login");
    await page.evaluate(value => localStorage.setItem("theme", value), theme.saved);
    await page.goto("/eventos");
    await expect(page.locator("html")).toHaveClass(new RegExp("\\b" + theme.saved + "\\b"));
    await expect(page.getByTestId(theme.visible)).toBeVisible();
    await expect(page.getByTestId(theme.hidden)).toBeHidden();
    await page.getByRole("button", { name: "Alternar entre tema claro e escuro" }).click();
    await expect(page.locator("html")).toHaveClass(new RegExp("\\b" + theme.next + "\\b"));
    await page.reload();
    await expect(page.locator("html")).toHaveClass(new RegExp("\\b" + theme.next + "\\b"));
    await expect(page.getByRole("heading", { name: "Próximos eventos", exact: true })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("deve mostrar catálogo vazio e manter o rodapé no final da página", async ({ page }) => {
  try {
    await control("/catalog", { mode: "empty" });
    await apiAs(1, "/api/painel/eventos/" + state.fixture.event.id, "PATCH", { status: "DRAFT" });
    await page.goto("/eventos");
    await expect(page.getByRole("heading", { name: "A programação está sendo preparada" })).toBeVisible();
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();
    const geometry = await footer.evaluate(element => ({ bottom: element.getBoundingClientRect().bottom + window.scrollY, end: document.documentElement.scrollHeight }));
    expect(Math.abs(geometry.end - geometry.bottom)).toBeLessThanOrEqual(1);
    await expectNoHorizontalOverflow(page);
  } finally { await restoreCatalog(); }
});

test("deve distinguir falha do catálogo vazio e recuperar pela ação de tentar novamente", async ({ page }) => {
  try {
    await restoreCatalog();
    await control("/catalog", { mode: "fault" });
    await page.goto("/eventos");
    await expect(page.getByRole("heading", { name: "Eventos indisponíveis no momento" })).toBeVisible();
    await expect(page.getByText("A programação está sendo preparada")).toBeHidden();
    await control("/catalog", { mode: "restore" });
    await page.getByRole("button", { name: "Tentar novamente" }).click();
    await expect(page.getByRole("heading", { name: "Próximos eventos", exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: state.fixture.event.title, exact: true })).toBeVisible();
  } finally { await restoreCatalog(); }
});

test("deve limpar o formulário e atualizar a equipe após adicionar um membro", async ({ page }, testInfo) => {
  try {
    await login(page, 1, "/painel");
    await page.goto("/painel/equipe");
    const email = page.getByPlaceholder("email@exemplo.com");
    await email.fill(state.actors[0].email);
    await page.locator("select[name=role]").selectOption("STAFF");
    await page.getByRole("button", { name: "Adicionar à Equipe" }).click();
    await expect(page.getByText("Membro adicionado com sucesso!")).toBeVisible();
    await expect(email).toHaveValue("");
    await expect(page.getByRole("heading", { name: state.actors[0].name, exact: true })).toBeVisible();
    await expect(page.locator("form").filter({ has: email }).getByRole("alert")).toHaveCount(0);
    const screenshot = testInfo.outputPath("equipe-depois.png");
    await page.screenshot({ path: screenshot, fullPage: true });
    await testInfo.attach("equipe-apos-adicionar", { path: screenshot, contentType: "image/png" });
  } finally { await apiAs(1, "/api/painel/equipe?userId=" + state.actors[0].id, "DELETE"); }
});

test("deve comprar por Pix no checkout e exibir o ingresso após confirmar o pagamento", async ({ page }) => {
  await login(page, 0, "/eventos");
  await page.getByRole("heading", { name: state.fixture.event.title, exact: true }).getByRole("link").click();
  await page.getByRole("button", { name: "Aumentar quantidade deste lote" }).click();
  await page.getByRole("button", { name: "Continuar para o checkout" }).click();
  await expect(page.getByLabel("Nome Completo", { exact: true })).toHaveValue(state.actors[0].name);
  await page.getByRole("button", { name: "Ir para o Pagamento" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Gerar o pagamento deste pedido" }).click();
  await expect(page.getByRole("heading", { name: "Escaneie o QR Code" })).toBeVisible();
  await expect(page.getByLabel("Ou copie o código (Pix Copia e Cola)")).not.toHaveValue("");
  const snapshot = await control("/snapshot");
  const pendingTicket = snapshot.tickets.find((item: { userId: string; status: string }) => item.userId === state.actors[0].id && item.status === "PENDING");
  expect(pendingTicket).toBeTruthy();
  const payment = snapshot.payments.find((item: { id: string }) => item.id === pendingTicket.paymentId);
  expect(payment).toBeTruthy();
  const settled = await control("/webhook", { id: payment.gatewayId, event: "PAYMENT_RECEIVED", status: "RECEIVED" });
  expect(settled.status).toBe(200);
  await page.goto("/meus-ingressos");
  await expect(page.getByText(state.fixture.event.title, { exact: true }).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
});

test("deve selecionar o evento antes de validar e recusar QR de outra festa", async ({ page }) => {
  const purchased = await apiAs(0, "/api/checkout", "POST", {
    acceptedTerms: true, paymentMethod: "PIX", tickets: [{ batchId: state.fixture.batch.id, participantName: "Participante da Portaria", participantCpf: state.actors[0].cpf }],
  }, { "Idempotency-Key": crypto.randomUUID() });
  const snapshot = await control("/snapshot");
  const payment = snapshot.payments.find((item: { id: string }) => item.id === purchased.paymentId);
  const settled = await control("/webhook", { id: payment.gatewayId, event: "PAYMENT_RECEIVED", status: "RECEIVED" });
  expect(settled.status).toBe(200);
  const ticket = snapshot.tickets.find((item: { paymentId: string }) => item.paymentId === payment.id);
  await login(page, 2, "/portaria");
  await expect(page.getByRole("button", { name: "Iniciar câmera" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Validar", exact: true })).toBeDisabled();
  await page.getByRole("combobox").selectOption(state.fixture.otherEvent.id);
  await page.getByLabel("QR ou código do ingresso").fill(ticket.qrHash);
  await page.getByRole("button", { name: "Validar", exact: true }).click();
  await expect(page.getByRole("main").getByRole("alert")).toContainText("Ingresso inválido para este evento (Válido para: " + state.fixture.event.title + ")");
  await page.getByRole("combobox").selectOption(state.fixture.event.id);
  await page.getByLabel("QR ou código do ingresso").fill(ticket.qrHash);
  await page.getByRole("button", { name: "Validar", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("Participante da Portaria");
  await expectNoHorizontalOverflow(page);
});
