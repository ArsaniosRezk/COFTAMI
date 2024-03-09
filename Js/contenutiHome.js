// Codice JavaScript per recuperare dati da Firebase e calcolare la classifica
// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB016Bj67OcUqsvrtPD21Yq4w2Uv5Apn5I",
  authDomain: "cofta-mi.firebaseapp.com",
  databaseURL:
    "https://cofta-mi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cofta-mi",
  storageBucket: "cofta-mi.appspot.com",
  messagingSenderId: "99662203430",
  appId: "1:99662203430:web:3cd23e844459925954b4e7",
  measurementId: "G-QB8RJEV0RX",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

import {
  getDatabase,
  ref,
  get,
  set,
  child,
  update,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const db = getDatabase();

const divisioneSelect = document.getElementById("divisione");
const divisioneSelectSmartphone = document.getElementById(
  "divisione-smartphone"
);
let selectedDivisione = "Superiori";

// Funzioni che partono al caricamento della pagina
document.addEventListener("DOMContentLoaded", () => {
  sequenzaEsecuzione();
});

// Funzioni che partono quando cambio divisione
divisioneSelect.addEventListener("change", async () => {
  selectedDivisione = divisioneSelect.value;

  // Chiamata alla funzione per visualizzare le squadre
  sequenzaEsecuzione();
});

// Funzioni che partono quando cambio divisione
divisioneSelectSmartphone.addEventListener("change", async () => {
  selectedDivisione = divisioneSelectSmartphone.value;

  // Chiamata alla funzione per visualizzare le squadre
  sequenzaEsecuzione();
});

// Chiamata alla funzione principale con gestione della sequenza
async function sequenzaEsecuzione() {
  recuperaProssimaGiornata();

  visualizzaSquadreHome();
  calcolaClassificaGirone();
}

/*
===================================
CLASSIFICA GIRONI
===================================
*/

// Funzione per calcolare classifica di un girone
async function calcolaClassificaGirone() {
  const containerId = `classifica`;

  const squadreRef = ref(db, `Calcio/${selectedDivisione}/Squadre`);
  const partiteRef = ref(db, `Calcio/${selectedDivisione}/Partite`);

  try {
    const squadreSnapshot = await get(squadreRef);
    const partiteSnapshot = await get(partiteRef);

    if (squadreSnapshot.exists()) {
      const squadre = squadreSnapshot.val();
      const partite = partiteSnapshot.val();
      const punteggi = {};

      // Inizializza i punteggi per ogni squadra nel girone
      Object.keys(squadre).forEach((squadraKey) => {
        const squadra = squadre[squadraKey];
        punteggi[squadraKey] = {
          partiteGiocate: 0,
          partiteVinte: 0,
          partitePareggiate: 0,
          partitePerse: 0,
          golFatti: 0,
          golSubiti: 0,
          differenzaReti: 0,
          punti: 0,
          scontriDiretti: {},
        };
      });

      // Itera sulle partite e aggiorna i punteggi
      for (const partitaKey in partite) {
        const partita = partite[partitaKey];

        aggiornaPunteggi(
          punteggi,
          partita.SquadraCasa,
          partita.GolSquadraCasa,
          partita.GolSquadraOspite,
          partita.SquadraOspite
        );
        aggiornaPunteggi(
          punteggi,
          partita.SquadraOspite,
          partita.GolSquadraOspite,
          partita.GolSquadraCasa,
          partita.SquadraCasa
        );
      }

      // Converti l'oggetto punteggi in un array per ordinare le squadre
      const classificaArray = Object.entries(punteggi);

      // Ordina l'array in base al punteggio e ai criteri aggiuntivi
      classificaArray.sort((a, b) => {
        if (b[1].punti !== a[1].punti) {
          return b[1].punti - a[1].punti;
        } else {
          // Verifica scontri diretti
          const scontriDirettiA = punteggi[a[0]].scontriDiretti;
          const scontriDirettiB = punteggi[b[0]].scontriDiretti;

          if (scontriDirettiA && scontriDirettiB) {
            const scontroDirettoA = scontriDirettiA[b[0]];
            const scontroDirettoB = scontriDirettiB[a[0]];

            if (scontroDirettoA && scontroDirettoB) {
              if (scontroDirettoA.punti !== scontroDirettoB.punti) {
                return scontroDirettoB.punti - scontroDirettoA.punti;
              } else if (
                scontroDirettoA.differenzaReti !==
                scontroDirettoB.differenzaReti
              ) {
                return (
                  scontroDirettoB.differenzaReti -
                  scontroDirettoA.differenzaReti
                );
              }
            }
          }

          // Se non c'è scontro diretto o i criteri non sono sufficienti, continua con gli altri criteri
          return (
            b[1].differenzaReti - a[1].differenzaReti ||
            b[1].golFatti - a[1].golFatti ||
            a[1].golSubiti - b[1].golSubiti
          );
        }
      });

      // Rappresenta la classifica
      rappresentaClassificaGironi(containerId, classificaArray);
    } else {
      console.log(
        `Nessuna partita o squadra trovata per il girone  in Firebase`
      );
    }
  } catch (error) {
    console.error(
      `Errore nel recupero delle partite o squadre per il girone  da Firebase:`,
      error
    );
  }
}

// Funzione per aggiornare i punteggi di una squadra
function aggiornaPunteggi(punteggi, squadra, golFatti, golSubiti, avversario) {
  if (!punteggi[squadra]) {
    punteggi[squadra] = {
      partiteGiocate: 0,
      partiteVinte: 0,
      partitePareggiate: 0,
      partitePerse: 0,
      golFatti: 0,
      golSubiti: 0,
      differenzaReti: 0,
      punti: 0,
      scontriDiretti: {},
    };
  }

  punteggi[squadra].partiteGiocate++;
  punteggi[squadra].golFatti += golFatti;
  punteggi[squadra].golSubiti += golSubiti;
  punteggi[squadra].differenzaReti =
    punteggi[squadra].golFatti - punteggi[squadra].golSubiti;

  if (golFatti > golSubiti) {
    punteggi[squadra].partiteVinte++;
    punteggi[squadra].punti += 3;
  } else if (golFatti === golSubiti) {
    punteggi[squadra].partitePareggiate++;
    punteggi[squadra].punti += 1;
  } else {
    punteggi[squadra].partitePerse++;
  }

  // Aggiorna scontri diretti sempre
  if (!punteggi[squadra].scontriDiretti[avversario]) {
    punteggi[squadra].scontriDiretti[avversario] = {
      partiteGiocate: 0,
      golFatti: 0,
      golSubiti: 0,
      differenzaReti: 0,
      punti: 0,
    };
  }

  punteggi[squadra].scontriDiretti[avversario].partiteGiocate++;
  punteggi[squadra].scontriDiretti[avversario].golFatti += golFatti;
  punteggi[squadra].scontriDiretti[avversario].golSubiti += golSubiti;
  punteggi[squadra].scontriDiretti[avversario].differenzaReti =
    punteggi[squadra].scontriDiretti[avversario].golFatti -
    punteggi[squadra].scontriDiretti[avversario].golSubiti;

  if (golFatti > golSubiti) {
    punteggi[squadra].scontriDiretti[avversario].punti += 3;
  } else if (golFatti === golSubiti) {
    punteggi[squadra].scontriDiretti[avversario].punti += 1;
  }
}

// Funzione per rappresentare la classifica gironi
function rappresentaClassificaGironi(containerId, classificaArray) {
  const classificaDiv = document.getElementById(containerId);
  classificaDiv.innerHTML = "";
  const table = document.createElement("table");
  table.classList.add("custom-table");

  const thead = document.createElement("thead");

  const tbody = document.createElement("tbody");

  // Intestazione della tabella
  const theadRow = document.createElement("tr");

  const colonne = ["#", "Squadra", "PG", "V", "N", "S", "GF", "GS", "DR", "P"];

  colonne.forEach((colonna, index) => {
    const th = document.createElement("th");
    th.textContent = colonna;

    theadRow.appendChild(th);
  });

  thead.appendChild(theadRow);
  table.appendChild(thead);

  // Righe della tabella
  classificaArray.forEach(([squadra, dati], index) => {
    const tr = document.createElement("tr");

    // Modifica il nome della squadra sostituendo "-" con "."
    const squadraPuntata = squadra.replace(/-/g, ".");

    const colonneDati = [
      index + 1,
      squadraPuntata,
      dati.partiteGiocate,
      dati.partiteVinte,
      dati.partitePareggiate,
      dati.partitePerse,
      dati.golFatti,
      dati.golSubiti,
      dati.differenzaReti,
      dati.punti,
    ];

    colonneDati.forEach((dato, columnIndex) => {
      const td = document.createElement("td");
      td.textContent = dato;

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  classificaDiv.appendChild(table);
}

/*
===================================
SQUADRE
===================================
*/

// Funzione per ottenere e visualizzare le squadre da Firebase
async function visualizzaSquadreHome() {
  const containerSquadre = document.getElementById("container-squadre");

  // Svuota div container squadre
  containerSquadre.innerHTML = "";

  const squadreRef = ref(db, `Calcio/${selectedDivisione}/Squadre`);
  const squadreSnapshot = await get(squadreRef);

  if (squadreSnapshot.exists()) {
    squadreSnapshot.forEach((squadra) => {
      const squadraData = squadra.val();
      const nomeSquadra = squadra.key;
      const nomeSquadraPuntato = nomeSquadra.replace(/-/g, ".");
      const logoSquadra = squadraData.Logo;

      // Creazione del div per la squadra
      const squadraDiv = document.createElement("div");
      squadraDiv.className = "squadra";

      // Creazione dell'elemento immagine
      const immagineElemento = document.createElement("img");
      immagineElemento.src = logoSquadra;

      // Creazione dell'elemento div per il nome della squadra
      const nomeTeamDiv = document.createElement("div");
      nomeTeamDiv.className = "nome-team";

      // Creazione dell'elemento span
      const spanElemento = document.createElement("span");
      spanElemento.textContent = nomeSquadraPuntato;

      // Aggiunta degli elementi al DOM
      nomeTeamDiv.appendChild(spanElemento);
      squadraDiv.appendChild(immagineElemento);
      squadraDiv.appendChild(nomeTeamDiv);
      containerSquadre.appendChild(squadraDiv);
    });
  } else {
    console.log("Nessuna squadra trovata nel database.");
  }
}

/*
===================================
FASE FINALE
===================================
*/

/*
===================================
RISULTATI
===================================
*/

/*
===================================
PROSSIMA GIORNATA
===================================
*/

async function recuperaProssimaGiornata() {
  const calendarioRef = ref(db, `Calcio/${selectedDivisione}/Calendario`);
  const squadreRef = ref(db, `Calcio/${selectedDivisione}/Squadre`);
  const prossimaGiornataDiv = document.getElementById("prossima-giornata");

  const [calendarioSnapshot, squadreSnapshot] = await Promise.all([
    get(calendarioRef),
    get(squadreRef),
  ]);

  // Dichiarazione di prossimaData all'inizio della funzione
  let prossimaData;

  // Verifica che il nodo Calendario contenga dati
  if (calendarioSnapshot.exists()) {
    // Trova la chiave (data) più vicina alla data attuale
    const today = new Date();
    const dateKeys = Object.keys(calendarioSnapshot.val());

    // Ordina le date e le stampa sulla console
    const dateKeysSorted = dateKeys.sort((a, b) => {
      const [dayA, monthA, yearA] = a.split("-").map(Number);
      const [dayB, monthB, yearB] = b.split("-").map(Number);

      return (
        new Date(yearA, monthA - 1, dayA) - new Date(yearB, monthB - 1, dayB)
      );
    });

    prossimaData = dateKeysSorted.find((data) => new Date(data) > today);

    if (prossimaData) {
      const prossimaGiornataDiv = document.getElementById("prossima-giornata");

      // Rimuove eventuali contenuti precedenti nel div
      prossimaGiornataDiv.innerHTML = "";

      const giornataDiv = document.createElement("div");
      giornataDiv.classList.add("giornata");

      const dataElement = document.createElement("p");
      dataElement.classList.add("data-giornata");
      dataElement.textContent = prossimaData;

      giornataDiv.appendChild(dataElement);

      const partiteDiv = document.createElement("div");
      partiteDiv.classList.add("partite");

      // Recupera le partite della giornata più vicina
      const partiteSnapshot = calendarioSnapshot.child(prossimaData);
      partiteSnapshot.forEach((partitaSnapshot) => {
        const partitaString = partitaSnapshot.key;

        const [squadraCasa, squadraOspite] = partitaString.split(":");
        const squadraCasaPuntato = squadraCasa.replace(/-/g, ".");
        const squadraOspitePuntato = squadraOspite.replace(/-/g, ".");

        const partitaDiv = document.createElement("div");
        partitaDiv.classList.add("partita");

        // ... (resto del codice per creare le squadre e visualizzare la partita)

        const squadraCasaDiv = document.createElement("div");
        squadraCasaDiv.classList.add("squadraCasa");

        // Recupera il logo della squadra casa dal nodo Squadre
        const logoCasaContainer = document.createElement("div");
        logoCasaContainer.classList.add("container-logo");
        const logoCasaElement = document.createElement("img");
        const logoCasaUrl = squadreSnapshot
          .child(squadraCasa)
          .child("Logo")
          .val();
        logoCasaElement.src = logoCasaUrl;

        const squadraCasaElement = document.createElement("p");
        squadraCasaElement.textContent = squadraCasaPuntato;
        squadraCasaElement.classList.add("nome-squadra");

        logoCasaContainer.appendChild(logoCasaElement);
        squadraCasaDiv.appendChild(logoCasaContainer);
        squadraCasaDiv.appendChild(squadraCasaElement);

        const risultatoDiv = document.createElement("div");
        risultatoDiv.classList.add("risultato");

        // Controlla se il value è vuoto o contiene qualcosa
        const risultatoValue = partitaSnapshot.val();
        risultatoDiv.textContent = risultatoValue ? risultatoValue : "VS";

        const squadraOspiteDiv = document.createElement("div");
        squadraOspiteDiv.classList.add("squadraOspite");

        // Recupera il logo della squadra ospite dal nodo Squadre
        const logoOspiteContainer = document.createElement("div");
        logoOspiteContainer.classList.add("container-logo");
        const logoOspiteElement = document.createElement("img");
        const logoOspiteUrl = squadreSnapshot
          .child(squadraOspite)
          .child("Logo")
          .val();
        logoOspiteElement.src = logoOspiteUrl;

        const squadraOspiteElement = document.createElement("p");
        squadraOspiteElement.textContent = squadraOspitePuntato;
        squadraOspiteElement.classList.add("nome-squadra");

        logoOspiteContainer.appendChild(logoOspiteElement);
        squadraOspiteDiv.appendChild(squadraOspiteElement);
        squadraOspiteDiv.appendChild(logoOspiteContainer);

        partitaDiv.appendChild(squadraCasaDiv);
        partitaDiv.appendChild(risultatoDiv);
        partitaDiv.appendChild(squadraOspiteDiv);

        partiteDiv.appendChild(partitaDiv);
      });

      giornataDiv.appendChild(partiteDiv);
      prossimaGiornataDiv.appendChild(giornataDiv);
    } else {
      console.log("Non ci sono giornate future nel calendario.");
      prossimaGiornataDiv.innerHTML = `<p>Attualmente non sono previste partite per la divisione ${selectedDivisione}</p>`;
    }
  } else {
    console.log("Il nodo Calendario non contiene dati");
  }
}
