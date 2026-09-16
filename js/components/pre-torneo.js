import { getData, getPaths } from "../firebase.js";
import { edition } from "../divisionAndVariables.js";

/*
===================================
AVVISO PRE-TORNEO
===================================

Finché l'edizione corrente non ha nessuna squadra caricata su
Calcio/{edizione}/{Divisione}/Squadre, le pagine pubbliche mostrano un
avviso d'attesa al posto delle sezioni vuote.

Non serve nessun interruttore nel gestionale: appena le squadre vengono
pubblicate, l'avviso sparisce da solo e le pagine tornano normali.
*/

const ID_AVVISO = "avviso-pre-torneo";

// True se per l'edizione e la divisione correnti non c'è ancora nessuna squadra
export async function torneoNonIniziato() {
    const { teamsPath } = getPaths();
    const squadre = await getData(teamsPath);
    return !squadre || Object.keys(squadre).length === 0;
}

async function iscrizioniAperte() {
    const impostazioni = await getData("Impostazioni");
    // Le iscrizioni sono considerate aperte finché non vengono chiuse esplicitamente
    return !impostazioni || impostazioni.iscrizioniAperte !== false;
}

function creaAvviso(main) {
    const avviso = document.createElement("section");
    avviso.id = ID_AVVISO;
    main.prepend(avviso);
    return avviso;
}

/*
 Mostra o nasconde l'avviso a seconda dello stato del torneo.
 Restituisce true se il torneo non è ancora iniziato, così la pagina
 chiamante può fermarsi prima di caricare classifiche e calendario.
*/
export async function gestisciAttesaTorneo() {
    const main = document.querySelector("main");
    if (!main) return false;

    // Solo le sezioni di contenuto: overlay e simili restano intoccati
    const sezioni = [...main.querySelectorAll(":scope > section")].filter(
        (el) => el.id !== ID_AVVISO
    );

    const inAttesa = await torneoNonIniziato();

    if (!inAttesa) {
        document.getElementById(ID_AVVISO)?.remove();
        sezioni.forEach((el) => el.style.removeProperty("display"));
        return false;
    }

    sezioni.forEach((el) => (el.style.display = "none"));

    const avviso = document.getElementById(ID_AVVISO) || creaAvviso(main);
    const aperte = await iscrizioniAperte();
    const invito = aperte
        ? "Le iscrizioni sono aperte: c'è ancora tempo per portare la tua squadra in campo."
        : "Le iscrizioni sono chiuse, il sorteggio dei gironi è in arrivo.";
    const cta = aperte
        ? `<a class="btn-pre-torneo" href="/iscrizione.html">Iscrivi la tua squadra</a>`
        : "";

    avviso.innerHTML = `
        <i class="fa-solid fa-futbol icona-pre-torneo"></i>
        <p class="section-title">Il torneo ${edition} non è ancora iniziato</p>
        <p class="testo-pre-torneo">
          Squadre, calendario e classifiche saranno pubblicati qui appena il
          campionato prende il via. ${invito}
        </p>
        ${cta}`;

    return true;
}

/*
 Messaggio ridotto per gli stati intermedi: le squadre ci sono già ma
 calendario, partite o marcatori non sono ancora stati caricati.
 Sostituisce lo scheletro di caricamento, che altrimenti resterebbe appeso.
*/
export function mostraAvvisoVuoto(targetDiv, messaggio) {
    const container = document.getElementById(targetDiv);
    if (!container) return;

    container.innerHTML = `<p class="avviso-vuoto">${messaggio}</p>`;
}
