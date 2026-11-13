const eventZone = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function eventDateTimeInput(value: Date | string): string {
  const parts = Object.fromEntries(eventZone.formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function eventDateTimeToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error("Informe uma data e hora válidas.");
  const anchor = new Date(value + ":00Z");
  const projected = new Date(eventDateTimeInput(anchor) + ":00Z");
  const instant = new Date(2 * anchor.getTime() - projected.getTime());
  // A comparação também recusa datas normalizadas e horários inexistentes no fuso.
  if (eventDateTimeInput(instant) !== value) throw new Error("Data ou horário inexistente em Brasília.");
  return instant.toISOString();
}
