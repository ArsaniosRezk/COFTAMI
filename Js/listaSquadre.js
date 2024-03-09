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

// Funzione per ottenere e visualizzare le squadre da Firebase
async function visualizzaSquadre() {
  const containerSquadre = document.getElementById("container-squadre");

  const squadreRef = ref(db, "Calcio/Superiori/Squadre");
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

// Chiamata alla funzione per visualizzare le squadre
visualizzaSquadre();
