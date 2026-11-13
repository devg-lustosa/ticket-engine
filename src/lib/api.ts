import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export class ApiError extends Error {
  constructor(public status: number, message: string, public code = "INVALID_REQUEST") { super(message); }
}

export function uuid(value: unknown, field = "ID"): string {
  if (typeof value !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value)) throw new ApiError(400, `${field} inválido.`);
  return value;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const allowed = new Set([new URL(request.url).origin]);
  if (process.env.NEXT_PUBLIC_SITE_URL) allowed.add(new URL(process.env.NEXT_PUBLIC_SITE_URL).origin);
  if (request.headers.get("sec-fetch-site") === "cross-site" || (origin && !allowed.has(origin))) throw new ApiError(403, "Origem da requisição não permitida.", "INVALID_ORIGIN");
}

export async function jsonBody(request: Request, maxBytes = 32768): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new ApiError(415, "Envie JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Corpo da requisição obrigatório.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const item = await reader.read();
    if (item.done) break;
    size += item.value.length;
    if (size > maxBytes) { await reader.cancel(); throw new ApiError(413, "Requisição muito grande."); }
    chunks.push(item.value);
  }
  try {
    const data = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error();
    return data;
  } catch { throw new ApiError(400, "JSON inválido."); }
}

export async function requireActor(roles?: Role[]) {
  const client = await createClient();
  const { data: { user } } = await client.auth.getUser();
  if (!user) throw new ApiError(401, "Não autenticado.", "UNAUTHENTICATED");
  const actor = await prisma.user.findUnique({ where: { authId: user.id } });
  if (!actor || (roles && !roles.includes(actor.role))) throw new ApiError(403, "Acesso negado.", "FORBIDDEN");
  return actor;
}

export type Actor = Awaited<ReturnType<typeof requireActor>>;

export function apiError(error: unknown) {
  if (error instanceof ApiError) return NextResponse.json({ success: false, error: error.message, code: error.code }, { status: error.status });
  // Axios errors contain authorization headers and card payloads; never log the object.
  console.error("[api] Falha interna:", error instanceof Error ? error.name : "UnknownError");
  return NextResponse.json({ error: "Erro interno. Tente novamente.", code: "INTERNAL_ERROR" }, { status: 500 });
}
