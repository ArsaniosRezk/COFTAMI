import { db, ref, remove, getData, setData, updateData } from "../firebase.js";
import { edition } from "../divisionAndVariables.js";
import { formatDateTime } from "../utils/formatters.js";

/*
===================================
ISCRIZIONI (gestionale)
===================================
Legge da:    Calcio/{edizione}/Iscrizioni
Converte in: Calcio/{edizione}/{Divisione}/Squadre
*/

const DIVISIONI = ["Superiori", "Giovani"];

const LOGO_DEFAULT =
  "https://firebasestorage.googleapis.com/v0/b/cofta-mi.appspot.com/o/Loghi%2FTavola%20disegno%201.png?alt=media&token=fd010a97-1ff0-4d54-9830-856d3f93da74";

const iscrizioniPath = () => `Calcio/${edition}/Iscrizioni`;

// Stato della vista (filtri)
let filtroDivisione = "Tutte";
let filtroTesto = "";
let iscrizioniCache = [];

/*
-----------------------------------
HELPER
-----------------------------------
*/

// Firebase restituisce gli array come array, ma un array vuoto non viene salvato
function comeLista(valore) {
  if (!valore) return [];
  return Array.isArray(valore) ? valore.filter(Boolean) : Object.values(valore);
}

// Le squadre usano "_" al posto dei punti (vedi teams.js)
function chiaveSquadra(nomeSquadra) {
  return nomeSquadra.trim().replace(/\./g, "_");
}

function mappaNomi(persone) {
  return persone.reduce((acc, persona) => {
    acc[persona.Nome] = true;
    return acc;
  }, {});
}

function conteggioPersone(iscrizione) {
  return {
    responsabili: comeLista(iscrizione.Responsabili).length,
    allenatori: comeLista(iscrizione.Allenatori).length,
    giocatori: comeLista(iscrizione.Giocatori).length,
    arbitri: comeLista(iscrizione.Arbitri).length,
  };
}

/*
-----------------------------------
CARICAMENTO
-----------------------------------
*/

async function caricaIscrizioni() {
  const snapshot = await getData(iscrizioniPath());
  if (!snapshot) return [];

  return Object.entries(snapshot)
    .map(([chiave, dati]) => ({ chiave, ...dati }))
    .sort((a, b) => {
      // Prima per divisione (Superiori, Giovani), poi per nome squadra
      const ordineDivisione =
        DIVISIONI.indexOf(a.Divisione) - DIVISIONI.indexOf(b.Divisione);
      if (ordineDivisione !== 0) return ordineDivisione;
      return (a.NomeSquadra || "").localeCompare(b.NomeSquadra || "", "it");
    });
}

function iscrizioniFiltrate() {
  const testo = filtroTesto.trim().toLowerCase();

  return iscrizioniCache.filter((iscrizione) => {
    if (filtroDivisione !== "Tutte" && iscrizione.Divisione !== filtroDivisione) {
      return false;
    }
    if (!testo) return true;

    const nomiPersone = [
      ...comeLista(iscrizione.Responsabili),
      ...comeLista(iscrizione.Allenatori),
      ...comeLista(iscrizione.Giocatori),
      ...comeLista(iscrizione.Arbitri),
    ]
      .map((persona) => persona.Nome)
      .join(" ");

    return `${iscrizione.NomeSquadra} ${nomiPersone}`
      .toLowerCase()
      .includes(testo);
  });
}

/*
-----------------------------------
RENDER
-----------------------------------
*/

export async function showIscrizioni() {
  const contenitore = document.getElementById("iscrizioni-content");
  contenitore.innerHTML = '<p class="iscrizioni-vuoto">Caricamento...</p>';

  try {
    iscrizioniCache = await caricaIscrizioni();
  } catch (error) {
    console.error("Errore nel caricamento delle iscrizioni:", error);
    contenitore.innerHTML =
      '<p class="iscrizioni-vuoto">Errore nel caricamento delle iscrizioni.</p>';
    return;
  }

  disegnaVista();
}

