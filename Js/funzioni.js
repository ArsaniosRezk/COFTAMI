import {
  db,
  ref,
  update,
  set,
  getData,
  setData,
  updateData,
  getPaths,
} from "./firebase.js";

import { edition } from "./divisionAndVariables.js";

/*
===================================
SHARED
===================================
*/

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/*
===================================
SQUADRE
===================================
*/

export async function visualizzaSquadreConMembri() {
  const teamsContainer = document.getElementById("teams-container");

  // Svuota div container squadre
  teamsContainer.innerHTML = "";

  const { teamsPath } = getPaths();
  const teamsSnapshot = await getData(teamsPath);

  if (teamsSnapshot) {
    for (const [teamName, teamData] of Object.entries(teamsSnapshot)) {
      const abbreviatedTeamName = teamName.replace(/_/g, ".");
      const teamLogo = teamData.Logo;
      const coaches = teamData.Allenatori || {};
      const players = teamData.Giocatori || {};

      // Creazione del div per la squadra
      const teamDiv = document.createElement("div");
      teamDiv.className = "squadra";

      // Creazione dell'elemento div per logo e nome della squadra
      const logoNameDiv = document.createElement("div");
      logoNameDiv.className = "logo-e-nome";

      // Creazione dell'elemento immagine
      const logoEl = document.createElement("img");
      logoEl.src = teamLogo;

      // Creazione dell'elemento div per il nome della squadra
      const teamNameDiv = document.createElement("div");
      teamNameDiv.className = "nome-team";

      // Creazione dell'elemento span
      const teamNameEl = document.createElement("span");
      teamNameEl.textContent = abbreviatedTeamName;

      // Aggiunta degli elementi al DOM
      teamNameDiv.appendChild(teamNameEl);
      logoNameDiv.appendChild(logoEl);
      logoNameDiv.appendChild(teamNameDiv);
      teamDiv.appendChild(logoNameDiv);

      // Creazione del div per i membri della squadra
      const membersDiv = document.createElement("div");
      membersDiv.className = "membri";

      // Creazione e aggiunta degli elementi p per gli allenatori
      const coachesMembersType = document.createElement("p");
      coachesMembersType.className = "tipo-membro";
      coachesMembersType.textContent = "Allenatori";
      membersDiv.appendChild(coachesMembersType);

      const coachesMembers = document.createElement("p");
      coachesMembers.className = "membro";
      coachesMembers.textContent = Object.keys(coaches).join(", ");
      membersDiv.appendChild(coachesMembers);

      // Creazione e aggiunta degli elementi p per i giocatori
      const playersMembersType = document.createElement("p");
      playersMembersType.className = "tipo-membro";
      playersMembersType.textContent = "Giocatori";
      membersDiv.appendChild(playersMembersType);

      const playersMembers = document.createElement("p");
      playersMembers.className = "membro";
      playersMembers.textContent = Object.keys(players).join(", ");
      membersDiv.appendChild(playersMembers);

      // Aggiunta del div dei membri al DOM
      teamDiv.appendChild(membersDiv);

      // Aggiunta del div della squadra al container
      teamsContainer.appendChild(teamDiv);

      teamDiv.addEventListener("click", () => {
        openTeamMembersOverlay(abbreviatedTeamName, coaches, players, teamLogo);
      });
    }
  } else {
    console.log("Nessuna squadra trovata nel database.");
  }
}

// Funzione per aprire l'overlay e popolare i dati della squadra
function openTeamMembersOverlay(
  abbreviatedTeamName,
  coaches,
  players,
  teamLogo
) {
  if (isMobileDevice()) {
    const overlay = document.getElementById("team-overlay");
    const teamNameEl = document.getElementById("team-name");
    const logoEl = document.getElementById("team-logo");
    const coachesEl = document.getElementById("overlay-allenatori");
    const playersEl = document.getElementById("overlay-giocatori");

    // Popola i dati della squadra nell'overlay
    teamNameEl.textContent = abbreviatedTeamName;
    logoEl.src = teamLogo;
    coachesEl.textContent = Object.keys(coaches).join(", ");
    playersEl.textContent = Object.keys(players).join(", ");

    // Mostra l'overlay
    overlay.style.top = "0%";
    document.getElementById("team-info").style.opacity = "1";
  }
}

export async function showTeams() {
  // Div della sezione squadre
  const teamsContent = document.getElementById("teams-content");

  // Crea Div per le card delle squadre
  const teamsContainer = document.createElement("div");
  teamsContainer.id = "teams-container";
  teamsContent.appendChild(teamsContainer);

  // Svuota div container squadre
  teamsContainer.innerHTML = "";

  const { teamsPath } = getPaths();
  const teamsSnapshot = await getData(teamsPath);

  if (teamsSnapshot) {
    for (const [teamName, teamData] of Object.entries(teamsSnapshot)) {
      const abbreviatedTeamName = teamName.replace(/_/g, ".");
      const teamLogo = teamData.Logo;

      // Creazione del div per la squadra
      const teamCard = document.createElement("div");
      teamCard.className = "team-card";

      // Creazione dell'elemento immagine
      const teamLogoEl = document.createElement("img");
      teamLogoEl.src = teamLogo;

      // Creazione dell'elemento div per il nome della squadra
      const teamNameDiv = document.createElement("div");
      teamNameDiv.className = "team-name-div";

      // Creazione dell'elemento span
      const teamNameEl = document.createElement("span");
      teamNameEl.className = "team-name";
      teamNameEl.textContent = abbreviatedTeamName;

      // Aggiunta degli elementi al DOM
      teamNameDiv.appendChild(teamNameEl);
      teamCard.appendChild(teamLogoEl);
      teamCard.appendChild(teamNameDiv);

      // Aggiunta del div della squadra al container
      teamsContainer.appendChild(teamCard);

      // Aggiunta del gestore di eventi click
      teamCard.addEventListener("click", () =>
        showTeamInfo(teamName, teamData)
      );
    }

    // Pulsante per aggiungere una nuova squadra
    const addTeamButton = document.createElement("button");
    addTeamButton.id = "add-team-button";
    addTeamButton.innerHTML = "Aggiungi<br>Squadra";

    // Crea l'elemento icona
    const icon = document.createElement("i");
    icon.classList.add("fa-solid", "fa-plus");

    // Aggiungi l'icona al pulsante
    addTeamButton.prepend(icon);

    // Aggiungi il pulsante al container delle squadre
    teamsContainer.appendChild(addTeamButton);

    addTeamButton.addEventListener("click", addTeam);
  } else {
    console.log("Nessuna squadra trovata nel database.");
  }
}

