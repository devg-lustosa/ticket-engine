import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase browser client.
 * Use in Client Components only (marked with "use client").
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
