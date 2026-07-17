import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Routing hint only. Decoded claims are unverified; backend remains the authority. */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload;
  } catch {
    return null;
  }
}

export function proxy(request: NextRequest) {
  const token = request.cookies.get("auth_token")?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  const isDashboardPage = request.nextUrl.pathname.startsWith("/dashboard");

  // ── Protected dashboard routes: require SUPER_ADMIN or STAFF role ──────────────
  if (isDashboardPage) {
    if (!token) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const payload = decodeJwtPayload(token);
    const role = payload?.role as string | undefined;

    if (!payload || (role !== "SUPER_ADMIN" && role !== "STAFF")) {
      // Clear invalid/unauthorized token and redirect to login
      const response = NextResponse.redirect(new URL("/login?error=access_denied", request.url));
      response.cookies.delete("auth_token");
      response.cookies.delete("refresh_token");
      return response;
    }
  }

  // ── Login page: redirect authenticated admins/staff to dashboard ─────
  if (isLoginPage && token) {
    const payload = decodeJwtPayload(token);
    const role = payload?.role as string | undefined;
    if (payload && (role === "SUPER_ADMIN" || role === "STAFF")) {
      return NextResponse.redirect(new URL("/dashboard/events", request.url));
    }
  }

  // ── Root logic ──────────────────────────────────────────────
  if (request.nextUrl.pathname === "/") {
    if (token) {
      const payload = decodeJwtPayload(token);
      const role = payload?.role as string | undefined;
      if (payload && (role === "SUPER_ADMIN" || role === "STAFF")) {
        return NextResponse.redirect(new URL("/dashboard/events", request.url));
      }
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login", "/"],
};
