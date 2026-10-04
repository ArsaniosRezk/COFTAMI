import { db, ref, set, getData, getPaths } from "../firebase.js";
import { edition, getSelectedDivision } from "../divisionAndVariables.js";
import {
    giornateNumerate,
    giornataCorrente,
    GIORNATA_AUTOMATICA,
    haRisultato,
    statoPartita,
    dataPartita,
    nomeSquadra,
    linkMappa,
    squadraPreferita,
} from "../utils/torneo.js";
import { mostraToast, rendiCliccabile } from "../utils/interfaccia.js";
import { showOverlayMatchResult } from "./match-overlay.js";
import { mostraAvvisoVuoto } from "./pre-torneo.js";

// Mostra o nasconde l'istruzione "Tocca una partita..." in base a cosa c'è da toccare
function mostraIstruzione(visibile) {
    const istruzione = document.querySelector(".instruction");
    if (istruzione) istruzione.style.display = visibile ? "block" : "none";
}

// Legge i dati della divisione corrente quando la pagina non li passa già
async function leggiDatiDivisione() {
    const { divisionPath, matchdayToShowPath } = getPaths();
    const [squadre, partite, calendario, giornata, giornataGlobale] = await Promise.all([
        getData(`${divisionPath}/Squadre`),
        getData(`${divisionPath}/Partite`),
        getData(`${divisionPath}/Calendario`),
        getData(`${divisionPath}/GiornataDaMostrare`),
        getData(matchdayToShowPath),
    ]);
    return {
        divisione: getSelectedDivision(),
        squadre,
        partite,
        calendario,
        giornataImpostata: giornata ?? giornataGlobale,
    };
}

/*
===================================
GIORNATA DA MOSTRARE (gestionale)
===================================
"Automatica" mostra in home la prima giornata con partite ancora da giocare.
Si può fissare a mano una giornata, anche della fase finale (SF1, F...).
*/

export async function editMatchdayToShow() {
    const matchdayToShowDiv =
        document.getElementById("matchday-selection") ||
        document.getElementById("match-to-show-div");
    if (!matchdayToShowDiv) return;

    const division = document.getElementById("division")?.value || "Superiori";
    const { matchdayToShowPath } = getPaths(division); // path globale (retro-compatibilità)
    const perDivisionPath = `Calcio/${edition}/${division}/GiornataDaMostrare`;

    const [perDivisione, globale, calendario] = await Promise.all([
        getData(perDivisionPath),
        getData(matchdayToShowPath),
        getData(`Calcio/${edition}/${division}/Calendario`),
    ]);
    const impostata = perDivisione ?? globale;
    const automatica = giornataCorrente(calendario, null);

    const inputContainer = document.createElement("div");

    const matchdayToShowLabel = document.createElement("label");
    matchdayToShowLabel.setAttribute("for", "matchday-to-show-input");
    matchdayToShowLabel.innerText = "Giornata da Mostrare";

    const matchdayToShowInput = document.createElement("select");
    matchdayToShowInput.id = "matchday-to-show-input";

    const opzione = (valore, testo) => {
        const option = document.createElement("option");
        option.value = valore;
        option.textContent = testo;
        matchdayToShowInput.appendChild(option);
    };
    opzione(
        GIORNATA_AUTOMATICA,
        automatica ? `Automatica (ora: ${automatica})` : "Automatica"
    );
    const giornate = Object.keys(calendario || {});
    const numerate = giornateNumerate(calendario);
    const speciali = giornate.filter((giornata) => !numerate.includes(giornata)).sort();
    [...numerate, ...speciali].forEach((giornata) => opzione(giornata, giornata));

    // Un valore salvato che non è più nel calendario resta visibile
    const valoreAttuale =
        impostata === null || impostata === undefined || impostata === ""
            ? GIORNATA_AUTOMATICA
            : String(impostata);
    if (![...matchdayToShowInput.options].some((o) => o.value === valoreAttuale)) {
        opzione(valoreAttuale, valoreAttuale);
    }
    matchdayToShowInput.value = valoreAttuale;

    inputContainer.appendChild(matchdayToShowLabel);
    inputContainer.appendChild(matchdayToShowInput);
    matchdayToShowDiv.appendChild(inputContainer);

    // Bottone per salvare la giornata da mostrare (per-divisione)
    const saveButton = document.createElement("button");
    saveButton.classList.add("custom-button");
    saveButton.textContent = "Salva";
    matchdayToShowDiv.appendChild(saveButton);

    saveButton.addEventListener("click", async () => {
        saveButton.disabled = true;
        try {
            await set(ref(db, perDivisionPath), matchdayToShowInput.value);
            mostraToast("Giornata da mostrare salvata");
        } catch (error) {
            console.error("Errore nel salvataggio delle modifiche:", error);
            mostraToast("Errore nel salvataggio. Riprova.", { errore: true });
        } finally {
            saveButton.disabled = false;
        }
    });
}

