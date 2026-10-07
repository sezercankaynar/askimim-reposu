import { redirect } from "next/navigation";
import { getUser, isSupabaseConfigured } from "@/lib/supabase/server";
import LoginForm from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; hata?: string }> }) {
  const { next = "/defter", hata } = await searchParams;
  if (!isSupabaseConfigured()) redirect("/kurulum");
  const user = await getUser();
  if (user) redirect(next.startsWith("/") ? next : "/defter");
  return (
    <main className="page">
      <section className="paper paper--plain" style={{ minHeight: "auto", marginTop: 40 }}>
        <h1>Giriş yap</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>Defterin yalnızca sana özel. E-posta ve şifrenle giriş yap; tariflerin her cihazda seninle gelir.</p>
        {hata && (
          <p role="alert" className="notice notice--error">
            Giriş tamamlanamadı. Lütfen tekrar deneyin.
          </p>
        )}
        <LoginForm next={next.startsWith("/") ? next : "/defter"} />
      </section>
    </main>
  );
}
