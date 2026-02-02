import { getData, setData } from "./firebase.js";
import { edition } from "./divisionAndVariables.js";

function getPaths() {
  // const edition = "2025"; // Removed hardcoded value
  const selectedDivision = document.getElementById("division").value;
  const teamsPath = `Calcio/${edition}/${selectedDivision}/Squadre`;
  const calendarPath = `Calcio/${edition}/${selectedDivision}/Calendario`;
  const matchesPath = `Calcio/${edition}/${selectedDivision}/Partite`;
  const matchesReportPath = `Calcio/${edition}/${selectedDivision}/Referti`;

  return {
    teamsPath,
    calendarPath,
    matchesPath,
    matchesReportPath,
  };
}

document.addEventListener("DOMContentLoaded", async () => {
  const divisionSelect = document.getElementById("division");
  const matchdaySelect = document.getElementById("matchday");
  const matchSelect = document.getElementById("match");
  const homePlayersDiv = document.getElementById("home-players");
  const awayPlayersDiv = document.getElementById("away-players");
  const mvpSelect = document.getElementById("mvp");
  const homeGoals = document.getElementById("home-gol-score");
  const awayGoals = document.getElementById("away-gol-score");
  const comments = document.getElementById("comments");

  // Popola le giornate disponibili in base alla divisione selezionata
  divisionSelect.addEventListener("change", async () => {
    const { calendarPath } = getPaths();
    const calendarSnapshot = await getData(calendarPath);

    // Svuota altri elementi
    const placeholderMatchday = matchdaySelect.querySelector("option[hidden]");
    matchdaySelect.innerHTML = "";
    matchdaySelect.appendChild(placeholderMatchday);
    matchdaySelect.value = "";

    const placeholderMatch = matchSelect.querySelector("option[hidden]");
    matchSelect.innerHTML = "";
    matchSelect.appendChild(placeholderMatch);
    matchSelect.value = "";

    homeGoals.value = "";
    awayGoals.value = "";

    homePlayersDiv.innerHTML = "";
    awayPlayersDiv.innerHTML = "";

    comments.value = "";

    const placeholderMVP = mvpSelect.querySelector("option[hidden]");
    mvpSelect.innerHTML = "";
    mvpSelect.appendChild(placeholderMVP);
    mvpSelect.value = "";

    const matchdays = Object.keys(calendarSnapshot);

    matchdays.forEach((matchday) => {
      const option = document.createElement("option");
      option.value = matchday;
      option.textContent = `${matchday}`;
      matchdaySelect.appendChild(option);
    });
  });

  // Popola le partite disponibili in base alla giornata selezionata
  matchdaySelect.addEventListener("change", async () => {
    const { calendarPath } = getPaths();

    // Svuota altri elementi
    const placeholderMatch = matchSelect.querySelector("option[hidden]");
    matchSelect.innerHTML = "";
    matchSelect.appendChild(placeholderMatch);
    matchSelect.value = "";

    homeGoals.value = "";
    awayGoals.value = "";

    homePlayersDiv.innerHTML = "";
    awayPlayersDiv.innerHTML = "";

    comments.value = "";

    const placeholderMVP = mvpSelect.querySelector("option[hidden]");
    mvpSelect.innerHTML = "";
    mvpSelect.appendChild(placeholderMVP);
    mvpSelect.value = "";

    const matchday = matchdaySelect.value;

    const matchesSnapshot = await getData(`/${calendarPath}/${matchday}`);

    const matches = Object.keys(matchesSnapshot);

    matches.forEach((match) => {
      const option = document.createElement("option");
      option.value = match;
      option.textContent = match.replace(/_/g, ".").replace(":", " vs ");
      matchSelect.appendChild(option);
    });
  });

  // Funzione per gestire la visibilità del div "scorers-mvp"
  function toggleScorersMVPDiv(show) {
    const scorersMVPDiv = document.getElementById("scorers-mvp");
    if (show) {
      scorersMVPDiv.classList.remove("hidden");
    } else {
      scorersMVPDiv.classList.add("hidden");
    }
  }

  // Nascondi il div "scorers-mvp" quando la selezione della divisione cambia
  divisionSelect.addEventListener("change", () => {
    toggleScorersMVPDiv(false);
    matchdaySelect.value = ""; // Resetta selettore giornata
    matchSelect.value = ""; // Resetta selettore partita
  });

  // Nascondi il div "scorers-mvp" quando la selezione della giornata cambia
  matchdaySelect.addEventListener("change", () => {
    toggleScorersMVPDiv(false);
  });

  matchSelect.addEventListener("change", async () => {
    let matchString = match.value;
    matchString = matchString.replace(/_/g, ".");
    const homeTeamName = document.getElementById("home-team-name");
    const awayTeamName = document.getElementById("away-team-name");
    const [SquadraCasa, SquadraOspite] = matchString.split(":");
    homeTeamName.innerText = SquadraCasa;
    awayTeamName.innerText = SquadraOspite;

    const selectedMatch = matchSelect.value;

    homeGoals.value = "";
    awayGoals.value = "";

    comments.value = "";

    // Verifica se una partita è selezionata
    if (!selectedMatch) {
      toggleScorersMVPDiv(false); // Nascondi il div se nessuna partita è selezionata
      return;
    }

    toggleScorersMVPDiv(true); // Mostra il div quando una partita è selezionata

    const [homeTeam, awayTeam] = selectedMatch.split(":");

    // Recupera i dati delle squadre dal database
    const { teamsPath } = getPaths();

    const homeTeamData = await getData(`${teamsPath}/${homeTeam}`);
    const awayTeamData = await getData(`${teamsPath}/${awayTeam}`);

    // Estrai i giocatori dalle rispettive chiavi "Giocatori"
    const homePlayers = Object.keys(homeTeamData.Giocatori);
    const awayPlayers = Object.keys(awayTeamData.Giocatori);

    // Popola i giocatori e l'MVP
    populatePlayers(homePlayersDiv, homePlayers, awayTeam);
    populatePlayers(awayPlayersDiv, awayPlayers, homeTeam);
    populateMVP(mvpSelect, homePlayers, awayPlayers);
  });

  // Nascondi il div all'inizio
  toggleScorersMVPDiv(false);

  document
    .getElementById("match-report-form")
    .addEventListener("submit", async (event) => {
      event.preventDefault();
      const NomeArbitro = document.getElementById("referee-name").value;
      const match = document.getElementById("match").value;
      const matchday = document.getElementById("matchday").value;
      const MVP = document.getElementById("mvp").value;
      const Commenti = document.getElementById("comments").value;
      const Divisione = document.getElementById("division").value;

      const SquadraCasa = match.split(":")[0];
      const SquadraOspite = match.split(":")[1];

      // Prendi i valori dei gol dalle input box
      const GolSquadraCasa = parseInt(
        document.getElementById("home-gol-score").value || 0
      );
      const GolSquadraOspite = parseInt(
        document.getElementById("away-gol-score").value || 0
      );

      // Raccolta dei marcatori in due oggetti distinti
      const MarcatoriCasa = {};
      const MarcatoriOspite = {};
      let autogolCasa = 0;
      let autogolOspite = 0;

      let totalGoalsHome = 0;
      let totalGoalsAway = 0;

      // Marcatori squadra di casa
      Array.from(homePlayersDiv.children).forEach((div) => {
        const playerName = div.querySelector(".player-name").textContent.trim();
        const goals = parseInt(div.querySelector("input").value || 0);
        if (goals > 0) {
          if (playerName.includes("Autogol di")) {
            autogolCasa += goals; // Autogol della squadra ospite conta per la squadra di casa
            MarcatoriCasa[`AutogolOspite`] =
              (MarcatoriCasa[`AutogolOspite`] || 0) + goals;
          } else {
            MarcatoriCasa[playerName] = goals;
            totalGoalsHome += goals; // Gol normali segnati dalla squadra di casa
          }
        }
      });

      // Marcatori squadra ospite
      Array.from(awayPlayersDiv.children).forEach((div) => {
        const playerName = div.querySelector(".player-name").textContent.trim();
        const goals = parseInt(div.querySelector("input").value || 0);
        if (goals > 0) {
          if (playerName.includes("Autogol di")) {
            autogolOspite += goals; // Autogol della squadra di casa conta per la squadra ospite
            MarcatoriOspite[`AutogolCasa`] =
              (MarcatoriOspite[`AutogolCasa`] || 0) + goals;
          } else {
            MarcatoriOspite[playerName] = goals;
            totalGoalsAway += goals; // Gol normali segnati dalla squadra ospite
          }
        }
      });

      // Verifica che il totale dei gol segnati corrisponda a quello inserito
      if (GolSquadraCasa !== totalGoalsHome + autogolCasa) {
        alert(
          `Errore: Il totale dei gol segnati dalla squadra di casa (${totalGoalsHome + autogolCasa
          }) non corrisponde al totale dei gol inseriti (${GolSquadraCasa}).`
        );
        return; // Interrompe l'invio del referto
      }

      if (GolSquadraOspite !== totalGoalsAway + autogolOspite) {
        alert(
          `Errore: Il totale dei gol segnati dalla squadra ospite (${totalGoalsAway + autogolOspite
          }) non corrisponde al totale dei gol inseriti (${GolSquadraOspite}).`
        );
        return; // Interrompe l'invio del referto
      }

      // Aggiungi divisione e ora di invio
      const oraInvio = new Date().toISOString();

      // Aggiorna l'oggetto del referto
      const matchReport = {
        NomeArbitro,
        SquadraCasa,
        SquadraOspite,
        GolSquadraCasa,
        GolSquadraOspite,
        Marcatori: {
          MarcatoriCasa:
            Object.keys(MarcatoriCasa).length > 0 ? MarcatoriCasa : true,
          MarcatoriOspite:
            Object.keys(MarcatoriOspite).length > 0 ? MarcatoriOspite : true,
        },
        MVP,
        Commenti,
        Divisione,
        OraInvio: oraInvio,
      };

      try {
        const { matchesReportPath } = getPaths();

        await setData(`${matchesReportPath}/${matchday}/${match}`, matchReport);
        alert("Referto inviato con successo!");
      } catch (error) {
        console.error("Errore durante l'invio del referto:", error);
        alert("Errore durante l'invio del referto. Riprova.");
      }
    });
});

