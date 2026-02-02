import {
    db,
    ref,
    update,
    set,
    getData,
    getDataCached,
    getPaths,
} from "../firebase.js";
import { edition } from "../divisionAndVariables.js";
import { convertiDataOra } from "../utils/formatters.js";
import { showOverlayMatchResult } from "./match-overlay.js";

/*
===================================
CALENDARIO
===================================
*/

export async function showCalendarOptions() {
    editCalendar();
}

async function editCalendar() {
    // Div della sezione Calendario
    const calendarContent = document.getElementById("calendar-content");

    // Div giornata
    let calendarDiv = document.getElementById("calendar-div");
    if (!calendarDiv) {
        calendarDiv = document.createElement("div");
        calendarDiv.id = "calendar-div";
        calendarContent.appendChild(calendarDiv);
    }

    // Ottieni i percorsi per calendario e squadre
    const { calendarPath } = getPaths();

    // Recupera i dati di calendario
    const calendarSnapshot = await getData(calendarPath);

    if (calendarSnapshot) {
        calendarDiv.innerHTML = "";

        const matchdaySelectorDiv = document.createElement("div");
        matchdaySelectorDiv.id = "matchday-selector-div";
        calendarDiv.appendChild(matchdaySelectorDiv);

        const matchdayMatchesDiv = document.createElement("div");
        matchdayMatchesDiv.id = "matchday-matches-div";
        calendarDiv.appendChild(matchdayMatchesDiv);

        const matchdays = Object.keys(calendarSnapshot);

        matchdays.forEach((matchday) => {
            const matchdayLabel = document.createElement("label");
            matchdayLabel.classList.add("matchday-btn");
            matchdayLabel.innerText = `${matchday}`;
            matchdayLabel.setAttribute("matchday-number", matchday);
            matchdaySelectorDiv.appendChild(matchdayLabel);
        });

        function createInputField(value, onChange, placeholder, width) {
            const input = document.createElement("input");
            input.type = "text";
            input.value = value ?? "";
            input.placeholder = placeholder;
            input.style.width = width;
            input.addEventListener("input", onChange);
            return input;
        }

        function displayMatches(matchday) {
            matchdayMatchesDiv.innerHTML = "";

            const matches = calendarSnapshot[matchday];
            const matchesArray = Object.keys(matches).map((match) => {
                const matchInfo = matches[match];
                const [homeTeam, awayTeam] = match.split(":");
                const homeTeamAbbreviated = homeTeam.replace(/_/g, ".");
                const awayTeamAbbreviated = awayTeam.replace(/_/g, ".");
                const dateAndTime = convertiDataOra(matchInfo.Data, matchInfo.Orario);

                return {
                    matchKey: match,
                    homeTeam: homeTeamAbbreviated,
                    awayTeam: awayTeamAbbreviated,
                    dateAndTime: dateAndTime,
                    data: matchInfo.Data ?? "",
                    orario: matchInfo.Orario ?? "",
                    luogo: matchInfo.Luogo ?? "",
                };
            });

            // Ordina le partite cronologicamente
            const sortedMatches = ordinaPartite(matchesArray);

            sortedMatches.forEach((matchInfo) => {
                const matchDiv = document.createElement("div");
                matchDiv.className = "match-div";
                matchdayMatchesDiv.appendChild(matchDiv);

                // Nome partita
                const matchTitleDiv = document.createElement("div");
                matchTitleDiv.className = "match-title-div";
                matchDiv.appendChild(matchTitleDiv);

                const matchTitle = document.createElement("p");
                matchTitle.textContent = `${matchInfo.homeTeam} : ${matchInfo.awayTeam}`;
                matchTitleDiv.appendChild(matchTitle);

                // Info partita
                const matchInfoDiv = document.createElement("div");
                matchInfoDiv.className = "match-info-div";
                matchDiv.appendChild(matchInfoDiv);

                const dataInput = createInputField(
                    matchInfo.data,
                    (event) => {
                        matchInfo.data = event.target.value;
                    },
                    "Data",
                    "60px"
                );

                const orarioInput = createInputField(
                    matchInfo.orario,
                    (event) => {
                        matchInfo.orario = event.target.value;
                    },
                    "Orario",
                    "60px"
                );

                const luogoInput = createInputField(
                    matchInfo.luogo,
                    (event) => {
                        matchInfo.luogo = event.target.value;
                    },
                    "Luogo",
                    "100px"
                );

                matchInfoDiv.appendChild(dataInput);
                matchInfoDiv.appendChild(orarioInput);
                matchInfoDiv.appendChild(luogoInput);

                matchdayMatchesDiv.appendChild(matchDiv);
            });

            // Aggiungi il pulsante di salvataggio
            const saveButton = document.createElement("button");
            saveButton.textContent = "Salva Modifiche";
            saveButton.classList.add("custom-button");
            matchdayMatchesDiv.appendChild(saveButton);

            saveButton.addEventListener("click", () => {
                // Aggiorna i dati nel database
                const updates = {};
                matchdayMatchesDiv
                    .querySelectorAll(".match-div")
                    .forEach((matchDiv) => {
                        const [homeTeam, awayTeam] = matchDiv
                            .querySelector(".match-title-div p")
                            .textContent.split(" : ");
                        const homeTeamKey = homeTeam.replace(/\./g, "_");
                        const awayTeamKey = awayTeam.replace(/\./g, "_");
                        const matchKey = `${homeTeamKey}:${awayTeamKey}`;

                        const matchInfoDiv = matchDiv.querySelector(".match-info-div");

                        const data = matchInfoDiv.querySelector(
                            "input[placeholder='Data']"
                        ).value;
                        const orario = matchInfoDiv.querySelector(
                            "input[placeholder='Orario']"
                        ).value;
                        const luogo = matchInfoDiv.querySelector(
                            "input[placeholder='Luogo']"
                        ).value;

                        updates[`${calendarPath}/${matchday}/${matchKey}/Data`] = data;
                        updates[`${calendarPath}/${matchday}/${matchKey}/Orario`] = orario;
                        updates[`${calendarPath}/${matchday}/${matchKey}/Luogo`] = luogo;
                    });

                update(ref(db), updates)
                    .then(() => {
                        console.log("Modifiche salvate con successo");
                        alert("Modifiche salvate con successo");
                    })
                    .catch((error) => {
                        console.error("Errore nel salvataggio delle modifiche:", error);
                        alert("Errore nel salvataggio delle modifiche");
                    });
            });
        }

        // Gestione click sulle giornate
        document.querySelectorAll(".matchday-btn").forEach((btn) => {
            btn.addEventListener("click", (event) => {
                // Rimuovi la classe active da tutti i pulsanti
                document
                    .querySelectorAll(".matchday-btn")
                    .forEach((button) => button.classList.remove("active"));
                // Aggiungi la classe active al pulsante cliccato
                event.target.classList.add("active");

                const selectedGiornata = event.target.getAttribute("matchday-number");

                displayMatches(selectedGiornata);
            });
        });

        // Seleziona la giornata di default (per-divisione con fallback globale)
        const { matchdayToShowPath } = getPaths(); // globale
        const division = document.getElementById("division")?.value || "Superiori";
        const perDivisionPath = `Calcio/${edition}/${division}/GiornataDaMostrare`;
        const matchdayToShow =
            (await getData(perDivisionPath)) ?? (await getData(matchdayToShowPath));

        document
            .querySelector(`.matchday-btn[matchday-number="${matchdayToShow}"]`)
            ?.click();
    } else {
        console.log("Nessun calendario trovato nel database.");
    }
}

