import { db, ref, update, set, getData, getPaths, uploadFile } from "../firebase.js";
import { getSelectedDivision } from "../divisione.js";
import { capitalize } from "../utils/formattazione.js";
import { nomeSquadra, linkSquadra, eSquadraPreferita } from "../utils/torneo.js";
import { mostraAvvisoVuoto } from "./pre-torneo.js";
import { conferma as chiediConferma, mostraToast } from "../utils/interfaccia.js";

// Messaggi al posto di alert(): brevi in basso, quelli lunghi in una finestra
const segnalaErrore = (testo) => mostraToast(testo, { errore: true });

// Caratteri che Firebase non accetta nelle chiavi, più ":" che separa
// le due squadre nelle chiavi delle partite (Casa:Ospite)
const CARATTERI_VIETATI = /[/#$[\]:]/;

const TIPI_LOGO = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTE = 10 * 1024 * 1024;

// Nome visualizzato -> chiave su Firebase (il punto non è ammesso)
function chiaveDaNome(nome) {
  return nome.trim().replace(/\./g, "_");
}

/*
===================================
SQUADRE
===================================
*/

export async function visualizzaSquadreConMembri(dati = null) {
  const teamsContainer = document.getElementById("teams-container");
  if (!teamsContainer) return;

  let teamsSnapshot = dati?.squadre;
  const divisione = dati?.divisione || getSelectedDivision();
  if (!dati) {
    const { teamsPath } = getPaths();
    teamsSnapshot = await getData(teamsPath);
  }

  if (!teamsSnapshot) {
    mostraAvvisoVuoto("teams-container", "Le squadre iscritte saranno pubblicate qui a breve.");
    return;
  }

  teamsContainer.innerHTML = "";

  const ordinate = Object.entries(teamsSnapshot).sort(([a], [b]) =>
    nomeSquadra(a).localeCompare(nomeSquadra(b))
  );

  for (const [teamName, teamData] of ordinate) {
    const coaches = teamData.Allenatori || {};
    const players = teamData.Giocatori || {};

    // Ogni scheda porta alla pagina della squadra (partite, marcatori, rosa)
    const teamDiv = document.createElement("a");
    teamDiv.className = "squadra";
    teamDiv.href = linkSquadra(teamName, divisione);
    if (eSquadraPreferita(divisione, teamName)) teamDiv.classList.add("preferita");

    const logoNameDiv = document.createElement("div");
    logoNameDiv.className = "logo-e-nome";

    // Versione leggera del logo: quella grande pesa fino a 1 MB
    const logoUrl = teamData.LogoLR || teamData.Logo;
    if (logoUrl) {
      const logoEl = document.createElement("img");
      logoEl.src = logoUrl;
      logoEl.alt = "";
      logoEl.width = 125;
      logoEl.height = 125;
      logoEl.loading = "lazy";
      logoEl.decoding = "async";
      logoNameDiv.appendChild(logoEl);
    }

    const teamNameDiv = document.createElement("div");
    teamNameDiv.className = "nome-team";
    const teamNameEl = document.createElement("span");
    teamNameEl.textContent = nomeSquadra(teamName);
    teamNameDiv.appendChild(teamNameEl);
    logoNameDiv.appendChild(teamNameDiv);
    teamDiv.appendChild(logoNameDiv);

    // Rosa visibile accanto al logo su schermi larghi
    const membersDiv = document.createElement("div");
    membersDiv.className = "membri";

    const aggiungiMembri = (titolo, membri) => {
      const tipo = document.createElement("p");
      tipo.className = "tipo-membro";
      tipo.textContent = titolo;
      const elenco = document.createElement("p");
      elenco.className = "membro";
      elenco.textContent = Object.keys(membri).join(", ") || "-";
      membersDiv.append(tipo, elenco);
    };
    aggiungiMembri("Allenatori", coaches);
    aggiungiMembri("Giocatori", players);

    teamDiv.appendChild(membersDiv);
    teamsContainer.appendChild(teamDiv);
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
    teamsContainer.appendChild(creaPannelloGironi(teamsSnapshot));
    const pannelloLoghi = creaPannelloLoghi(teamsSnapshot);
    if (pannelloLoghi) teamsContainer.appendChild(pannelloLoghi);

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
      teamCard.addEventListener("click", () => showTeamInfo(teamName, teamData));
    }

    // Pulsante per aggiungere una nuova squadra
    const addTeamButton = document.createElement("button");
    addTeamButton.id = "add-team-button";
    addTeamButton.innerHTML = "Aggiungi<br>Squadra";

    // Crea l'elemento icona
    const icon = document.createElement("i");
    icon.classList.add("icona", "icona-plus");

    // Aggiungi l'icona al pulsante
    addTeamButton.prepend(icon);

    // Aggiungi il pulsante al container delle squadre
    teamsContainer.appendChild(addTeamButton);

    addTeamButton.addEventListener("click", addTeam);
  }
}

