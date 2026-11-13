import { describe, expect, it } from "vitest";
import { eventDateTimeToIso, eventDateTimeInput } from "@/lib/event-date-time";

describe("horários dos eventos em Brasília", () => {
  it("deveMostrar20hAoEditarEventoSalvoComo23hUtc", () => {
    expect(eventDateTimeInput("2030-12-18T23:00:00.000Z")).toBe("2030-12-18T20:00");
  });
  it("deveEnviarInstanteExplicitoAoCriarEventoAs20h", () => {
    expect(eventDateTimeToIso("2030-12-18T20:00")).toBe("2030-12-18T23:00:00.000Z");
  });
  it("devePreservarInstanteAoAbrirESalvarSemAlterarHorario", () => {
    expect(eventDateTimeToIso(eventDateTimeInput("2030-12-18T23:15:00.000Z"))).toBe("2030-12-18T23:15:00.000Z");
  });
  it("deveConverterViradaDeAnoSemAlterarDiaLocal", () => {
    expect(eventDateTimeToIso("2030-12-31T23:30")).toBe("2031-01-01T02:30:00.000Z");
  });
  it("deveRecusarDataLocalInexistenteNoCalendario", () => {
    expect(() => eventDateTimeToIso("2030-02-30T20:00")).toThrow();
  });
  it("deveRecusarEntradaSemHoraEmVezDePresumirFuso", () => {
    expect(() => eventDateTimeToIso("2030-12-18")).toThrow();
  });
});
