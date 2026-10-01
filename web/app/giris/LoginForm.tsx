"use client";

import { useActionState } from "react";
import { signInWithEmail, signInWithGoogle, type EmailState } from "@/lib/actions/auth";

export default function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signInWithEmail, {} as EmailState);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <form action={() => signInWithGoogle(next)}>
        <button type="submit" className="btn btn--block">
          <span aria-hidden="true">G</span> Google ile giriş yap
        </button>
      </form>
      <div style={{ textAlign: "center", color: "var(--ink-faint)", fontSize: 13 }}>ya da</div>
      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <div className="field">
          <label htmlFor="email">E-posta</label>
          <input id="email" name="email" type="email" className="input" autoComplete="email" inputMode="email" required />
        </div>
        {state.error && (
          <p role="alert" className="notice notice--error">
            {state.error}
          </p>
        )}
        {state.message && <p className="notice notice--ok">{state.message}</p>}
        <button type="submit" className="btn btn--ghost btn--block" disabled={pending}>
          {pending ? "Gönderiliyor…" : "E-postama giriş bağlantısı gönder"}
        </button>
      </form>
    </div>
  );
}