/*
-----------------------------------
GIRONI
-----------------------------------
*/

// Libreria per il trascinamento (funziona anche col tocco su smartphone)
const SORTABLE_URL = "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/modular/sortable.esm.js";

// Pannello in cima all'elenco: mostra la divisione attuale in gironi,
// permette di rifarla (girone unico oppure sorteggio in N gironi) e di
// spostare le squadre trascinandole da una tabella all'altra
function creaPannelloGironi(teamsSnapshot) {
  const chiaviSquadre = Object.keys(teamsSnapshot);
  const gironiAttuali = [
    ...new Set(
      Object.values(teamsSnapshot)
        .map((datiSquadra) => datiSquadra.Girone || "")
        .filter(Boolean)
    ),
  ].sort();

  const pannello = document.createElement("div");
  pannello.id = "gironi-panel";

  const titolo = document.createElement("h3");
  titolo.textContent = "Gironi";
  pannello.appendChild(titolo);

  const riepilogo = document.createElement("p");
  riepilogo.className = "gironi-riepilogo";
  pannello.appendChild(riepilogo);

  // Le squadre senza girone non compaiono in classifica se le altre ce l'hanno
  const avviso = document.createElement("p");
  avviso.className = "gironi-avviso";
  pannello.appendChild(avviso);

  const aggiornaRiepilogo = () => {
    const conteggio = {};
    let senzaGirone = 0;
    for (const datiSquadra of Object.values(teamsSnapshot)) {
      const girone = datiSquadra.Girone || "";
      if (girone === "") senzaGirone++;
      else conteggio[girone] = (conteggio[girone] || 0) + 1;
    }
    const gironi = Object.keys(conteggio).sort();

    riepilogo.textContent =
      gironi.length === 0
        ? `Girone unico (${chiaviSquadre.length} squadre)`
        : gironi.map((girone) => `Girone ${girone}: ${conteggio[girone]}`).join(" · ");

    const mostraAvviso = gironi.length > 0 && senzaGirone > 0;
    avviso.hidden = !mostraAvviso;
    avviso.textContent = mostraAvviso
      ? `${senzaGirone} squadre senza girone: non compariranno in classifica.`
      : "";

    pannello.querySelectorAll(".girone-tabella").forEach((tabella) => {
      const numero = tabella.querySelectorAll(".girone-squadra").length;
      tabella.querySelector(".girone-conteggio").textContent = `(${numero})`;
    });
  };

  const controlli = document.createElement("div");
  controlli.className = "gironi-controlli";

  const etichetta = document.createElement("label");
  etichetta.setAttribute("for", "gironi-numero");
  etichetta.textContent = "Numero di gironi:";
  controlli.appendChild(etichetta);

  const inputNumero = document.createElement("input");
  inputNumero.type = "number";
  inputNumero.id = "gironi-numero";
  inputNumero.min = "1";
  inputNumero.max = String(Math.min(chiaviSquadre.length, 26));
  inputNumero.value = String(Math.max(gironiAttuali.length, 1));
  controlli.appendChild(inputNumero);

  const applica = document.createElement("button");
  applica.className = "custom-button";
  applica.textContent = "Applica";
  applica.addEventListener("click", () => applicaGironi(chiaviSquadre, parseInt(inputNumero.value, 10)));
  controlli.appendChild(applica);

  pannello.appendChild(controlli);

  const nota = document.createElement("p");
  nota.className = "gironi-nota";
  nota.textContent =
    "1 = girone unico. Con più gironi le squadre vengono sorteggiate a caso; " +
    "poi puoi spostarle trascinandole da una tabella all'altra.";
  pannello.appendChild(nota);

  if (gironiAttuali.length > 0) {
    pannello.appendChild(creaTabelleGironi(teamsSnapshot, gironiAttuali, aggiornaRiepilogo));
  }

  aggiornaRiepilogo();
  return pannello;
}

