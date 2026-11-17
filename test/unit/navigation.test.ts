import { describe, expect, it } from "vitest";
import { homeForRole, navigationForRole } from "@/lib/navigation";

describe("entrada e navegação por perfil", () => {
  it("deveLevarCompradorAoCatalogo", () => { expect(homeForRole("BUYER")).toBe("/eventos"); });
  it("deveLevarOrganizadorAoPainel", () => { expect(homeForRole("ORGANIZER")).toBe("/painel"); });
  it("deveLevarPorteiroDiretamenteAPortaria", () => { expect(homeForRole("STAFF")).toBe("/portaria"); });
  it("deveOcultarGestaoFinanceiraDoPorteiro", () => { expect(navigationForRole("STAFF").flatMap(group => group.links).some(link => link.href.startsWith("/painel"))).toBe(false); });
  it("deveManterAjudaEmTodosOsPerfis", () => { expect(navigationForRole(null).flatMap(group => group.links)).toContainEqual(expect.objectContaining({ href: "/ajuda" })); });
});
