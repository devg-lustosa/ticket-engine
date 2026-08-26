import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Routes accessible only to authenticated users with ORGANIZER or STAFF role */
const ORGANIZER_ROUTES = ["/dashboard"];
const STAFF_ROUTES     = ["/portaria"];
const BUYER_ROUTES     = ["/meus-ingressos", "/checkout"];

export async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — IMPORTANT: do not remove getUser() call.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  const redirect = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    return NextResponse.redirect(url);
  };

  // ── Unauthenticated users trying to access protected routes ──
  const isProtected = [
    ...ORGANIZER_ROUTES,
    ...STAFF_ROUTES,
    ...BUYER_ROUTES,
  ].some((route) => pathname.startsWith(route));

  if (!user && isProtected) {
    return redirect("/login");
  }

  if (user) {
    // Redirect authenticated users away from auth pages
    if (pathname === "/login" || pathname === "/cadastro") {
      return redirect("/meus-ingressos");
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - /api/webhooks/** (public webhook endpoints)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|api/webhooks).*)",
  ],
};