// Una tabella per girone (più "Senza girone" se serve): trascinando una
// squadra in un'altra tabella il nuovo girone viene salvato subito
function creaTabelleGironi(teamsSnapshot, gironi, aggiornaRiepilogo) {
  const contenitore = document.createElement("div");
  contenitore.className = "gironi-tabelle";

  const colonne = [...gironi];
  if (Object.values(teamsSnapshot).some((datiSquadra) => !datiSquadra.Girone)) {
    colonne.push("");
  }

  const liste = colonne.map((girone) => {
    const tabella = document.createElement("div");
    tabella.className = "girone-tabella";

    const intestazione = document.createElement("div");
    intestazione.className = "girone-intestazione";
    intestazione.textContent = girone ? `Girone ${girone} ` : "Senza girone ";
    const conteggio = document.createElement("span");
    conteggio.className = "girone-conteggio";
    intestazione.appendChild(conteggio);
    tabella.appendChild(intestazione);

    const lista = document.createElement("ul");
    lista.className = "girone-lista";
    lista.dataset.girone = girone;

    Object.entries(teamsSnapshot)
      .filter(([, datiSquadra]) => (datiSquadra.Girone || "") === girone)
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([chiave, datiSquadra]) => {
        const elemento = document.createElement("li");
        elemento.className = "girone-squadra";
        elemento.dataset.chiave = chiave;

        const logo = document.createElement("img");
        logo.src = datiSquadra.LogoLR || datiSquadra.Logo || "";
        logo.alt = "";
        elemento.appendChild(logo);

        const nome = document.createElement("span");
        nome.textContent = chiave.replace(/_/g, ".");
        elemento.appendChild(nome);

        lista.appendChild(elemento);
      });

    tabella.appendChild(lista);
    contenitore.appendChild(tabella);
    return lista;
  });

  import(SORTABLE_URL)
    .then(({ default: Sortable }) => {
      const { teamsPath } = getPaths();

      for (const lista of liste) {
        Sortable.create(lista, {
          group: "gironi",
          animation: 150,
          // Su smartphone serve una breve pressione, così lo scorrimento resta libero
          delay: 150,
          delayOnTouchOnly: true,
          ghostClass: "girone-squadra-fantasma",
          onAdd: async (evento) => {
            const chiave = evento.item.dataset.chiave;
            const nuovoGirone = evento.to.dataset.girone;
            const vecchioGirone = evento.from.dataset.girone;

            teamsSnapshot[chiave].Girone = nuovoGirone;
            aggiornaRiepilogo();

            try {
              await update(ref(db, `${teamsPath}/${chiave}`), {
                Girone: nuovoGirone,
              });
            } catch (error) {
              console.error("Errore nello spostamento della squadra:", error);
              segnalaErrore("Errore nel salvataggio del girone. Riprova.");
              // Rimette la squadra dov'era
              teamsSnapshot[chiave].Girone = vecchioGirone;
              evento.from.insertBefore(evento.item, evento.from.children[evento.oldIndex] || null);
              aggiornaRiepilogo();
            }
          },
        });
      }
    })
    .catch((error) => {
      console.error("Impossibile caricare il trascinamento:", error);
      contenitore.classList.add("gironi-tabelle-statiche");
    });

  return contenitore;
}

