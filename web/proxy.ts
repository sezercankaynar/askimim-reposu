import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/", "/giris", "/auth", "/kurulum", "/onizleme", "/manifest.webmanifest", "/icons", "/sw.js", "/offline"];

/** Oturum çerezini tazeler; giriş yapılmamışsa korunan sayfaları /giris'e yönlendirir. */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Supabase giriş kodu yanlış sayfaya düşerse (ör. kök sayfa) callback'e yönlendir
  const code = request.nextUrl.searchParams.get("code");
  if (code && !pathname.startsWith("/auth/callback")) {
    const cb = new URL("/auth/callback", request.url);
    cb.searchParams.set("code", code);
    cb.searchParams.set("next", request.nextUrl.searchParams.get("next") ?? "/defter");
    return NextResponse.redirect(cb);
  }
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    if (isPublic || pathname === "/kurulum") return NextResponse.next();
    return NextResponse.redirect(new URL("/kurulum", request.url));
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic) {
    const login = new URL("/giris", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|jpg|jpeg|webp|ico|woff2?)$).*)"],
};
