import { NextResponse, type NextRequest } from "next/server";

// Authorization boundary for the working environment. Everything under
// /dashboard and /api/v1 requires the session cookie the login flow sets.
// The marketing site (/) and /login stay public.

const SESSION_COOKIE = "ce_session";

export function middleware(req: NextRequest) {
  const authed = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  if (authed) return NextResponse.next();

  const { pathname, search } = req.nextUrl;

  if (pathname.startsWith("/api/v1")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const login = req.nextUrl.clone();
  login.pathname = "/login";
  login.search = `?next=${encodeURIComponent(pathname + search)}`;
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*"],
};
