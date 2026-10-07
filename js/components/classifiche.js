import { getData, getPaths } from "../firebase.js";
import { getSelectedDivision } from "../divisione.js";
import { paginaCorrente } from "../utils/percorso.js";
import { nomeSquadra, linkSquadra, eSquadraPreferita } from "../utils/torneo.js";
import {
  calcolaClassifiche,
  calcolaMarcatori,
  calcolaPosizioniGlobali,
  squadraDeiGiocatori,
} from "../utils/classifica.js";

// I calcoli stanno in utils/classifica.js: qui solo il disegno delle tabelle
export {
  calcolaClassifiche,
  calcolaMarcatori,
  squadraDeiGiocatori,
  posizioneSquadra,
} from "../utils/classifica.js";
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
      const [squadre, partite] = await Promise.all([getData(teamsPath), getData(matchesPath)]);
      dati = { squadre, partite, divisione: getSelectedDivision() };
    } catch (error) {
      console.error(`Errore nel recupero delle partite o squadre da Firebase: ${error.message}`, error);
      mostraAvvisoVuoto(containerId, "Impossibile caricare la classifica. Riprova più tardi.");
      return;
    }
  }

  const teams = dati.squadre;
  if (!teams) {
    mostraAvvisoVuoto(containerId, "La classifica sarà disponibile appena verranno pubblicate le squadre.");
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

export function rappresentaClassifica(containerId, rankingArray, target = null, divisione = null) {
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

export async function classificaMarcatori(targetDiv, dati = null) {
  const containerId = targetDiv;

  if (!dati) {
    scheletroMarcatori(containerId);
    const { teamsPath, matchesPath } = getPaths();
    try {
      const [squadre, partite] = await Promise.all([getData(teamsPath), getData(matchesPath)]);
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
            player.toLowerCase().includes(testo) || nomeSquadra(squadra).toLowerCase().includes(testo)
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
