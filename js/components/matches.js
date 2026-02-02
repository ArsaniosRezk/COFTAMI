import { getData, updateData, getPaths } from "../../js/firebase.js";
import { edition } from "../../js/divisionAndVariables.js";

export async function showMatchesOptions() {
    selectMatchday();
}

async function selectMatchday() {
    // Div della sezione Partite
    const matchesContent = document.getElementById("matches-content");

    // DIV SELEZIONE GIORNATA
    // Ottieni i percorsi per calendario e squadre
    const { calendarPath } = getPaths();

    // Recupera i dati di calendario e squadre in parallelo
    const calendarSnapshot = await getData(calendarPath);

    // Div giornata
    let matchdaySelectorDiv = document.getElementById("matchday-selector-div");
    if (!matchdaySelectorDiv) {
        matchdaySelectorDiv = document.createElement("div");
        matchdaySelectorDiv.id = "matchday-selector-div";
        matchesContent.appendChild(matchdaySelectorDiv);
    }

    if (calendarSnapshot) {
        matchdaySelectorDiv.innerHTML = "";

        const matchdays = Object.keys(calendarSnapshot);

        matchdays.forEach((matchday) => {
            const matchdayLabel = document.createElement("label");
            matchdayLabel.classList.add("matchday-btn");
            matchdayLabel.innerText = `${matchday}`;
            matchdayLabel.setAttribute("matchday-number", matchday);
            matchdaySelectorDiv.appendChild(matchdayLabel);
        });

        // Funzione per gestire il click sulle giornate
        document.querySelectorAll(".matchday-btn").forEach((btn) => {
            btn.addEventListener("click", (event) => {
                const selectedGiornata = event.target.getAttribute("matchday-number");

                showMatches(selectedGiornata);
            });
        });
    }
}

async function showMatches(selectedGiornata) {
    // Div della sezione Partite
    const matchesContent = document.getElementById("matches-content");

    // Rimuove il selettore della giornata per fare spazio alle partite
    const matchdaySelectorDiv = document.getElementById("matchday-selector-div");
    matchdaySelectorDiv?.remove();

    // Creazione del div che conterrà le partite
    let matchesDiv = document.getElementById("matches-selector-div");
    if (!matchesDiv) {
        matchesDiv = document.createElement("div");
        matchesDiv.id = "matches-selector-div";
        matchesContent.appendChild(matchesDiv);
    } else {
        matchesDiv.innerHTML = ""; // Pulisce il div se esiste già
    }

    // Recupera le partite per la giornata selezionata
    const { matchesPath } = getPaths();
    const matchesSnapshot = await getData(matchesPath);
    const selectedMatches = matchesSnapshot[selectedGiornata];

    // Se ci sono partite per la giornata selezionata
    if (selectedMatches && Object.keys(selectedMatches).length > 0) {
        Object.keys(selectedMatches).forEach((matchKey) => {
            const match = selectedMatches[matchKey];

            const matchDiv = document.createElement("div");
            matchDiv.classList.add("match-div");

            // Aggiungi dettagli della partita al div
            matchDiv.innerHTML = `
        <div class="match-title">${match.SquadraCasa.replace(
                /_/g,
                "."
            )} vs ${match.SquadraOspite.replace(/_/g, ".")}</div>
      `;

            matchesDiv.appendChild(matchDiv);

            // Aggiungi event listener per cliccare sulla partita
            matchDiv.addEventListener("click", () => {
                // Rimuovi il div delle partite
                matchesDiv.remove();

                // Mostra le info della partita
                showMatchDetails(match, selectedGiornata);
            });
        });
    } else {
        matchesDiv.innerHTML = "<p>Non ci sono partite per questa giornata</p>";
    }

    // Aggiungi un pulsante per tornare alla lista delle partite
    const backButton = document.createElement("button");
    backButton.innerText = "⮪";
    backButton.classList.add("back-button");
    backButton.addEventListener("click", () => {
        matchesDiv.remove(); // Rimuovi i dettagli della partita
        selectMatchday();
    });

    matchesDiv.appendChild(backButton);
}

