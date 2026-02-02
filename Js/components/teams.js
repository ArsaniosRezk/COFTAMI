import {
    db,
    ref,
    update,
    set,
    getData,
    getPaths,
} from "../firebase.js";
import { isMobileDevice } from "../utils/device.js";
import { capitalize } from "../utils/formatters.js";

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