/*
===================================
CALENDARIO (pagina pubblica)
===================================
*/

// Squadra scelta nel filtro e divisione a cui si riferisce
const statoCalendario = { divisione: null, squadra: "", scorrimentoFatto: false };

export function scheletroCalendario(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    const giornata = `
        <div class="giornata">
            <div class="skeleton skeleton-text" style="width: 100px; margin: 0 auto 10px;"></div>
            <div class="partite">
                <div class="skeleton skeleton-card" style="height: 80px;"></div>
                <div class="skeleton skeleton-card" style="height: 80px;"></div>
            </div>
        </div>`;
    container.innerHTML = giornata + giornata;
}

export async function recuperaCalendario(dati = null) {
    if (!dati) {
        scheletroCalendario("giornate");
        dati = await leggiDatiDivisione();
    }

    const calendarDiv = document.getElementById("giornate");
    if (!calendarDiv) return;

    const { calendario, squadre, partite, divisione } = dati;
    const matchdays = giornateNumerate(calendario);

    if (matchdays.length === 0) {
        document.getElementById("barra-calendario")?.replaceChildren();
        mostraIstruzione(false);
        mostraAvvisoVuoto("giornate", "Il calendario delle partite non è ancora disponibile.");
        return;
    }

    // Cambiando divisione il filtro riparte da "Tutte le squadre"
    if (statoCalendario.divisione !== divisione) {
        statoCalendario.divisione = divisione;
        statoCalendario.squadra = "";
        statoCalendario.scorrimentoFatto = false;
    }
    if (statoCalendario.squadra && !squadre?.[statoCalendario.squadra]) {
        statoCalendario.squadra = "";
    }

    // Giornata in corso solo se ha ancora qualcosa da giocare: a torneo finito
    // (al massimo con qualche recupero indietro) nessuna giornata è "in corso"
    // e la pagina parte dall'inizio
    const automatica = giornataCorrente(calendario, null);
    const corrente = Object.values(calendario[automatica] || {}).some((partita) => !haRisultato(partita))
        ? automatica
        : null;
    const contesto = { squadre: squadre || {}, partite, calendario, divisione };

    const disegna = () => {
        calendarDiv.innerHTML = "";
        const filtro = statoCalendario.squadra;
        let cliccabili = false;

        for (const matchday of matchdays) {
            let matches = calendario[matchday] || {};
            if (filtro) {
                matches = Object.fromEntries(
                    Object.entries(matches).filter(([chiave]) => chiave.split(":").includes(filtro))
                );
            }
            if (Object.values(matches).some(haRisultato)) cliccabili = true;

            rappresentaGiornata(matchday, matches, contesto, calendarDiv, {
                corrente: matchday === corrente,
                riposo: filtro ? nomeSquadra(filtro) : null,
            });
        }
        mostraIstruzione(cliccabili);
    };

    disegnaBarraCalendario(contesto, disegna);
    disegna();

    // Alla prima apertura si porta in vista la giornata in corso
    if (!statoCalendario.scorrimentoFatto) {
        statoCalendario.scorrimentoFatto = true;
        if (corrente && corrente !== matchdays[0]) {
            document
                .getElementById(`giornata-${corrente}`)
                ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }
    }
}

