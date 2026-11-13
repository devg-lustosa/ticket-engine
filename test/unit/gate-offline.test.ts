import { expect, it } from "vitest";
import { gateStorageKey, canReplay, appendOfflineEntry } from "@/lib/gate-offline";

it("deveSepararCachePorOperadorEEvento", () => {
  expect(gateStorageKey("operador-a", "sexta")).not.toBe(gateStorageKey("operador-b", "sexta"));
  expect(gateStorageKey("operador-a", "sexta")).not.toBe(gateStorageKey("operador-a", "sabado"));
});
it("deveRecusarPendenciaDeOutroEvento", () => {
  expect(canReplay({ eventId: "sabado", state: "PENDING" }, "sexta")).toBe(false);
});
it("devePreservarConflitoParaRevisaoSemReenviarAutomaticamente", () => {
  expect(canReplay({ eventId: "sexta", state: "CONFLICT" }, "sexta")).toBe(false);
});

it("deveRecusarRepeticaoDoIngressoNoDiarioPersistido", () => {
  expect(() => appendOfflineEntry({ used: ["ticket-1"], queue: [] }, "ticket-1", { id: "entry-2", eventId: "sexta", qrHash: "qr", at: "2026-11-11T12:00:00Z", state: "PENDING" })).toThrow("Ingresso já registrado neste aparelho.");
});

it("deveGuardarEntradaEPendenciaNoMesmoRegistroSemPerderPendenciasAnteriores", () => {
  expect(appendOfflineEntry({ used: [], queue: [{ id: "entry-1", eventId: "sexta", qrHash: "qr-1", at: "2026-11-11T12:00:00Z", state: "CONFLICT" }] }, "ticket-2", { id: "entry-2", eventId: "sexta", qrHash: "qr-2", at: "2026-11-11T12:01:00Z", state: "PENDING" })).toMatchObject({ used: ["ticket-2"], queue: [{ id: "entry-1" }, { id: "entry-2" }] });
});
