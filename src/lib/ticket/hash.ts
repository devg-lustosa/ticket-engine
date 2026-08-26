import crypto from "crypto";

const SECRET = process.env.TICKET_SECRET_HASH!;

/**
 * Gera um hash HMAC-SHA256 seguro para o QR Code do ingresso.
 * Payload: ticketId + eventId + userId
 */
export function generateTicketHash(
  ticketId: string,
  eventId: string,
  userId: string
): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${ticketId}:${eventId}:${userId}`)
    .digest("hex");
}

/**
 * Verifica se um hash de ingresso é válido.
 * Usa comparação segura (timing-safe) para evitar timing attacks.
 */
export function verifyTicketHash(
  hash: string,
  ticketId: string,
  eventId: string,
  userId: string
): boolean {
  const expected = generateTicketHash(ticketId, eventId, userId);
  const expectedBuffer = Buffer.from(expected, "hex");
  const hashBuffer = Buffer.from(hash, "hex");

  if (expectedBuffer.length !== hashBuffer.length) return false;

  return crypto.timingSafeEqual(expectedBuffer, hashBuffer);
}
