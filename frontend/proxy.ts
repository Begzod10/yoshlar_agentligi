import { NextResponse, type NextRequest } from "next/server";

// JWTs live in localStorage today, which the server cannot read.
// This proxy is intentionally permissive: it adds security headers
// and lets RouteGuard handle auth on the client.
//
// When auth migrates to HTTP-only cookies, swap the comment block
// below for a real cookie-based gate.

const PUBLIC_PATHS = ["/login", "/api/", "/_next/", "/favicon", "/healthz"];

export function proxy(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp)).*)"],
};
