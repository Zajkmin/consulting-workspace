# Eliminaciones y cascadas de Supabase

Este documento describe el comportamiento definido por `001_initial_schema.sql`. Las eliminaciones directas son una única sentencia PostgreSQL y, junto con sus cascadas, son atómicas.

| Registro eliminado | Resultado |
|---|---|
| `clients` | `RESTRICT`: se rechaza si existen proyectos del cliente. |
| `projects` | Elimina por cascada sus `areas`, `project_members` e `initiatives`. La eliminación de iniciativas continúa hacia responsables, versiones, tareas, subtareas, dependencias y agenda. La FK diferible del área principal usa `NO ACTION` y se comprueba al finalizar la transacción. |
| `areas` | Se elimina con el proyecto. Una eliminación directa se rechaza cuando el área todavía tiene iniciativas (`RESTRICT`). |
| `profiles` | Elimina por cascada `project_members`, `schedule_blocks` y `work_preferences`. Se rechaza si el perfil sigue en `initiative_owners` o como responsable de una versión, tarea o subtarea (`RESTRICT`). `auth.users` no se elimina; si una cuenta Auth desaparece, `profiles.auth_user_id` queda en `NULL`. |
| `initiatives` | Elimina por cascada `initiative_owners`, `versions` y `tasks`. Las tareas eliminan sus subtareas, ambos lados de sus dependencias y sus bloques de agenda. |
| `versions` | Elimina por cascada sus `tasks` y todos los descendientes de esas tareas. |
| `tasks` | Elimina por cascada `subtasks`, `schedule_blocks` y filas de `task_dependencies` donde sea la tarea dependiente o requerida. |
| `subtasks` | No produce cascadas adicionales. |
| `task_dependencies` | No produce cascadas adicionales. |
| `schedule_blocks` | No produce cascadas adicionales. |
| `work_preferences` | No produce cascadas adicionales. |
| `project_members` | No produce cascadas adicionales. |
| `initiative_owners` | No produce cascadas adicionales. |

Las sincronizaciones de responsables, membresías y relaciones de tareas se realizan mediante RPCs específicas de `003_workspace_transactions.sql`; sus borrados y reinserciones quedan dentro de una sola transacción y se revierten completos ante cualquier error.
