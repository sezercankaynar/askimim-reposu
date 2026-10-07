"use client";

import { useActionState, useState } from "react";
import { sendPasswordReset, signInWithGoogle, signInWithPassword, signUpWithPassword, type AuthState } from "@/lib/actions/auth";

type Mode = "login" | "signup" | "reset";

export default function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [loginState, loginAction, loginPending] = useActionState(signInWithPassword, {} as AuthState);
  const [signupState, signupAction, signupPending] = useActionState(signUpWithPassword, {} as AuthState);
  const [resetState, resetAction, resetPending] = useActionState(sendPasswordReset, {} as AuthState);

  const state = mode === "login" ? loginState : mode === "signup" ? signupState : resetState;
  const action = mode === "login" ? loginAction : mode === "signup" ? signupAction : resetAction;
  const pending = loginPending || signupPending || resetPending;

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div className="chip-row" role="group" aria-label="Giriş türü">
        <button type="button" className="chip" aria-pressed={mode === "login"} onClick={() => setMode("login")}>
          Giriş yap
        </button>
        <button type="button" className="chip" aria-pressed={mode === "signup"} onClick={() => setMode("signup")}>
          Hesap oluştur
        </button>
      </div>

      <form action={action} key={mode}>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" inputMode="email" required />
        </div>
        {mode !== "reset" && (
          <div className="field">
            <label htmlFor="password">Şifre {mode === "signup" && <span style={{ fontWeight: 400 }}>(en az 8 karakter)</span>}</label>
            <input
              id="password"
              name="password"
              type="password"
              className="input"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              minLength={mode === "signup" ? 8 : undefined}
              required
            />
          </div>
        )}
        {mode === "reset" && (
          <p style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 0 }}>
            Şifreni unuttuysan ya da hesabını daha önce e-posta bağlantısıyla açtıysan buradan şifre belirle. Tek seferlik bir bağlantı gönderilir;
            sonrasında e-posta beklemeden şifreyle girersin.
          </p>
        )}
        {state.error && (
          <p role="alert" className="notice notice--error">
            {state.error}
          </p>
        )}
        {state.message && <p className="notice notice--ok">{state.message}</p>}
        <button type="submit" className="btn btn--block" disabled={pending}>
          {pending ? "Bekleyin…" : mode === "login" ? "Giriş yap" : mode === "signup" ? "Hesap oluştur" : "Şifre bağlantısı gönder"}
        </button>
      </form>

      {mode === "reset" ? (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setMode("login")}>
          ← Girişe dön
        </button>
      ) : (
        <button type="button" className="btn btn--ghost btn--block" onClick={() => setMode("reset")}>
          Şifremi unuttum / şifre belirle
        </button>
      )}

      <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 13 }}>ya da</div>
      <form action={() => signInWithGoogle(next)}>
        <button type="submit" className="btn btn--soft btn--block">
          <span aria-hidden="true">G</span> Google ile giriş yap
        </button>
      </form>
    </div>
  );
}
