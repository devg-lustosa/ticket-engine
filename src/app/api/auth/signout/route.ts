import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  
  // Redireciona de volta para a homepage
  return NextResponse.redirect(new URL("/", request.url));
}
