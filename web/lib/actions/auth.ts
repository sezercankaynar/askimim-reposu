"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Uygulamanın dışarıdan görünen adresi: env > istek başlıkları > localhost */
async function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}

function safeNext(next: unknown) {
  const n = String(next ?? "/defter");
  return n.startsWith("/") ? n : "/defter";
}

export async function signInWithGoogle(next: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/giris?hata=google");
  redirect(data.url);
}

export type AuthState = { message?: string; error?: string };

const EXISTS_MSG = "Bu e-posta ile zaten bir hesap var. 'Giriş yap'ı dene ya da 'Şifremi unuttum' ile şifre belirle.";

/** E-posta + şifre ile giriş. */
export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email.includes("@")) return { error: "Geçerli bir e-posta adresi yazın." };
  if (!password) return { error: "Şifrenizi yazın." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    if (error.code === "email_not_confirmed") return { error: "E-posta adresin henüz doğrulanmamış. Gelen kutundaki bağlantıya dokun." };
    if (error.code === "invalid_credentials" || error.status === 400) {
      return { error: "E-posta ya da şifre hatalı. Hesabın yoksa 'Hesap oluştur'a bas; şifreni unuttuysan 'Şifremi unuttum' bağlantısını kullan." };
    }
    return { error: "Giriş yapılamadı. Birkaç dakika sonra tekrar deneyin." };
  }
  redirect(next);
}

/** E-posta + şifre ile yeni hesap. Doğrulama kapalıysa anında giriş yapılır. */
export async function signUpWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));
  if (!email.includes("@")) return { error: "Geçerli bir e-posta adresi yazın." };
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await siteUrl()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) {
    if (error.code === "user_already_exists" || /already/i.test(error.message)) return { error: EXISTS_MSG };
    if (error.code === "weak_password") return { error: "Şifre çok zayıf. Harf ve rakam karışık, en az 8 karakter kullan." };
    return { error: "Hesap oluşturulamadı. Birkaç dakika sonra tekrar deneyin." };
  }
  // Supabase, e-posta zaten kayıtlıysa kimlik bilgisi olmayan sahte bir kullanıcı döndürür
  if (data.user && data.user.identities && data.user.identities.length === 0) return { error: EXISTS_MSG };
  if (data.session) redirect(next);
  return { message: `Hesap oluşturuldu. Doğrulama bağlantısı ${email} adresine gönderildi; bağlantıya dokununca giriş yapılır.` };
}

/** Şifre sıfırlama / ilk kez şifre belirleme bağlantısı gönderir. */
export async function sendPasswordReset(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email.includes("@")) return { error: "Geçerli bir e-posta adresi yazın." };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    // Doğrudan şifre sayfasına döner; gelen ?code proxy tarafından callback'e yönlendirilir
    redirectTo: `${await siteUrl()}/hesap/sifre`,
  });
  if (error) return { error: "Bağlantı gönderilemedi. Birkaç dakika sonra tekrar deneyin." };
  return {
    message: `Şifre belirleme bağlantısı ${email} adresine gönderildi. Bağlantıya dokunup yeni şifreni yaz; sonrasında e-posta beklemeden şifreyle girersin.`,
  };
}

/** Oturum açıkken yeni şifre kaydeder (sıfırlama bağlantısından sonra ya da ayarlardan). */
export async function updatePassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const password = String(formData.get("password") ?? "");
  const again = String(formData.get("again") ?? "");
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };
  if (password !== again) return { error: "Şifreler birbirini tutmuyor." };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (error.code === "same_password") return { error: "Yeni şifre eskisiyle aynı olamaz." };
    return { error: "Şifre kaydedilemedi. Bağlantının süresi dolmuş olabilir; 'Şifremi unuttum' ile yeni bağlantı iste." };
  }
  redirect("/defter?sifre=ok");
}
