import { paginaCorrente, nomePagina } from "./utils/percorso.js";

/*
===================================
PAGINE ATTIVE
===================================

Dalla dashboard del gestionale si possono spegnere le pagine pubbliche con i
dati del torneo. Il valore sta in Impostazioni/pagineAttive:

  { home: true, campionato: false, calendario: false, squadre: false }

- Pagina spenta: al posto dei contenuti compare un avviso (pre-torneo.js) e
  il link sparisce dai menu (la Home resta: è l'ingresso del sito).
- Valore assente: la pagina è accesa. Senza squadre caricate resta comunque
  l'avviso automatico "il torneo non è ancora iniziato".
*/

export const PAGINE_CONTROLLABILI = [
  { chiave: "home", nome: "Home" },
  { chiave: "campionato", nome: "Campionato" },
  { chiave: "calendario", nome: "Calendario" },
  { chiave: "squadre", nome: "Squadre" },
];

// Nome della pagina (da paginaCorrente/nomePagina) -> interruttore che la comanda.
// La pagina di una singola squadra segue l'interruttore "Squadre".
const INTERRUTTORE_PER_PAGINA = {
  "": "home",
  campionato: "campionato",
  calendario: "calendario",
  squadre: "squadre",
  squadra: "squadre",
};

// Ultimo stato visto: i link spenti si nascondono subito, senza aspettare il server
const CHIAVE_ULTIMO_STATO = "cofta_pagine_attive";

export function interruttoreDellaPagina(nome = paginaCorrente()) {
  return INTERRUTTORE_PER_PAGINA[nome] ?? null;
}

export function paginaAttiva(impostazioni, chiave) {
  if (!chiave) return true;
  return impostazioni?.pagineAttive?.[chiave] !== false;
}

function leggiUltimoStato() {
  try {
    return JSON.parse(localStorage.getItem(CHIAVE_ULTIMO_STATO)) || {};
  } catch (errore) {
    return {};
  }
}

function salvaUltimoStato(pagineAttive) {
  try {
    localStorage.setItem(CHIAVE_ULTIMO_STATO, JSON.stringify(pagineAttive || {}));
  } catch (errore) {
    // Senza storage i link si aggiornano solo all'arrivo delle impostazioni
  }
}

// Nasconde nei menu (header, menu smartphone, footer) i link alle pagine spente.
// La Home resta sempre raggiungibile dal menu.
export function aggiornaMenu(pagineAttive) {
  document.querySelectorAll(".nav a, #overlay-menu a, .footer-menu a").forEach((link) => {
    const chiave = interruttoreDellaPagina(nomePagina(new URL(link.href).pathname));
    if (!chiave || chiave === "home") return;
    const voce = link.closest("li") || link;
    voce.hidden = pagineAttive?.[chiave] === false;
  });
}

// Da chiamare una volta dopo aver disegnato header e footer
export function avviaMenuPagineAttive(osservaImpostazioni) {
  aggiornaMenu(leggiUltimoStato());
  osservaImpostazioni((impostazioni) => {
    salvaUltimoStato(impostazioni.pagineAttive);
    aggiornaMenu(impostazioni.pagineAttive);
  });
}