function showTeamInfo(teamName, teamData) {
  // Rimuove container card squadre
  const teamsContainer = document.getElementById("teams-container");
  teamsContainer?.remove();

  // Div della sezione squadre
  const teamsContent = document.getElementById("teams-content");

  // Crea Div per le info del team selezionato
  // Controlla se il div esiste già
  // Svuota il contenitore esistente o crea uno nuovo
  let teamInfoContainer = document.getElementById("team-info-container");
  if (!teamInfoContainer) {
    teamInfoContainer = document.createElement("div");
    teamInfoContainer.id = "team-info-container";
    teamsContent.appendChild(teamInfoContainer);
  }
  teamInfoContainer.innerHTML = "";

  // INFO SQUADRA
  const abbreviatedTeamName = teamName.replace(/_/g, ".");
  const coaches = teamData.Allenatori || {};
  const players = teamData.Giocatori || {};
  const group = teamData.Girone;
  const penalty = teamData.Penalità;

  // NOME E LOGO
  const nameAndLogoDiv = document.createElement("div");
  nameAndLogoDiv.id = "name-and-logo";

  const teamNameEl = document.createElement("h2");
  teamNameEl.textContent = abbreviatedTeamName;

  const logoEl = document.createElement("img");
  logoEl.src = teamData.Logo;

  // Aggiunta degli elementi al DOM
  nameAndLogoDiv.appendChild(teamNameEl);
  nameAndLogoDiv.appendChild(logoEl);

  teamInfoContainer.appendChild(nameAndLogoDiv);

  // Div info squadra
  const teamDetailsDiv = document.createElement("div");
  teamDetailsDiv.id = "team-details";

  // MEMBRI
  // Allenatori
  const coachesDiv = document.createElement("div");
  coachesDiv.classList.add("team-details-section");

  const coachesEl = document.createElement("label");
  coachesEl.textContent = "Allenatori";
  coachesDiv.appendChild(coachesEl);

  const coachesNames = document.createElement("span");
  coachesNames.textContent = Object.keys(coaches).join(", ");
  coachesDiv.appendChild(coachesNames);

  teamDetailsDiv.appendChild(coachesDiv);

  // Giocatori
  const playersDiv = document.createElement("div");
  playersDiv.classList.add("team-details-section");

  const playersEl = document.createElement("label");
  playersEl.textContent = "Giocatori";
  playersDiv.appendChild(playersEl);

  const playersNames = document.createElement("span");
  playersNames.textContent = Object.keys(players).join(", ");
  playersDiv.appendChild(playersNames);

  teamDetailsDiv.appendChild(playersDiv);

  // GIRONE E PENALITA
  const groupAndPenaltyDiv = document.createElement("div");
  groupAndPenaltyDiv.id = "group-and-penalty";
  groupAndPenaltyDiv.classList.add("team-details-section");
  teamDetailsDiv.appendChild(groupAndPenaltyDiv);

  //Girone
  const groupDiv = document.createElement("div");
  groupDiv.id = "group-div";

  const groupLabel = document.createElement("label");
  groupLabel.innerHTML = `Girone:&nbsp;`;
  groupDiv.appendChild(groupLabel);

  const groupVal = document.createElement("p");
  groupVal.textContent = `${group}`;
  groupDiv.appendChild(groupVal);

  groupAndPenaltyDiv.appendChild(groupDiv);

  //Penalità
  const penaltyDiv = document.createElement("div");
  penaltyDiv.id = "penalty-div";

  const penaltyLabel = document.createElement("label");
  penaltyLabel.innerHTML = "Penalità:&nbsp;";
  penaltyDiv.appendChild(penaltyLabel);

  const penaltyVal = document.createElement("p");
  penaltyVal.textContent = `${penalty}`;
  penaltyDiv.appendChild(penaltyVal);

  groupAndPenaltyDiv.appendChild(penaltyDiv);

  // Aggiunta al DOM
  teamInfoContainer.appendChild(teamDetailsDiv);

  // Aggiunta del pulsante per modificare i dettagli
  const editButton = document.createElement("button");
  editButton.classList.add("custom-button");
  editButton.textContent = "Modifica Info";
  editButton.addEventListener("click", () => editTeamInfo(teamName, teamData));

  teamDetailsDiv.appendChild(editButton);
}