async function showMatchDetails(match, selectedGiornata) {
    const matchesContent = document.getElementById("matches-content");
    matchesContent.style.alignItems = "start";

    let matchDetailsDiv = document.getElementById("match-details-div");
    if (!matchDetailsDiv) {
        matchDetailsDiv = document.createElement("div");
        matchDetailsDiv.id = "match-details-div";
        matchesContent.appendChild(matchDetailsDiv);
    } else {
        matchDetailsDiv.innerHTML = "";
    }

    const matchInfoDiV = document.createElement("div");
    matchInfoDiV.id = "match-info-div";
    matchDetailsDiv.appendChild(matchInfoDiV);

    const homeTeam = (match?.SquadraCasa || "").replace(/_/g, ".");
    const awayTeam = (match?.SquadraOspite || "").replace(/_/g, ".");
    const homeGoals = match?.GolSquadraCasa ?? 0;
    const awayGoals = match?.GolSquadraOspite ?? 0;

    const matchTitle = document.createElement("div");
    matchTitle.id = "match-title-div";
    matchInfoDiV.appendChild(matchTitle);

    const homeSection = document.createElement("div");
    homeSection.id = "home-section";
    const awaySection = document.createElement("div");
    awaySection.id = "away-section";

    const homeTeamNameEl = document.createElement("span");
    homeTeamNameEl.innerText = homeTeam;
    homeSection.appendChild(homeTeamNameEl);
    const homeTeamGoalsInput = document.createElement("input");
    homeTeamGoalsInput.type = "number";
    homeTeamGoalsInput.value = homeGoals;
    homeSection.appendChild(homeTeamGoalsInput);

    const awayTeamNameEl = document.createElement("span");
    awayTeamNameEl.innerText = awayTeam;
    awaySection.appendChild(awayTeamNameEl);
    const awayTeamGoalsInput = document.createElement("input");
    awayTeamGoalsInput.type = "number";
    awayTeamGoalsInput.value = awayGoals;
    awaySection.appendChild(awayTeamGoalsInput);

    matchTitle.appendChild(homeSection);
    matchTitle.appendChild(awaySection);

    const matchScorersDiv = document.createElement("div");
    matchScorersDiv.id = "match-scorers-div";
    matchInfoDiV.appendChild(matchScorersDiv);

    const homeScorersDiv = document.createElement("div");
    homeScorersDiv.id = "match-home-scorers-div";
    matchScorersDiv.appendChild(homeScorersDiv);

    const awayScorersDiv = document.createElement("div");
    awayScorersDiv.id = "match-away-scorers-div";
    matchScorersDiv.appendChild(awayScorersDiv);

    const { teamsPath } = getPaths();
    const homeTeamData = await getData(`${teamsPath}/${match.SquadraCasa}`);
    const awayTeamData = await getData(`${teamsPath}/${match.SquadraOspite}`);

    const homePlayers = Object.keys(homeTeamData?.Giocatori || {});
    const awayPlayers = Object.keys(awayTeamData?.Giocatori || {});

    // ↓↓↓ PASSA SEMPRE UN OGGETTO (mai undefined)
    const homeScorersObj = match?.Marcatori?.MarcatoriCasa || {};
    const awayScorersObj = match?.Marcatori?.MarcatoriOspite || {};

    populatePlayers(
        homeScorersDiv,
        homePlayers,
        match.SquadraOspite,
        homeScorersObj
    );
    populatePlayers(
        awayScorersDiv,
        awayPlayers,
        match.SquadraCasa,
        awayScorersObj
    );

    const backButton = document.createElement("button");
    backButton.innerText = "⮪";
    backButton.classList.add("back-button");
    backButton.addEventListener("click", () => {
        matchDetailsDiv.remove();
        matchesContent.style.alignItems = "center";
        showMatches(selectedGiornata);
    });

    const buttonsDiv = document.createElement("div");
    buttonsDiv.id = "buttons-div";
    buttonsDiv.appendChild(backButton);

    const saveButton = document.createElement("button");
    saveButton.classList.add("custom-button");
    saveButton.textContent = "Salva Modifiche";
    saveButton.addEventListener("click", () =>
        saveEditedMatch(match, selectedGiornata)
    );

    buttonsDiv.appendChild(saveButton);
    matchDetailsDiv.appendChild(buttonsDiv);
}

