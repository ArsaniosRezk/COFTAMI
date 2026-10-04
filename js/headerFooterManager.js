import { paginaCorrente, nomePagina } from "./utils/percorso.js";
import { avviaControlloManutenzione } from "./maintenance-guard.js";
import { avviaMenuPagineAttive } from "./pagine-attive.js";
import { osservaImpostazioni } from "./impostazioni.js";
import {
  edizioneForzata,
  edizioneTest,
  tornaEdizioneCorrente,
} from "./divisionAndVariables.js";

// HEADER E FOOTER //

const VOCI_MENU = [
  { href: "/", testo: "Home" },
  { href: "/campionato.html", testo: "Campionato" },
  { href: "/squadre.html", testo: "Squadre" },
  { href: "/calendario.html", testo: "Calendario" },
  { href: "/regolamento.html", testo: "Regolamento" },
  { href: "/albo-d'oro.html", testo: "Albo d'Oro" },
  // Galleria nascosta per il momento: la pagina esiste ancora (/galleria.html)
  // { href: "/galleria.html", testo: "Galleria" },
  { href: "/iscrizione.html", testo: "Iscrizioni" },
];

// Pagine in cui la divisione cambia i contenuti: altrove il selettore è nascosto
const PAGINE_CON_DIVISIONE = ["", "campionato", "squadre", "calendario"];

// La pagina di una squadra evidenzia "Squadre" nel menu
const VOCE_ATTIVA_PER_PAGINA = { squadra: "squadre" };

const vociMenu = (classeLink = "") =>
  VOCI_MENU.map(
    ({ href, testo }) =>
      `<li><a${classeLink ? ` class="${classeLink}"` : ""} href="${href}">${testo}</a></li>`
  ).join("");

class MyHeader extends HTMLElement {
  connectedCallback() {
    const conDivisione = PAGINE_CON_DIVISIONE.includes(paginaCorrente());

    this.innerHTML = `
    <header>
      <div class="left-header">
        <a href="/" aria-label="Cofta Milano, vai alla home">
          <img src="/assets/images/LOGO_COFTA_SITO.svg" width="130" height="58" class="logo" alt="Cofta Milano" />
        </a>

        <!-- Fonte del valore per gli script: lo comandano i pulsanti qui sotto -->
        <select id="division" hidden tabindex="-1" aria-hidden="true">
          <option value="Superiori">Superiori</option>
          <option value="Giovani">Giovani</option>
        </select>
        <div class="division-switch" role="group" aria-label="Divisione"${conDivisione ? "" : " hidden"}>
          <button type="button" data-division="Superiori">Superiori</button>
          <button type="button" data-division="Giovani">Giovani</button>
        </div>
      </div>

      <div class="right-header">
        <nav class="nav" aria-label="Menu principale">
          <ul>${vociMenu("nav-link")}</ul>
        </nav>
        <button type="button" class="menu-icon hide-hamb" aria-label="Apri il menu"
          aria-expanded="false" aria-controls="overlay-menu-container">
          <i class="icona icona-bars" aria-hidden="true"></i>
        </button>
        <div id="overlay-menu-container" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" class="close-menu-icon" aria-label="Chiudi il menu">
            <i class="icona icona-xmark" aria-hidden="true"></i>
          </button>
          <ul id="overlay-menu">
            <li class="voce-logo">
              <a href="/" aria-label="Home">
                <img src="/assets/images/LOGO_COFTA_SITO.svg" width="150" height="67" class="logo hide-logo" alt="" />
              </a>
            </li>
            ${vociMenu()}
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
          <ul>${vociMenu()}</ul>
        </div>
        <div class="footer-logo">
          <a href="/" aria-label="Home"><img src="/assets/images/LOGO_COFTA_SITO_3.svg" width="83" height="90" class="logo" alt="Cofta Milano" loading="lazy" /></a>
        </div>
        <div class="footer-contacts">
          <h4>Contatti</h4>
          <p>Per maggiori info manda una <br />mail a: <a href="mailto:info@coftamilano.com"><b>info@coftamilano.com</b></a></p>
          <div class="contacts-icon">
            <a href="https://www.instagram.com/coftamilano" aria-label="Instagram di Cofta Milano" rel="noopener" target="_blank"><i class="icona icona-instagram contact-icon" aria-hidden="true"></i></a>
            <a href="mailto:info@coftamilano.com" aria-label="Scrivi una mail a Cofta Milano"><i class="icona icona-envelope contact-icon" aria-hidden="true"></i></a>
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
// Confronto sui nomi normalizzati: l'evidenziazione funziona sia su
// /campionato.html sia su /campionato.
const paginaAttiva = VOCE_ATTIVA_PER_PAGINA[paginaCorrente()] ?? paginaCorrente();

document.querySelectorAll(".nav-link, #overlay-menu a, .footer-menu a").forEach((link) => {
  const paginaLink = nomePagina(new URL(link.href).pathname);
  if (paginaAttiva === paginaLink && !link.closest(".voce-logo")) {
    if (link.classList.contains("nav-link")) link.classList.add("active");
    link.setAttribute("aria-current", "page");
  }
});

// MENU SU SMARTPHONE //
const pulsanteMenu = document.querySelector(".menu-icon");
const menu = document.getElementById("overlay-menu-container");

function apriMenu() {
  menu.classList.add("aperto");
  pulsanteMenu.setAttribute("aria-expanded", "true");
  document.body.style.overflow = "hidden";
  menu.querySelector(".close-menu-icon").focus();
}

function chiudiMenu() {
  if (!menu.classList.contains("aperto")) return;
  menu.classList.remove("aperto");
  pulsanteMenu.setAttribute("aria-expanded", "false");
  document.body.style.overflow = "";
  pulsanteMenu.focus();
}

if (pulsanteMenu && menu) {
  pulsanteMenu.addEventListener("click", apriMenu);
  menu.querySelector(".close-menu-icon").addEventListener("click", chiudiMenu);
  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape") chiudiMenu();
  });
}

// EDIZIONE PASSATA //
// Chi guarda un'edizione passata (link dall'albo d'oro) deve capirlo e poter tornare indietro
if (edizioneForzata && !edizioneTest) {
  const avviso = document.createElement("div");
  avviso.className = "avviso-archivio";
  avviso.innerHTML = `<span>Stai guardando l'edizione <b>${edizioneForzata}</b></span>`;

  const torna = document.createElement("button");
  torna.type = "button";
  torna.textContent = "Torna all'edizione corrente";
  torna.addEventListener("click", tornaEdizioneCorrente);
  avviso.appendChild(torna);

  document.querySelector("main")?.prepend(avviso);
}

// MANUTENZIONE //
avviaControlloManutenzione();

// PAGINE SPENTE DAL GESTIONALE: spariscono dai menu //
avviaMenuPagineAttive(osservaImpostazioni);

// SERVICE WORKER REGISTRATION (Cache)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.log("SW Registration Failed:", error);
    });
  });
}
