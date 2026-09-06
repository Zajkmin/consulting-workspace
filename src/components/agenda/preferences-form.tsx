"use client";
export function PreferencesForm({onDone}:{onDone:()=>void}){return <div><p className="form-hint">La agenda ya no utiliza horarios ni cálculos de duración. Solo elegí las tareas de cada día.</p><div className="modal-actions"><button type="button" className="button primary" onClick={onDone}>Entendido</button></div></div>}