function editTeamInfo(teamName, teamData) {
  const teamInfoContainer = document.getElementById("team-info-container");

  // Controlla se il div esiste già
  if (document.getElementById("edit-container")) {
    return;
  }

  const editContainer = document.createElement("div");
  editContainer.id = "edit-container";

  // Edit Area
  const editArea = document.createElement("div");
  editArea.id = "edit-area";
  editContainer.appendChild(editArea);

  // Div membri
  const membersEditContainer = document.createElement("div");
  membersEditContainer.id = "members-edit-container";
  editArea.appendChild(membersEditContainer);

  // Campo di input per modificare gli allenatori
  const coachesLabel = document.createElement("label");
  coachesLabel.setAttribute("for", "coaches-input");
  coachesLabel.textContent = "Allenatori:";

  const coachesInput = document.createElement("textarea");
  coachesInput.setAttribute("spellcheck", "false");
  coachesInput.id = "coaches-input";
  coachesInput.value = Object.keys(teamData.Allenatori).join(", ");

  membersEditContainer.appendChild(coachesLabel);
  membersEditContainer.appendChild(coachesInput);

  // Campo di input per modificare i giocatori
  const playersLabel = document.createElement("label");
  playersLabel.setAttribute("for", "players-input");
  playersLabel.textContent = "Giocatori:";

  const playersInput = document.createElement("textarea");
  playersInput.setAttribute("spellcheck", "false");
  playersInput.id = "players-input";
  playersInput.value = Object.keys(teamData.Giocatori).join(", ");

  membersEditContainer.appendChild(playersLabel);
  membersEditContainer.appendChild(playersInput);

  // Div girone e penalità
  const groupAndPenaltyEditContainer = document.createElement("div");
  groupAndPenaltyEditContainer.id = "group-penalty-edit-container";
  editArea.appendChild(groupAndPenaltyEditContainer);

  // Campo di input per modificare i punti di penalità
  const penaltyLabel = document.createElement("label");
  penaltyLabel.setAttribute("for", "penalty-input");
  penaltyLabel.textContent = "Penalità:";

  const penaltyInput = document.createElement("input");
  penaltyInput.type = "number";
  penaltyInput.id = "penalty-input";
  penaltyInput.value = teamData.Penalità;

  groupAndPenaltyEditContainer.appendChild(penaltyLabel);
  groupAndPenaltyEditContainer.appendChild(penaltyInput);

  // Campo di input per modificare il girone
  const groupLabel = document.createElement("label");
  groupLabel.setAttribute("for", "group-input");
  groupLabel.textContent = "Girone:";

  const groupInput = document.createElement("input");
  groupInput.type = "text";
  groupInput.id = "group-input";
  groupInput.value = teamData.Girone;

  groupAndPenaltyEditContainer.appendChild(groupLabel);
  groupAndPenaltyEditContainer.appendChild(groupInput);

  // Bottone per salvare le modifiche
  const saveButton = document.createElement("button");
  saveButton.classList.add("custom-button");
  saveButton.textContent = "Salva Modifiche";
  saveButton.addEventListener("click", () =>
    saveTeamChanges({
      teamName,
      teamData,
      coaches: coachesInput.value.split(",").map((a) => a.trim()),
      players: playersInput.value.split(",").map((g) => g.trim()),
      group: groupInput.value,
      penalty: penaltyInput.value,
    })
  );

  editContainer.appendChild(saveButton);

  teamInfoContainer.appendChild(editContainer);
}

// Funzione per salvare le modifiche della squadra su Firebase
function saveTeamChanges({
  teamName,
  teamData,
  coaches,
  players,
  group,
  penalty,
}) {
  const paths = getPaths(); // Ottenere i percorsi
  const teamPath = `${paths.teamsPath}/${teamName}`;

  const teamRef = ref(db, teamPath);

  // Funzione per capitalizzare ogni parola in una stringa
  const capitalize = (str) => {
    return str
      .split(" ")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(" ");
  };

  // Costruisci l'oggetto di aggiornamento
  const updates = {
    Allenatori: coaches.reduce((acc, coach) => {
      const capName = capitalize(coach);
      acc[capName] = true; // Devo mettere valore true per permettere che si salvi sul Db
      return acc;
    }, {}),
    Giocatori: players.reduce((acc, player) => {
      const capName = capitalize(player);
      acc[capName] = true; // Devo mettere valore true per permettere che si salvi sul Db
      return acc;
    }, {}),
    Girone: capitalize(group),
    Penalità: penalty,
  };

  update(teamRef, updates)
    .then(() => {
      console.log("Modifiche salvate con successo");
      // Aggiorna l'interfaccia con i nuovi dati
      teamData.Allenatori = updates.Allenatori;
      teamData.Giocatori = updates.Giocatori;
      teamData.Girone = updates.Girone;
      teamData.Penalità = penalty;

      showTeamInfo(teamName, teamData);
    })
    .catch((error) => {
      console.error("Errore nel salvataggio delle modifiche:", error);
    });
}

