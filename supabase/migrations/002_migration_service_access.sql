begin;

-- Acceso exclusivo para tareas administrativas ejecutadas en servidor.
-- No concede permisos a anon ni authenticated y no activa RLS.
grant usage on schema gestion_trabajo to service_role;
grant select, insert, update, delete on all tables in schema gestion_trabajo to service_role;

commit;
