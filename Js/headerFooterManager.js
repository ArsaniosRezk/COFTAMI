import { ref, get, db } from "./firebase.js";

// HEADER E FOOTER //

class MyHeader extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <header>
      <div class="left-header">
        <a href="/"
          ><img src="assets/images/LOGO_COFTA_SITO.svg" width="130px" class="logo"
        /></a>

        <select id="division">
          <option value="Superiori">Superiori</option>
          <option value="Giovani">Giovani</option>
        </select>
      </div>

      <div class="right-header">
        <select id="division-smartphone">
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
            <li>
              <a class="nav-link" href="/albo-d'oro.html">Albo d'Oro</a>
            </li>
          </ul>
        </nav>
        <i class="fa-solid fa-bars menu-icon hide-hamb" onclick="openMenu()"></i>
        <div id="overlay-menu-container">
          <i class="fa-solid fa-xmark close-menu-icon" onclick="closeMenu()"></i>
          <ul id="overlay-menu">
            <a href="/"
              ><img
                src="assets/images/LOGO_COFTA_SITO.svg"
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
            <li>
              <a href="/albo-d'oro.html">Albo d'Oro</a>
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
            <li>
              <a href="/albo-d'oro.html">Albo d'Oro</a>
            </li>
          </ul>
        </div>
        <div class="footer-logo">
          <a href="/"><img src="assets/images/LOGO_COFTA_SITO_3.svg" height="90px" class="logo" /></a>
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
    <style>
      footer {
        padding-bottom: env(safe-area-inset-bottom); /* Fix for iPhone Home Bar */
      }
    </style>
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
    (windowPathname === "/" && navLinkPathname === "/")
  ) {
    navLinkEl.classList.add("active");
  }
});

// GLOBAL MAINTENANCE CHECK
import { maintenanceGuard } from "./maintenance-guard.js";

(async function checkMaintenanceGlobal() {
  // The guard handles visibility and throws if maintenance is on
  try {
    await maintenanceGuard();
    // If we get here, it's safe to run other logic if needed
  } catch (e) {
    if (e.message !== "MAINTENANCE_MODE_BLOCK") {
      console.error(e);
    }
    // If blocked, we do nothing more. The body is visible (showing overlay) but we stop here.
  }
})();

// EDITION SYNC CHECK (Runs on every page load)
(async function syncEdition() {
  try {
    const settingsRef = ref(db, "Impostazioni");
    const snapshot = await get(settingsRef);

    if (snapshot.exists()) {
      const data = snapshot.val();
      // Ensure it's a string for comparison
      const serverEdition = String(data.edizioneCorrente || "2025");
      const localEdition = localStorage.getItem("site_edition");

      console.log(`[EditionSync] Server: ${serverEdition} (${typeof serverEdition}), Local: ${localEdition} (${typeof localEdition})`);

      // If local is missing or different, update and reload
      if (localEdition !== serverEdition) {
        console.log(`[EditionSync] Updating: ${localEdition} -> ${serverEdition}`);
        localStorage.setItem("site_edition", serverEdition);

        // Reload to apply changes (unless we are just initializing for the first time?)
        // If it's the very first visit, we don't want to loop if the logic uses defaults.
        // But here we are explicit. 
        // Reload to apply changes immediately
        location.reload();
      }
    }
  } catch (error) {
    console.error("Edition Sync Failed:", error);
  }
})();

// SERVICE WORKER REGISTRATION (Cache)
document.addEventListener("DOMContentLoaded", () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW Registered (Public)', registration.scope);
      })
      .catch((error) => {
        console.log('SW Registration Failed:', error);
      });
  }
});
