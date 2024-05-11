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

// Chiamata alla funzione principale con gestione della sequenza
export async function sequenzaEsecuzione() {
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
      dataElement.classList.add("numero-giornata");
      dataElement.textContent = data;

      giornataDiv.appendChild(dataElement);

      const partiteDiv = document.createElement("div");
      partiteDiv.classList.add("partite");

      const partiteArray = [];

      childSnapshot.forEach((partitaSnapshot) => {
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

        partiteArray.push(partitaDiv);
      });
      // Ordina le partite in base all'orario
      partiteArray.sort((a, b) => {
        const orarioA = a.querySelector(".data p").textContent;
        const orarioB = b.querySelector(".data p").textContent;
        return orarioA.localeCompare(orarioB); // Ordina in base all'orario
      });

      // Svuota il contenuto del div delle partite
      partiteDiv.innerHTML = "";

      // Aggiungi le partite ordinate al div delle partite
      partiteArray.forEach((partitaDiv) => {
        partiteDiv.appendChild(partitaDiv);
      });

      giornataDiv.appendChild(partiteDiv);
      calendarioPartiteDiv.appendChild(giornataDiv);
    });
  }
}
