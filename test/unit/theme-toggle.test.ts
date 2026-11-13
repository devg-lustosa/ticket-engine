import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeToggle } from "@/components/theme-toggle";

const theme = vi.hoisted(() => ({
  resolvedTheme: undefined as string | undefined,
  setTheme: vi.fn(),
}));

vi.mock("next-themes", () => ({ useTheme: () => theme }));

afterEach(() => {
  theme.resolvedTheme = undefined;
  theme.setTheme.mockReset();
});

describe("hidratação do controle de tema", () => {
  it.each(["dark", "light"])("devePreservarHtmlInicialComTemaSalvo_%s", (savedTheme) => {
    const serverHtml = renderToString(createElement(ThemeToggle));

    theme.resolvedTheme = savedTheme;

    expect(renderToString(createElement(ThemeToggle))).toBe(serverHtml);
  });

  it("deveExplicarAlternanciaSemDependerDaPreferenciaDoNavegador", () => {
    const html = renderToString(createElement(ThemeToggle));

    expect(html).toContain('aria-label="Alternar entre tema claro e escuro"');
    expect(html).toContain('data-tooltip="Alternar entre tema claro e escuro"');
  });
});
