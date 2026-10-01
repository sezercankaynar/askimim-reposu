import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Google ve e-posta bağlantısı girişlerinin geri döndüğü adres. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/defter";
  const safeNext = next.startsWith("/") ? next : "/defter";

  const supabase = await createClient();
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  // E-posta şablonu token_hash gönderiyorsa (PKCE yerine OTP akışı)
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as "magiclink" | "email" | "signup" | "recovery",
    });
    if (!error) return NextResponse.redirect(`${origin}${safeNext}`);
  }
  return NextResponse.redirect(`${origin}/giris?hata=baglanti`);
}
