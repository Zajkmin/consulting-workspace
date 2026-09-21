"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/services/supabase/client";

const unauthorized = "Correo o contraseña incorrectos.";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(unauthorized);
      setLoading(false);
      return;
    }

    router.replace("/");
    router.refresh();
  }

  return (
    <main className="login-page">
      <section className="login-brand">
        <div>
          <span className="brand-mark large">G</span>
          <p className="eyebrow">Gestión de Trabajo</p>
          <h1>El trabajo importante,<br />en una sola dirección.</h1>
          <p>Organizá proyectos, prioridades y tiempo sin perder de vista a tus clientes.</p>
        </div>
        <small>Espacio de trabajo para equipos de consultoría</small>
      </section>

      <section className="login-panel">
        <form className="login-form" onSubmit={handleSubmit}>
          <div>
            <p className="eyebrow">Bienvenido</p>
            <h2>Iniciar sesión</h2>
            <p>Ingresá con tu cuenta para ver los proyectos que tenés asignados.</p>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <label>
            <span>Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              required
              autoComplete="current-password"
            />
          </label>

          <button className="button primary login-button" type="submit" disabled={loading}>
            {loading ? "Iniciando sesión..." : "Iniciar sesión"}
          </button>

          <p className="login-help">Solo podrán acceder las cuentas autorizadas previamente.</p>
        </form>
      </section>
    </main>
  );
}