// Filtro per squadra
function disegnaBarraCalendario({ squadre, divisione }, ridisegna) {
    const barra = document.getElementById("barra-calendario");
    if (!barra) return;
    barra.replaceChildren();

    const etichetta = document.createElement("label");
    etichetta.className = "filtro-squadra";
    etichetta.htmlFor = "filtro-squadra";
    etichetta.textContent = "Squadra";

    const select = document.createElement("select");
    select.id = "filtro-squadra";

    const preferita = squadraPreferita();
    const chiavi = Object.keys(squadre).sort((a, b) => nomeSquadra(a).localeCompare(nomeSquadra(b)));
    const opzione = (valore, testo) => {
        const option = document.createElement("option");
        option.value = valore;
        option.textContent = testo;
        select.appendChild(option);
    };
    opzione("", "Tutte le squadre");
    if (preferita?.divisione === divisione && squadre[preferita.nome]) {
        opzione(preferita.nome, `★ ${nomeSquadra(preferita.nome)}`);
    }
    chiavi
        .filter((chiave) => !(preferita?.divisione === divisione && preferita.nome === chiave))
        .forEach((chiave) => opzione(chiave, nomeSquadra(chiave)));
    select.value = statoCalendario.squadra;

    select.addEventListener("change", () => {
        statoCalendario.squadra = select.value;
        ridisegna();
    });

    barra.append(etichetta, select);
}

/*
===================================
PROSSIMA GIORNATA (home)
===================================
*/

