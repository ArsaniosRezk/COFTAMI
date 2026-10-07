/*
 Numeri di telefono di iscrizioni e rose: stessa pulizia e stesso controllo
 nel modulo pubblico e nel gestionale.
*/

// 8-15 cifre, prefisso internazionale facoltativo
export const TELEFONO_REGEX = /^\+?\d{8,15}$/;

// Toglie spazi, punti, trattini, barre e parentesi
export function pulisciTelefono(telefono) {
  return String(telefono || "").replace(/[\s.\-/()]/g, "");
}

export function telefonoValido(telefono) {
  return TELEFONO_REGEX.test(pulisciTelefono(telefono));
}
