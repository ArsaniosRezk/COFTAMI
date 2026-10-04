import { edition } from "../divisionAndVariables.js";

/*
===================================
FUNZIONI DEL TORNEO
===================================

Piccole funzioni sui dati del torneo usate da più pagine (home, calendario,
pagina squadra, gestionale).
*/

// Le chiavi su Firebase non ammettono il punto: "S_ Giorgio" -> "S. Giorgio"
export function nomeSquadra(chiave) {
    return String(chiave || "").replace(/_/g, ".");
}

// Indirizzo della pagina di una squadra
export function linkSquadra(chiave, divisione) {
    const parametri = new URLSearchParams({ divisione, nome: chiave });
    return `/squadra.html?${parametri}`;
}

// Giornate di campionato (1, 2, 3...) in ordine numerico.
// Senza il confronto numerico "10" finirebbe tra "1" e "2".
export function giornateNumerate(oggetto) {
    return Object.keys(oggetto || {})
        .filter((chiave) => chiave.trim() !== "" && !isNaN(chiave))
        .sort((a, b) => a - b);
}

// Una partita del calendario è giocata quando ha un risultato
export function haRisultato(partita) {
    const risultato = String(partita?.Risultato ?? "").trim();
    return risultato !== "" && risultato !== "VS";
}

/*
 Giornata da mostrare in home.
 Il gestionale può fissarla a mano; se non è impostata (o è "auto") si usa la
 prima giornata che ha ancora partite da giocare, oppure l'ultima se sono
 state giocate tutte.
*/
export const GIORNATA_AUTOMATICA = "auto";

export function giornataCorrente(calendario, impostata = null) {
    const valore = impostata === null || impostata === undefined ? "" : String(impostata).trim();
    if (valore !== "" && valore !== GIORNATA_AUTOMATICA) return valore;

    const giornate = giornateNumerate(calendario);
    if (giornate.length === 0) return null;

    const daGiocare = giornate.find((giornata) =>
        Object.values(calendario[giornata] || {}).some((partita) => !haRisultato(partita))
    );
    return daGiocare ?? giornate[giornate.length - 1];
}

// Anno delle partite: le date sul calendario sono "gg/mm" senza anno
function annoEdizione() {
    const anno = parseInt(edition, 10);
    return Number.isNaN(anno) ? new Date().getFullYear() : anno;
}

// Data e ora di una partita, oppure null se mancano
export function dataPartita(partita) {
    const [giorno, mese] = String(partita?.Data || "").split("/").map(Number);
    if (!giorno || !mese) return null;

    const [ore, minuti] = String(partita?.Orario || "").split(":").map(Number);
    return new Date(annoEdizione(), mese - 1, giorno, ore || 0, minuti || 0);
}

export function stessoGiorno(a, b) {
    return (
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate()
    );
}

// "giocata", "oggi" o "da giocare"
export function statoPartita(partita, adesso = new Date()) {
    if (haRisultato(partita)) return "giocata";
    const data = dataPartita(partita);
    if (data && stessoGiorno(data, adesso)) return "oggi";
    return "da giocare";
}

// Tutte le partite del calendario in cui gioca una squadra, in ordine di giornata
export function partiteDellaSquadra(calendario, squadra) {
    const elenco = [];
    for (const giornata of giornateNumerate(calendario)) {
        for (const [chiave, dati] of Object.entries(calendario[giornata] || {})) {
            const [casa, ospite] = chiave.split(":");
            if (casa === squadra || ospite === squadra) {
                elenco.push({ giornata, chiave, casa, ospite, dati });
            }
        }
    }
    return elenco;
}

// Link a Google Maps per il campo di gioco
export function linkMappa(luogo) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(luogo)}`;
}

/*
-----------------------------------
FILE CALENDARIO (.ics)
-----------------------------------
Le partite con data e orario diventano eventi da aggiungere al calendario del
telefono (Google Calendar, Apple Calendario, Outlook).
*/

const DURATA_PARTITA_MINUTI = 90;

function dataIcs(data) {
    const due = (numero) => String(numero).padStart(2, "0");
    return (
        `${data.getFullYear()}${due(data.getMonth() + 1)}${due(data.getDate())}` +
        `T${due(data.getHours())}${due(data.getMinutes())}00`
    );
}

function testoIcs(testo) {
    return String(testo).replace(/\\/g, "\\\\").replace(/([,;])/g, "\\$1").replace(/\n/g, "\\n");
}

// partite: [{ giornata, chiave, casa, ospite, dati }]
export function creaIcs(partite, divisione) {
    const righe = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Cofta Milano//Calendario//IT",
        "CALSCALE:GREGORIAN",
    ];
    const adesso = dataIcs(new Date());

    for (const partita of partite) {
        const inizio = dataPartita(partita.dati);
        if (!inizio) continue;
        const fine = new Date(inizio.getTime() + DURATA_PARTITA_MINUTI * 60000);
        const uid = `${edition}-${divisione}-${partita.giornata}-${partita.chiave}`
            .replace(/[^A-Za-z0-9-]/g, "");

        righe.push(
            "BEGIN:VEVENT",
            `UID:${uid}@coftamilano.com`,
            `DTSTAMP:${adesso}`,
            `DTSTART:${dataIcs(inizio)}`,
            `DTEND:${dataIcs(fine)}`,
            `SUMMARY:${testoIcs(`COFTA: ${nomeSquadra(partita.casa)} - ${nomeSquadra(partita.ospite)}`)}`,
            `DESCRIPTION:${testoIcs(`${divisione} · Giornata ${partita.giornata}`)}`
        );
        if (partita.dati?.Luogo) righe.push(`LOCATION:${testoIcs(partita.dati.Luogo)}`);
        righe.push("END:VEVENT");
    }

    righe.push("END:VCALENDAR");
    return righe.join("\r\n");
}

export function scaricaFile(nomeFile, contenuto, tipo) {
    const url = URL.createObjectURL(new Blob([contenuto], { type: tipo }));
    const link = document.createElement("a");
    link.href = url;
    link.download = nomeFile;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/*
-----------------------------------
SQUADRA PREFERITA
-----------------------------------
Salvata solo su questo dispositivo: { divisione, nome }
*/

const CHIAVE_PREFERITA = "cofta_squadra_preferita";

export function squadraPreferita() {
    try {
        const salvata = JSON.parse(localStorage.getItem(CHIAVE_PREFERITA));
        return salvata && salvata.nome && salvata.divisione ? salvata : null;
    } catch (errore) {
        return null;
    }
}

export function impostaSquadraPreferita(divisione, nome) {
    try {
        if (nome) {
            localStorage.setItem(CHIAVE_PREFERITA, JSON.stringify({ divisione, nome }));
        } else {
            localStorage.removeItem(CHIAVE_PREFERITA);
        }
    } catch (errore) {
        console.warn("Impossibile salvare la squadra preferita", errore);
    }
}

export function eSquadraPreferita(divisione, nome) {
    const preferita = squadraPreferita();
    return Boolean(preferita && preferita.divisione === divisione && preferita.nome === nome);
}
