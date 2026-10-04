/*
===================================
EDIZIONE SALVATA
===================================

L'edizione corrente arriva da Impostazioni/edizioneCorrente tramite
impostazioni.js, che la imposta in divisionAndVariables.js prima che le pagine
leggano i dati: non serve più ricaricare la pagina quando il valore salvato
nel localStorage è vecchio.
*/

const CHIAVE = "site_edition";

// Usata dal gestionale quando l'amministratore cambia l'anno a mano
export function impostaEdizioneLocale(edizione) {
    try {
        localStorage.setItem(CHIAVE, String(edizione));
    } catch (errore) {
        console.warn("Impossibile salvare l'edizione nel localStorage", errore);
    }
}