async function applicaGironi(chiaviSquadre, numeroGironi) {
  const massimo = Math.min(chiaviSquadre.length, 26);
  if (!Number.isInteger(numeroGironi) || numeroGironi < 1 || numeroGironi > massimo) {
    segnalaErrore(`Inserisci un numero di gironi tra 1 e ${massimo}.`);
    return;
  }

  const lettere = Array.from({ length: numeroGironi }, (_, i) => String.fromCharCode(65 + i));

  const conferma = await chiediConferma(
    numeroGironi === 1
      ? `Tutte le ${chiaviSquadre.length} squadre verranno messe in un girone unico.`
      : `Le ${chiaviSquadre.length} squadre verranno sorteggiate in ${numeroGironi} gironi ` +
          `(${lettere.join(", ")}).\n\nI gironi assegnati finora verranno sovrascritti.`
  );
  if (!conferma) return;

  // Sorteggio (Fisher-Yates), poi distribuzione a rotazione: i gironi
  // differiscono al massimo di una squadra
  const mescolate = [...chiaviSquadre];
  for (let i = mescolate.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [mescolate[i], mescolate[j]] = [mescolate[j], mescolate[i]];
  }

  const { teamsPath } = getPaths();
  const updates = {};
  mescolate.forEach((chiave, indice) => {
    updates[`${teamsPath}/${chiave}/Girone`] = numeroGironi === 1 ? "" : lettere[indice % numeroGironi];
  });

  try {
    await update(ref(db), updates);
    document.getElementById("nav-squadre")?.click();
  } catch (error) {
    console.error("Errore nell'assegnazione dei gironi:", error);
    segnalaErrore("Errore nel salvataggio dei gironi. Riprova.");
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

  // Torna all'elenco delle squadre
  const toolbar = document.createElement("div");
  toolbar.id = "team-info-toolbar";

  const backButton = document.createElement("button");
  backButton.classList.add("back-button");
  backButton.innerHTML = '<i class="icona icona-arrow-left" aria-hidden="true"></i> Squadre';
  backButton.addEventListener("click", () => document.getElementById("nav-squadre")?.click());
  toolbar.appendChild(backButton);
  teamInfoContainer.appendChild(toolbar);

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

  // Campo di input per rinominare la squadra
  const nameLabel = document.createElement("label");
  nameLabel.setAttribute("for", "team-name-edit-input");
  nameLabel.textContent = "Nome squadra:";

  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.setAttribute("spellcheck", "false");
  nameInput.id = "team-name-edit-input";
  nameInput.value = teamName.replace(/_/g, ".");

  membersEditContainer.appendChild(nameLabel);
  membersEditContainer.appendChild(nameInput);

  // Logo: anteprima + scelta di una nuova immagine (caricata al salvataggio)
  const logoLabel = document.createElement("label");
  logoLabel.textContent = "Logo:";
  membersEditContainer.appendChild(logoLabel);

  const logoEditDiv = document.createElement("div");
  logoEditDiv.id = "logo-edit";

  const logoPreview = document.createElement("img");
  logoPreview.src = teamData.Logo || "";
  logoPreview.alt = "";
  logoEditDiv.appendChild(logoPreview);

  const logoInput = document.createElement("input");
  logoInput.type = "file";
  logoInput.accept = TIPI_LOGO.join(",");
  logoInput.id = "logo-input";
  logoInput.hidden = true;

  const logoPicker = document.createElement("label");
  logoPicker.setAttribute("for", "logo-input");
  logoPicker.className = "custom-button";
  logoPicker.innerHTML = '<i class="icona icona-image" aria-hidden="true"></i> Cambia logo';

  let logoFile = null;
  logoInput.addEventListener("change", () => {
    const file = logoInput.files[0];
    if (!file) return;
    if (!TIPI_LOGO.includes(file.type)) {
      segnalaErrore("Il logo deve essere un'immagine PNG, JPG o WEBP.");
      logoInput.value = "";
      return;
    }
    if (file.size > LOGO_MAX_BYTE) {
      segnalaErrore("L'immagine è troppo pesante (massimo 10 MB).");
      logoInput.value = "";
      return;
    }
    logoFile = file;
    logoPreview.src = URL.createObjectURL(file);
  });

  logoEditDiv.appendChild(logoInput);
  logoEditDiv.appendChild(logoPicker);
  membersEditContainer.appendChild(logoEditDiv);

  // Campo di input per modificare gli allenatori
  const coachesLabel = document.createElement("label");
  coachesLabel.setAttribute("for", "coaches-input");
  coachesLabel.textContent = "Allenatori:";

  const coachesInput = document.createElement("textarea");
  coachesInput.setAttribute("spellcheck", "false");
  coachesInput.id = "coaches-input";
  coachesInput.value = Object.keys(teamData.Allenatori || {}).join(", ");

  membersEditContainer.appendChild(coachesLabel);
  membersEditContainer.appendChild(coachesInput);

  // Campo di input per modificare i giocatori
  const playersLabel = document.createElement("label");
  playersLabel.setAttribute("for", "players-input");
  playersLabel.textContent = "Giocatori:";

  const playersInput = document.createElement("textarea");
  playersInput.setAttribute("spellcheck", "false");
  playersInput.id = "players-input";
  playersInput.value = Object.keys(teamData.Giocatori || {}).join(", ");

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
  saveButton.addEventListener("click", async () => {
    saveButton.disabled = true;
    saveButton.textContent = logoFile ? "Caricamento logo..." : "Salvataggio...";
    await saveTeamChanges({
      teamName,
      teamData,
      newName: nameInput.value,
      logoFile,
      coaches: coachesInput.value
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean),
      players: playersInput.value
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean),
      group: groupInput.value,
      penalty: penaltyInput.value,
    });
    // Se il salvataggio è andato a buon fine la scheda è già stata ridisegnata
    saveButton.disabled = false;
    saveButton.textContent = "Salva Modifiche";
  });

  editContainer.appendChild(saveButton);

  teamInfoContainer.appendChild(editContainer);

  // Su smartphone il modulo compare sotto la scheda, fuori dallo schermo
  editContainer.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Funzione per salvare le modifiche della squadra su Firebase
