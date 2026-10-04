import { db, ref, onValue, getPaths } from "./firebase.js";

/*
===================================
DATI DEL TORNEO IN TEMPO REALE
===================================

Le pagine pubbliche ascoltano i nodi della divisione invece di leggerli una
volta: le letture partono tutte insieme (non una dopo l'altra) e quando il
gestionale conferma un risultato classifica e calendario si aggiornano da soli.

osservaDivisione(callback, opzioni) chiama callback(dati) quando sono arrivati
tutti i nodi e poi a ogni modifica. Restituisce una funzione che interrompe
l'ascolto (da chiamare quando si cambia divisione).

dati = { divisione, squadre, partite, calendario, giornataImpostata }
*/

const RITARDO_AGGIORNAMENTO_MS = 50;
const ATTESA_LENTA_MS = 10000;

export function osservaDivisione(
    callback,
    { divisione = null, onLento = null, onErrore = null } = {}
) {
    const { divisionPath, matchdayToShowPath } = getPaths(divisione);
    const divisioneScelta = divisionPath.split("/").pop();

    const percorsi = {
        squadre: `${divisionPath}/Squadre`,
        partite: `${divisionPath}/Partite`,
        calendario: `${divisionPath}/Calendario`,
        giornata: `${divisionPath}/GiornataDaMostrare`,
        giornataGlobale: matchdayToShowPath,
    };

    const valori = {};
    const arrivati = new Set();
    let attivo = true;
    let primaVolta = true;
    let timer = null;

    const componi = () => ({
        divisione: divisioneScelta,
        squadre: valori.squadre || null,
        partite: valori.partite || null,
        calendario: valori.calendario || null,
        giornataImpostata: valori.giornata ?? valori.giornataGlobale ?? null,
    });

    const notifica = () => {
        if (!attivo || arrivati.size < Object.keys(percorsi).length) return;

        // Il primo disegno è immediato; le modifiche successive arrivano spesso
        // a gruppi (risultato + marcatori): si aspetta un attimo e si ridisegna una volta
        if (primaVolta) {
            primaVolta = false;
            callback(componi());
            return;
        }
        clearTimeout(timer);
        timer = setTimeout(() => attivo && callback(componi()), RITARDO_AGGIORNAMENTO_MS);
    };

    const annulla = Object.entries(percorsi).map(([nome, percorso]) =>
        onValue(
            ref(db, percorso),
            (snapshot) => {
                valori[nome] = snapshot.val();
                arrivati.add(nome);
                notifica();
            },
            (errore) => {
                console.error(`Errore nella lettura di ${percorso}:`, errore);
                if (attivo) onErrore?.(errore);
            }
        )
    );

    // Senza rete Firebase resta in attesa: dopo qualche secondo lo si dice
    const timerLento = setTimeout(() => {
        if (attivo && primaVolta) onLento?.();
    }, ATTESA_LENTA_MS);

    return () => {
        attivo = false;
        clearTimeout(timer);
        clearTimeout(timerLento);
        annulla.forEach((stop) => stop());
    };
}

// Messaggio al posto degli scheletri di caricamento quando la rete non risponde
export function mostraErroreCaricamento(idContenitori, messaggio = null) {
    const testo =
        messaggio ||
        (navigator.onLine === false
            ? "Sei offline: i dati compariranno appena torna la connessione."
            : "Il caricamento sta impiegando più del previsto.");

    for (const id of idContenitori) {
        const contenitore = document.getElementById(id);
        if (!contenitore || !contenitore.querySelector(".skeleton")) continue;

        contenitore.innerHTML = "";
        const avviso = document.createElement("div");
        avviso.className = "avviso-vuoto avviso-errore";

        const paragrafo = document.createElement("p");
        paragrafo.textContent = testo;
        avviso.appendChild(paragrafo);

        const riprova = document.createElement("button");
        riprova.type = "button";
        riprova.className = "btn-riprova";
        riprova.textContent = "Riprova";
        riprova.addEventListener("click", () => location.reload());
        avviso.appendChild(riprova);

        contenitore.appendChild(avviso);
    }
}