export function scheletroProssimaGiornata(containerId = "prossima-giornata") {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <div class="giornata" style="width:100%">
            <div class="skeleton skeleton-text" style="width: 100px; margin: 10px auto;"></div>
            <div class="partite" style="justify-content: center; gap: 10px;">
                <div class="skeleton skeleton-card" style="height: 80px; width: 100%;"></div>
                <div class="skeleton skeleton-card" style="height: 80px; width: 100%;"></div>
                <div class="skeleton skeleton-card" style="height: 80px; width: 100%;"></div>
            </div>
        </div>`;
}

export async function prossimaGiornata(dati = null) {
    if (!dati) {
        scheletroProssimaGiornata();
        dati = await leggiDatiDivisione();
    }

    const calendarDiv = document.getElementById("prossima-giornata");
    if (!calendarDiv) return;

    const matchdayToShow = giornataCorrente(dati.calendario, dati.giornataImpostata);
    const matches = matchdayToShow ? dati.calendario?.[matchdayToShow] : null;

    if (!matches) {
        // Nessuna giornata disponibile: lo scheletro resterebbe appeso
        mostraIstruzione(false);
        mostraAvvisoVuoto(
            "prossima-giornata",
            "Le partite della prossima giornata non sono ancora state pubblicate."
        );
        return;
    }

    calendarDiv.innerHTML = "";
    rappresentaGiornata(
        matchdayToShow,
        matches,
        { squadre: dati.squadre || {}, partite: dati.partite, calendario: dati.calendario, divisione: dati.divisione },
        calendarDiv
    );

    mostraIstruzione(Object.values(matches).some(haRisultato));
}

/*
===================================
GIORNATA E PARTITA
===================================
contesto = { squadre, partite, calendario, divisione }
*/

// Nome leggibile: "Giornata 3", oppure il nome della fase finale
export function nomeGiornata(giornata) {
    const fasi = { F: "Finale", SF1: "Semifinale 1", SF2: "Semifinale 2" };
    if (fasi[giornata]) return fasi[giornata];
    return isNaN(giornata) ? giornata : `Giornata ${giornata}`;
}

export function rappresentaGiornata(
    matchday,
    matches,
    contesto,
    calendarDiv,
    { corrente = false, riposo = null } = {}
) {
    const matchdayDiv = document.createElement("div");
    matchdayDiv.classList.add("giornata");
    matchdayDiv.id = `giornata-${matchday}`;
    if (corrente) matchdayDiv.classList.add("giornata-corrente");

    const matchdayElement = document.createElement("h3");
    matchdayElement.classList.add("numero-giornata");
    matchdayElement.textContent = nomeGiornata(matchday);
    if (corrente) {
        const badge = document.createElement("span");
        badge.className = "badge-giornata";
        badge.textContent = "In corso";
        matchdayElement.append(" ", badge);
    }
    matchdayDiv.appendChild(matchdayElement);

    const matchesDiv = document.createElement("div");
    matchesDiv.classList.add("partite");

    const ordinate = Object.entries(matches || {}).sort(
        ([, a], [, b]) => (dataPartita(a) || Infinity) - (dataPartita(b) || Infinity)
    );

    for (const [matchString, matchData] of ordinate) {
        matchesDiv.appendChild(rappresentaPartita(matchString, matchData, contesto, matchday));
    }

    if (ordinate.length === 0 && riposo) {
        const nota = document.createElement("p");
        nota.className = "nota-riposo";
        nota.textContent = `${riposo} riposa in questa giornata`;
        matchesDiv.appendChild(nota);
    }

    matchdayDiv.appendChild(matchesDiv);
    calendarDiv.appendChild(matchdayDiv);
    return matchdayDiv;
}

function logoSquadra(url) {
    const container = document.createElement("div");
    container.classList.add("container-logo");
    if (url) {
        const img = document.createElement("img");
        img.src = url;
        img.alt = "";
        img.width = 50;
        img.height = 50;
        img.loading = "lazy";
        img.decoding = "async";
        container.appendChild(img);
    }
    return container;
}

function bloccoSquadra(classe, chiave, squadre) {
    const div = document.createElement("div");
    div.classList.add(classe);

    const nomeContainer = document.createElement("div");
    nomeContainer.classList.add("container-nome-squadra");
    const nome = document.createElement("p");
    nome.textContent = nomeSquadra(chiave);
    nome.classList.add("nome-squadra");
    nomeContainer.appendChild(nome);

    div.append(logoSquadra(squadre?.[chiave]?.LogoLR || ""), nomeContainer);
    return div;
}

export function rappresentaPartita(matchString, matchData, contesto, matchday) {
    const [homeTeam, awayTeam] = matchString.split(":");
    const giocata = haRisultato(matchData);
    const stato = statoPartita(matchData);

    // container della partita
    const matchDiv = document.createElement("div");
    matchDiv.classList.add("partita-div");
    if (stato === "oggi") matchDiv.classList.add("partita-oggi");

    // container delle squadre che si affrontano
    const match = document.createElement("div");
    match.classList.add("partita");

    const resultDiv = document.createElement("div");
    resultDiv.classList.add("risultato");
    resultDiv.textContent = giocata ? String(matchData.Risultato).trim() : "VS";

    match.append(
        bloccoSquadra("squadraCasa", homeTeam, contesto.squadre),
        resultDiv,
        bloccoSquadra("squadraOspite", awayTeam, contesto.squadre)
    );

    // container di luogo e data
    const matchVenueDiv = document.createElement("div");
    matchVenueDiv.classList.add("partita-venue");

    const venueDiv = document.createElement("div");
    venueDiv.classList.add("luogo");
    const luogo = matchData?.Luogo;
    if (luogo) {
        const link = document.createElement("a");
        link.href = linkMappa(luogo);
        link.target = "_blank";
        link.rel = "noopener";
        link.className = "link-mappa";
        link.title = `Apri ${luogo} su Google Maps`;
        link.innerHTML = `<i class="icona icona-location" aria-hidden="true"></i>`;
        link.append(` ${luogo}`);
        // Il clic sul luogo apre la mappa, non il dettaglio della partita
        link.addEventListener("click", (evento) => evento.stopPropagation());
        link.addEventListener("keydown", (evento) => evento.stopPropagation());
        venueDiv.appendChild(link);
    } else {
        const venueElement = document.createElement("p");
        venueElement.textContent = "Luogo da definire";
        venueDiv.appendChild(venueElement);
    }

    const dateDiv = document.createElement("div");
    dateDiv.classList.add("data");
    const dateElement = document.createElement("p");
    if (matchData?.Data && matchData?.Orario) {
        dateElement.textContent = `${matchData.Data} - ${matchData.Orario}`;
    } else {
        dateElement.textContent = "Data da definire";
    }
    if (stato === "oggi") {
        const oggi = document.createElement("span");
        oggi.className = "badge-oggi";
        oggi.textContent = "Oggi";
        dateElement.prepend(oggi, " ");
    }
    dateDiv.appendChild(dateElement);

    matchVenueDiv.append(venueDiv, dateDiv);
    matchDiv.append(match, matchVenueDiv);

    // Solo le partite giocate hanno un dettaglio da mostrare
    if (giocata) {
        matchDiv.classList.add("cliccabile");
        rendiCliccabile(
            matchDiv,
            () =>
                showOverlayMatchResult(matchString, contesto.squadre, matchday, {
                    partite: contesto.partite,
                    calendario: contesto.calendario,
                    divisione: contesto.divisione,
                }),
            `${nomeSquadra(homeTeam)} ${resultDiv.textContent} ${nomeSquadra(awayTeam)}: vedi i marcatori`
        );
    }

    return matchDiv;
}
