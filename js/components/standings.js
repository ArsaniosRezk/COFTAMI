import { getData, getPaths } from "../firebase.js";

/*
===================================
CLASSIFICA SQUADRE
===================================
*/

export async function classificaGirone(targetDiv, showGenericTitle = false) {
    const containerId = targetDiv;
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
        <div class="skeleton skeleton-card">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-rect" style="height: 150px;"></div>
        </div>
        <div class="skeleton skeleton-card">
            <div class="skeleton skeleton-title"></div>
            <div class="skeleton skeleton-rect" style="height: 150px;"></div>
        </div>`;
    }

    const { teamsPath, matchesPath } = getPaths();

    try {
        const teams = await getData(teamsPath);
        if (!teams) {
            console.log("Nessuna squadra trovata");
            return;
        }

        const giornate = await getData(matchesPath);
        const numeriGiornate = giornate
            ? Object.keys(giornate).filter((key) => !isNaN(key))
            : [];
        // Raggruppa le squadre per girone
        const gironi = {};
        let almenoUnGirone = false;

        for (const teamKey in teams) {
            const girone = teams[teamKey].Girone || "";

            if (girone !== "") {
                almenoUnGirone = true;
                if (!gironi[girone]) gironi[girone] = {};
                gironi[girone][teamKey] = teams[teamKey];
            }
        }

        // Se nessuna squadra ha un girone, raggruppale tutte in un unico girone "unico"
        if (!almenoUnGirone) {
            gironi["unico"] = teams;
        }

        const container = document.getElementById(containerId);
        if (!container) return; // Exit if container no longer exists
        container.innerHTML = ""; // Pulisce il contenuto precedente

        // Per ogni girone, calcola e mostra la classifica
        for (const girone of Object.keys(gironi).sort()) {
            const gironeTeams = gironi[girone];
            const scores = inizializzaPunteggi(gironeTeams);

            // Calcola punteggi solo delle partite tra squadre dello stesso girone
            for (const giornata of numeriGiornate) {
                const matches = giornate[giornata];
                for (const matchKey in matches) {
                    const match = matches[matchKey];
                    // DOPO — “inclusiva”
                    // Se almeno una delle due è del girone, aggiorniamo quella (o entrambe se intra-girone)
                    const casaIn = !!gironeTeams[match.SquadraCasa];
                    const trasIn = !!gironeTeams[match.SquadraOspite];

                    if (casaIn) {
                        aggiornaPunteggi(
                            scores,
                            match.SquadraCasa,
                            match.GolSquadraCasa,
                            match.GolSquadraOspite,
                            match.SquadraOspite
                        );
                    }
                    if (trasIn) {
                        aggiornaPunteggi(
                            scores,
                            match.SquadraOspite,
                            match.GolSquadraOspite,
                            match.GolSquadraCasa,
                            match.SquadraCasa
                        );
                    }
                }
            }

            const rankingArray = ordinaClassifica(scores);

            // Aggiungi un titolo per il girone
            // Aggiungi un contenitore specifico per ogni girone
            const gironeSection = document.createElement("div");
            gironeSection.classList.add("girone-section");

            const numeroGironi = Object.keys(gironi).length;

            if (numeroGironi === 1) {
                if (showGenericTitle) {
                    const title = document.createElement("h3");
                    title.classList.add("titolo-girone");
                    title.innerText = "Classifica Squadre";
                    gironeSection.appendChild(title);
                }
            } else if (girone !== "unico") {
                const title = document.createElement("h3");
                title.classList.add("titolo-girone");
                title.innerText = `Girone ${girone}`;
                gironeSection.appendChild(title);
            }

            // Appendiamo la classifica lì dentro
            rappresentaClassifica(containerId, rankingArray, gironeSection);

            // Infine, aggiungiamo questa sezione al contenitore principale
            container.appendChild(gironeSection);
        }
    } catch (error) {
        console.error(
            `Errore nel recupero delle partite o squadre da Firebase: ${error.message}`,
            error
        );
    }
}

export function inizializzaPunteggi(teams) {
    const scores = {};
    for (const teamKey in teams) {
        const team = teams[teamKey];
        scores[teamKey] = {
            playedMatches: 0,
            wonMatches: 0,
            drawnMatches: 0,
            lostMatches: 0,
            scoredGoals: 0,
            concededGoals: 0,
            goalsDifference: 0,
            points: 0,
            headToHead: {},
            penaltyPoints: team.Penalità || 0,
        };
    }
    return scores;
}

export function aggiornaPunteggi(
    scores,
    team,
    scoredGoals,
    concededGoals,
    opponent
) {
    const teamStats = scores[team];
    teamStats.playedMatches++;
    teamStats.scoredGoals += scoredGoals;
    teamStats.concededGoals += concededGoals;
    teamStats.goalsDifference = teamStats.scoredGoals - teamStats.concededGoals;

    if (scoredGoals > concededGoals) {
        teamStats.wonMatches++;
        teamStats.points += 3;
    } else if (scoredGoals === concededGoals) {
        teamStats.drawnMatches++;
        teamStats.points += 1;
    } else {
        teamStats.lostMatches++;
    }

    aggiornaScontriDiretti(scores, team, scoredGoals, concededGoals, opponent);
}

export function aggiornaScontriDiretti(
    scores,
    team,
    scoredGoals,
    concededGoals,
    opponent
) {
    // NUOVO: se l’avversaria non è nel girone corrente, niente H2H
    if (!scores[opponent]) return;

    if (!scores[team].headToHead[opponent]) {
        scores[team].headToHead[opponent] = {
            playedMatches: 0,
            scoredGoals: 0,
            concededGoals: 0,
            goalsDifference: 0,
            points: 0,
        };
    }

    const headToHead = scores[team].headToHead[opponent];

    headToHead.playedMatches++;
    headToHead.scoredGoals += scoredGoals;
    headToHead.concededGoals += concededGoals;
    headToHead.goalsDifference =
        headToHead.scoredGoals - headToHead.concededGoals;

    if (scoredGoals > concededGoals) {
        headToHead.points += 3;
    } else if (scoredGoals === concededGoals) {
        headToHead.points += 1;
    }
}

export function ordinaClassifica(scores) {
    return Object.entries(scores).sort((a, b) => {
        const [teamA, statsA] = a;
        const [teamB, statsB] = b;

        const totalPointsA = statsA.points - statsA.penaltyPoints;
        const totalPointsB = statsB.points - statsB.penaltyPoints;

        if (totalPointsB !== totalPointsA) return totalPointsB - totalPointsA;

        const headToHeadA = statsA.headToHead[teamB] || {};
        const headToHeadB = statsB.headToHead[teamA] || {};

        const headToHeadPointsA = headToHeadA.points || 0;
        const headToHeadPointsB = headToHeadB.points || 0;
        if (headToHeadPointsA !== headToHeadPointsB) {
            return headToHeadPointsB - headToHeadPointsA;
        }

        const goalsDifferenceheadToHeadA = headToHeadA.goalsDifference || 0;
        const goalsDifferenceheadToHeadB = headToHeadB.goalsDifference || 0;
        if (goalsDifferenceheadToHeadA !== goalsDifferenceheadToHeadB) {
            return goalsDifferenceheadToHeadB - goalsDifferenceheadToHeadA;
        }

        if (statsB.goalsDifference !== statsA.goalsDifference) {
            return statsB.goalsDifference - statsA.goalsDifference;
        }

        if (statsB.scoredGoals !== statsA.scoredGoals) {
            return statsB.scoredGoals - statsA.scoredGoals;
        }

        return statsA.concededGoals - statsB.concededGoals;
    });
}

export function rappresentaClassifica(
    containerId,
    rankingArray,
    target = null
) {
    const rankingDiv = target || document.getElementById(containerId);

    // rankingDiv.innerHTML = "";
    const table = document.createElement("table");
    table.classList.add("ranking-table");

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // Funzione helper per creare righe di tabella
    const creaRigaTabella = (cellData, isHeader = false) => {
        const row = document.createElement("tr");
        cellData.forEach((cellText) => {
            const cell = document.createElement(isHeader ? "th" : "td");
            cell.innerText = cellText;
            row.appendChild(cell);
        });
        return row;
    };

    const headerRow = creaRigaTabella(
        ["#", "Squadra", "PG", "V", "N", "S", "GF", "GS", "DR", "P"],
        true
    );
    thead.appendChild(headerRow);
    table.appendChild(thead);

    rankingArray.forEach(([team, data], index) => {
        const teamName = data.penaltyPoints > 0 ? team + "*" : team;
        const abbreviatedTeamName = teamName.replace(/_/g, ".");
        const pointsWithoutPenalty = data.points - (data.penaltyPoints || 0);

        const rowData = [
            index + 1,
            abbreviatedTeamName,
            data.playedMatches,
            data.wonMatches,
            data.drawnMatches,
            data.lostMatches,
            data.scoredGoals,
            data.concededGoals,
            data.goalsDifference,
            pointsWithoutPenalty,
        ];

        const row = creaRigaTabella(rowData);

        // Aggiunge classe speciale alla cella posizione (solo primi 4)
        if (index < 10) {
            const posCell = row.children[0];
            const indicator = document.createElement("span");
            indicator.classList.add("posizione-indicatore", `posizione-${index + 1}`);
            posCell.style.position = "relative";
            posCell.prepend(indicator);
        }

        tbody.appendChild(row);
    });

    table.appendChild(tbody);
    rankingDiv.appendChild(table);

    // Aggiungi il messaggio delle penalità se esistono penalità
    if (rankingArray.some(([_, data]) => data.penaltyPoints > 0)) {
        const penaltyDiv = document.createElement("div");
        penaltyDiv.classList.add("penalty-message");

        const penaltyMessage = rankingArray
            .filter(([_, data]) => data.penaltyPoints > 0)
            .map(
                ([team, data]) =>
                    `<strong>${team.replace(/_/g, ".")}</strong>: -${data.penaltyPoints
                    } punti penalità`
            )
            .join("<br>");

        penaltyDiv.innerHTML = penaltyMessage;

        rankingDiv.appendChild(penaltyDiv);
    }
}

/*
===================================
CLASSIFICA MARCATORI
===================================
*/
let globalRankingArray = []; // Memorizza la classifica globale
let teamsCache = {}; // Memorizza la cache delle squadre

export async function classificaMarcatori(targetDiv) {
    const containerId = targetDiv;
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
        <div class="skeleton skeleton-card">
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
        </div>`;
    }

    const scorers = {};
    const { matchesPath } = getPaths();

    try {
        teamsCache = await caricaSquadre();

        const giornateSnapshot = await getData(matchesPath);

        if (giornateSnapshot) {
            for (const giornataKey in giornateSnapshot) {
                const giornata = giornateSnapshot[giornataKey] || {};
                for (const matchKey in giornata) {
                    const match = giornata[matchKey] || {};
                    aggiornaClassifica(scorers, match?.Marcatori?.MarcatoriCasa || {});
                    aggiornaClassifica(scorers, match?.Marcatori?.MarcatoriOspite || {});
                }
            }
        } else {
            console.log(`Nessuna partita trovata su Firebase`);
        }
    } catch (error) {
        console.error(`Errore nel recupero delle partite da Firebase:`, error);
    }

    const scorersArray = Object.entries(scorers);
    scorersArray.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    globalRankingArray = scorersArray;

    const rowsPerPage = 10;
    rappresentaClassificaMarcatori(containerId, scorersArray, 1, rowsPerPage);
}

