# Supabase Auth: Fase 1

Esta fase prepara los clientes de Supabase Auth sin cambiar el mecanismo actual de Microsoft/NextAuth.

- `src/services/supabase/client.ts` crea el cliente browser con `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `src/services/supabase/server.ts` crea el cliente SSR con esas mismas variables y las cookies de Next.js.
- `src/services/supabase/auth-proxy.ts` contiene el helper de refresh para una fase posterior. No se invoca desde `src/proxy.ts`: ese proxy sigue siendo exclusivamente de NextAuth para no alterar el login Microsoft.
- `src/services/supabase/admin-rest-client.ts` permanece separado y usa `SUPABASE_SECRET_KEY` únicamente en server-side para persistencia, RPC y operaciones administrativas.
- `/auth/supabase-test` es un Route Handler aislado. Solo informa si el cliente pudo inicializarse y si existe una sesión; no crea usuarios, no modifica datos y no expone credenciales.

## Integración posterior del refresh

Cuando Supabase Auth pase a formar parte del flujo, `src/proxy.ts` deberá crear una respuesta `NextResponse`, ejecutar `refreshSupabaseAuthSession(request)` y conservar las cookies que ese helper copie a la respuesta. Esa integración debe probarse junto con `auth` de NextAuth antes de cambiar la protección de rutas. En esta fase no se ejecuta el helper para evitar que dos mecanismos de sesión modifiquen la misma respuesta.