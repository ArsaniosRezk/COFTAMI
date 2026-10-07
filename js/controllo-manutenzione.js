import { manutenzione, rimuoviManutenzione } from "./components/manutenzione.js";
import { osservaImpostazioni } from "./impostazioni.js";

// Ultimo stato visto: chi torna sul sito durante la manutenzione vede subito
// l'avviso, senza intravedere la pagina mentre arriva la risposta del server
const CHIAVE_ULTIMO_STATO = "cofta_manutenzione";

function ricordaStato(attiva) {
  try {
    if (attiva) localStorage.setItem(CHIAVE_ULTIMO_STATO, "1");
    else localStorage.removeItem(CHIAVE_ULTIMO_STATO);
  } catch (errore) {
    // Senza storage si perde solo l'avviso immediato
  }
}

/**
 * Mostra l'avviso di manutenzione sopra la pagina quando è attivo nelle
 * impostazioni, e lo toglie quando viene disattivato (anche a pagina aperta).
 * La pagina sotto continua a caricarsi: è coperta, non serve fermarla.
 */
export function avviaControlloManutenzione() {
  try {
    if (localStorage.getItem(CHIAVE_ULTIMO_STATO) === "1") manutenzione();
  } catch (errore) {
    // Storage non leggibile: si aspetta la risposta del server
  }

  osservaImpostazioni((impostazioni) => {
    const attiva = Boolean(impostazioni.manutenzione);
    ricordaStato(attiva);
    if (attiva) manutenzione();
    else rimuoviManutenzione();
  });
}