function disegnaVista() {
  const contenitore = document.getElementById("iscrizioni-content");
  contenitore.innerHTML = "";

  contenitore.appendChild(creaBarraStrumenti());

  const elenco = document.createElement("div");
  elenco.id = "iscrizioni-elenco";
  contenitore.appendChild(elenco);

  disegnaElenco();
}

// Ridisegna solo l'elenco: la barra degli strumenti resta intatta
// (altrimenti la ricerca perderebbe il focus a ogni carattere)
function disegnaElenco() {
  const elenco = document.getElementById("iscrizioni-elenco");
  elenco.innerHTML = "";

  const visibili = iscrizioniFiltrate();

  if (visibili.length === 0) {
    elenco.innerHTML =
      '<p class="iscrizioni-vuoto">Nessuna iscrizione da mostrare.</p>';
    return;
  }

  DIVISIONI.forEach((divisione) => {
    const gruppo = visibili.filter((i) => i.Divisione === divisione);
    if (gruppo.length === 0) return;

    const titolo = document.createElement("h3");
    titolo.className = "iscrizioni-gruppo-titolo";
    titolo.textContent = `${divisione} (${gruppo.length})`;
    elenco.appendChild(titolo);

    gruppo.forEach((iscrizione) => elenco.appendChild(creaCard(iscrizione)));
  });

  // Iscrizioni con una divisione non riconosciuta (non dovrebbe accadere)
  const orfane = visibili.filter((i) => !DIVISIONI.includes(i.Divisione));
  if (orfane.length > 0) {
    const titolo = document.createElement("h3");
    titolo.className = "iscrizioni-gruppo-titolo";
    titolo.textContent = `Altre (${orfane.length})`;
    elenco.appendChild(titolo);
    orfane.forEach((iscrizione) => elenco.appendChild(creaCard(iscrizione)));
  }
}

function creaBarraStrumenti() {
  const barra = document.createElement("div");
  barra.id = "iscrizioni-toolbar";

  const totali = iscrizioniCache.length;
  const daConvertire = iscrizioniCache.filter(
    (i) => i.Stato !== "Convertita"
  ).length;

  const riepilogo = document.createElement("div");
  riepilogo.className = "iscrizioni-riepilogo";
  riepilogo.innerHTML =
    `<span><b>${totali}</b> iscrizioni</span>` +
    `<span><b>${daConvertire}</b> da convertire</span>` +
    `<span>Edizione <b>${edition}</b></span>`;
  barra.appendChild(riepilogo);

  const controlli = document.createElement("div");
  controlli.className = "iscrizioni-controlli";

  const selectDivisione = document.createElement("select");
  selectDivisione.className = "iscrizioni-select";
  ["Tutte", ...DIVISIONI].forEach((valore) => {
    const opzione = document.createElement("option");
    opzione.value = valore;
    opzione.textContent = valore;
    selectDivisione.appendChild(opzione);
  });
  selectDivisione.value = filtroDivisione;
  selectDivisione.addEventListener("change", () => {
    filtroDivisione = selectDivisione.value;
    disegnaElenco();
  });
  controlli.appendChild(selectDivisione);

  const ricerca = document.createElement("input");
  ricerca.type = "search";
  ricerca.className = "iscrizioni-ricerca";
  ricerca.placeholder = "Cerca squadra o persona...";
  ricerca.value = filtroTesto;
  ricerca.addEventListener("input", () => {
    filtroTesto = ricerca.value;
    disegnaElenco();
  });
  controlli.appendChild(ricerca);

  const esporta = document.createElement("button");
  esporta.className = "custom-button iscrizioni-azione";
  esporta.innerHTML = '<i class="fa-solid fa-file-csv"></i> Esporta CSV';
  esporta.addEventListener("click", esportaCsv);
  controlli.appendChild(esporta);

  const convertiTutte = document.createElement("button");
  convertiTutte.className = "custom-button iscrizioni-azione";
  convertiTutte.innerHTML =
    '<i class="fa-solid fa-people-group"></i> Converti tutte';
  convertiTutte.addEventListener("click", convertiTutteLeIscrizioni);
  controlli.appendChild(convertiTutte);

  const aggiorna = document.createElement("button");
  aggiorna.className = "custom-button iscrizioni-azione";
  aggiorna.innerHTML = '<i class="fa-solid fa-rotate"></i>';
  aggiorna.title = "Ricarica";
  aggiorna.addEventListener("click", showIscrizioni);
  controlli.appendChild(aggiorna);

  barra.appendChild(controlli);
  return barra;
}

