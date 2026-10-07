import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";

export default function PasswordPage() {
  return (
    <main>
      <section className="paper paper--plain" style={{ minHeight: "auto" }}>
        <h1>Şifre belirle</h1>
        <p style={{ color: "var(--ink-soft)", marginTop: 0 }}>Bundan sonra e-posta beklemeden bu şifreyle giriş yaparsın.</p>
        <PasswordForm />
      </section>
    </main>
  );
}
