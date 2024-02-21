// HEADER E FOOTER //

class MyHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <header>
      <div class="left-header">
        <a href="/"><img src="immagini/LOGO_COFTA_SITO.svg" width="150px" class="logo" /></a>

        <select id="divisione"></select>
      </div>

      <div class="right-header">
        <select id="divisione-smartphone"></select>
        <nav class="nav">
          <ul>
            <li>
              <a class="nav-link" href="/">Home</a>
            </li>
            <li>
              <a class="nav-link" href="/campionato.html">Campionato</a>
            </li>
            <li>
              <a class="nav-link" href="/squadre.html">Squadre</a>
            </li>
            <li>
              <a class="nav-link" href="/regolamento.html">Regolamento</a>
            </li>
          </ul>
        </nav>
        <i class="fa-solid fa-bars menu-icon hide-hamb" onclick="openMenu()"></i>
        <di v id="overlay-menu-container">
          <i class="fa-solid fa-xmark close-menu-icon" onclick="closeMenu()"></i>
          <ul id="overlay-menu">
            <a href="/"><img src="immagini/LOGO_COFTA_SITO.svg" width="150px" class="logo hide-logo" /></a>
            <li>
              <a href="/">Home</a>
            </li>
            <li>
              <a href="/campionato.html">Campionato</a>
            </li>
            <li>
              <a href="/squadre.html">Squadre</a>
            </li>
            <li>
              <a href="/regolamento.html">Regolamento</a>
            </li>
          </ul>
         </div>
      </div>
    </header>
    `;
  }
}

class MyFooter extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <footer>
      <div class="footer-grid">
        <div class="footer-menu">
          <h4>Menu</h4>
          <ul>
            <li>
              <a href="index.html">Home</a>
            </li>
            <li>
              <a href="/campionato.html">Campionato</a>
            </li>
            <li>
              <a href="/squadre.html">Squadre</a>
            </li>
            <li>
              <a href="/regolamento.html">Regolamento</a>
            </li>
          </ul>
        </div>
        <div class="footer-logo">
          <a href="/"><img src="immagini/LOGO_COFTA_SITO.svg" width="150px" class="logo" /></a>
        </div>
        <div class="footer-contacts">
          <h4>Contatti</h4>
          <p>Per maggiori info manda una <br />mail a: <b>info@coftamilano.com</b></p>
          <div class="contacts-icon">
            <i class="fa-brands fa-youtube contact-icon"></i>
            <i class="fa-brands fa-instagram contact-icon"></i>
            <i class="fa-solid fa-envelope contact-icon"></i>
          </div>
        </div>
      </div>
    </footer>
    `;
  }
}

customElements.define("my-header", MyHeader);
customElements.define("my-footer", MyFooter);

// Active Page //
const navLinkEls = document.querySelectorAll(".nav-link");
const windowPathname = window.location.pathname;

navLinkEls.forEach((navLinkEl) => {
  const navLinkPathname = new URL(navLinkEl.href).pathname;

  if (
    windowPathname === navLinkPathname ||
    (windowPathname === "/index.html" && navLinkPathname === "/")
  ) {
    navLinkEl.classList.add("active");
  }
});

//////////////////////////////////////////////////////////////////////////////////

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
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

const db = getDatabase();

const divisioneSelect = document.getElementById("divisione");
const divisioneSelectSmartphone = document.getElementById(
  "divisione-smartphone"
);

populateDivisioneSelect();

// Funzione per popolare l'elemento select con le divisioni da Firebase
async function populateDivisioneSelect() {
  try {
    const divisioniRef = ref(db, "Calcio");

    // Recupera i dati delle divisioni
    const snapshot = await get(divisioniRef);

    // Se esistono dati, popola l'elemento select
    if (snapshot.exists()) {
      const divisioni = snapshot.val();

      // Rimuovi eventuali opzioni precedenti
      divisioneSelect.innerHTML = "";
      divisioneSelectSmartphone.innerHTML = "";

      // Aggiungi le divisioni dal database
      Object.keys(divisioni).forEach((divisione) => {
        const option = document.createElement("option");
        option.value = divisione;
        option.textContent = divisione;
        divisioneSelect.appendChild(option);
      });

      // Aggiungi le divisioni dal database
      Object.keys(divisioni).forEach((divisione) => {
        const option = document.createElement("option");
        option.value = divisione;
        option.textContent = divisione;
        divisioneSelectSmartphone.appendChild(option);
      });
    }
  } catch (error) {
    console.error(
      "Errore durante il recupero delle divisioni da Firebase:",
      error
    );
  }
}
