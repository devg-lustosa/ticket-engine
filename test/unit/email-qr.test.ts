import { afterEach, expect, it, vi } from "vitest";
import { sendTicketEmail } from "@/services/email.service";

const delivery = vi.hoisted(() => ({ send: vi.fn().mockResolvedValue({ data: { id: "synthetic-email" }, error: null }) }));
vi.mock("resend", () => ({ Resend: class { emails = delivery; } }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); delivery.send.mockClear(); });

it("deveIncorporarQrComoAnexoPngSemEnviarCodigoAUmGeradorExterno", async () => {
  vi.stubEnv("RESEND_API_KEY", "synthetic-local-key");
  vi.spyOn(console, "log").mockImplementation(() => {});
  await sendTicketEmail("synthetic@example.test", { participantName: "Participante Sintético", eventName: "Evento de Teste", eventDate: "12/12/2026", venue: "Casa de Teste", qrHash: "synthetic-qr-bearer-code" });
  const message = delivery.send.mock.calls[0][0];
  expect(message.html).not.toContain("qrserver.com");
  expect(message.html).toContain("cid:ticket-qr");
  expect(message.attachments[0].contentId).toBe("ticket-qr");
  expect(Buffer.from(message.attachments[0].content).subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
});
