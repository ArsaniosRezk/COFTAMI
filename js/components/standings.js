import { getData, getPaths } from "../firebase.js";
import { getSelectedDivision } from "../divisionAndVariables.js";
import { paginaCorrente } from "../utils/percorso.js";
import {
    giornateNumerate,
    nomeSquadra,
    linkSquadra,
    eSquadraPreferita,
} from "../utils/torneo.js";
import { mostraAvvisoVuoto } from "./pre-torneo.js";

// Nel gestionale i nomi delle squadre non portano alla pagina pubblica
const conLinkSquadre = () => paginaCorrente() !== "gestionale";

/*
===================================
CLASSIFICA SQUADRE
===================================
*/

export function scheletroClassifica(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
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

/*
 Classifiche di tutti i gironi.
 Restituisce [{ girone, ranking }] con ranking = [[chiaveSquadra, statistiche], ...]
 già ordinato. girone vale "unico" se nessuna squadra ha un girone.
*/
export function calcolaClassifiche(teams, giornate) {
    const numeriGiornate = giornateNumerate(giornate);

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

    return Object.keys(gironi)
        .sort()
        .map((girone) => {
            const gironeTeams = gironi[girone];
            const scores = inizializzaPunteggi(gironeTeams);

            // Se almeno una delle due squadre è del girone, aggiorniamo quella
            // (o entrambe se la partita è interna al girone)
            for (const giornata of numeriGiornate) {
                const matches = giornate[giornata];
                for (const matchKey in matches) {
                    const match = matches[matchKey];

                    if (gironeTeams[match.SquadraCasa]) {
                        aggiornaPunteggi(
                            scores,
                            match.SquadraCasa,
                            match.GolSquadraCasa,
                            match.GolSquadraOspite,
                            match.SquadraOspite
                        );
                    }
                    if (gironeTeams[match.SquadraOspite]) {
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

            return { girone, ranking: ordinaClassifica(scores) };
        });
}

/*
 Disegna la classifica nel contenitore.
 dati (facoltativo) = { squadre, partite, divisione }: senza, i dati vengono letti
 da Firebase (gestionale); con, si ridisegna subito (aggiornamenti in tempo reale).
*/
export async function classificaGirone(targetDiv, showGenericTitle = false, dati = null) {
    const containerId = targetDiv;

    if (!dati) {
        scheletroClassifica(containerId);
        const { teamsPath, matchesPath } = getPaths();
        try {
            const [squadre, partite] = await Promise.all([
                getData(teamsPath),
                getData(matchesPath),
            ]);
            dati = { squadre, partite, divisione: getSelectedDivision() };
        } catch (error) {
            console.error(
                `Errore nel recupero delle partite o squadre da Firebase: ${error.message}`,
                error
            );
            mostraAvvisoVuoto(containerId, "Impossibile caricare la classifica. Riprova più tardi.");
            return;
        }
    }

    const teams = dati.squadre;
    if (!teams) {
        mostraAvvisoVuoto(
            containerId,
            "La classifica sarà disponibile appena verranno pubblicate le squadre."
        );
        return;
    }

    const container = document.getElementById(containerId);
    if (!container) return; // Exit if container no longer exists
    container.innerHTML = ""; // Pulisce il contenuto precedente

    const classifiche = calcolaClassifiche(teams, dati.partite || {});
    const divisione = dati.divisione || getSelectedDivision();

    for (const { girone, ranking } of classifiche) {
        const gironeSection = document.createElement("div");
        gironeSection.classList.add("girone-section");

        if (classifiche.length === 1) {
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

        rappresentaClassifica(containerId, ranking, gironeSection, divisione);
        container.appendChild(gironeSection);
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
            penaltyPoints: Number(team.Penalità) || 0,
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
    scoredGoals = Number(scoredGoals) || 0;
    concededGoals = Number(concededGoals) || 0;

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
    // Se l'avversaria non è nel girone corrente, niente scontri diretti
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
    target = null,
    divisione = null
) {
    const rankingDiv = target || document.getElementById(containerId);
    const divisioneSquadre = divisione || getSelectedDivision();
    const link = conLinkSquadre();

    const table = document.createElement("table");
    table.classList.add("ranking-table");

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    // Intestazioni abbreviate con il significato per gli screen reader
    const intestazioni = [
        ["#", "Posizione"],
        ["Squadra", "Squadra"],
        ["PG", "Partite giocate"],
        ["V", "Vinte"],
        ["N", "Pareggiate"],
        ["S", "Perse"],
        ["GF", "Gol fatti"],
        ["GS", "Gol subiti"],
        ["DR", "Differenza reti"],
        ["P", "Punti"],
    ];
    const headerRow = document.createElement("tr");
    for (const [sigla, significato] of intestazioni) {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = sigla;
        if (sigla !== significato) th.title = significato;
        headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);

    rankingArray.forEach(([team, data], index) => {
        const pointsWithoutPenalty = data.points - (data.penaltyPoints || 0);
        const row = document.createElement("tr");

        if (eSquadraPreferita(divisioneSquadre, team)) {
            row.classList.add("riga-preferita");
        }

        const valori = [
            index + 1,
            null, // nome squadra, sotto
            data.playedMatches,
            data.wonMatches,
            data.drawnMatches,
            data.lostMatches,
            data.scoredGoals,
            data.concededGoals,
            data.goalsDifference,
            pointsWithoutPenalty,
        ];

        valori.forEach((valore, colonna) => {
            const cell = document.createElement("td");

            if (colonna === 1) {
                const nome = nomeSquadra(team) + (data.penaltyPoints > 0 ? "*" : "");
                if (link) {
                    const a = document.createElement("a");
                    a.href = linkSquadra(team, divisioneSquadre);
                    a.className = "link-squadra";
                    a.textContent = nome;
                    cell.appendChild(a);
                } else {
                    cell.textContent = nome;
                }
            } else {
                cell.textContent = valore;
            }
            row.appendChild(cell);
        });

        // Indicatore laterale sulle prime 4 posizioni
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
    const penalizzate = rankingArray.filter(([_, data]) => data.penaltyPoints > 0);
    if (penalizzate.length > 0) {
        const penaltyDiv = document.createElement("div");
        penaltyDiv.classList.add("penalty-message");

        penalizzate.forEach(([team, data], indice) => {
            if (indice > 0) penaltyDiv.appendChild(document.createElement("br"));
            const nome = document.createElement("strong");
            nome.textContent = nomeSquadra(team);
            penaltyDiv.appendChild(nome);
            penaltyDiv.append(`: -${data.penaltyPoints} punti penalità`);
        });

        rankingDiv.appendChild(penaltyDiv);
    }
}

/*
===================================
CLASSIFICA MARCATORI
===================================
*/

const RIGHE_PER_PAGINA = 10;

// Pagina e ricerca per contenitore: restano uguali quando la classifica si
// ridisegna per un aggiornamento in tempo reale
const statoMarcatori = {};

export function scheletroMarcatori(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = `
        <div class="skeleton skeleton-card">
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
            <div class="skeleton skeleton-row"></div>
        </div>`;
}

// Gol per giocatore: [[nome, gol], ...] dal più prolifico
export function calcolaMarcatori(partite) {
    const scorers = {};
    for (const giornataKey in partite || {}) {
        const giornata = partite[giornataKey] || {};
        for (const matchKey in giornata) {
            const match = giornata[matchKey] || {};
            aggiornaClassifica(scorers, match?.Marcatori?.MarcatoriCasa || {});
            aggiornaClassifica(scorers, match?.Marcatori?.MarcatoriOspite || {});
        }
    }
    return Object.entries(scorers).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// Giocatore -> squadra
export function squadraDeiGiocatori(squadre) {
    const squadraDi = {};
    for (const teamName in squadre || {}) {
        for (const player in squadre[teamName].Giocatori || {}) {
            squadraDi[player] = teamName;
        }
    }
    return squadraDi;
}

export async function classificaMarcatori(targetDiv, dati = null) {
    const containerId = targetDiv;

    if (!dati) {
        scheletroMarcatori(containerId);
        const { teamsPath, matchesPath } = getPaths();
        try {
            const [squadre, partite] = await Promise.all([
                getData(teamsPath),
                getData(matchesPath),
            ]);
            dati = { squadre, partite, divisione: getSelectedDivision() };
        } catch (error) {
            console.error(`Errore nel recupero delle partite da Firebase:`, error);
            dati = { squadre: null, partite: null };
        }
    }

    const scorersArray = calcolaMarcatori(dati.partite);
    if (scorersArray.length === 0) {
        mostraAvvisoVuoto(containerId, "Ancora nessun gol segnato.");
        return;
    }

    const rankingDiv = document.getElementById(containerId);
    if (!rankingDiv) return;

    const squadraDi = squadraDeiGiocatori(dati.squadre);
    const divisione = dati.divisione || getSelectedDivision();
    const righe = calcolaPosizioniGlobali(scorersArray).map((riga) => ({
        ...riga,
        squadra: squadraDi[riga.player] || null,
    }));

    // Cambiando divisione si riparte dalla prima pagina, senza filtro
    if (statoMarcatori[containerId]?.divisione !== divisione) {
        statoMarcatori[containerId] = { pagina: 1, ricerca: "", divisione };
        rankingDiv.querySelector(".ricerca-marcatori")?.remove();
    }
    const stato = statoMarcatori[containerId];

    // Il campo di ricerca resta lo stesso elemento: chi sta scrivendo non perde il focus
    let ricerca = rankingDiv.querySelector(".ricerca-marcatori input");
    if (!ricerca) {
        rankingDiv.innerHTML = "";

        const etichetta = document.createElement("label");
        etichetta.className = "ricerca-marcatori";
        etichetta.innerHTML = `<i class="icona icona-search" aria-hidden="true"></i><span class="sr-only">Cerca un giocatore o una squadra</span>`;
        ricerca = document.createElement("input");
        ricerca.type = "search";
        ricerca.placeholder = "Cerca giocatore o squadra";
        ricerca.autocomplete = "off";
        ricerca.value = stato.ricerca;
        etichetta.appendChild(ricerca);
        rankingDiv.appendChild(etichetta);

        const contenuto = document.createElement("div");
        contenuto.className = "contenuto-marcatori";
        rankingDiv.appendChild(contenuto);
    }

    const contenuto = rankingDiv.querySelector(".contenuto-marcatori");

    const disegna = () => {
        const testo = stato.ricerca.trim().toLowerCase();
        const filtrate = testo
            ? righe.filter(
                  ({ player, squadra }) =>
                      player.toLowerCase().includes(testo) ||
                      nomeSquadra(squadra).toLowerCase().includes(testo)
              )
            : righe;

        const pagine = Math.max(1, Math.ceil(filtrate.length / RIGHE_PER_PAGINA));
        stato.pagina = Math.min(stato.pagina, pagine);

        contenuto.innerHTML = "";
        if (filtrate.length === 0) {
            const vuoto = document.createElement("p");
            vuoto.className = "avviso-vuoto";
            vuoto.textContent = "Nessun giocatore trovato.";
            contenuto.appendChild(vuoto);
            return;
        }

        contenuto.appendChild(
            tabellaMarcatori(
                filtrate.slice((stato.pagina - 1) * RIGHE_PER_PAGINA, stato.pagina * RIGHE_PER_PAGINA),
                divisione
            )
        );
        if (pagine > 1) {
            contenuto.appendChild(
                controlliPaginazione(pagine, stato.pagina, (pagina) => {
                    stato.pagina = pagina;
                    disegna();
                })
            );
        }
    };

    ricerca.oninput = () => {
        stato.ricerca = ricerca.value;
        stato.pagina = 1;
        disegna();
    };

    disegna();
}

function tabellaMarcatori(righe, divisione) {
    const link = conLinkSquadre();
    const table = document.createElement("table");
    table.classList.add("scorers-table");

    const thead = document.createElement("thead");
    const theadRow = document.createElement("tr");
    [
        ["#", "Posizione"],
        ["Giocatore", "Giocatore"],
        ["Squadra", "Squadra"],
        ["G", "Gol"],
    ].forEach(([sigla, significato]) => {
        const th = document.createElement("th");
        th.scope = "col";
        th.textContent = sigla;
        if (sigla !== significato) th.title = significato;
        theadRow.appendChild(th);
    });
    thead.appendChild(theadRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const { position, player, value, squadra } of righe) {
        const tr = document.createElement("tr");
        if (squadra && eSquadraPreferita(divisione, squadra)) tr.classList.add("riga-preferita");

        const posizione = document.createElement("td");
        posizione.textContent = position;
        if (position <= 2) posizione.classList.add("primaColonnaCella" + position);

        const giocatore = document.createElement("td");
        giocatore.textContent = player;

        const cellaSquadra = document.createElement("td");
        if (squadra && link) {
            const a = document.createElement("a");
            a.href = linkSquadra(squadra, divisione);
            a.className = "link-squadra";
            a.textContent = nomeSquadra(squadra);
            cellaSquadra.appendChild(a);
        } else {
            cellaSquadra.textContent = squadra ? nomeSquadra(squadra) : "N/A";
        }

        const gol = document.createElement("td");
        gol.textContent = value;

        tr.append(posizione, giocatore, cellaSquadra, gol);
        tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    return table;
}

function controlliPaginazione(numberOfPages, currentPage, vaiAPagina) {
    const paginationDiv = document.createElement("nav");
    paginationDiv.classList.add("pagination");
    paginationDiv.setAttribute("aria-label", "Pagine della classifica marcatori");

    const pulsante = (testo, pagina, { etichetta = null, attiva = false, disabilitato = false } = {}) => {
        const button = document.createElement("button");
        button.type = "button";
        button.textContent = testo;
        if (etichetta) button.setAttribute("aria-label", etichetta);
        if (attiva) {
            button.classList.add("active");
            button.setAttribute("aria-current", "page");
        }
        button.disabled = disabilitato;
        button.addEventListener("click", () => vaiAPagina(pagina));
        return button;
    };

    paginationDiv.appendChild(
        pulsante("‹", currentPage - 1, { etichetta: "Pagina precedente", disabilitato: currentPage === 1 })
    );
    for (let page = 1; page <= numberOfPages; page++) {
        paginationDiv.appendChild(
            pulsante(String(page), page, { etichetta: `Pagina ${page}`, attiva: page === currentPage })
        );
    }
    paginationDiv.appendChild(
        pulsante("›", currentPage + 1, {
            etichetta: "Pagina successiva",
            disabilitato: currentPage === numberOfPages,
        })
    );

    return paginationDiv;
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

// Posizione e statistiche di una squadra nel suo girone, oppure null
export function posizioneSquadra(squadre, partite, chiave) {
    if (!squadre?.[chiave]) return null;
    for (const { girone, ranking } of calcolaClassifiche(squadre, partite || {})) {
        const indice = ranking.findIndex(([squadra]) => squadra === chiave);
        if (indice === -1) continue;
        const statistiche = ranking[indice][1];
        return {
            girone: girone === "unico" ? null : girone,
            posizione: indice + 1,
            totale: ranking.length,
            statistiche,
            punti: statistiche.points - statistiche.penaltyPoints,
        };
    }
    return null;
}