function creaCard(iscrizione) {
  const conteggi = conteggioPersone(iscrizione);
  const convertita = iscrizione.Stato === "Convertita";

  const card = document.createElement("div");
  card.className = "iscrizione-card";

  // ---- INTESTAZIONE ----
  const intestazione = document.createElement("div");
  intestazione.className = "iscrizione-header";

  const titolo = document.createElement("div");
  titolo.className = "iscrizione-titolo";
  // I nomi arrivano da un modulo pubblico: sempre via textContent, mai innerHTML
  titolo.innerHTML = '<i class="fa-solid fa-chevron-right freccia"></i>';

  const nomeSquadraEl = document.createElement("span");
  nomeSquadraEl.className = "nome-squadra";
  nomeSquadraEl.textContent = iscrizione.NomeSquadra || iscrizione.chiave;
  titolo.appendChild(nomeSquadraEl);

  const badgeDivisione = document.createElement("span");
  badgeDivisione.className = "badge badge-divisione";
  badgeDivisione.textContent = iscrizione.Divisione || "?";
  titolo.appendChild(badgeDivisione);

  const badgeStato = document.createElement("span");
  badgeStato.className = convertita
    ? "badge badge-convertita"
    : "badge badge-nuova";
  badgeStato.textContent = convertita ? "Convertita" : "Da convertire";
  titolo.appendChild(badgeStato);

  const meta = document.createElement("div");
  meta.className = "iscrizione-meta";
  meta.innerHTML =
    `<span title="Responsabili"><i class="fa-solid fa-user-tie"></i> ${conteggi.responsabili} resp.</span>` +
    `<span title="Allenatori"><i class="fa-solid fa-clipboard-user"></i> ${conteggi.allenatori} all.</span>` +
    `<span title="Giocatori"><i class="fa-solid fa-futbol"></i> ${conteggi.giocatori} giocatori</span>` +
    `<span title="Arbitri"><i class="fa-solid fa-flag"></i> ${conteggi.arbitri} arbitri</span>` +
    `<span class="data-invio">${iscrizione.OraInvio ? formatDateTime(iscrizione.OraInvio) : ""}</span>`;

  intestazione.appendChild(titolo);
  intestazione.appendChild(meta);
  card.appendChild(intestazione);

  // ---- DETTAGLIO ----
  const dettaglio = document.createElement("div");
  dettaglio.className = "iscrizione-dettaglio hidden";

  dettaglio.appendChild(
    creaTabellaPersone("Responsabili", comeLista(iscrizione.Responsabili))
  );
  dettaglio.appendChild(
    creaTabellaPersone("Allenatori", comeLista(iscrizione.Allenatori))
  );
  dettaglio.appendChild(
    creaTabellaPersone("Giocatori", comeLista(iscrizione.Giocatori))
  );
  dettaglio.appendChild(
    creaTabellaPersone("Arbitri", comeLista(iscrizione.Arbitri))
  );

  const azioni = document.createElement("div");
  azioni.className = "iscrizione-azioni";

  const converti = document.createElement("button");
  converti.className = "custom-button";
  converti.innerHTML = convertita
    ? '<i class="fa-solid fa-rotate"></i> Riconverti in squadra'
    : '<i class="fa-solid fa-shield-halved"></i> Converti in squadra';
  converti.addEventListener("click", () => convertiSingola(iscrizione));
  azioni.appendChild(converti);

  if (convertita && iscrizione.ConvertitaIl) {
    const info = document.createElement("span");
    info.className = "iscrizione-info-conversione";
    info.textContent = `Convertita il ${formatDateTime(iscrizione.ConvertitaIl)}`;
    azioni.appendChild(info);
  }

  const elimina = document.createElement("button");
  elimina.className = "custom-button button-elimina";
  elimina.innerHTML = '<i class="fa-solid fa-trash"></i> Elimina';
  elimina.addEventListener("click", () => eliminaIscrizione(iscrizione));
  azioni.appendChild(elimina);

  dettaglio.appendChild(azioni);
  card.appendChild(dettaglio);

  intestazione.addEventListener("click", () => {
    dettaglio.classList.toggle("hidden");
    card.classList.toggle("aperta");
  });

  return card;
}

