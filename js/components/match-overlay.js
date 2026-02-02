import { getData, getPaths } from "../firebase.js";
import { abbreviateName, separateScorers } from "../utils/formatters.js";

export async function showOverlayMatchResult(matchString, teamsSnapshot, matchday) {
    // Crea l'overlay
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    // Aggiungi l'icona di chiusura
    const closeIcon = document.createElement("i");
    closeIcon.classList.add("fa-solid", "fa-xmark", "close-team-info");
    overlay.appendChild(closeIcon);

    const { matchesPath } = getPaths();
    const matchPath = `${matchesPath}/${matchday}/${matchString}`;
    const matchData = await getData(matchPath);

    // Crea il contenuto dell'overlay
    const content = document.createElement("div");
    content.classList.add("overlay-content");

    // DIV MATCH INFO
    const matchInfoDiv = document.createElement("div");
    matchInfoDiv.classList.add("match-info-div");

    // Squadra Casa
    const homeTeamDiv = document.createElement("div");
    homeTeamDiv.className = "team-div";
    matchInfoDiv.appendChild(homeTeamDiv);

    // logo
    const homeLogoDiv = document.createElement("div");
    homeLogoDiv.className = "logo-div";
    homeTeamDiv.appendChild(homeLogoDiv);

    const homeLogoImg = document.createElement("img");
    homeLogoImg.className = "logo-img";
    const homeTeam = matchData.SquadraCasa;
    homeLogoImg.src = teamsSnapshot[homeTeam]?.Logo || "";
    homeLogoDiv.appendChild(homeLogoImg);

    // nome
    const homeTeamName = document.createElement("span");
    homeTeamName.className = "team-name";

    homeTeamName.innerText = matchData.SquadraCasa.replace(/_/g, ".");
    homeTeamDiv.appendChild(homeTeamName);

    // Squadra Ospite
    const awayTeamDiv = document.createElement("div");
    awayTeamDiv.className = "team-div";
    matchInfoDiv.appendChild(awayTeamDiv);

    // logo
    const awayLogoDiv = document.createElement("div");
    awayLogoDiv.className = "logo-div";
    awayTeamDiv.appendChild(awayLogoDiv);

    const awayLogoImg = document.createElement("img");
    awayLogoImg.className = "logo-img";
    const awayTeam = matchData.SquadraOspite;
    awayLogoImg.src = teamsSnapshot[awayTeam]?.Logo || "";
    awayLogoDiv.appendChild(awayLogoImg);

    // nome
    const awayTeamName = document.createElement("span");
    awayTeamName.className = "team-name";

    awayTeamName.innerText = matchData.SquadraOspite.replace(/_/g, ".");
    awayTeamDiv.appendChild(awayTeamName);

    // GOL DIV
    const golDiv = document.createElement("div");
    golDiv.className = "gols-div";

    // casa
    const homeGolDiv = document.createElement("div");
    homeGolDiv.className = "gol-div";
    golDiv.appendChild(homeGolDiv);

    const homeGoalEl = document.createElement("span");
    homeGoalEl.className = "gol-number";
    homeGoalEl.innerText = matchData.GolSquadraCasa;
    homeGolDiv.appendChild(homeGoalEl);

    // gol
    const awayGolDiv = document.createElement("div");
    awayGolDiv.className = "gol-div";
    golDiv.appendChild(awayGolDiv);

    const awayGoalEl = document.createElement("span");
    awayGoalEl.className = "gol-number";
    awayGoalEl.innerText = matchData.GolSquadraOspite;
    awayGolDiv.appendChild(awayGoalEl);

    // Div per i marcatori
    const scorersDiv = document.createElement("div");
    scorersDiv.classList.add("scorers-div");

    // Sottodiv per i marcatori di casa
    const homeScorersDiv = document.createElement("div");
    homeScorersDiv.classList.add("home-scorers");

    const homeScorers = matchData?.Marcatori?.MarcatoriCasa || {};
    const { normalScorers: homeNormalScorers, ownGoals: homeOwnGoals } =
        separateScorers(homeScorers);

    const homeScorersList = document.createElement("ul");

    homeNormalScorers.forEach(({ name, count }) => {
        const listItem = document.createElement("li");

        const playerNameSpan = document.createElement("span");
        playerNameSpan.textContent = abbreviateName(name) + " ";
        listItem.appendChild(playerNameSpan);

        if (count > 3) {
            const goalIcon = document.createElement("i");
            goalIcon.classList.add("fa", "fa-soccer-ball-o");
            listItem.appendChild(goalIcon);

            const goalsCountSpan = document.createElement("span");
            goalsCountSpan.className = "goals-count";
            goalsCountSpan.textContent = ` ${count}`;
            listItem.appendChild(goalsCountSpan);
        } else {
            for (let i = 0; i < count; i++) {
                const goalIcon = document.createElement("i");
                goalIcon.classList.add("fa", "fa-soccer-ball-o");
                listItem.appendChild(goalIcon);

                if (i < count - 1) {
                    const space = document.createElement("span");
                    space.style.marginRight = "5px";
                    listItem.appendChild(space);
                }
            }
        }

        homeScorersList.appendChild(listItem);
    });

    // Aggiungi gli autogol alla fine della lista
    homeOwnGoals.forEach(({ name, count }) => {
        const listItem = document.createElement("li");

        const playerNameSpan = document.createElement("span");
        playerNameSpan.textContent = name + " ";
        listItem.appendChild(playerNameSpan);

        if (count > 3) {
            const goalsCountSpan = document.createElement("span");
            goalsCountSpan.className = "goals-count";
            goalsCountSpan.textContent = `${count} `;
            listItem.appendChild(goalsCountSpan);

            const goalIcon = document.createElement("i");
            goalIcon.classList.add("fa", "fa-soccer-ball-o");
            listItem.appendChild(goalIcon);
        } else {
            for (let i = 0; i < count; i++) {
                const goalIcon = document.createElement("i");
                goalIcon.classList.add("fa", "fa-soccer-ball-o");
                listItem.appendChild(goalIcon);

                if (i < count - 1) {
                    const space = document.createElement("span");
                    space.style.marginRight = "5px";
                    listItem.appendChild(space);
                }
            }
        }

        homeScorersList.appendChild(listItem);
    });

    homeScorersDiv.appendChild(homeScorersList);

    // Sottodiv per i marcatori Ospiti
    const awayScorersDiv = document.createElement("div");
    awayScorersDiv.classList.add("away-scorers");

    const awayScorers = matchData?.Marcatori?.MarcatoriOspite || {};
    const { normalScorers: awayNormalScorers, ownGoals: awayOwnGoals } =
        separateScorers(awayScorers);

    const awayScorersList = document.createElement("ul");

    awayNormalScorers.forEach(({ name, count }) => {
        const listItem = document.createElement("li");

        if (count > 3) {
            const goalsCountSpan = document.createElement("span");
            goalsCountSpan.className = "goals-count";
            goalsCountSpan.textContent = `${count} `;
            listItem.appendChild(goalsCountSpan);

            const goalIcon = document.createElement("i");
            goalIcon.classList.add("fa", "fa-soccer-ball-o");
            listItem.appendChild(goalIcon);
        } else {
            for (let i = 0; i < count; i++) {
                const goalIcon = document.createElement("i");
                goalIcon.classList.add("fa", "fa-soccer-ball-o");
                listItem.appendChild(goalIcon);

                if (i < count - 1) {
                    const space = document.createElement("span");
                    space.style.marginRight = "5px";
                    listItem.appendChild(space);
                }
            }
        }

        const playerNameSpan = document.createElement("span");
        playerNameSpan.textContent = " " + abbreviateName(name);
        listItem.appendChild(playerNameSpan);

        awayScorersList.appendChild(listItem);
    });

    // Aggiungi gli autogol alla fine della lista
    awayOwnGoals.forEach(({ name, count }) => {
        const listItem = document.createElement("li");

        if (count > 3) {
            const goalsCountSpan = document.createElement("span");
            goalsCountSpan.className = "goals-count";
            goalsCountSpan.textContent = `${count} `;
            listItem.appendChild(goalsCountSpan);

            const goalIcon = document.createElement("i");
            goalIcon.classList.add("fa", "fa-soccer-ball-o");
            listItem.appendChild(goalIcon);
        } else {
            for (let i = 0; i < count; i++) {
                const goalIcon = document.createElement("i");
                goalIcon.classList.add("fa", "fa-soccer-ball-o");
                listItem.appendChild(goalIcon);

                if (i < count - 1) {
                    const space = document.createElement("span");
                    space.style.marginRight = "5px";
                    listItem.appendChild(space);
                }
            }
        }

        const playerNameSpan = document.createElement("span");
        playerNameSpan.textContent = " " + name;
        listItem.appendChild(playerNameSpan);

        awayScorersList.appendChild(listItem);
    });

    awayScorersDiv.appendChild(awayScorersList);

    // Aggiungi i sottodiv alla scorersDiv
    scorersDiv.appendChild(homeScorersDiv);
    scorersDiv.appendChild(awayScorersDiv);

    // Aggiungi i div al contenuto dell'overlay
    content.appendChild(matchInfoDiv);
    content.appendChild(golDiv);
    content.appendChild(scorersDiv);

    // Aggiungi il contenuto all'overlay
    overlay.appendChild(content);
    document.body.appendChild(overlay);

    // Inizialmente posiziona l'overlay fuori dalla vista
    overlay.style.bottom = "-100%";
    overlay.style.opacity = "0";

    // Mostra l'overlay
    setTimeout(() => {
        overlay.style.bottom = "0%";
        overlay.style.opacity = "1";
    }, 10); // Ritarda leggermente per applicare la transizione

    // Chiudi l'overlay al clic
    closeIcon.addEventListener("click", () => {
        overlay.style.bottom = "-100%";
        overlay.style.opacity = "0";

        // Rimuovi l'overlay dal DOM dopo la transizione
        overlay.addEventListener(
            "transitionend",
            () => {
                document.body.removeChild(overlay);
            },
            { once: true }
        ); // { once: true } assicura che l'evento venga ascoltato solo una volta
    });
}
