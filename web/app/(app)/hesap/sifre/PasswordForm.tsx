"use client";

import { useActionState } from "react";
import { updatePassword, type AuthState } from "@/lib/actions/auth";

export default function PasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, {} as AuthState);
  return (
    <form action={action}>
      <div className="field">
        <label htmlFor="password">Yeni şifre (en az 8 karakter)</label>
        <input id="password" name="password" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      <div className="field">
        <label htmlFor="again">Yeni şifre (tekrar)</label>
        <input id="again" name="again" type="password" className="input" autoComplete="new-password" minLength={8} required />
      </div>
      {state.error && (
        <p role="alert" className="notice notice--error">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn--block" disabled={pending}>
        {pending ? "Kaydediliyor…" : "Şifreyi kaydet"}
      </button>
    </form>
  );
}
