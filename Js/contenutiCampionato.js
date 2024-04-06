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
  calcolaClassificaGirone();
  calcolaClassificheMarcatoriAssist();
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
        `Nessuna partita o squadra trovata per il girone in Firebase`
      );
    }
  } catch (error) {
    console.error(
      `Errore nel recupero delle partite o squadre per il girone da Firebase:`,
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

  // Verifica se la squadra corrente è quella a cui aggiungere il punto di penalità
  const squadraDaPenalizzare = "S_ Marco B"; // Inserisci il nome della squadra da penalizzare
  const penalita = 1; // Numero di punti da penalità

  // Calcola i punti totali della squadra prima dell'applicazione della penalità
  const puntiPrePenalita = punteggi[squadra].punti;

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

  // Se la squadra corrente corrisponde a quella da penalizzare, e ha effettivamente dei punti
  if (squadra === squadraDaPenalizzare && puntiPrePenalita > 0) {
    // Calcola i punti totali della squadra dopo l'applicazione della penalità
    const puntiDopoPenalita = Math.max(puntiPrePenalita - penalita, 0);
    // Aggiorna i punti della squadra con il calcolo appena eseguito
    punteggi[squadra].punti = puntiDopoPenalita;
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
    const squadraPuntata = squadra.replace(/_/g, ".");

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
CLASSIFICA MARCATORI E ASSIST
===================================
*/

// Funzione per calcolare e rappresentare le classifiche dei marcatori e degli assist
async function calcolaClassificheMarcatoriAssist() {
  const marcatori = {};
  // const assistman = {};

  // Itera su tutti i gironi e tutte le partite della divisione selezionata
  const partiteRef = ref(db, `Calcio/${selectedDivisione}/Partite`);

  try {
    const partiteSnapshot = await get(partiteRef);

    if (partiteSnapshot.exists()) {
      const partite = partiteSnapshot.val();

      // Itera su tutte le partite del girone corrente
      for (const partitaKey in partite) {
        const partita = partite[partitaKey];

        // Aggiorna la classifica dei marcatori
        aggiornaClassifica(marcatori, partita.Marcatori);

        // // Aggiorna la classifica degli assistman
        // aggiornaClassifica(assistman, partita.Assistman);
      }
    } else {
      console.log(`Nessuna partita trovata per il girone in Firebase`);
    }
  } catch (error) {
    console.error(
      `Errore nel recupero delle partite per il girone da Firebase:`,
      error
    );
  }

  // Converti le classifiche in array per ordinare i giocatori
  const marcatoriArray = Object.entries(marcatori);
  // const assistmanArray = Object.entries(assistman);

  // Ordina gli array in base ai gol o agli assist
  marcatoriArray.sort((a, b) => b[1] - a[1]);
  // assistmanArray.sort((a, b) => b[1] - a[1]);

  // Rappresenta le classifiche marcatori e assist
  rappresentaClassificheGiocatori(
    "classificaGol",
    marcatoriArray,
    "Marcatori",
    "G",
    1,
    10
  );
  // rappresentaClassificheGiocatori(
  //   "classificaAssist",
  //   assistmanArray,
  //   "Assist",
  //   "A",
  //   1,
  //   10
  // );
}

// Funzione per aggiornare la classifica di marcatori o assistman
function aggiornaClassifica(classifica, giocatori) {
  if (giocatori) {
    // Itera su tutti i giocatori della partita corrente
    Object.keys(giocatori).forEach((giocatore) => {
      // Aggiorna la classifica con i gol o gli assist del giocatore
      classifica[giocatore] =
        (classifica[giocatore] || 0) + giocatori[giocatore];
    });
  }
}

// Funzione per rappresentare le classifiche dei marcatori e assistman con paginazione
async function rappresentaClassificheGiocatori(
  containerId,
  classificaArray,
  captionText,
  tipo,
  paginaCorrente = 1,
  righePerPagina = 10
) {
  const classificaDiv = document.getElementById(containerId);
  classificaDiv.innerHTML = "";
  const table = document.createElement("table");
  table.classList.add("custom-table-g-a");

  // Aggiungi il caption alla tabella
  const caption = table.createCaption();
  caption.textContent = captionText;

  const thead = document.createElement("thead");

  const tbody = document.createElement("tbody");

  // Intestazione della tabella
  const theadRow = document.createElement("tr");

  const colonne = ["#", "Giocatore", "Squadra", tipo];

  colonne.forEach((colonna, index) => {
    const th = document.createElement("th");
    th.textContent = colonna;

    theadRow.appendChild(th);
  });

  thead.appendChild(theadRow);
  table.appendChild(thead);

  // Variabili per tenere traccia della posizione nella classifica
  let posizioneAttuale = 0;
  let valorePrecedente = null;

  // Calcola il numero totale di pagine
  const numeroPagine = Math.ceil(classificaArray.length / righePerPagina);

  // Calcola l'indice iniziale e finale per la pagina corrente
  const indiceIniziale = (paginaCorrente - 1) * righePerPagina;
  const indiceFinale = Math.min(
    indiceIniziale + righePerPagina,
    classificaArray.length
  );

  // Itera solo sulle righe della pagina corrente
  for (let index = indiceIniziale; index < indiceFinale; index++) {
    const [giocatore, valore] = classificaArray[index];

    const tr = document.createElement("tr");

    // Recupera la squadra del giocatore
    const squadra = await recuperaSquadraGiocatore(giocatore);
    const squadraPuntata = squadra.replace(/_/g, ".");

    // Controlla la parità
    if (valore !== valorePrecedente) {
      posizioneAttuale = index + 1;
    }

    const colonneDati = [posizioneAttuale, giocatore, squadraPuntata, valore];

    colonneDati.forEach((dato, columnIndex) => {
      const td = document.createElement("td");
      td.textContent = dato;

      // Aggiungi classe per le prime due celle della prima colonna del body
      if (columnIndex === 0 && posizioneAttuale <= 2) {
        td.classList.add("primaColonnaCella" + posizioneAttuale);
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);

    // Aggiorna il valore precedente
    valorePrecedente = valore;
  }

  table.appendChild(tbody);
  classificaDiv.appendChild(table);

  // Aggiungi i controlli di paginazione
  aggiungiControlliPaginazione(
    classificaDiv,
    numeroPagine,
    paginaCorrente,
    classificaArray,
    captionText,
    tipo,
    righePerPagina
  );
}

// Funzione per aggiungere i controlli di paginazione
function aggiungiControlliPaginazione(
  container,
  numeroPagine,
  paginaCorrente,
  classificaArray,
  captionText,
  tipo,
  righePerPagina
) {
  const paginazioneDiv = document.createElement("div");
  paginazioneDiv.classList.add("pagination");

  for (let pagina = 1; pagina <= numeroPagine; pagina++) {
    const link = document.createElement("a");
    link.href = "#";
    link.textContent = pagina;

    // Aggiungi classe attiva per la pagina corrente
    if (pagina === paginaCorrente) {
      link.classList.add("active");
    }

    // Aggiungi l'evento per cambiare la pagina
    link.addEventListener("click", (event) => {
      event.preventDefault(); // Previeni il comportamento predefinito del link
      rappresentaClassificheGiocatori(
        container.id,
        classificaArray,
        captionText,
        tipo,
        pagina,
        righePerPagina
      );
    });

    paginazioneDiv.appendChild(link);
  }

  container.appendChild(paginazioneDiv);
}

// Funzione per recuperare giocatori da inserire in tabelle marcatori e assist
async function recuperaSquadraGiocatore(giocatore) {
  const squadreRef = ref(db, `Calcio/${selectedDivisione}/Squadre`);
  try {
    const squadreSnapshot = await get(squadreRef);
    if (squadreSnapshot.exists()) {
      const squadre = squadreSnapshot.val();
      for (const nomeSquadra in squadre) {
        const giocatoriSquadra = squadre[nomeSquadra].Giocatori || {};
        if (giocatoriSquadra[giocatore]) {
          return nomeSquadra;
        }
      }
    }
  } catch (error) {
    console.error(`Errore nel recupero della squadra da Firebase:`, error);
  }
  return null;
}

/*
===================================
SQUADRE
===================================
*/

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
CALENADRIO
===================================
*/