function creaTabellaPersone(titolo, persone) {
  const sezione = document.createElement("div");
  sezione.className = "dettaglio-sezione";

  const intestazione = document.createElement("h4");
  intestazione.textContent = `${titolo} (${persone.length})`;
  sezione.appendChild(intestazione);

  if (persone.length === 0) {
    const vuoto = document.createElement("p");
    vuoto.className = "dettaglio-vuoto";
    vuoto.textContent =
      titolo === "Arbitri" ? "Nessun arbitro indicato." : "Nessuno indicato.";
    sezione.appendChild(vuoto);
    return sezione;
  }

  const lista = document.createElement("ol");
  lista.className = "dettaglio-lista";

  persone.forEach((persona) => {
    const voce = document.createElement("li");

    const nome = document.createElement("span");
    nome.className = "persona-nome";
    nome.textContent = persona.Nome || "";

    const telefono = document.createElement("a");
    telefono.className = "persona-tel";
    telefono.href = `tel:${persona.Telefono || ""}`;
    telefono.textContent = persona.Telefono || "-";

    voce.appendChild(nome);
    voce.appendChild(telefono);
    lista.appendChild(voce);
  });

  sezione.appendChild(lista);
  return sezione;
}

/*
-----------------------------------
CONVERSIONE IN SQUADRA
-----------------------------------
*/

// Scrive la squadra nel nodo Squadre della divisione.
// Se la squadra esiste già aggiorna solo i membri, mantenendo girone, logo e penalità.
async function scriviSquadra(iscrizione, sovrascriviEsistente) {
  const percorsoSquadra = `Calcio/${edition}/${iscrizione.Divisione}/Squadre/${chiaveSquadra(iscrizione.NomeSquadra)}`;
  const esistente = await getData(percorsoSquadra);

  if (esistente && !sovrascriviEsistente) {
    return { esito: "esistente", percorsoSquadra };
  }

  const membri = {
    Responsabili: mappaNomi(comeLista(iscrizione.Responsabili)),
    Allenatori: mappaNomi(comeLista(iscrizione.Allenatori)),
    Giocatori: mappaNomi(comeLista(iscrizione.Giocatori)),
  };

  if (esistente) {
    // Aggiorna i membri senza toccare Girone/Logo/Penalità già impostati
    await updateData(percorsoSquadra, membri);
  } else {
    await setData(percorsoSquadra, {
      ...membri,
      Girone: "",
      Logo: LOGO_DEFAULT,
      LogoLR: "",
      Penalità: 0,
    });
  }

  await updateData(`${iscrizioniPath()}/${iscrizione.chiave}`, {
    Stato: "Convertita",
    ConvertitaIl: new Date().toISOString(),
  });

  return { esito: esistente ? "aggiornata" : "creata", percorsoSquadra };
}

async function convertiSingola(iscrizione) {
  if (!DIVISIONI.includes(iscrizione.Divisione)) {
    alert("Divisione non valida: impossibile convertire questa iscrizione.");
    return;
  }

  const nomeSquadra = chiaveSquadra(iscrizione.NomeSquadra).replace(/_/g, ".");

  try {
    let risultato = await scriviSquadra(iscrizione, false);

    if (risultato.esito === "esistente") {
      const conferma = confirm(
        `La squadra "${nomeSquadra}" esiste già in ${iscrizione.Divisione}.\n\n` +
          "Vuoi aggiornare responsabili, allenatori e giocatori con i dati dell'iscrizione?\n" +
          "(girone, logo e penalità restano invariati)"
      );
      if (!conferma) return;
      risultato = await scriviSquadra(iscrizione, true);
    }

    alert(
      risultato.esito === "creata"
        ? `Squadra "${nomeSquadra}" creata in ${iscrizione.Divisione}.`
        : `Squadra "${nomeSquadra}" aggiornata in ${iscrizione.Divisione}.`
    );
    showIscrizioni();
  } catch (error) {
    console.error("Errore nella conversione dell'iscrizione:", error);
    alert("Errore nella conversione. Riprova.");
  }
}

