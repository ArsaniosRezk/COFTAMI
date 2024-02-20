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
  visualizzaSquadreConMembri();
}

async function visualizzaSquadreConMembri() {
  const containerSquadre = document.getElementById("container-squadre");

  // Svuota div container squadre
  containerSquadre.innerHTML = "";

  const squadreRef = ref(db, `Calcio/${selectedDivisione}/Squadre`);
  const squadreSnapshot = await get(squadreRef);

  if (squadreSnapshot.exists()) {
    squadreSnapshot.forEach((squadra) => {
      const squadraData = squadra.val();
      const nomeSquadra = squadra.key;
      const logoSquadra = squadraData.Logo;
      const allenatori = squadraData.Allenatori || {};
      const giocatori = squadraData.Giocatori || {};

      // Creazione del div per la squadra
      const squadraDiv = document.createElement("div");
      squadraDiv.className = "squadra";

      // Creazione dell'elemento div per logo e nome della squadra
      const logoNomeDiv = document.createElement("div");
      logoNomeDiv.className = "logo-e-nome";

      // Creazione dell'elemento immagine
      const immagineElemento = document.createElement("img");
      immagineElemento.src = logoSquadra;

      // Creazione dell'elemento div per il nome della squadra
      const nomeTeamDiv = document.createElement("div");
      nomeTeamDiv.className = "nome-team";

      // Creazione dell'elemento span
      const spanElemento = document.createElement("span");
      spanElemento.textContent = nomeSquadra;

      // Aggiunta degli elementi al DOM
      nomeTeamDiv.appendChild(spanElemento);
      logoNomeDiv.appendChild(immagineElemento);
      logoNomeDiv.appendChild(nomeTeamDiv);
      squadraDiv.appendChild(logoNomeDiv);

      // Creazione del div per i membri della squadra
      const membriDiv = document.createElement("div");
      membriDiv.className = "membri";

      // Creazione e aggiunta degli elementi p per gli allenatori
      const tipoMembroAllenatori = document.createElement("p");
      tipoMembroAllenatori.className = "tipo-membro";
      tipoMembroAllenatori.textContent = "Allenatori";
      membriDiv.appendChild(tipoMembroAllenatori);

      const membriAllenatori = document.createElement("p");
      membriAllenatori.className = "membro";
      membriAllenatori.textContent = Object.keys(allenatori).join(", ");
      membriDiv.appendChild(membriAllenatori);

      // Creazione e aggiunta degli elementi p per i giocatori
      const tipoMembroGiocatori = document.createElement("p");
      tipoMembroGiocatori.className = "tipo-membro";
      tipoMembroGiocatori.textContent = "Giocatori";
      membriDiv.appendChild(tipoMembroGiocatori);

      const membriGiocatori = document.createElement("p");
      membriGiocatori.className = "membro";
      membriGiocatori.textContent = Object.keys(giocatori).join(", ");
      membriDiv.appendChild(membriGiocatori);

      // Aggiunta del div dei membri al DOM
      squadraDiv.appendChild(membriDiv);

      // Aggiunta del div della squadra al container
      containerSquadre.appendChild(squadraDiv);

      squadraDiv.addEventListener("click", () => {
        openTeamMembersOverlay(nomeSquadra, allenatori, giocatori, logoSquadra);
      });
    });
  } else {
    console.log("Nessuna squadra trovata nel database.");
  }
}

function isMobileDevice() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

// Funzione per aprire l'overlay e popolare i dati della squadra
function openTeamMembersOverlay(
  nomeSquadra,
  allenatori,
  giocatori,
  logoSquadra
) {
  if (isMobileDevice()) {
    // const overlay = document.getElementById("team-overlay");
    // const teamNameElement = document.getElementById("team-name");
    // const logoElement = document.getElementById("team-logo");
    // const allenatoriElement = document.getElementById("overlay-allenatori");
    // const giocatoriElement = document.getElementById("overlay-giocatori");

    // // Popola i dati della squadra nell'overlay
    // teamNameElement.textContent = nomeSquadra;
    // logoElement.src = logoSquadra;
    // allenatoriElement.textContent = Object.keys(allenatori).join(", ");
    // giocatoriElement.textContent = Object.keys(giocatori).join(", ");

    // // Mostra l'overlay
    // overlay.style.display = "flex";

    const overlay = document.getElementById("team-overlay");
    const teamNameElement = document.getElementById("team-name");
    const logoElement = document.getElementById("team-logo");
    const allenatoriElement = document.getElementById("overlay-allenatori");
    const giocatoriElement = document.getElementById("overlay-giocatori");

    // Popola i dati della squadra nell'overlay
    teamNameElement.textContent = nomeSquadra;
    logoElement.src = logoSquadra;
    allenatoriElement.textContent = Object.keys(allenatori).join(", ");
    giocatoriElement.textContent = Object.keys(giocatori).join(", ");

    // Mostra l'overlay
    overlay.style.top = "0%";
    document.getElementById("team-info").style.opacity = "1";
  }
}