export async function editMatchdayToShow() {
    // Div prossima giornata
    const matchdayToShowDiv = document.getElementById("matchday-selection") || document.getElementById("match-to-show-div");

    const { matchdayToShowPath } = getPaths(); // path globale (retro-compatibilità)
    const division = document.getElementById("division")?.value || "Superiori";
    const perDivisionPath = `Calcio/${edition}/${division}/GiornataDaMostrare`;

    // leggi: prima per-divisione, se mancante usa il globale
    let matchdayToShow =
        (await getData(perDivisionPath)) ?? (await getData(matchdayToShowPath));

    if (matchdayToShow !== undefined && matchdayToShow !== null) {
        const inputContainer = document.createElement("div");

        const matchdayToShowLabel = document.createElement("label");
        matchdayToShowLabel.setAttribute("for", "matchday-to-show-input");
        matchdayToShowLabel.innerText = "Giornata da Mostrare";

        const matchdayToShowInput = document.createElement("input");
        matchdayToShowInput.id = "matchday-to-show-input";
        matchdayToShowInput.value = matchdayToShow;

        inputContainer.appendChild(matchdayToShowLabel);
        inputContainer.appendChild(matchdayToShowInput);
        matchdayToShowDiv.appendChild(inputContainer);

        // Bottone per salvare la giornata da mostrare (per-divisione)
        const saveButton = document.createElement("button");
        saveButton.classList.add("custom-button");
        saveButton.textContent = "Salva";
        matchdayToShowDiv.appendChild(saveButton);

        saveButton.addEventListener("click", () => {
            const matchdayToShowRef = ref(db, perDivisionPath);

            set(matchdayToShowRef, matchdayToShowInput.value)
                .then(() => {
                    alert("Modifica Salvata");
                    // Aggiorna l'interfaccia con i nuovi dati
                    matchdayToShow = matchdayToShowInput.value;

                    // Nota: se avevi un ref con typo, usa l'ID corretto "nav-dashboard"
                    const navDashboard =
                        document.getElementById("nav-dashboard") ||
                        document.getElementById("nav-dasboard");
                    if (navDashboard) navDashboard.click();
                })
                .catch((error) => {
                    console.error("Errore nel salvataggio delle modifiche:", error);
                });
        });
    }
}

