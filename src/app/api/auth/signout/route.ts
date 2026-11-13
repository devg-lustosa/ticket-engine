import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { assertSameOrigin, apiError } from "@/lib/api";

export async function POST(request: Request) {
  try {
  assertSameOrigin(request);
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Redireciona de volta para a homepage
  return NextResponse.redirect(new URL("/eventos", request.url), 303);
  } catch (error) { return apiError(error); }
}
