"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export async function signInWithGoogle(next: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/giris?hata=google");
  redirect(data.url);
}

export type EmailState = { message?: string; error?: string };

export async function signInWithEmail(_prev: EmailState, formData: FormData): Promise<EmailState> {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "/defter");
  if (!email.includes("@")) return { error: "Geçerli bir e-posta adresi yazın." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) return { error: "Bağlantı gönderilemedi. Birkaç dakika sonra tekrar deneyin." };
  return { message: `Giriş bağlantısı ${email} adresine gönderildi. E-postanızı açıp bağlantıya dokunun.` };
}
