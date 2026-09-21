"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/services/supabase/client";
import {
  clearSupabaseAuthCallback,
  isSupabaseSessionReady,
  parseSupabaseAuthCallback,
} from "@/services/supabase/auth-callback";

export const dynamic = "force-dynamic";

export default function SetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "missing-session">("loading");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function initializeSession() {
      try {
        const currentUrl = new URL(window.location.href);
        const { data: sessionData } = await supabase.auth.getSession();

        if (isSupabaseSessionReady(sessionData.session)) {
          window.history.replaceState(null, "", clearSupabaseAuthCallback(currentUrl).toString());
          setStatus("ready");
          return;
        }

        const callback = parseSupabaseAuthCallback(currentUrl);

        if (callback.kind === "fragment") {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: callback.accessToken,
            refresh_token: callback.refreshToken,
          });

          if (sessionError) {
            setStatus("missing-session");
            return;
          }

          window.history.replaceState(null, "", clearSupabaseAuthCallback(currentUrl).toString());
          const { data: userData, error: userError } = await supabase.auth.getUser();
          setStatus(userError || !userData.user ? "missing-session" : "ready");
          return;
        }

        if (callback.kind === "pkce") {
          const { data, error: codeError } = await supabase.auth.exchangeCodeForSession(
            callback.code,
            callback.flowId ? { flowId: callback.flowId } : undefined,
          );

          if (codeError || !data.session) {
            setStatus("missing-session");
            return;
          }

          window.history.replaceState(null, "", clearSupabaseAuthCallback(currentUrl).toString());
          const { data: userData, error: userError } = await supabase.auth.getUser();
          setStatus(userError || !userData.user ? "missing-session" : "ready");
          return;
        }

        if (callback.kind === "error" || callback.kind === "invalid-fragment") {
          setStatus("missing-session");
          return;
        }

        setStatus("missing-session");
      } catch {
        setStatus("missing-session");
      }
    }

    void initializeSession();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (password !== confirmation) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    setSaving(true);
    const supabase = createSupabaseBrowserClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError("No se pudo establecer la contraseña. Volvé a solicitar una invitación si el enlace expiró.");
      setSaving(false);
      return;
    }
    router.replace("/auth/supabase-test");
  }

  return (
    <main className="page-shell">
      <section className="page-heading compact-heading">
        <p className="eyebrow">Supabase Auth</p>
        <h1>Establecer contraseña</h1>
        {status === "loading" && <p>Validando la invitación...</p>}
        {status === "missing-session" && <p>La invitación no es válida o ya expiró.</p>}
        {status === "ready" && <p>Elegí una contraseña para completar la activación de tu cuenta.</p>}
      </section>
      {status === "ready" && (
        <form className="edit-form" onSubmit={handleSubmit}>
          <label>
            Contraseña
            <input type="password" value={password} onChange={event => setPassword(event.target.value)} required autoComplete="new-password" minLength={8} />
          </label>
          <label>
            Confirmar contraseña
            <input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} required autoComplete="new-password" minLength={8} />
          </label>
          {error && <p role="alert">{error}</p>}
          <button type="submit" disabled={saving}>{saving ? "Guardando..." : "Establecer contraseña"}</button>
        </form>
      )}
    </main>
  );
}