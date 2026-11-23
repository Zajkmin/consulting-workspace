"use client";

import Image from "next/image";
import { useActionState, useState } from "react";
import { loginAction } from "@/app/actions/auth";

export function LoginForm({ initialError = null }: { initialError?: string | null }) {
  const [error, formAction, loading] = useActionState(loginAction, initialError);
  const [email, setEmail] = useState("");

  return (
    <main className="login-page login-page--corporate">
      <section className="login-brand">
        <div>
          <Image className="login-brand-logo" src="/analytico-white.svg" width={480} height={106} alt="Analytico" />
          <p className="eyebrow">Portal del Consultor</p>
          <div className="login-brand-title">El trabajo importante,<br />en una sola dirección.</div>
          <p>Organizá proyectos, prioridades y tiempo sin perder de vista a tus clientes.</p>
        </div>
        <small>Espacio de trabajo para el equipo Analytico</small>
      </section>

      <section className="login-panel">
        <form className="login-form" action={formAction}>
          <div>
            <h1>Iniciar sesión</h1>
            <p>Ingresá con tu cuenta para ver los proyectos que tenés asignados.</p>
          </div>

          {error && <p className="form-error" role="alert">{error}</p>}

          <label>
            <span>Correo electrónico</span>
            <input
              type="email" name="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              required
              autoComplete="email"
            />
          </label>

          <label>
            <span>Contraseña</span>
            <input
              type="password" name="password"
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
