import { manutenzione, rimuoviManutenzione } from "./components/manutenzione.js";
import { osservaImpostazioni } from "./impostazioni.js";
import { paginaCorrente } from "./utils/percorso.js";

/*
    TEMPORANEO (fase di test)
    -------------------------
    Pagine raggiungibili anche con la manutenzione attiva.
    Le pagine pubbliche (regolamento, iscrizione) sono bloccate: restano
    accessibili solo le rispettive copie di test.
    Svuotare l'array per rimettere il blocco su tutto il sito.
*/
const PAGINE_ESENTI = ["regolamento-test", "iscrizione-test"];

// Ultimo stato visto: chi torna sul sito durante la manutenzione vede subito
// l'avviso, senza intravedere la pagina mentre arriva la risposta del server
const CHIAVE_ULTIMO_STATO = "cofta_manutenzione";

function paginaEsenteDaManutenzione() {
    // Funziona sia con /iscrizione.html sia con /iscrizione
    return PAGINE_ESENTI.includes(paginaCorrente());
}

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
    if (paginaEsenteDaManutenzione()) return;

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