async function saveTeamChanges({ teamName, teamData, newName, logoFile, coaches, players, group, penalty }) {
  const paths = getPaths(); // Ottenere i percorsi
  const teamPath = `${paths.teamsPath}/${teamName}`;

  const teamRef = ref(db, teamPath);

  const newTeamName = chiaveDaNome(newName);
  if (!newTeamName) {
    segnalaErrore("Il nome della squadra non può essere vuoto.");
    return;
  }
  if (CARATTERI_VIETATI.test(newTeamName)) {
    segnalaErrore("Il nome della squadra non può contenere i caratteri / # $ [ ] :");
    return;
  }

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

  try {
    if (logoFile) {
      Object.assign(updates, await caricaLogo(newTeamName, logoFile));
    }

    if (newTeamName !== teamName) {
      const rinominata = await rinominaSquadra(teamName, newTeamName, {
        ...teamData,
        ...updates,
      });
      if (!rinominata) return;
    } else {
      await update(teamRef, updates);
    }

    // Aggiorna l'interfaccia con i nuovi dati
    teamData.Allenatori = updates.Allenatori;
    teamData.Giocatori = updates.Giocatori;
    teamData.Girone = updates.Girone;
    teamData.Penalità = penalty;
    if (updates.Logo) {
      teamData.Logo = updates.Logo;
      teamData.LogoLR = updates.LogoLR;
    }

    showTeamInfo(newTeamName, teamData);
  } catch (error) {
    console.error("Errore nel salvataggio delle modifiche:", error);
    segnalaErrore("Errore nel salvataggio delle modifiche. Riprova.");
  }
}

/*
-----------------------------------
OTTIMIZZAZIONE LOGHI
-----------------------------------
I loghi caricati prima del 2026 pesano fino a 1 MB e non hanno la cache del
browser: a ogni visita venivano ricontrollati. Questo pannello li ricarica
nel formato attuale (600 px + versione leggera da 200 px, con cache lunga).
I file vecchi restano su Storage: si cambia solo l'indirizzo salvato.
*/

// I loghi caricati con caricaLogo() stanno in Loghi/{edizione}/{divisione}/
const LOGO_RECENTE = /\/o\/Loghi%2F(\d{4}|Test)%2F/;

function logoDaOttimizzare(datiSquadra) {
  return Boolean(datiSquadra.Logo) && !LOGO_RECENTE.test(datiSquadra.Logo);
}

function creaPannelloLoghi(teamsSnapshot) {
  const daOttimizzare = Object.entries(teamsSnapshot).filter(([, dati]) => logoDaOttimizzare(dati));
  if (daOttimizzare.length === 0) return null;

  const pannello = document.createElement("div");
  pannello.id = "loghi-panel";

  const titolo = document.createElement("h3");
  titolo.textContent = "Loghi";

  const testo = document.createElement("p");
  testo.className = "gironi-nota";
  testo.textContent =
    `${daOttimizzare.length} loghi sono nel formato vecchio (fino a 1 MB l'uno): ` +
    "ottimizzandoli il sito pubblico si carica molto più in fretta. L'aspetto non cambia.";

  const pulsante = document.createElement("button");
  pulsante.className = "custom-button";
  pulsante.textContent = `Ottimizza ${daOttimizzare.length} loghi`;

  pulsante.addEventListener("click", async () => {
    const procedi = await chiediConferma(
      `Verranno ricaricati ${daOttimizzare.length} loghi in versione leggera. Ci vuole circa un minuto: lascia aperta la pagina.`,
      { titolo: "Ottimizza i loghi", ok: "Ottimizza" }
    );
    if (!procedi) return;

    const { teamsPath } = getPaths();
    pulsante.disabled = true;
    const falliti = [];

    for (const [indice, [chiave, dati]] of daOttimizzare.entries()) {
      pulsante.textContent = `Ottimizzazione ${indice + 1} di ${daOttimizzare.length}...`;
      try {
        const risposta = await fetch(dati.Logo);
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        const nuovi = await caricaLogo(chiave, await risposta.blob());
        await update(ref(db, `${teamsPath}/${chiave}`), nuovi);
        Object.assign(teamsSnapshot[chiave], nuovi);
      } catch (errore) {
        console.error(`Logo di ${chiave} non ottimizzato:`, errore);
        falliti.push(chiave.replace(/_/g, "."));
      }
    }

    if (falliti.length === 0) {
      mostraToast("Loghi ottimizzati");
      pannello.remove();
    } else {
      segnalaErrore(`Non ottimizzati: ${falliti.join(", ")}. Riprova.`);
      pulsante.disabled = false;
      pulsante.textContent = "Riprova";
    }
  });

  pannello.append(titolo, testo, pulsante);
  return pannello;
}

