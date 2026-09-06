import { auth, signIn } from "../../../auth";
import { redirect } from "next/navigation";

const unauthorized = "Tu cuenta no está autorizada para acceder a Norte";
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
  const session=await auth();if(session?.user?.appId)redirect("/");const {error}=await searchParams;
  return <main className="login-page"><section className="login-brand"><div><span className="brand-mark large">G</span><p className="eyebrow">Gestión de Trabajo</p><h1>El trabajo importante,<br/>en una sola dirección.</h1><p>Organizá proyectos, prioridades y tiempo sin perder de vista a tus clientes.</p></div><small>Espacio de trabajo para equipos de consultoría</small></section><section className="login-panel"><form className="login-form" action={async()=>{"use server";await signIn("microsoft-entra-id",{redirectTo:"/"})}}><div><p className="eyebrow">Bienvenido</p><h2>Iniciar sesión</h2><p>Ingresá con tu cuenta corporativa para ver los proyectos que tenés asignados.</p></div>{error&&<p className="form-error" role="alert">{unauthorized}</p>}<button className="button primary login-button" type="submit">Iniciar sesión con Microsoft</button><p className="login-help">Solo podrán acceder las cuentas autorizadas previamente.</p></form></section></main>;
}
