import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { getPublishedEvents } from "@/services/event.service";

const query = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/lib/prisma", () => ({ prisma: { event: query } }));
vi.mock("next/cache", () => ({ unstable_cache: (fn: unknown) => fn }));

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-11-12T12:00:00Z"));
});
afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); query.findMany.mockReset(); });

it("devePropagarIndisponibilidadeSemApresentarCatalogoVazio", async () => {
  const error = new Error("Consulta indisponível");
  query.findMany.mockRejectedValueOnce(error);
  vi.spyOn(console, "error").mockImplementation(() => {});

  await expect(getPublishedEvents()).rejects.toBe(error);
});

it("deveRetornarVazioQuandoNaoExistemEventosPublicados", async () => {
  query.findMany.mockResolvedValueOnce([]);

  await expect(getPublishedEvents()).resolves.toEqual([]);
});
