import { afterEach, expect, it, vi } from "vitest";
import { getCurrentUser } from "@/services/user.service";

const auth = vi.hoisted(() => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/server", () => auth);
vi.mock("@/lib/prisma", () => ({ prisma: { user: { findUnique: vi.fn() } } }));
afterEach(() => { vi.restoreAllMocks(); auth.createClient.mockReset(); });

it("devePreservarInterrupcaoDeRenderizacaoDinamicaDoNext", async () => {
  const interruption = Object.assign(new Error("cookies exigem requisição"), { digest: "DYNAMIC_SERVER_USAGE" });
  auth.createClient.mockRejectedValueOnce(interruption);
  vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(getCurrentUser()).rejects.toBe(interruption);
});

it("deveRetornarUsuarioAusenteEmFalhaComumDaIntegracao", async () => {
  auth.createClient.mockRejectedValueOnce(new Error("Auth indisponível"));
  vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(getCurrentUser()).resolves.toBeNull();
});
