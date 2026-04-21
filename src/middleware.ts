import { NextRequest, NextResponse } from "next/server";

const PASSWORD = process.env.SITE_PASSWORD;
const COOKIE_NAME = "resy_bot_auth";

const BOT_UA = /bot|crawl|spider|slack|discord|telegram|whatsapp|facebook|twitter|linkedin|preview|fetch|curl|wget|imessage|applebot|googlebot|bingbot|yandex|baidu|duckduck|embedly|quora|outbrain|pinterest|vkshare|facebot|Twitterbot|LinkedInBot/i;

export function middleware(req: NextRequest) {
  if (!PASSWORD) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname === "/login" || pathname === "/api/login" || pathname.startsWith("/_next") || pathname.startsWith("/favicon") || pathname.includes("opengraph-image")) {
    return NextResponse.next();
  }

  const ua = req.headers.get("user-agent") ?? "";
  if (BOT_UA.test(ua)) return NextResponse.next();

  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (cookie === PASSWORD) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
