import { STAGING } from "./ambiente.js";

/*
===================================
CONSENSO AI COOKIE
===================================

Google Analytics usa cookie di profilazione statistica: si carica solo dopo
che il visitatore ha scelto "Accetta" nel banner. Rifiutare o chiudere il
banner non carica nulla.

La scelta resta salvata nel browser (localStorage) e il banner non
ricompare prima di 6 mesi, come chiedono le linee guida del Garante privacy.
Dal footer ("Preferenze cookie") la si può cambiare in ogni momento.
Sullo staging e in locale Analytics non si carica mai.
*/

const ID_ANALYTICS = "G-LHN9QNCZV6";
const CHIAVE = "cofta_consenso_cookie";
const DURATA_SCELTA_MS = 182 * 24 * 60 * 60 * 1000;

function leggiScelta() {
  try {
    const scelta = JSON.parse(localStorage.getItem(CHIAVE));
    if (!scelta || Date.now() - scelta.data > DURATA_SCELTA_MS) return null;
    return scelta.analytics === true ? "si" : "no";
  } catch (errore) {
    return null;
  }
}

function salvaScelta(analytics) {
  try {
    localStorage.setItem(CHIAVE, JSON.stringify({ analytics, data: Date.now() }));
  } catch (errore) {
    // Senza storage il banner ricomparirà alla prossima visita
  }
}

let analyticsCaricato = false;

function caricaAnalytics() {
  if (analyticsCaricato || STAGING) return;
  analyticsCaricato = true;

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", ID_ANALYTICS);

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${ID_ANALYTICS}`;
  document.head.appendChild(script);
}

// Toglie i cookie di Analytics già salvati (quando si revoca il consenso)
function cancellaCookieAnalytics() {
  const dominio = location.hostname.replace(/^www\./, "");
  document.cookie.split(";").forEach((voce) => {
    const nome = voce.split("=")[0].trim();
    if (!nome.startsWith("_ga")) return;
    for (const suffisso of ["", `; domain=${dominio}`, `; domain=.${dominio}`]) {
      document.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${suffisso}`;
    }
  });
}

function mostraBanner() {
  if (document.getElementById("banner-cookie")) return;

  const banner = document.createElement("div");
  banner.id = "banner-cookie";
  banner.className = "banner-cookie";
  banner.setAttribute("role", "dialog");
  banner.setAttribute("aria-labelledby", "banner-cookie-titolo");
  banner.innerHTML = `
    <h2 id="banner-cookie-titolo">Cookie e statistiche</h2>
    <p>
      Usiamo solo i cookie tecnici necessari al sito. Con il tuo consenso usiamo anche
      Google Analytics per contare le visite in forma aggregata.
      Dettagli nell'<a href="/privacy.html#cookie">informativa</a>.
    </p>
    <div class="banner-cookie-azioni">
      <button type="button" class="banner-cookie-rifiuta">Rifiuta</button>
      <button type="button" class="banner-cookie-accetta">Accetta</button>
    </div>
  `;

  const chiudi = (analytics) => {
    salvaScelta(analytics);
    banner.remove();
    if (analytics) caricaAnalytics();
    else {
      cancellaCookieAnalytics();
      // Analytics già caricato in questa pagina: si ferma solo ricaricando
      if (analyticsCaricato) location.reload();
    }
  };

  banner.querySelector(".banner-cookie-rifiuta").addEventListener("click", () => chiudi(false));
  banner.querySelector(".banner-cookie-accetta").addEventListener("click", () => chiudi(true));
  document.body.appendChild(banner);
}

export function avviaConsenso() {
  const scelta = leggiScelta();
  if (scelta === "si") caricaAnalytics();
  else if (scelta === null) mostraBanner();
}

export function apriPreferenzeCookie() {
  mostraBanner();
  document.querySelector("#banner-cookie button")?.focus();
}