function aggiornaVistaPagina(
    containerId,
    rankingWithPositions,
    currentPage,
    rowsPerPage
) {
    const rankingDiv = document.getElementById(containerId);
    const tbody = rankingDiv.querySelector("tbody");
    tbody.innerHTML = ""; // Pulisce solo il corpo della tabella, non l'intera tabella

    const startingIndex = (currentPage - 1) * rowsPerPage;
    const finalIndex = Math.min(
        startingIndex + rowsPerPage,
        rankingWithPositions.length
    );

    for (let index = startingIndex; index < finalIndex; index++) {
        const { position, player, value } = rankingWithPositions[index];

        const tr = document.createElement("tr");
        const team = teamsCache[player] || "N/A";
        const abbreviatedTeamName = team.replace(/_/g, ".");

        const dataColumns = [position, player, abbreviatedTeamName, value];
        dataColumns.forEach((dato, columnIndex) => {
            const td = document.createElement("td");
            td.textContent = dato;

            if (columnIndex === 0 && position <= 2) {
                td.classList.add("primaColonnaCella" + position);
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    }
}

function aggiungiControlliPaginazione(
    container,
    numberOfPages,
    currentPage,
    rankingArray,
    rowsPerPage
) {
    const paginationDiv = document.createElement("div");
    paginationDiv.classList.add("pagination");

    for (let page = 1; page <= numberOfPages; page++) {
        const link = document.createElement("a");
        link.href = "#";
        link.textContent = page;

        if (page === currentPage) {
            link.classList.add("active");
        }

        link.addEventListener("click", (event) => {
            event.preventDefault();

            // Rimuovi la classe active da tutti i link
            const allLinks = paginationDiv.querySelectorAll("a");
            allLinks.forEach((link) => link.classList.remove("active"));

            // Aggiorna la vista della pagina
            aggiornaVistaPagina(container.id, rankingArray, page, rowsPerPage);

            // Aggiungi la classe active al link corrente
            link.classList.add("active");
        });

        paginationDiv.appendChild(link);
    }

    container.appendChild(paginationDiv);
}

async function rappresentaClassificaMarcatori(
    containerId,
    rankingArray,
    currentPage,
    rowsPerPage
) {
    const rankingDiv = document.getElementById(containerId);
    if (!rankingDiv) return;
    rankingDiv.innerHTML = "";

    // Se non ci sono marcatori, mostra un messaggio e interrompi
    if (rankingArray.length === 0) {
        rankingDiv.innerHTML = "";
        return;
    }

    // Calcola le posizioni globali una volta sola
    const rankingWithPositions = calcolaPosizioniGlobali(rankingArray);

    const table = document.createElement("table");
    table.classList.add("scorers-table");

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const theadRow = document.createElement("tr");

    const columns = ["#", "Giocatore", "Squadra", "G"];
    columns.forEach((column) => {
        const th = document.createElement("th");
        th.textContent = column;
        theadRow.appendChild(th);
    });

    thead.appendChild(theadRow);
    table.appendChild(thead);
    table.appendChild(tbody);

    rankingDiv.appendChild(table);

    const numberOfPages = Math.ceil(rankingArray.length / rowsPerPage);

    aggiornaVistaPagina(
        containerId,
        rankingWithPositions,
        currentPage,
        rowsPerPage
    );
    aggiungiControlliPaginazione(
        rankingDiv,
        numberOfPages,
        currentPage,
        rankingWithPositions,
        rowsPerPage
    );
}

async function caricaSquadre() {
    const { teamsPath } = getPaths();
    const teams = await getData(teamsPath);
    const teamsCache = {};

    if (teams) {
        for (const teamName in teams) {
            const teamPlayers = teams[teamName].Giocatori || {};
            for (const player in teamPlayers) {
                teamsCache[player] = teamName;
            }
        }
    }

    return teamsCache;
}

function aggiornaClassifica(ranking, players) {
    if (!players || typeof players !== "object") return;
    Object.keys(players).forEach((player) => {
        if (player === "AutogolCasa" || player === "AutogolOspite") return;
        const gol = Number(players[player]) || 0;
        if (gol <= 0) return;
        ranking[player] = (ranking[player] || 0) + gol;
    });
}

function calcolaPosizioniGlobali(rankingArray) {
    let uniquePosition = 1; // Posizione unica iniziale
    let previousValue = null;

    return rankingArray.map((item, index) => {
        const [player, value] = item;

        // Aggiorna la posizione solo se cambia il numero di goal
        if (value !== previousValue) {
            uniquePosition = index + 1;
        }

        previousValue = value;

        return { position: uniquePosition, player, value };
    });
}
