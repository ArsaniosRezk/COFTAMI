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

// Funzioni che partono quando cambio divisione da telefono
divisioneSelectSmartphone.addEventListener("change", async () => {
  selectedDivisione = divisioneSelectSmartphone.value;

  // Chiamata alla funzione per visualizzare le squadre
  sequenzaEsecuzione();
});

// Chiamata alla funzione principale con gestione della sequenza
async function sequenzaEsecuzione() {
  recuperaCalendario();
}

/*
===================================
CALENDARIO
===================================
*/

async function recuperaCalendario() {
  const calendarioRef = ref(db, `Calcio/${selectedDivisione}/Calendario`);
  const squadreRef = ref(db, `Calcio/${selectedDivisione}/Squadre`);
  const calendarioPartiteDiv = document.getElementById("giornate");

  const [calendarioSnapshot, squadreSnapshot] = await Promise.all([
    get(calendarioRef),
    get(squadreRef),
  ]);

  if (calendarioSnapshot.exists()) {
    // Pulisce il contenuto del div prima di inserire nuove date
    calendarioPartiteDiv.innerHTML = "";

    calendarioSnapshot.forEach((childSnapshot) => {
      const data = childSnapshot.key;
      const giornataDiv = document.createElement("div");
      giornataDiv.classList.add("giornata");

      const dataElement = document.createElement("p");
      dataElement.classList.add("data-giornata");
      dataElement.textContent = data;

      giornataDiv.appendChild(dataElement);

      const partiteDiv = document.createElement("div");
      partiteDiv.classList.add("partite");

      childSnapshot.forEach((partitaSnapshot) => {
        const partitaString = partitaSnapshot.key;

        const [squadraCasa, squadraOspite] = partitaString.split(":");
        const squadraCasaPuntato = squadraCasa.replace(/-/g, ".");
        const squadraOspitePuntato = squadraOspite.replace(/-/g, ".");

        const partitaDiv = document.createElement("div");
        partitaDiv.classList.add("partita");

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
      calendarioPartiteDiv.appendChild(giornataDiv);
    });
    // Ordina i div delle giornate in base alla data
    const giornateDivs = Array.from(calendarioPartiteDiv.children);
    giornateDivs.sort((a, b) => {
      const dataA = convertiFormatoData(
        a.querySelector(".data-giornata").textContent
      );
      const dataB = convertiFormatoData(
        b.querySelector(".data-giornata").textContent
      );
      return new Date(dataA) - new Date(dataB);
    });

    calendarioPartiteDiv.innerHTML = "";
    giornateDivs.forEach((giornataDiv) => {
      calendarioPartiteDiv.appendChild(giornataDiv);
    });
  } else {
    console.log("Il nodo Calendario non contiene dati");
  }
}

function convertiFormatoData(data) {
  const [day, month, year] = data.split("-");
  return `${year}-${month}-${day}`;
}