// Carica il logo su Storage in due versioni: Logo (schede, grafiche social)
// e LogoLR, più leggera, per calendario, elenco squadre e pagina squadra.
// 200 px restano nitidi anche sugli schermi ad alta densità. Restituisce i due URL.
async function caricaLogo(teamKey, file) {
  const { teamsPath } = getPaths();
  // Calcio/{edizione}/{Divisione}/Squadre -> Loghi/{edizione}/{Divisione}/...
  const cartella = teamsPath.replace(/^Calcio\//, "Loghi/").replace(/\/Squadre$/, "");
  const percorso = `${cartella}/${teamKey}-${Date.now().toString(36)}`;

  const [logo, logoLR] = await Promise.all([
    ridimensionaImmagine(file, 600),
    ridimensionaImmagine(file, 200),
  ]);

  const [urlLogo, urlLogoLR] = await Promise.all([
    uploadFile(`${percorso}.png`, logo),
    uploadFile(`${percorso}-LR.png`, logoLR),
  ]);

  return { Logo: urlLogo, LogoLR: urlLogoLR };
}

// Riduce l'immagine (solo se più grande) e la converte in PNG,
// che mantiene lo sfondo trasparente dei loghi
async function ridimensionaImmagine(file, latoMassimo) {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, latoMassimo / Math.max(bitmap.width, bitmap.height));

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scala);
  canvas.height = Math.round(bitmap.height * scala);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();

  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Conversione del logo non riuscita"))),
      "image/png"
    )
  );
}

// Il nome della squadra è la chiave del nodo Squadre ed è ripetuto nelle
// chiavi "Casa:Ospite" di Calendario, Partite e Referti (e nei campi
// SquadraCasa/SquadraOspite): li sposta tutti in un unico update atomico.
async function rinominaSquadra(vecchiaChiave, nuovaChiave, datiSquadra) {
  const { teamsPath, matchesPath, calendarPath } = getPaths();
  const refertiPath = teamsPath.replace(/Squadre$/, "Referti");

  if (await getData(`${teamsPath}/${nuovaChiave}`)) {
    segnalaErrore(`Esiste già una squadra chiamata "${nuovaChiave.replace(/_/g, ".")}".`);
    return false;
  }

  const updates = {
    [`${teamsPath}/${vecchiaChiave}`]: null,
    [`${teamsPath}/${nuovaChiave}`]: datiSquadra,
  };

  const rinomina = (squadra) => (squadra === vecchiaChiave ? nuovaChiave : squadra);

  for (const percorso of [calendarPath, matchesPath, refertiPath]) {
    const giornate = (await getData(percorso)) || {};

    for (const [giornata, partite] of Object.entries(giornate)) {
      if (!partite || typeof partite !== "object") continue;

      for (const [chiavePartita, partita] of Object.entries(partite)) {
        const squadre = chiavePartita.split(":");
        if (squadre.length !== 2 || !squadre.includes(vecchiaChiave)) continue;

        const nuovaPartita = partita && typeof partita === "object" ? { ...partita } : partita;
        if (nuovaPartita?.SquadraCasa !== undefined) {
          nuovaPartita.SquadraCasa = rinomina(nuovaPartita.SquadraCasa);
        }
        if (nuovaPartita?.SquadraOspite !== undefined) {
          nuovaPartita.SquadraOspite = rinomina(nuovaPartita.SquadraOspite);
        }

        updates[`${percorso}/${giornata}/${chiavePartita}`] = null;
        updates[`${percorso}/${giornata}/${squadre.map(rinomina).join(":")}`] = nuovaPartita;
      }
    }
  }

  await update(ref(db), updates);

  return true;
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
    if (CARATTERI_VIETATI.test(teamName)) {
      segnalaErrore("Il nome della squadra non può contenere i caratteri / # $ [ ] :");
      return;
    }
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
      segnalaErrore("Inserisci un nome per la squadra!");
    }
  });
  newTeamDiv.appendChild(saveTeam);
}
