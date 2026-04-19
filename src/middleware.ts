import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/session-constants";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE_NAME);

  if (
    (pathname.startsWith("/quiz") || pathname.startsWith("/leaderboard")) &&
    !hasSession
  ) {
    return NextResponse.redirect(new URL("/login", request.nextUrl));
  }

  if ((pathname === "/login" || pathname === "/register") && hasSession) {
    return NextResponse.redirect(new URL("/", request.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/quiz/:path*", "/leaderboard/:path*", "/login", "/register"],
};
