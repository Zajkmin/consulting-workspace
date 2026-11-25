import assert from "node:assert/strict";
import test from "node:test";
import { dismissWhenIdle, runConfirmedSave, settleWorkspaceSave } from "./workspace-feedback.ts";

test("el éxito se anuncia solo después de aplicar la respuesta del servidor", async () => {
  let resolve!: (result: { ok: true; data: number }) => void;
  const response = new Promise<{ ok: true; data: number }>(done => { resolve = done; });
  const events: unknown[] = [];
  const saving = settleWorkspaceSave(response, "Guardado.", data => events.push(data), (...notice) => events.push(notice));
  assert.deepEqual(events, []);
  resolve({ ok: true, data: 2 });
  assert.equal(await saving, true);
  assert.deepEqual(events, [2, ["Guardado.", "success"]]);
});

test("el fallo conserva la respuesta actualizada o restaura el estado optimista", async () => {
  const events: unknown[] = [];
  const apply = (data: number) => events.push(data);
  const notify = (...notice: [string, "success" | "error"]) => events.push(notice);
  assert.equal(await settleWorkspaceSave(Promise.resolve({ ok: false, message: "Registro cambiado.", errorId: "test", data: 3 }), "Guardado.", apply, notify, 1), false);
  assert.deepEqual(events, [3, ["Registro cambiado. Código: test", "error"]]);
  events.length = 0;
  assert.equal(await settleWorkspaceSave(Promise.reject(Error("Error interno")), "Guardado.", apply, notify, 1), false);
  assert.deepEqual(events, [1, ["No se pudo confirmar el guardado. Verificá el estado antes de reintentar.", "error"]]);
});

test("ignora el doble envío y conserva el diálogo abierto ante un fallo", async () => {
  const lock = { current: false };
  let resolve!: (saved: boolean) => void;
  const response = new Promise<boolean>(done => { resolve = done; });
  const events: Array<boolean | string> = [];
  const pending = (value: boolean) => events.push(value);
  const close = () => events.push("cerrado");
  const first = runConfirmedSave(lock, () => response, pending, close);
  await runConfirmedSave(lock, () => { throw Error("envío duplicado"); }, pending, close);
  resolve(false);
  await first;
  assert.deepEqual(events, [true, false]);
  await runConfirmedSave(lock, () => true, pending, close);
  assert.deepEqual(events, [true, false, true, "cerrado", false]);
});

test("bloquea el cierre manual hasta recibir la respuesta y lo habilita después de un error", async () => {
  const lock = { current: false };
  let resolve!: (saved: boolean) => void;
  const response = new Promise<boolean>(done => { resolve = done; });
  const events: string[] = [];
  const saving = runConfirmedSave(lock, () => response, () => undefined, () => events.push("guardado"));
  const dismiss = () => dismissWhenIdle(lock, () => events.push("cerrado"));

  dismiss();
  assert.deepEqual(events, []);
  resolve(false);
  await saving;
  dismiss();
  assert.deepEqual(events, ["cerrado"]);
});
