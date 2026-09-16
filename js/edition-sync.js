import { ref, get, db } from "./firebase.js";

/*
===================================
SINCRONIZZAZIONE EDIZIONE
===================================

divisionAndVariables.js legge l'edizione dal localStorage all'avvio, perché
serve subito a comporre i percorsi Firebase. Se quel valore è vecchio, l'intera
pagina lavora sull'annata sbagliata.

Questo modulo lo riallinea a Impostazioni/edizioneCorrente. Va eseguito su ogni
pagina che legge o scrive dati del torneo: il sito pubblico tramite
headerFooterManager.js, il gestionale tramite gestionale.html.
*/

const CHIAVE = "site_edition";

export async function sincronizzaEdizione() {
    try {
        const snapshot = await get(ref(db, "Impostazioni"));
        if (!snapshot.exists()) return;

        const edizioneServer = String(snapshot.val().edizioneCorrente || "2025");
        const edizioneLocale = localStorage.getItem(CHIAVE);

        if (edizioneLocale === edizioneServer) return;

        console.log(`[EditionSync] ${edizioneLocale} -> ${edizioneServer}`);
        impostaEdizioneLocale(edizioneServer);

        // Se il localStorage non è scrivibile la ricarica non risolverebbe
        // nulla e la pagina entrerebbe in un ciclo infinito
        if (localStorage.getItem(CHIAVE) !== edizioneServer) return;

        // I moduli hanno già letto il valore vecchio: serve una ricarica
        location.reload();
    } catch (errore) {
        console.error("Edition Sync Failed:", errore);
    }
}

// Usata dal gestionale quando l'amministratore cambia l'anno a mano
export function impostaEdizioneLocale(edizione) {
    try {
        localStorage.setItem(CHIAVE, String(edizione));
    } catch (errore) {
        console.warn("Impossibile salvare l'edizione nel localStorage", errore);
    }
}
