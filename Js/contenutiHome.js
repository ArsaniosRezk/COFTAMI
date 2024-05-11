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

  // visualizzaSquadreHome();
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
          penalita: squadra.penalita || 0, // Recupera i punti di penalità, se presenti
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

      // Ordina l'array in base al punteggio e ai criteri aggiuntivi, considerando anche i punti di penalità
      classificaArray.sort((a, b) => {
        // Calcola il totale dei punti aggiungendo i punti guadagnati e sottraendo i punti di penalità
        const puntiTotaliA = a[1].punti - (a[1].penalita || 0);
        const puntiTotaliB = b[1].punti - (b[1].penalita || 0);

        // Effettua il confronto basato sui punti totali
        if (puntiTotaliB !== puntiTotaliA) {
          return puntiTotaliB - puntiTotaliA;
        } else {
          // Continua con gli altri criteri in caso di parità nei punti totali

          // Verifica scontri diretti
          const scontriDirettiA = a[1].scontriDiretti;
          const scontriDirettiB = b[1].scontriDiretti;

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

          // Se non ci sono scontri diretti o i criteri non sono sufficienti, continua con gli altri criteri
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

    // Aggiungi un asterisco accanto al nome della squadra se ha subito penalità
    const nomeSquadra = dati.penalita > 0 ? squadra + "*" : squadra;

    // Modifica il nome della squadra sostituendo "-" con "."
    const squadraPuntata = nomeSquadra.replace(/_/g, ".");

    // Sottrai i punti di penalità, se presenti
    const puntiSenzaPenalita = dati.punti - (dati.penalita || 0);

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
      puntiSenzaPenalita, // Utilizzare puntiSenzaPenalita invece di dati.punti
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

  // Dopo la rappresentazione della tabella della classifica
  if (classificaArray.some(([_, dati]) => dati.penalita > 0)) {
    const penalitaDiv = document.createElement("div");
    penalitaDiv.classList.add("penalita-message");

    const penalitaMessage = classificaArray
      .filter(([_, dati]) => dati.penalita > 0)
      .map(
        ([squadra, dati]) =>
          `<strong>${squadra.replace(/_/g, ".")}</strong>: -${
            dati.penalita
          } punti di penalità`
      )
      .join("<br>");

    penalitaDiv.innerHTML = penalitaMessage;

    classificaDiv.appendChild(penalitaDiv);
  }
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
      const nomeSquadraPuntato = nomeSquadra.replace(/_/g, ".");
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
  // Ottenere il riferimento alla giornata da mostrare
  const giornataDaMostrareRef = ref(
    db,
    `Calcio/${selectedDivisione}/GiornataDaMostrare`
  );

  // Ottenere lo snapshot della giornata da mostrare
  const giornataSnapshot = await get(giornataDaMostrareRef);

  // Verificare se la giornata da mostrare esiste
  if (giornataSnapshot.exists()) {
    const giornataDaMostrare = giornataSnapshot.val();

    // Ottenere il riferimento al calendario della divisione
    const calendarioRef = ref(
      db,
      `Calcio/${selectedDivisione}/Calendario/${giornataDaMostrare}`
    );

    // Ottenere lo snapshot del calendario per la giornata da mostrare
    const calendarioSnapshot = await get(calendarioRef);

    // Ottenere il riferimento alle squadre della divisione
    const squadreRef = ref(db, `Calcio/${selectedDivisione}/Squadre`);

    // Ottenere lo snapshot delle squadre della divisione
    const squadreSnapshot = await get(squadreRef);

    // Se lo snapshot del calendario per la giornata da mostrare esiste
    if (calendarioSnapshot.exists()) {
      // Pulire il contenuto del div "prossima-giornata" prima di aggiungere le partite
      const prossimaGiornataDiv = document.getElementById("prossima-giornata");
      prossimaGiornataDiv.innerHTML = "";

      // Creare un div per la giornata
      const giornataDiv = document.createElement("div");
      giornataDiv.classList.add("giornata");

      // Creare un elemento per la data della giornata
      const dataElement = document.createElement("p");
      dataElement.classList.add("numero-giornata");
      dataElement.textContent = giornataDaMostrare;
      giornataDiv.appendChild(dataElement);

      // Creare un div per le partite della giornata
      const partiteDiv = document.createElement("div");
      partiteDiv.classList.add("partite");

      // Array per memorizzare le partite per l'ordinamento
      const partiteArray = [];

      // Per ogni partita nella giornata, creare gli elementi corrispondenti nel DOM
      calendarioSnapshot.forEach((partitaSnapshot) => {
        // Codice per creare gli elementi della partita (come fatto nella funzione recuperaCalendario)
        const partitaString = partitaSnapshot.key;

        const [squadraCasa, squadraOspite] = partitaString.split(":");
        const squadraCasaPuntato = squadraCasa.replace(/_/g, ".");
        const squadraOspitePuntato = squadraOspite.replace(/_/g, ".");

        // container della partita
        const partitaDiv = document.createElement("div");
        partitaDiv.classList.add("partita-div");

        // container delle squadre che si affrontano
        const partita = document.createElement("div");
        partita.classList.add("partita");

        // SQUADRA CASA
        const squadraCasaDiv = document.createElement("div");
        squadraCasaDiv.classList.add("squadraCasa");

        // Recupera il logo della squadra casa dal nodo Squadre
        const logoCasaContainer = document.createElement("div");
        logoCasaContainer.classList.add("container-logo");
        const logoCasaElement = document.createElement("img");
        const logoCasaUrl = squadreSnapshot
          .child(squadraCasa)
          .child("LogoLR")
          .val();
        logoCasaElement.src = logoCasaUrl;

        const nomeSquadraCasaContainer = document.createElement("div");
        nomeSquadraCasaContainer.classList.add("container-nome-squadra");
        const squadraCasaElement = document.createElement("p");
        squadraCasaElement.textContent = squadraCasaPuntato;
        squadraCasaElement.classList.add("nome-squadra");

        logoCasaContainer.appendChild(logoCasaElement);
        nomeSquadraCasaContainer.appendChild(squadraCasaElement);
        squadraCasaDiv.appendChild(logoCasaContainer);
        squadraCasaDiv.appendChild(nomeSquadraCasaContainer);

        // RISULTATO
        const risultatoDiv = document.createElement("div");
        risultatoDiv.classList.add("risultato");

        // Controlla se il risultato è presente e non è vuoto
        const risultatoValue = partitaSnapshot.hasChild("Risultato")
          ? partitaSnapshot.child("Risultato").val()
          : "";

        // Se il risultato è vuoto, imposta "VS"
        risultatoDiv.textContent = risultatoValue.trim()
          ? risultatoValue
          : "VS";

        // SQUADRA OSPITE
        const squadraOspiteDiv = document.createElement("div");
        squadraOspiteDiv.classList.add("squadraOspite");

        // Recupera il logo della squadra ospite dal nodo Squadre
        const logoOspiteContainer = document.createElement("div");
        logoOspiteContainer.classList.add("container-logo");
        const logoOspiteElement = document.createElement("img");
        const logoOspiteUrl = squadreSnapshot
          .child(squadraOspite)
          .child("LogoLR")
          .val();
        logoOspiteElement.src = logoOspiteUrl;

        const nomeSquadraOspiteContainer = document.createElement("div");
        nomeSquadraOspiteContainer.classList.add("container-nome-squadra");
        const squadraOspiteElement = document.createElement("p");
        squadraOspiteElement.textContent = squadraOspitePuntato;
        squadraOspiteElement.classList.add("nome-squadra");

        logoOspiteContainer.appendChild(logoOspiteElement);
        nomeSquadraOspiteContainer.appendChild(squadraOspiteElement);
        squadraOspiteDiv.appendChild(logoOspiteContainer);
        squadraOspiteDiv.appendChild(nomeSquadraOspiteContainer);

        // container di luogo e data
        const partitaVenueDiv = document.createElement("div");
        partitaVenueDiv.classList.add("partita-venue");

        const dataPartita = partitaSnapshot.hasChild("Data")
          ? partitaSnapshot.child("Data").val()
          : null;
        const orarioPartita = partitaSnapshot.hasChild("Orario")
          ? partitaSnapshot.child("Orario").val()
          : null;
        const luogoPartita = partitaSnapshot.hasChild("Luogo")
          ? partitaSnapshot.child("Luogo").val()
          : null;

        const dataDiv = document.createElement("div");
        dataDiv.classList.add("data");
        const luogoDiv = document.createElement("div");
        luogoDiv.classList.add("luogo");

        if (dataPartita && orarioPartita) {
          const dataElement = document.createElement("p");
          dataElement.textContent = `${dataPartita} - ${orarioPartita}`;
          dataDiv.appendChild(dataElement);
        } else {
          const dataElement = document.createElement("p");
          dataElement.textContent = "TBD";
          dataDiv.appendChild(dataElement);
        }

        if (luogoPartita) {
          const luogoElement = document.createElement("p");
          luogoElement.textContent = `${luogoPartita}`;
          luogoDiv.appendChild(luogoElement);
        } else {
          const luogoElement = document.createElement("p");
          luogoElement.textContent = "TBD";
          luogoDiv.appendChild(luogoElement);
        }

        partita.appendChild(squadraCasaDiv);
        partita.appendChild(risultatoDiv);
        partita.appendChild(squadraOspiteDiv);

        partitaVenueDiv.appendChild(luogoDiv);
        partitaVenueDiv.appendChild(dataDiv);

        partitaDiv.appendChild(partita);
        partitaDiv.appendChild(partitaVenueDiv);

        // Aggiungi la partita all'array per l'ordinamento
        partiteArray.push(partitaDiv);

        // Aggiungere gli elementi della partita al div delle partite
        // partiteDiv.appendChild(partitaDiv);
      });

      // Ordina le partite in base all'orario
      partiteArray.sort((a, b) => {
        const orarioA = a.querySelector(".data p").textContent;
        const orarioB = b.querySelector(".data p").textContent;
        return orarioA.localeCompare(orarioB); // Ordina in base all'orario
      });

      // Aggiungi le partite ordinate al div delle partite
      partiteArray.forEach((partitaDiv) => {
        partiteDiv.appendChild(partitaDiv);
      });

      // Aggiungere il div delle partite al div della giornata
      giornataDiv.appendChild(partiteDiv);

      // Aggiungere il div della giornata al div "prossima-giornata" nel DOM
      prossimaGiornataDiv.appendChild(giornataDiv);
    }
  }
}
