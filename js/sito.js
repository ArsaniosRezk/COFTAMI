import { STAGING } from "./ambiente.js";
import { avviaControlloManutenzione } from "./controllo-manutenzione.js";
import { avviaMenuPagineAttive } from "./pagine-attive.js";
import { osservaImpostazioni } from "./impostazioni.js";
import { avviaConsenso, apriPreferenzeCookie } from "./consenso.js";
import { edizioneForzata, edizioneTest, tornaEdizioneCorrente } from "./divisione.js";

/*
===================================
SITO
===================================

Comportamento comune a tutte le pagine pubbliche. Header, menu e footer sono
già nell'HTML (li scrive scripts/aggiorna-pagine.mjs): qui si aggiunge solo
quello che deve reagire, cioè menu su smartphone, avvisi, pagine spente dal
gestionale, cookie e service worker.
*/

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

// HEADER: un'ombra leggera quando la pagina scorre sotto //
const header = document.querySelector(".sito-header");
if (header) {
  const aggiornaOmbra = () => header.classList.toggle("staccato", window.scrollY > 4);
  window.addEventListener("scroll", aggiornaOmbra, { passive: true });
  aggiornaOmbra();
}

// AVVISI IN CIMA ALLA PAGINA //
function avvisoInCima(testoHtml) {
  const avviso = document.createElement("div");
  avviso.className = "avviso-archivio";
  avviso.innerHTML = `<span>${testoHtml}</span>`;
  document.querySelector("main")?.prepend(avviso);
  return avviso;
}

// Chi guarda un'edizione passata (link dall'albo d'oro) deve capirlo e poter tornare indietro
if (edizioneForzata && !edizioneTest) {
  const avviso = avvisoInCima(`Stai guardando l'edizione <b>${edizioneForzata}</b>`);
  const torna = document.createElement("button");
  torna.type = "button";
  torna.textContent = "Torna all'edizione corrente";
  torna.addEventListener("click", tornaEdizioneCorrente);
  avviso.appendChild(torna);
}

// Sul sito di prova deve essere chiaro che i dati non sono quelli del torneo
if (STAGING) avvisoInCima("<b>Sito di staging</b>: dati di prova (Calcio/Test)");

// MANUTENZIONE //
avviaControlloManutenzione();

// PAGINE SPENTE DAL GESTIONALE: spariscono dai menu //
avviaMenuPagineAttive(osservaImpostazioni);

// COOKIE //
avviaConsenso();
document.querySelectorAll("[data-preferenze-cookie]").forEach((pulsante) => {
  pulsante.addEventListener("click", apriPreferenzeCookie);
});

// SERVICE WORKER (copie per l'uso offline) //
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker non registrato:", error);
    });
  });
}