// Funzione per popolare i giocatori e i gol segnati
function populatePlayers(container, players, opponentTeamName) {
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
    playerDiv.appendChild(playerName);
    playerDiv.appendChild(goalsInput);
    container.appendChild(playerDiv);
  });

  // Aggiungi campo autogol
  const ownGoalDiv = document.createElement("div");
  ownGoalDiv.className = "player-div";
  const ownGoal = document.createElement("span");
  ownGoal.className = "player-name";
  ownGoal.innerHTML = `<span>Autogol di ${opponentTeamName.replace(
    /_/g,
    "."
  )}</span>`;
  const ownGoalsInput = document.createElement("input");
  ownGoalsInput.type = "number";
  ownGoalsInput.min = "0";
  ownGoalsInput.placeholder = "A";
  ownGoalDiv.appendChild(ownGoal);
  ownGoalDiv.appendChild(ownGoalsInput);
  container.appendChild(ownGoalDiv);
}

function populateMVP(mvpSelect, homePlayers, awayPlayers) {
  // Mantieni il placeholder originale
  const placeholderMVP = document.createElement("option");
  placeholderMVP.value = "";
  placeholderMVP.textContent = "- Seleziona MVP -";
  placeholderMVP.disabled = true;
  placeholderMVP.selected = true;
  placeholderMVP.hidden = true;

  mvpSelect.innerHTML = ""; // Svuota le opzioni esistenti
  mvpSelect.appendChild(placeholderMVP); // Aggiungi il placeholder come prima opzione

  // Combina e ordina i giocatori in ordine alfabetico
  const sortedPlayers = [...homePlayers, ...awayPlayers].sort();

  // Aggiungi le opzioni ordinate al select
  sortedPlayers.forEach((player) => {
    const option = document.createElement("option");
    option.value = player;
    option.textContent = player;
    mvpSelect.appendChild(option);
  });

  // Reimposta il valore del select al placeholder
  mvpSelect.value = "";
}