// Funzione per popolare i giocatori e i gol segnati
function populatePlayers(container, players, opponentTeamName, scorers = {}) {
    container.innerHTML = "";

    players.forEach((player) => {
        const playerDiv = document.createElement("div");
        playerDiv.className = "player-div";
        const playerName = document.createElement("span");
        playerName.className = "player-name";
        playerName.innerText = player;

        const goalsInput = document.createElement("input");
        goalsInput.type = "number";
        goalsInput.min = "0";
        goalsInput.placeholder = "G";
        goalsInput.value = scorers[player] || "";
        playerDiv.appendChild(playerName);
        playerDiv.appendChild(goalsInput);
        container.appendChild(playerDiv);
    });

    const ownGoalDiv = document.createElement("div");
    ownGoalDiv.className = "player-div";
    const ownGoal = document.createElement("span");
    ownGoal.className = "player-name";

    if (container.id === "match-home-scorers-div") {
        ownGoal.innerHTML = `<span>Autogol di ${String(
            opponentTeamName || ""
        ).replace(/_/g, ".")}</span>`;
        const ownGoalsInput = document.createElement("input");
        ownGoalsInput.type = "number";
        ownGoalsInput.min = "0";
        ownGoalsInput.placeholder = "A";
        ownGoalsInput.value = scorers.AutogolOspite || "";
        ownGoalDiv.appendChild(ownGoal);
        ownGoalDiv.appendChild(ownGoalsInput);
    } else if (container.id === "match-away-scorers-div") {
        ownGoal.innerHTML = `<span>Autogol di ${String(
            opponentTeamName || ""
        ).replace(/_/g, ".")}</span>`;
        const ownGoalsInput = document.createElement("input");
        ownGoalsInput.type = "number";
        ownGoalsInput.min = "0";
        ownGoalsInput.placeholder = "A";
        ownGoalsInput.value = scorers.AutogolCasa || "";
        ownGoalDiv.appendChild(ownGoal);
        ownGoalDiv.appendChild(ownGoalsInput);
    }

    container.appendChild(ownGoalDiv);
}

// Funzione per gestire la conferma del referto
async function saveEditedMatch(match, selectedGiornata) {
    const homeTeamGoalsInput = document.querySelector("#home-section input");
    const awayTeamGoalsInput = document.querySelector("#away-section input");
    const newHomeGoals = parseInt(homeTeamGoalsInput.value) || 0;
    const newAwayGoals = parseInt(awayTeamGoalsInput.value) || 0;

    match.GolSquadraCasa = newHomeGoals;
    match.GolSquadraOspite = newAwayGoals;

    const homeScorersInputs = document.querySelectorAll(
        "#match-home-scorers-div input"
    );
    const awayScorersInputs = document.querySelectorAll(
        "#match-away-scorers-div input"
    );

    const updatedHomeScorers = {};
    const updatedAwayScorers = {};

    let autogolOspite = 0;
    let autogolCasa = 0;

    homeScorersInputs.forEach((input) => {
        const playerName = input.parentNode.querySelector(".player-name").innerText;
        const goals = parseInt(input.value) || 0;
        if (playerName.includes("Autogol di")) {
            autogolOspite = goals;
        } else if (goals > 0) {
            updatedHomeScorers[playerName] = goals;
        }
    });

    awayScorersInputs.forEach((input) => {
        const playerName = input.parentNode.querySelector(".player-name").innerText;
        const goals = parseInt(input.value) || 0;
        if (playerName.includes("Autogol di")) {
            autogolCasa = goals;
        } else if (goals > 0) {
            updatedAwayScorers[playerName] = goals;
        }
    });

    // Assicura l'esistenza del ramo Marcatori
    match.Marcatori = match.Marcatori || {};

    // Scrivi solo se ci sono valori; altrimenti rimuovi il ramo per evitare `{}` che il DB può potare
    if (Object.keys(updatedHomeScorers).length > 0 || autogolOspite > 0) {
        match.Marcatori.MarcatoriCasa = { ...updatedHomeScorers };
        if (autogolOspite > 0)
            match.Marcatori.MarcatoriCasa.AutogolOspite = autogolOspite;
    } else {
        delete match.Marcatori.MarcatoriCasa;
    }

    if (Object.keys(updatedAwayScorers).length > 0 || autogolCasa > 0) {
        match.Marcatori.MarcatoriOspite = { ...updatedAwayScorers };
        if (autogolCasa > 0)
            match.Marcatori.MarcatoriOspite.AutogolCasa = autogolCasa;
    } else {
        delete match.Marcatori.MarcatoriOspite;
    }

    const { matchesPath } = getPaths();
    const matchPath = `${matchesPath}/${selectedGiornata}/${match.SquadraCasa}:${match.SquadraOspite}`;

    const risultato = `${match.GolSquadraCasa}:${match.GolSquadraOspite}`;
    const selectedDivision = document.getElementById("division").value;
    const calendarioPath = `Calcio/${edition}/${selectedDivision}/Calendario/${selectedGiornata}/${match.SquadraCasa}:${match.SquadraOspite}`;

    try {
        await updateData(matchPath, match);
        await updateData(calendarioPath, { Risultato: risultato });
        alert("Modifiche salvate con successo!");
    } catch (error) {
        console.error("Errore durante il salvataggio delle modifiche:", error);
        alert("Si è verificato un errore durante il salvataggio delle modifiche.");
    }
}
