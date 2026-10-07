import { paginaCorrente, nomePagina } from "./utils/percorso.js";

/*
===================================
PAGINE ATTIVE
===================================

Dalla dashboard del gestionale si possono spegnere le pagine pubbliche. Il
valore sta in Impostazioni/pagineAttive:

  { campionato: false, calendario: true, regolamento: false, ... }

- Pagina spenta: al posto dei contenuti compare un avviso e il link sparisce
  dai menu. Le pagine con i dati del torneo mostrano l'avviso da
  pre-torneo.js, le altre (regolamento, albo d'oro, galleria) da qui.
- La Home è sempre accesa: è l'ingresso del sito.
- Valore assente: la pagina è accesa. Senza squadre caricate resta comunque
  l'avviso automatico "il torneo non è ancora iniziato".

Anche il link "Iscrizioni" sparisce dai menu quando le iscrizioni sono chiuse
(Impostazioni/iscrizioniAperte = false).
*/

export const PAGINE_CONTROLLABILI = [
  { chiave: "campionato", nome: "Campionato" },
  { chiave: "calendario", nome: "Calendario" },
  { chiave: "squadre", nome: "Squadre" },
  { chiave: "regolamento", nome: "Regolamento" },
  { chiave: "alboOro", nome: "Albo d'oro" },
  { chiave: "galleria", nome: "Galleria" },
];

// Pagine senza dati del torneo: l'avviso di pagina spenta lo mette avviaPaginaSpenta()
const PAGINE_SENZA_DATI = new Set(["regolamento", "alboOro", "galleria"]);

// Nome della pagina (da paginaCorrente/nomePagina) -> interruttore che la comanda.
// La pagina di una singola squadra segue l'interruttore "Squadre".
const INTERRUTTORE_PER_PAGINA = {
  campionato: "campionato",
  calendario: "calendario",
  squadre: "squadre",
  squadra: "squadre",
  regolamento: "regolamento",
  "albo-doro": "alboOro",
  "albo-d'oro": "alboOro",
  galleria: "galleria",
};

// Solo per i menu: il link alla pagina di iscrizione segue iscrizioniAperte
const VOCE_PER_PAGINA = { ...INTERRUTTORE_PER_PAGINA, iscrizione: "iscrizioni" };

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

// Link visibili nei menu: pagine attive più le iscrizioni
function vociVisibili(impostazioni) {
  return { ...impostazioni.pagineAttive, iscrizioni: impostazioni.iscrizioniAperte !== false };
}

function salvaUltimoStato(voci) {
  try {
    localStorage.setItem(CHIAVE_ULTIMO_STATO, JSON.stringify(voci));
  } catch (errore) {
    // Senza storage i link si aggiornano solo all'arrivo delle impostazioni
  }
}

// Nasconde nei menu (header, menu smartphone, footer) i link alle pagine spente
// e alle iscrizioni chiuse. La Home resta sempre raggiungibile dal menu.
export function aggiornaMenu(voci) {
  document.querySelectorAll(".nav a, #overlay-menu a, .footer-menu a").forEach((link) => {
    const chiave = VOCE_PER_PAGINA[nomePagina(new URL(link.href).pathname)];
    if (!chiave) return;
    const voce = link.closest("li") || link;
    voce.hidden = voci?.[chiave] === false;
  });
}

// Da chiamare una volta dopo aver disegnato header e footer
export function avviaMenuPagineAttive(osservaImpostazioni) {
  aggiornaMenu(leggiUltimoStato());
  osservaImpostazioni((impostazioni) => {
    const voci = vociVisibili(impostazioni);
    salvaUltimoStato(voci);
    aggiornaMenu(voci);
  });
}

const ID_AVVISO = "avviso-pre-torneo";

function mostraPaginaSpenta(spenta) {
  const main = document.querySelector("main");
  if (!main) return;
  main.querySelectorAll(":scope > section").forEach((sezione) => {
    if (sezione.id !== ID_AVVISO) sezione.hidden = spenta;
  });

  const avviso = document.getElementById(ID_AVVISO);
  if (!spenta) {
    avviso?.remove();
    return;
  }
  if (avviso) return;

  const nuovo = document.createElement("section");
  nuovo.id = ID_AVVISO;
  nuovo.innerHTML = `
        <i class="icona icona-futbol icona-pre-torneo" aria-hidden="true"></i>
        <p class="section-title">Pagina non disponibile</p>
        <p class="testo-pre-torneo">Questa pagina tornerà presto. Intanto trovi tutto il torneo nella home.</p>
        <a class="btn-pre-torneo" href="/">Vai alla home</a>`;
  main.prepend(nuovo);
}

// Regolamento, albo d'oro e galleria: avviso al posto dei contenuti se spente
export function avviaPaginaSpenta(osservaImpostazioni) {
  const chiave = interruttoreDellaPagina();
  if (!PAGINE_SENZA_DATI.has(chiave)) return;

  // Ultimo stato visto: niente contenuti che compaiono e poi spariscono
  if (leggiUltimoStato()[chiave] === false) mostraPaginaSpenta(true);
  osservaImpostazioni((impostazioni) => mostraPaginaSpenta(!paginaAttiva(impostazioni, chiave)));
}
