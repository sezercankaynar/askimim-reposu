import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Google ve e-posta bağlantısı girişlerinin geri döndüğü adres. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/defter";
  const safeNext = next.startsWith("/") ? next : "/defter";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/giris?hata=baglanti`);
}