async function addTeam() {
  // Rimuove container card squadre
  const teamsContainer = document.getElementById("teams-container");

  // Creazione del div per inserire una nuova squadra
  let newTeamDiv = document.getElementById("new-team-div");
  if (!newTeamDiv) {
    newTeamDiv = document.createElement("div");
    newTeamDiv.id = "new-team-div";
    teamsContainer.appendChild(newTeamDiv);
  }

  // Svuota il div prima di aggiungere nuovi elementi
  newTeamDiv.innerHTML = "";

  const teamNameValueInput = document.createElement("input");
  teamNameValueInput.type = "text";
  teamNameValueInput.placeholder = "Nome Squadra";
  teamNameValueInput.setAttribute("spellcheck", "false");
  teamNameValueInput.id = "team-name-input";

  newTeamDiv.appendChild(teamNameValueInput);

  // Bottone per inserire la squadra
  const saveTeam = document.createElement("button");
  saveTeam.className = "custom-button";
  saveTeam.innerHTML = "Inserisci Squadra";
  saveTeam.addEventListener("click", async () => {
    const teamName = teamNameValueInput.value.trim();
    if (teamName) {
      const newTeam = {
        Allenatori: "",
        Giocatori: "",
        Girone: "",
        Logo: "https://firebasestorage.googleapis.com/v0/b/cofta-mi.appspot.com/o/Loghi%2FTavola%20disegno%201.png?alt=media&token=fd010a97-1ff0-4d54-9830-856d3f93da74",
        LogoLR: "",
        Penalità: 0,
      };

      try {
        const paths = getPaths();
        const teamPath = `${paths.teamsPath}/${teamName.replace(/\./g, "_")}`;

        const teamRef = ref(db, teamPath);
        await set(teamRef, newTeam);

        teamNameValueInput.value = ""; // Reset del campo input

        // Trova l'elemento del nav per la sezione Squadre e simula un clic su di esso
        const navTeam = document.getElementById("nav-squadre");
        if (navTeam) {
          navTeam.click();
        }
      } catch (error) {
        console.error("Errore nel salvataggio della squadra:", error);
      }
    } else {
      alert("Inserisci un nome per la squadra!");
    }
  });
  newTeamDiv.appendChild(saveTeam);
}

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
  const matchdayToShowDiv = document.getElementById("match-to-show-div");

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

  // Recupera i dati di calendario e squadre in parallelo
  const [calendarSnapshot, teamsSnapshot] = await Promise.all([
    getData(calendarPath),
    getData(teamsPath),
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

    if (value === "Superiori") {
      descrizioneCalendario.innerHTML = `
  Dopo aver svolto tutte le partite del girone di andata, ogni squadra farà 3 partite extra a seconda della propria posizione in classifica, secondo il seguente schema:<br><br>
  <table style="margin: 0 auto; border-spacing: 8px 4px; text-align: left;">
    <tr><td>A (1ª)</td><td>D, E, F</td></tr>
    <tr><td>B (2ª)</td><td>C, E, F</td></tr>
    <tr><td>C (3ª)</td><td>B, D, F</td></tr>
    <tr><td>D (4ª)</td><td>A, C, E</td></tr>
    <tr><td>E (5ª)</td><td>A, B, D</td></tr>
    <tr><td>F (6ª)</td><td>A, B, C</td></tr>
  </table><br>
  Le prime <strong>4</strong> in classifica al termine di queste partite passeranno alla fase finale.
`;
    } else if (value === "Giovani") {
      descrizioneCalendario.innerHTML = `
 Dopo aver svolto tutte le partite del girone di andata, ogni squadra farà 3 partite extra a seconda della propria posizione in classifica, contro le squadre dell'altro girone, secondo il seguente schema:<br><br>
  <table style="margin: 0 auto; border-spacing: 8px 4px; text-align: left;">
    <tr><td>A (1ª)</td><td>D, E, F</td></tr>
    <tr><td>B (2ª)</td><td>C, E, F</td></tr>
    <tr><td>C (3ª)</td><td>B, D, F</td></tr>
    <tr><td>D (4ª)</td><td>A, C, E</td></tr>
    <tr><td>E (5ª)</td><td>A, B, D</td></tr>
    <tr><td>F (6ª)</td><td>A, B, C</td></tr>
  </table><br>
  Le prime <strong>4</strong> in classifica al termine di queste partite passeranno alla fase finale.
`;
    } else {
      descrizioneCalendario.textContent = "";
    }
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

function convertiDataOra(matchDate, matchTime) {
  const [day, month] = matchDate.split("/");
  const [hour, minutes] = matchTime.split(":");
  const currentYear = new Date().getFullYear();
  return new Date(currentYear, month - 1, day, hour, minutes);
}

async function showOverlayMatchResult(matchString, teamsSnapshot, matchday) {
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

function abbreviateName(name) {
  if (name.length <= 20) return name;

  const nameParts = name.split(" ");
  const firstName = nameParts[0];
  const abbreviatedLastName = nameParts
    .slice(1)
    .map((part) => part.charAt(0) + ".")
    .join(" ");

  const abbreviatedName = `${firstName} ${abbreviatedLastName}`;

  return abbreviatedName;
}

function separateScorers(scorers) {
  const normalScorers = [];
  const ownGoals = [];

  Object.keys(scorers).forEach((scorer) => {
    if (scorer === "AutogolCasa" || scorer === "AutogolOspite") {
      ownGoals.push({ name: "Autogol", count: scorers[scorer] });
    } else {
      normalScorers.push({ name: scorer, count: scorers[scorer] });
    }
  });

  return { normalScorers, ownGoals };
}

/*
===================================
REPORT
===================================
*/

export async function showReportOptions() {
  loadMatchReports();
}

// Funzione per ottenere i referti e popolare la tabella per il GESTIONALE
async function loadMatchReports() {
  const reportsDiv = document.getElementById("report-content");
  reportsDiv.innerHTML = "";

  const scrollContainer = document.createElement("div");
  scrollContainer.id = "scroll-container";
  reportsDiv.appendChild(scrollContainer);

  const table = document.createElement("table");

  const headers = [
    "Data Ricezione",
    "Nome Arbitro",
    "Partita",
    "Marcatori",
    "MVP",
    "Commenti/Espulsioni",
    "Conferma",
  ];
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  const reportsPath = `Calcio/${edition}/`;
  const allReports = [];

  const divisions = ["Superiori", "Giovani"];
  for (let division of divisions) {
    const divisionRefPath = `${reportsPath}${division}/Referti`;
    const giornateSnapshot = await getData(divisionRefPath);
    if (!giornateSnapshot) continue;

    for (let giornata in giornateSnapshot) {
      const matchesSnapshot = giornateSnapshot[giornata] || {};
      for (let match in matchesSnapshot) {
        const report = matchesSnapshot[match];
        allReports.push({ report, division, giornata, match });
      }
    }
  }

  allReports.sort(
    (a, b) =>
      new Date(b.report?.OraInvio || 0) - new Date(a.report?.OraInvio || 0)
  );

  for (let { report, division, giornata } of allReports) {
    const row = document.createElement("tr");

    const dataRicezione = document.createElement("td");
    dataRicezione.textContent = formatDateTime(
      report?.OraInvio || new Date(0).toISOString()
    );
    row.appendChild(dataRicezione);

    const nomeArbitro = document.createElement("td");
    nomeArbitro.textContent = report?.NomeArbitro || "";
    row.appendChild(nomeArbitro);

    const partita = document.createElement("td");
    const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
    const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
    const golCasa = report?.GolSquadraCasa ?? "";
    const golOspite = report?.GolSquadraOspite ?? "";
    partita.innerHTML = `
          <div>${squadraCasa}: ${golCasa}</div>
          <div>${squadraOspite}: ${golOspite}</div>
          <br>
          <div>D: ${report?.Divisione || division} - G: ${giornata}</div>
      `;
    row.appendChild(partita);

    // Marcatori (con fallback sicuri)
    const marcatori = document.createElement("td");
    const marcatoriCasaObj = report?.Marcatori?.MarcatoriCasa || {};
    const marcatoriOspiteObj = report?.Marcatori?.MarcatoriOspite || {};

    const generateMarcatoriHTML = (squadra, obj) => {
      let html = `<strong>${squadra}</strong><br>`;
      for (let [nome, gol] of Object.entries(obj)) {
        if (String(nome).startsWith("Autogol")) continue;
        html += `${nome}: ${gol}<br>`;
      }
      return html;
    };

    const generateAutogolHTML = (obj) => {
      let autogolTotale = 0;
      for (let [nome, gol] of Object.entries(obj)) {
        if (String(nome).startsWith("Autogol")) autogolTotale += gol;
      }
      return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
    };

    let marcatoriCasaHTML = generateMarcatoriHTML(
      squadraCasa,
      marcatoriCasaObj
    );
    let marcatoriOspiteHTML = generateMarcatoriHTML(
      squadraOspite,
      marcatoriOspiteObj
    );
    marcatoriCasaHTML += generateAutogolHTML(marcatoriCasaObj);
    marcatoriOspiteHTML += generateAutogolHTML(marcatoriOspiteObj);

    marcatori.innerHTML = `${marcatoriCasaHTML}<br>${marcatoriOspiteHTML}`;
    row.appendChild(marcatori);

    const mvp = document.createElement("td");
    mvp.textContent = report?.MVP || "";
    row.appendChild(mvp);

    const commenti = document.createElement("td");
    commenti.textContent = report?.Commenti || "";
    row.appendChild(commenti);

    // Conferma
    const conferma = document.createElement("td");
    const confermaButton = document.createElement("button");
    confermaButton.classList.add("confirm-button");

    const matchKey = `${report?.SquadraCasa || ""}:${
      report?.SquadraOspite || ""
    }`;
    const matchPath = `Calcio/${edition}/${division}/Partite/${giornata}/${matchKey}`;
    const existingMatchData = await getData(matchPath);

    if (existingMatchData) {
      confermaButton.classList.add("confirmed");
    } else {
      confermaButton.classList.add("not-confirmed");
    }

    confermaButton.innerHTML = "✔";
    confermaButton.onclick = () => confermaReport(giornata, report);
    conferma.appendChild(confermaButton);
    row.appendChild(conferma);

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  scrollContainer.appendChild(table);
}

//PER I PADRI E I SOCIAL
export async function loadMatchReports2() {
  const reportsDiv = document.getElementById("reports");
  reportsDiv.innerHTML = "";

  // Crea il contenitore per la tabella
  const tableContainer = document.createElement("div");
  tableContainer.className = "table-container";
  reportsDiv.appendChild(tableContainer);

  // Crea la tabella
  const table = document.createElement("table");

  // Intestazioni delle colonne (rimuovi "Conferma")
  const headers = [
    "Data Ricezione",
    "Nome Arbitro",
    "Partita",
    "Marcatori",
    "MVP",
    "Commenti/Espulsioni",
  ];
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  headers.forEach((headerText) => {
    const th = document.createElement("th");
    th.textContent = headerText;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  tbody.className = "scrollable-tbody";

  const reportsPath = `Calcio/${edition}/`;
  const allReports = [];

  const divisions = ["Superiori", "Giovani"];
  for (let division of divisions) {
    const divisionRefPath = `${reportsPath}${division}/Referti`;
    const giornateSnapshot = await getData(divisionRefPath);
    if (!giornateSnapshot) continue;

    for (let giornata in giornateSnapshot) {
      const matchesSnapshot = giornateSnapshot[giornata] || {};
      for (let match in matchesSnapshot) {
        const report = matchesSnapshot[match];
        allReports.push({ report, division, giornata, match });
      }
    }
  }

  // Ordina per data invio (robusto ai valori mancanti)
  allReports.sort(
    (a, b) =>
      new Date(b.report?.OraInvio || 0) - new Date(a.report?.OraInvio || 0)
  );

  // Popola la tabella
  for (let { report, division, giornata } of allReports) {
    const row = document.createElement("tr");

    // Data Ricezione
    const dataRicezione = document.createElement("td");
    dataRicezione.textContent = formatDateTime(
      report?.OraInvio || new Date(0).toISOString()
    );
    row.appendChild(dataRicezione);

    // Nome Arbitro
    const nomeArbitro = document.createElement("td");
    nomeArbitro.textContent = report?.NomeArbitro || "";
    row.appendChild(nomeArbitro);

    // Partita
    const partita = document.createElement("td");
    const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
    const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
    const golCasa = report?.GolSquadraCasa ?? "";
    const golOspite = report?.GolSquadraOspite ?? "";
    partita.innerHTML = `
          <div>${squadraCasa}: ${golCasa}</div>
          <div>${squadraOspite}: ${golOspite}</div>
          <br>
          <div>D: ${report?.Divisione || division} - G: ${giornata}</div>
      `;
    row.appendChild(partita);

    // Marcatori (safe)
    const marcatori = document.createElement("td");
    const marcatoriCasa = report?.Marcatori?.MarcatoriCasa || {};
    const marcatoriOspite = report?.Marcatori?.MarcatoriOspite || {};

    const generateMarcatoriHTML = (squadra, obj) => {
      let html = `<strong>${squadra}</strong><br>`;
      for (let [nome, gol] of Object.entries(obj)) {
        if (String(nome).startsWith("Autogol")) continue;
        html += `${nome}: ${gol}<br>`;
      }
      return html;
    };

    const generateAutogolHTML = (obj) => {
      let autogolTotale = 0;
      for (let [nome, gol] of Object.entries(obj)) {
        if (String(nome).startsWith("Autogol")) autogolTotale += gol;
      }
      return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
    };

    let marcatoriCasaHTML = generateMarcatoriHTML(squadraCasa, marcatoriCasa);
    let marcatoriOspiteHTML = generateMarcatoriHTML(
      squadraOspite,
      marcatoriOspite
    );

    marcatoriCasaHTML += generateAutogolHTML(marcatoriCasa);
    marcatoriOspiteHTML += generateAutogolHTML(marcatoriOspite);

    marcatori.innerHTML = `${marcatoriCasaHTML}<br>${marcatoriOspiteHTML}`;
    row.appendChild(marcatori);

    // MVP
    const mvp = document.createElement("td");
    mvp.textContent = report?.MVP || "";
    row.appendChild(mvp);

    // Commenti/Espulsioni
    const commenti = document.createElement("td");
    commenti.textContent = report?.Commenti || "";
    row.appendChild(commenti);

    // Click su riga -> overlay (safe)
    row.addEventListener("click", () => {
      if (isMobileDevice()) {
        const currentPage = window.location.pathname;
        if (currentPage === "/referti.html") {
          openOverlay(report, division, giornata);
        } else if (currentPage === "/referti-social.html") {
          openOverlay2(report, division, giornata);
        }
      }
    });

    tbody.appendChild(row);
  }

  table.appendChild(tbody);
  tableContainer.appendChild(table);
}

//PADRI
function openOverlay(report, division, giornata) {
  const generateMarcatoriHTML = (squadra, obj = {}) => {
    let html = `<strong>${squadra}</strong><br>`;
    for (let [nome, gol] of Object.entries(obj)) {
      if (String(nome).startsWith("Autogol")) continue;
      html += `${nome}: ${gol}<br>`;
    }
    return html;
  };

  const generateAutogolHTML = (obj = {}) => {
    let autogolTotale = 0;
    for (let [nome, gol] of Object.entries(obj)) {
      if (String(nome).startsWith("Autogol")) autogolTotale += gol;
    }
    return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
  };

  const overlay = document.createElement("div");
  overlay.classList.add("overlay");

  const overlayContent = document.createElement("div");
  overlayContent.classList.add("overlay-content");

  const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
  const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
  const golCasa = report?.GolSquadraCasa ?? "";
  const golOspite = report?.GolSquadraOspite ?? "";

  const marcatoriCasaObj = report?.Marcatori?.MarcatoriCasa || {};
  const marcatoriOspiteObj = report?.Marcatori?.MarcatoriOspite || {};

  overlayContent.innerHTML = `
    <i class="fa-solid fa-xmark close-overlay"></i>
    <h2>Referto</h2>
    <p><strong>Arbitro:</strong> ${report?.NomeArbitro || ""}</p>
    <p><strong>Divisione:</strong> ${division} <strong>Giornata:</strong> ${giornata}</p>
    <h3><strong>Partita</strong></h3>
    <p>${squadraCasa}: ${golCasa}</p>
    <p>${squadraOspite}: ${golOspite}</p>

    <h3><strong>Marcatori e MVP</strong></h3>
    <p>${generateMarcatoriHTML(squadraCasa, marcatoriCasaObj)}</p>
    <p>${generateMarcatoriHTML(squadraOspite, marcatoriOspiteObj)}
       ${generateAutogolHTML(marcatoriCasaObj)}${generateAutogolHTML(
    marcatoriOspiteObj
  )}</p>
    <p><strong>MVP:</strong> ${report?.MVP || ""}</p>
    <h3><strong>Commenti/Espulsioni:</strong></h3>
    <p>${report?.Commenti || ""}</p>
  `;

  overlay.appendChild(overlayContent);
  document.body.appendChild(overlay);

  const closeButton = overlayContent.querySelector(".close-overlay");
  closeButton.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
}

//SOCIAL
function openOverlay2(report, division, giornata) {
  const generateMarcatoriHTML = (squadra, obj = {}) => {
    let html = `<strong>${squadra}</strong><br>`;
    for (let [nome, gol] of Object.entries(obj)) {
      if (String(nome).startsWith("Autogol")) continue;
      html += `${nome}: ${gol}<br>`;
    }
    return html;
  };

  const generateAutogolHTML = (obj = {}) => {
    let autogolTotale = 0;
    for (let [nome, gol] of Object.entries(obj)) {
      if (String(nome).startsWith("Autogol")) autogolTotale += gol;
    }
    return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
  };

  const overlay = document.createElement("div");
  overlay.classList.add("overlay");

  const overlayContent = document.createElement("div");
  overlayContent.classList.add("overlay-content");

  const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
  const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
  const golCasa = report?.GolSquadraCasa ?? "";
  const golOspite = report?.GolSquadraOspite ?? "";

  const marcatoriCasaObj = report?.Marcatori?.MarcatoriCasa || {};
  const marcatoriOspiteObj = report?.Marcatori?.MarcatoriOspite || {};

  overlayContent.innerHTML = `
    <i class="fa-solid fa-xmark close-overlay"></i>
    <h3>Referto Partita</h3>
    <p><strong>Divisione:</strong> ${division} <strong>Giornata:</strong> ${giornata}</p>  
    <p><strong>${squadraCasa}: ${golCasa}</strong></p>
    <p><strong>${squadraOspite}: ${golOspite}</strong></p>
    <h3><strong>Marcatori</strong></h3>
    <p>${generateMarcatoriHTML(squadraCasa, marcatoriCasaObj)}</p>
    <p>${generateMarcatoriHTML(squadraOspite, marcatoriOspiteObj)}
       ${generateAutogolHTML(marcatoriCasaObj)}${generateAutogolHTML(
    marcatoriOspiteObj
  )}</p>
  `;

  overlay.appendChild(overlayContent);
  document.body.appendChild(overlay);

  const closeButton = overlayContent.querySelector(".close-overlay");
  closeButton.addEventListener("click", () => {
    document.body.removeChild(overlay);
  });
}

// Funzione per formattare la data e l'ora
function formatDateTime(isoString) {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // Mesi da 0 a 11
  const year = String(date.getFullYear()).slice(-2); // Ultime due cifre dell'anno
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

// Funzione per gestire la conferma del referto
async function confermaReport(giornata, report) {
  const matchKey = `${report.SquadraCasa}:${report.SquadraOspite}`;

  const division = report.Divisione;
  // Prepara i dati da inviare per la partita
  const matchData = {
    GolSquadraCasa: report.GolSquadraCasa,
    GolSquadraOspite: report.GolSquadraOspite,
    SquadraCasa: report.SquadraCasa,
    SquadraOspite: report.SquadraOspite,
    Marcatori: report.Marcatori,
  };

  // Prepara il risultato nel formato "GolCasa:GolOspite"
  const risultato = `${report.GolSquadraCasa}:${report.GolSquadraOspite}`;

  // Ottieni il percorso della chiave specifica nel database per la partita
  const matchPath = `Calcio/${edition}/${division}/Partite/${giornata}/${matchKey}`;

  // Ottieni il percorso della chiave specifica nel database per il calendario
  const calendarioPath = `Calcio/${edition}/${division}/Calendario/${giornata}/${matchKey}`;

  try {
    // Aggiorna i dati nel database per la partita
    await setData(matchPath, matchData);

    // Aggiorna il risultato nel calendario
    await updateData(calendarioPath, { Risultato: risultato });

    alert(
      `Dati della partita per ${division}, giornata ${giornata}, partita ${matchKey} aggiornati con successo.`
    );
  } catch (error) {
    console.error("Errore nell'aggiornamento dei dati:", error);
    alert(
      "Si è verificato un errore nell'aggiornamento dei dati della partita."
    );
  }
}

/*
===================================
PARTITE
===================================
*/

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

/*
===================================
FASE FINALE
===================================
*/

export async function faseFinale() {
  const tabelloneImg = document.getElementById("tabellone");
  const divisionSelect = document.getElementById("division");

  const supExists = await fileExists("immagini/Tabellone_Sup.png");
  const giovExists = await fileExists("immagini/Tabellone_Giov.png");

  if (supExists && giovExists) {
    if (divisionSelect.value === "Superiori") {
      tabelloneImg.src = "immagini/Tabellone_Sup.png";
    } else if (divisionSelect.value === "Giovani") {
      tabelloneImg.src = "immagini/Tabellone_Giov.png";
    }
  } else {
    tabelloneImg.src = "immagini/Tabellone.png";
  }
}

async function fileExists(url) {
  try {
    const response = await fetch(url, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.error(`Errore durante la verifica del file ${url}:`, error);
    return false;
  }
}

/*
===================================
CLASSIFICA SQUADRE
===================================
*/

export async function classificaGirone(targetDiv) {
  const containerId = targetDiv;
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

      if (girone !== "unico") {
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

    // Dopo il ciclo for (const girone of Object.keys(gironi).sort()) { ... }

    // // Cerca il valore selezionato nel select (mobile o desktop)
    // const selectElement =
    //   document.getElementById("division-smartphone") ||
    //   document.getElementById("division");

    // const categoria = selectElement?.value || "";
    // const avviso = document.createElement("p");
    // avviso.classList.add("classifica-avviso");

    // if (categoria === "Superiori") {
    //   avviso.innerText = "NB: Ogni squadra farà 3 partite extra";
    // } else if (categoria === "Giovani") {
    //   avviso.innerText = "NB: Ogni squadra farà 2 partite extra";
    // } else {
    //   avviso.innerText = "";
    // }

    // container.appendChild(avviso);
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
          `<strong>${team.replace(/_/g, ".")}</strong>: -${
            data.penaltyPoints
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
===================================x
*/
let globalRankingArray = []; // Memorizza la classifica globale
let teamsCache = {}; // Memorizza la cache delle squadre

export async function classificaMarcatori(targetDiv) {
  const containerId = targetDiv;
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

// async function getAllMatchReports(division) {
//   const edition = "2025";
//   const matchReportsPath = `Calcio/${edition}/${division}/Referti`;
//   const matchReportsSnapshot = await getData(matchReportsPath);
//   return matchReportsSnapshot;
// }

// async function getMVPsByDivision(division) {
//   // Recupera tutti i referti
//   const matchReports = await getAllMatchReports(division);

//   // Crea un array per memorizzare gli MVP
//   const mvps = [];

//   // Itera su ogni giornata di referti
//   Object.keys(matchReports).forEach((matchday) => {
//     const matchdayReports = matchReports[matchday];

//     // Itera su ogni partita del referto
//     Object.keys(matchdayReports).forEach((match) => {
//       const report = matchdayReports[match];
//       const mvp = report.MVP;

//       // Aggiungi l'MVP all'array, se presente
//       if (mvp) {
//         mvps.push(mvp);
//       }
//     });
//   });

//   return mvps;
// }

// document
//   .getElementById("get-mvps-button")
//   .addEventListener("click", async () => {
//     const division = document.getElementById("division").value;
//     const mvps = await getMVPsByDivision(division);

//     console.log("MVPs per la divisione selezionata:", mvps);
//   });

/*
===================================
ALBO D'ORO
===================================
*/

export async function getAlboOro() {
  try {
    // Recupero tutti gli anni disponibili sotto il nodo Calcio/AlboOro
    let alboOroData = await getData("Calcio/AlboOro");
    let container = document.getElementById("albo-d'oro");

    if (!container) {
      console.error("Elemento #albo-d'oro non trovato.");
      return;
    }

    container.innerHTML = ""; // Pulisce il contenuto prima di stampare i dati

    let anniDisponibili = new Set();

    // Scansioniamo tutte le categorie per trovare tutti gli anni
    for (let categoria in alboOroData) {
      for (let anno in alboOroData[categoria]) {
        anniDisponibili.add(anno);
      }
    }

    // Ordiniamo gli anni dal più recente al più vecchio
    let anniOrdinati = Array.from(anniDisponibili).sort((b, a) =>
      b.localeCompare(a)
    );

    // Per ogni anno disponibile, creiamo una tabella con le classi corrette
    anniOrdinati.forEach((anno) => {
      let superiori = alboOroData.Superiori?.[anno] || {};
      let giovani = alboOroData.Giovani?.[anno] || {};

      // Sostituiamo "_" con "." nei nomi delle squadre
      let superioriPrimo = superiori.PrimoClassificato
        ? `🥇 ${superiori.PrimoClassificato.replace(/_/g, ".")}`
        : "-";

      let superioriSecondo = superiori.SecondoClassificato
        ? `🥈 ${superiori.SecondoClassificato.replace(/_/g, ".")}`
        : "-";

      let giovaniPrimo = giovani.PrimoClassificato
        ? `🥇 ${giovani.PrimoClassificato.replace(/_/g, ".")}`
        : "-";

      let giovaniSecondo = giovani.SecondoClassificato
        ? `🥈 ${giovani.SecondoClassificato.replace(/_/g, ".")}`
        : "-";

      // Creiamo il blocco HTML con la tabella, utilizzando le classi già definite nel sito
      let block = document.createElement("div");
      block.classList.add("albo-table-container"); // Classe per il contenitore della tabella

      block.innerHTML = `
            <h3 class="albo-table-title">${anno}</h3>
            <table class="albo-table">
                <thead>
                    <tr>
                        <th class="albo-table-header">Superiori</th>
                        <th class="albo-table-header">Giovani</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="albo-table-cell">${superioriPrimo}</td>
                        <td class="albo-table-cell">${giovaniPrimo}</td>
                    </tr>
                    <tr>
                        <td class="albo-table-cell">${superioriSecondo}</td>
                        <td class="albo-table-cell">${giovaniSecondo}</td>
                    </tr>
                </tbody>
            </table>
            <br>
        `;

      container.appendChild(block);
    });
  } catch (error) {
    console.error("Errore nel recupero dell'Albo d'Oro:", error);
    let container = document.getElementById("albo-d'oro");
    if (container) {
      container.innerHTML =
        "<p class='error-message'>⚠️ Nessun dato disponibile.</p>";
    }
  }
}
