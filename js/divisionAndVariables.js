import { paginaCorrente } from "./utils/percorso.js";

/*
===================================
EDIZIONE
===================================

L'edizione da mostrare è Impostazioni/edizioneCorrente. impostazioni.js la
legge all'avvio e la imposta qui con impostaEdizione(): `edition` è un export
"vivo", quindi chi lo importa vede sempre il valore aggiornato.
Le pagine aspettano impostazioniPronte prima di leggere dati del torneo, così
non serve più ricaricare la pagina quando l'edizione salvata è vecchia.

Edizione forzata dall'indirizzo:
- ?edizione=Test apre Calcio/Test, per provare il gestionale senza toccare i
  dati veri. Non passa dallo storage: chiudendo la pagina si torna all'edizione
  reale.
- Sul sito pubblico ?edizione=2025 (o un altro anno) mostra un'edizione
  passata. Resta valida per la scheda aperta (sessionStorage), così si può
  navigare tra classifica, calendario e squadre di quell'anno.
*/

const EDIZIONE_TEST = "Test";
const CHIAVE_EDIZIONE = "site_edition";
const CHIAVE_ARCHIVIO = "cofta_edizione_archivio";
const FORMATO_EDIZIONE = /^(\d{4}|Test)$/;

const paginaGestionale = ["gestionale", "contenuti-social"].includes(paginaCorrente());

function leggiStorage(storage, chiave) {
  try {
    return storage.getItem(chiave);
  } catch (errore) {
    return null;
  }
}

function scriviStorage(storage, chiave, valore) {
  try {
    if (valore === null) storage.removeItem(chiave);
    else storage.setItem(chiave, valore);
  } catch (errore) {
    // Storage non disponibile (es. navigazione privata): si prosegue senza
  }
}

// Pagine che scrivono dati: lavorano sempre sull'edizione corrente
// (al massimo su Test, se chiesto esplicitamente)
const paginaDiInvio = ["iscrizione", "iscrizione-test", "invia-report"].includes(paginaCorrente());

function edizioneDaIndirizzo() {
  const richiesta = new URLSearchParams(location.search).get("edizione");
  if (paginaDiInvio) return richiesta === EDIZIONE_TEST ? richiesta : null;
  if (richiesta && FORMATO_EDIZIONE.test(richiesta)) {
    if (!paginaGestionale && richiesta !== EDIZIONE_TEST) {
      scriviStorage(sessionStorage, CHIAVE_ARCHIVIO, richiesta);
    }
    return richiesta;
  }
  return paginaGestionale ? null : leggiStorage(sessionStorage, CHIAVE_ARCHIVIO);
}

// Edizione scelta dall'indirizzo (Test o un anno passato), altrimenti null
const edizioneForzata = edizioneDaIndirizzo();
const edizioneTest = edizioneForzata === EDIZIONE_TEST;

// Valore iniziale: serve solo finché non arriva Impostazioni/edizioneCorrente
let edition =
  edizioneForzata ||
  leggiStorage(localStorage, CHIAVE_EDIZIONE) ||
  String(new Date().getFullYear());

// Chiamata da impostazioni.js con il valore del server.
// Con un'edizione forzata dall'indirizzo il server non la sovrascrive.
function impostaEdizione(edizioneServer) {
  if (!edizioneServer) return;
  scriviStorage(localStorage, CHIAVE_EDIZIONE, String(edizioneServer));
  if (!edizioneForzata) edition = String(edizioneServer);
}

// Esce dalla vista di un'edizione passata e torna a quella corrente
function tornaEdizioneCorrente() {
  scriviStorage(sessionStorage, CHIAVE_ARCHIVIO, null);
  const indirizzo = new URL(location.href);
  indirizzo.searchParams.delete("edizione");
  location.href = indirizzo.href;
}

// Definizione variabile e funzioni per gestione divisione
const DIVISIONI = ["Superiori", "Giovani"];
let selectedDivision;

function getSelectedDivision() {
  return selectedDivision;
}

function setSelectedDivision(value) {
  selectedDivision = value;
  scriviStorage(localStorage, "selectedDivision", selectedDivision);
}

function loadSavedOption() {
  const savedOption = leggiStorage(localStorage, "selectedDivision");
  selectedDivision = DIVISIONI.includes(savedOption) ? savedOption : "Superiori";
}

// Allinea il select #division e i pulsanti del selettore nell'header
function updateSelectElement(selectId, value) {
  const selectElement = document.getElementById(selectId);
  if (selectElement) {
    selectElement.value = value;
  }
  document.querySelectorAll(".division-switch button[data-division]").forEach((pulsante) => {
    const scelto = pulsante.dataset.division === value;
    pulsante.classList.toggle("selected", scelto);
    pulsante.setAttribute("aria-pressed", String(scelto));
  });
}

export {
  getSelectedDivision,
  setSelectedDivision,
  loadSavedOption,
  updateSelectElement,
  impostaEdizione,
  tornaEdizioneCorrente,
  edition,
  edizioneTest,
  edizioneForzata,
  DIVISIONI,
};

// Logica per il caricamento delle funzioni
// I nomi sono normalizzati da paginaCorrente(), quindi valgono sia per
// /campionato.html sia per /campionato.
const moduliPerPagina = {
  "": "./funzioniHome.js", // vale sia per / sia per /index.html
  campionato: "./funzioniCampionato.js",
  squadre: "./funzioniSquadre.js",
  calendario: "./funzioniCalendario.js",
  "albo-d'oro": "./funzioniAlboOro.js",
};

const pagina = paginaCorrente();
const sequenzaEsecuzioneModule = moduliPerPagina[pagina]
  ? import(moduliPerPagina[pagina])
  : null;

// Pagine con il selettore della divisione nell'header
const pagineConDivisione = ["", "campionato", "squadre", "calendario"];

async function eseguiSequenza() {
  if (!sequenzaEsecuzioneModule) return;
  const module = await sequenzaEsecuzioneModule;
  if (module && module.sequenzaEsecuzione) {
    module.sequenzaEsecuzione();
  } else {
    console.error(
      "Il modulo della pagina corrente non contiene una funzione sequenzaEsecuzione."
    );
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  loadSavedOption();

  // Altre pagine hanno un loro select "division" (es. il modulo del referto):
  // si tocca solo quello dell'header e del gestionale
  const divisionSelect = document.getElementById("division");
  const conSelettore = pagineConDivisione.includes(pagina) || pagina === "gestionale";

  if (divisionSelect && conSelettore) {
    updateSelectElement("division", getSelectedDivision());

    divisionSelect.addEventListener("change", function () {
      setSelectedDivision(this.value);
      updateSelectElement("division", this.value);
      eseguiSequenza();
    });

    // I pulsanti dell'header comandano il select, che resta l'unica fonte del valore
    // (il gestionale ha i suoi, gestiti da gestionale.js)
    document.querySelectorAll("my-header .division-switch").forEach((selettore) => {
      selettore.addEventListener("click", (evento) => {
        const pulsante = evento.target.closest("button[data-division]");
        if (!pulsante || pulsante.dataset.division === divisionSelect.value) return;
        divisionSelect.value = pulsante.dataset.division;
        divisionSelect.dispatchEvent(new Event("change"));
      });
    });
  }

  if (!sequenzaEsecuzioneModule) return;

  // Prima di leggere i dati serve l'edizione corrente
  const { impostazioniPronte } = await import("./impostazioni.js");
  await impostazioniPronte;
  eseguiSequenza();
});
