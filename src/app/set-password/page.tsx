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
  const [status, setStatus] = useState<"loading" | "ready" | "missing-session" | "success">("loading");
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

    if (!password.trim() || !confirmation.trim()) {
      setError("Ambos campos son obligatorios.");
      return;
    }

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
      setError(
        updateError.message || "No se pudo establecer la contraseña. Verificá que el enlace siga siendo válido.",
      );
      setSaving(false);
      return;
    }

    setPassword("");
    setConfirmation("");
    setStatus("success");
    setSaving(false);
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div>
          <span className="brand-mark large">G</span>
          <p className="eyebrow">Supabase Auth</p>
          <h1>Completar activación</h1>
          <p>Definí una contraseña para terminar la invitación y acceder a tu espacio de trabajo.</p>
        </div>
        <small>Tu cuenta se vincula con tu perfil de trabajo tras confirmar la invitación.</small>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Bienvenido</p>
            <h2>Crear contraseña</h2>
            <p>
              {status === "loading" && "Validando la invitación..."}
              {status === "missing-session" && "La invitación no es válida o ya expiró."}
              {status === "ready" && "Elegí una contraseña para completar la activación de tu cuenta."}
              {status === "success" && "Tu contraseña quedó creada correctamente."}
            </p>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          {status === "success" ? (
            <>
              <p className="form-success" role="status">
                Ya podés volver a iniciar sesión con tu nueva contraseña.
              </p>
              <button type="button" className="button primary login-button" onClick={() => router.replace("/login")}>
                Ir al inicio de sesión
              </button>
            </>
          ) : status === "ready" ? (
            <>
              <label>
                <span>Nueva contraseña</span>
                <input
                  type="password"
                  value={password}
                  onChange={event => setPassword(event.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </label>

              <label>
                <span>Confirmar contraseña</span>
                <input
                  type="password"
                  value={confirmation}
                  onChange={event => setConfirmation(event.target.value)}
                  required
                  autoComplete="new-password"
                  minLength={8}
                />
              </label>

              <button className="button primary login-button" type="submit" disabled={saving}>
                {saving ? "Guardando..." : "Crear contraseña"}
              </button>
            </>
          ) : (
            <button type="button" className="button primary login-button" onClick={() => router.replace("/login")}>
              Volver al inicio de sesión
            </button>
          )}
        </form>
      </section>
    </main>
  );
}
