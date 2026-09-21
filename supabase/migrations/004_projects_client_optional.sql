begin;

alter table gestion_trabajo.projects
  alter column client_id drop not null;

-- Mantener la validación solo cuando haya un cliente seleccionado.
-- Si el proyecto no tiene cliente asociado, se guarda como NULL sin inventar IDs falsos.

commit;
