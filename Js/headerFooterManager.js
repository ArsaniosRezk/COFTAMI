// HEADER E FOOTER //

class MyHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <header>
      <div class="left-header">
        <a href="/"
          ><img src="immagini/LOGO_COFTA_SITO.svg" width="150px" class="logo"
        /></a>

        <select id="divisione">
          <option value="Superiori">Superiori</option>
          <option value="Giovani">Giovani</option>
        </select>
      </div>

      <div class="right-header">
        <select id="divisione-smartphone">
          <option value="Superiori">Superiori</option>
          <option value="Giovani">Giovani</option>
        </select>
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
              <a class="nav-link" href="/calendario.html">Calendario</a>
            </li>            
            <li>
              <a class="nav-link" href="/regolamento.html">Regolamento</a>
            </li>
          </ul>
        </nav>
        <i class="fa-solid fa-bars menu-icon hide-hamb" onclick="openMenu()"></i>
        <div id="overlay-menu-container">
          <i class="fa-solid fa-xmark close-menu-icon" onclick="closeMenu()"></i>
          <ul id="overlay-menu">
            <a href="/"
              ><img
                src="immagini/LOGO_COFTA_SITO.svg"
                width="150px"
                class="logo hide-logo"
            /></a>
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
              <a href="/calendario.html">Calendario</a>
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
              <a href="/calendario.html">Calendario</a>
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
          <a href="https://www.instagram.com/coftamilano"><i class="fa-brands fa-instagram contact-icon"></i></a>
            <a href="mailto: info@coftamilano.com"><i class="fa-solid fa-envelope contact-icon"></i></a>
          </div>
        </div>
      </div>
    </footer>
    `;
  }
}

/* <a href=""><i class="fa-brands fa-youtube contact-icon"></i></a> */

customElements.define("my-header", MyHeader);
customElements.define("my-footer", MyFooter);

// Active Page //
const navLinkEls = document.querySelectorAll(".nav-link");
const windowPathname = window.location.pathname;

navLinkEls.forEach((navLinkEl) => {
  const navLinkPathname = new URL(navLinkEl.href).pathname;

  if (
    windowPathname === navLinkPathname ||
    (windowPathname === "/" && navLinkPathname === "/")
  ) {
    navLinkEl.classList.add("active");
  }
});

//////////////////////////////////////////////////////////////////////////////////

// Definizione globale della variabile selectedDivisione
window.selectedDivisione;

let sequenzaEsecuzioneModule;

switch (window.location.pathname) {
  case "/":
    sequenzaEsecuzioneModule = import("./funzioniHome.js");
    break;
  case "/campionato.html":
    sequenzaEsecuzioneModule = import("./funzioniCampionato.js");
    break;
  case "/squadre.html":
    sequenzaEsecuzioneModule = import("./funzioniSquadre.js");
    break;
  case "/calendario.html":
    sequenzaEsecuzioneModule = import("./funzioniCalendario.js");
    break;
  case "/regolamento.html":
    break;
  default:
    console.error(
      "La pagina corrente non ha una funzione sequenzaEsecuzione definita."
    );
    break;
}

// Funzione per salvare l'opzione selezionata nello storage locale
function saveSelectedOption(selectId) {
  const selectElement = document.getElementById(selectId);
  window.selectedDivisione = selectElement.value;
  localStorage.setItem(selectId, selectedDivisione);
}

// Funzione per caricare l'opzione selezionata salvata nello storage locale
function loadSavedOption(selectId) {
  const selectElement = document.getElementById(selectId);
  const savedOption = localStorage.getItem(selectId);
  if (savedOption) {
    selectElement.value = savedOption;
    // Assegnazione del valore della divisione salvata alla variabile selectedDivisione
    window.selectedDivisione = savedOption;
  }
}

window.onload = function () {
  loadSavedOption("divisione");
  loadSavedOption("divisione-smartphone");
  // Chiamata alla funzione sequenzaEsecuzione solo se selectedDivisione è stata assegnata
  if (window.selectedDivisione) {
    // Una volta caricato il modulo, esegui la funzione sequenzaEsecuzione corrispondente
    sequenzaEsecuzioneModule.then((module) => {
      if (module && module.sequenzaEsecuzione) {
        module.sequenzaEsecuzione();
      } else {
        console.error(
          "Il modulo della pagina corrente non contiene una funzione sequenzaEsecuzione."
        );
      }
    });
  }
};

// Codice per gestire il cambiamento dell'opzione selezionata
document.getElementById("divisione").addEventListener("change", function () {
  saveSelectedOption("divisione");
  updateSelectElement("divisione-smartphone", selectedDivisione);
  // Una volta caricato il modulo, esegui la funzione sequenzaEsecuzione corrispondente
  sequenzaEsecuzioneModule.then((module) => {
    if (module && module.sequenzaEsecuzione) {
      module.sequenzaEsecuzione();
    } else {
      console.error(
        "Il modulo della pagina corrente non contiene una funzione sequenzaEsecuzione."
      );
    }
  });
});

document
  .getElementById("divisione-smartphone")
  .addEventListener("change", function () {
    saveSelectedOption("divisione-smartphone");
    updateSelectElement("divisione", selectedDivisione);
    // Una volta caricato il modulo, esegui la funzione sequenzaEsecuzione corrispondente
    sequenzaEsecuzioneModule.then((module) => {
      if (module && module.sequenzaEsecuzione) {
        module.sequenzaEsecuzione();
      } else {
        console.error(
          "Il modulo della pagina corrente non contiene una funzione sequenzaEsecuzione."
        );
      }
    });
  });

// Funzione per aggiornare entrambi gli elementi <select>
function updateSelectElement(selectId, value) {
  const selectElement = document.getElementById(selectId);
  if (selectElement) {
    selectElement.value = value;
  }
}
