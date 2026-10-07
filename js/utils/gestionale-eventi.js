/*
 Messaggi dalle sezioni del gestionale alla cornice (gestionale.js), senza
 importarla: la cornice è il modulo d'ingresso e importarla creerebbe un ciclo.
*/

// Apre un'altra sezione, es. vaiASezione("report")
export function vaiASezione(sezione) {
  window.dispatchEvent(new CustomEvent("gestionale:vai", { detail: sezione }));
}

// Dopo aver confermato un referto o convertito un'iscrizione
export function aggiornaConteggi() {
  window.dispatchEvent(new CustomEvent("gestionale:aggiorna-conteggi"));
}