async function convertiTutteLeIscrizioni() {
  const daConvertire = iscrizioniFiltrate().filter(
    (iscrizione) =>
      iscrizione.Stato !== "Convertita" && DIVISIONI.includes(iscrizione.Divisione)
  );

  if (daConvertire.length === 0) {
    alert("Non ci sono iscrizioni da convertire con i filtri attuali.");
    return;
  }

  const conferma = confirm(
    `Stai per creare ${daConvertire.length} squadre a partire dalle iscrizioni non ancora convertite.\n\n` +
      "Le squadre che esistono già verranno saltate (potrai convertirle una per una)."
  );
  if (!conferma) return;

  const create = [];
  const saltate = [];
  const errori = [];

  for (const iscrizione of daConvertire) {
    try {
      const risultato = await scriviSquadra(iscrizione, false);
      if (risultato.esito === "esistente") {
        saltate.push(iscrizione.NomeSquadra);
      } else {
        create.push(iscrizione.NomeSquadra);
      }
    } catch (error) {
      console.error(`Errore convertendo ${iscrizione.NomeSquadra}:`, error);
      errori.push(iscrizione.NomeSquadra);
    }
  }

  let messaggio = `Squadre create: ${create.length}`;
  if (saltate.length > 0) {
    messaggio += `\nGià esistenti (saltate): ${saltate.join(", ")}`;
  }
  if (errori.length > 0) {
    messaggio += `\nErrori: ${errori.join(", ")}`;
  }
  alert(messaggio);

  showIscrizioni();
}

/*
-----------------------------------
ELIMINAZIONE
-----------------------------------
*/

async function eliminaIscrizione(iscrizione) {
  const conferma = confirm(
    `Vuoi eliminare definitivamente l'iscrizione di "${iscrizione.NomeSquadra}" (${iscrizione.Divisione})?\n\n` +
      "L'eventuale squadra già creata nel torneo NON verrà eliminata."
  );
  if (!conferma) return;

  try {
    await remove(ref(db, `${iscrizioniPath()}/${iscrizione.chiave}`));
    showIscrizioni();
  } catch (error) {
    console.error("Errore nell'eliminazione dell'iscrizione:", error);
    alert("Errore nell'eliminazione. Riprova.");
  }
}

/*
-----------------------------------
ESPORTAZIONE CSV
-----------------------------------
*/

function esportaCsv() {
  const visibili = iscrizioniFiltrate();

  if (visibili.length === 0) {
    alert("Nessuna iscrizione da esportare.");
    return;
  }

  const righe = [
    [
      "Divisione",
      "Squadra",
      "Ruolo",
      "Nome",
      "Telefono",
      "Data iscrizione",
      "Stato",
    ],
  ];

  const ruoli = [
    ["Responsabile", "Responsabili"],
    ["Allenatore", "Allenatori"],
    ["Giocatore", "Giocatori"],
    ["Arbitro", "Arbitri"],
  ];

  visibili.forEach((iscrizione) => {
    const dataInvio = iscrizione.OraInvio
      ? formatDateTime(iscrizione.OraInvio)
      : "";

    ruoli.forEach(([etichetta, campo]) => {
      comeLista(iscrizione[campo]).forEach((persona) => {
        righe.push([
          iscrizione.Divisione || "",
          iscrizione.NomeSquadra || "",
          etichetta,
          persona.Nome || "",
          persona.Telefono || "",
          dataInvio,
          iscrizione.Stato || "Nuova",
        ]);
      });
    });
  });

  // ";" come separatore e BOM per l'apertura diretta in Excel italiano
  const csv = righe
    .map((riga) =>
      riga.map((cella) => `"${String(cella).replace(/"/g, '""')}"`).join(";")
    )
    .join("\r\n");

  const blob = new Blob([`﻿${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `iscrizioni-cofta-${edition}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