export async function recuperaCalendario() {
    // Ottieni i percorsi per calendario e squadre
    const { calendarPath, teamsPath } = getPaths();

    // Recupera i dati di calendario e squadre in parallelo con cache (60 min)
    const [calendarSnapshot, teamsSnapshot] = await Promise.all([
        getDataCached(calendarPath, 60),
        getDataCached(teamsPath, 60),
    ]);

    if (calendarSnapshot) {
        // Pulisce il contenuto del div prima di inserire nuove date
        const calendarDiv = document.getElementById("giornate");
        calendarDiv.innerHTML = "";

        // Filtra solo le chiavi numeriche
        const matchdays = Object.keys(calendarSnapshot)
            .filter((key) => !isNaN(key))
            .sort();

        matchdays.forEach((matchday) => {
            const matches = calendarSnapshot[matchday];
            rappresentaGiornata(matchday, matches, teamsSnapshot, calendarDiv);
        });
    } else {
        console.log("Nessun calendario trovato nel database.");
    }
}

export async function prossimaGiornata() {
    // Skeleton
    const container = document.getElementById("prossima-giornata");
    if (container) {
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

    const { matchdayToShowPath, teamsPath, calendarPath } = getPaths();

    const division = document.getElementById("division")?.value || "Superiori";
    const perDivisionPath = `Calcio/${edition}/${division}/GiornataDaMostrare`;

    // leggi giornata per la divisione, altrimenti usa quella globale
    const matchdayToShow =
        (await getData(perDivisionPath)) ?? (await getData(matchdayToShowPath));

    if (matchdayToShow) {
        const [calendarSnapshot, teamsSnapshot] = await Promise.all([
            getData(`${calendarPath}/${matchdayToShow}`),
            getData(teamsPath),
        ]);

        if (calendarSnapshot) {
            const calendarDiv = document.getElementById("prossima-giornata");
            calendarDiv.innerHTML = "";

            const matchdayDiv = document.createElement("div");
            matchdayDiv.classList.add("giornata");

            const matches = calendarSnapshot;
            rappresentaGiornata(matchdayToShow, matches, teamsSnapshot, calendarDiv);
        }

        const instructionElement = document.querySelector(".instruction");

        // Controlla se almeno una partita ha un risultato valido
        const hasResults = calendarSnapshot
            ? Object.values(calendarSnapshot).some(
                (match) =>
                    match.Risultato &&
                    match.Risultato.trim() !== "VS" &&
                    match.Risultato.trim() !== ""
            )
            : false;

        // Mostra o nasconde il paragrafo in base ai risultati
        if (instructionElement) {
            instructionElement.style.display = hasResults ? "block" : "none";
        }
    }
}

function rappresentaGiornata(matchday, matches, teamsSnapshot, calendarDiv) {
    const descrizioneCalendario =
        document.getElementById("descrizione-calendario") || null;
    const selectDesktop = document.getElementById("division");
    const selectMobile = document.getElementById("division-smartphone");

    function aggiornaTestoDivisione(value) {
        if (!descrizioneCalendario) return;
        descrizioneCalendario.innerHTML = "";
    }

    selectDesktop.addEventListener("change", (e) => {
        aggiornaTestoDivisione(e.target.value);
    });

    selectMobile.addEventListener("change", (e) => {
        aggiornaTestoDivisione(e.target.value);
    });

    // Imposta il testo iniziale in base al valore selezionato all'avvio
    aggiornaTestoDivisione(selectDesktop.value || selectMobile.value);

    const matchdayDiv = document.createElement("div");
    matchdayDiv.classList.add("giornata");

    const matchdayElement = document.createElement("p");
    matchdayElement.classList.add("numero-giornata");
    matchdayElement.textContent = `Giornata ${matchday}`;

    matchdayDiv.appendChild(matchdayElement);

    const matchesDiv = document.createElement("div");
    matchesDiv.classList.add("partite");

    const matchesArray = [];

    for (const [matchString, matchData] of Object.entries(matches)) {
        const dateAndTime = convertiDataOra(matchData.Data, matchData.Orario);
        const matchObj = {
            div: rappresentaPartita(matchString, matchData, teamsSnapshot, matchday),
            dateAndTime: dateAndTime,
        };
        matchesArray.push(matchObj);
    }

    // Ordina le partite in base alla data e all'hourrio
    const orderedMatches = ordinaPartite(matchesArray);

    // Aggiungi le partite ordinate al div delle partite
    orderedMatches.forEach((matchObj) => {
        matchesDiv.appendChild(matchObj.div);
    });

    matchdayDiv.appendChild(matchesDiv);
    calendarDiv.appendChild(matchdayDiv);
}

function rappresentaPartita(matchString, matchData, teamsSnapshot, matchday) {
    const [homeTeam, awayTeam] = matchString.split(":");
    const homeTeamAbbreviated = homeTeam.replace(/_/g, ".");
    const awayTeamAbbreviated = awayTeam.replace(/_/g, ".");

    // container della partita
    const matchDiv = document.createElement("div");
    matchDiv.classList.add("partita-div");

    // container delle squadre che si affrontano
    const match = document.createElement("div");
    match.classList.add("partita");

    // SQUADRA CASA
    const homeTeamDiv = document.createElement("div");
    homeTeamDiv.classList.add("squadraCasa");

    // Recupera il logo della squadra casa dal nodo Squadre
    const homeLogoContainer = document.createElement("div");
    homeLogoContainer.classList.add("container-logo");
    const homeLogoElement = document.createElement("img");
    const homeLogoUrl = teamsSnapshot[homeTeam]?.LogoLR || "";
    homeLogoElement.src = homeLogoUrl;

    const homeTeamNameContainter = document.createElement("div");
    homeTeamNameContainter.classList.add("container-nome-squadra");
    const homeTeamElement = document.createElement("p");
    homeTeamElement.textContent = homeTeamAbbreviated;
    homeTeamElement.classList.add("nome-squadra");

    homeLogoContainer.appendChild(homeLogoElement);
    homeTeamNameContainter.appendChild(homeTeamElement);
    homeTeamDiv.appendChild(homeLogoContainer);
    homeTeamDiv.appendChild(homeTeamNameContainter);

    // RISULTATO
    const resultDiv = document.createElement("div");
    resultDiv.classList.add("risultato");

    const resultValue = matchData?.Risultato || "VS";
    resultDiv.textContent = resultValue.trim() ? resultValue : "VS";

    // SQUADRA OSPITE
    const awayTeamDiv = document.createElement("div");
    awayTeamDiv.classList.add("squadraOspite");

    // Recupera il logo della squadra ospite dal nodo Squadre
    const awayLogoContainer = document.createElement("div");
    awayLogoContainer.classList.add("container-logo");
    const awayLogoElement = document.createElement("img");
    const awayLogoUrl = teamsSnapshot[awayTeam]?.LogoLR || "";
    awayLogoElement.src = awayLogoUrl;

    const awayTeamNameContainer = document.createElement("div");
    awayTeamNameContainer.classList.add("container-nome-squadra");
    const awayTeamElement = document.createElement("p");
    awayTeamElement.textContent = awayTeamAbbreviated;
    awayTeamElement.classList.add("nome-squadra");

    awayLogoContainer.appendChild(awayLogoElement);
    awayTeamNameContainer.appendChild(awayTeamElement);
    awayTeamDiv.appendChild(awayLogoContainer);
    awayTeamDiv.appendChild(awayTeamNameContainer);

    // container di luogo e data
    const matchVenueDiv = document.createElement("div");
    matchVenueDiv.classList.add("partita-venue");

    const matchDate = matchData?.Data || null;
    const matchTime = matchData?.Orario || null;
    const matchVenue = matchData?.Luogo || null;

    const dateDiv = document.createElement("div");
    dateDiv.classList.add("data");
    const venueDiv = document.createElement("div");
    venueDiv.classList.add("luogo");

    if (matchDate && matchTime) {
        const dateElement = document.createElement("p");
        dateElement.textContent = `${matchDate} - ${matchTime}`;
        dateDiv.appendChild(dateElement);
    } else {
        const dateElement = document.createElement("p");
        dateElement.textContent = "TBD";
        dateDiv.appendChild(dateElement);
    }

    if (matchVenue) {
        const venueElement = document.createElement("p");
        venueElement.textContent = `${matchVenue}`;
        venueDiv.appendChild(venueElement);
    } else {
        const venueElement = document.createElement("p");
        venueElement.textContent = "TBD";
        venueDiv.appendChild(venueElement);
    }

    match.appendChild(homeTeamDiv);
    match.appendChild(resultDiv);
    match.appendChild(awayTeamDiv);

    matchVenueDiv.appendChild(venueDiv);
    matchVenueDiv.appendChild(dateDiv);

    matchDiv.appendChild(match);
    matchDiv.appendChild(matchVenueDiv);

    // Aggiungi l'event listener per l'overlay
    if (resultValue !== "VS") {
        matchDiv.addEventListener("click", () => {
            showOverlayMatchResult(matchString, teamsSnapshot, matchday);
        });
    }

    return matchDiv;
}

function ordinaPartite(matchesArray) {
    return matchesArray.sort((a, b) => a.dateAndTime - b.dateAndTime);
}
