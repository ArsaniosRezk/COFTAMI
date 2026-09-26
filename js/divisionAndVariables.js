import { paginaCorrente } from "./utils/percorso.js";

// Edizione Torneo/Anno
// Il valore viene tenuto allineato a Impostazioni/edizioneCorrente da
// edition-sync.js, che gira sia sul sito pubblico sia sul gestionale.
const edition = localStorage.getItem("site_edition") || "2025";

// Definizione variabile e funzioni per gestione divisione
let selectedDivision;

function getSelectedDivision() {
  return selectedDivision;
}

function setSelectedDivision(value) {
  selectedDivision = value;
  localStorage.setItem("selectedDivision", selectedDivision);
}

function loadSavedOption() {
  const savedOption = localStorage.getItem("selectedDivision");
  if (savedOption) {
    selectedDivision = savedOption;
  } else {
    selectedDivision = "Superiori";
  }
}

// Funzione per aggiornare entrambi gli elementi <select>
function updateSelectElement(selectId, value) {
  const selectElement = document.getElementById(selectId);
  if (selectElement) {
    selectElement.value = value;
  }
}

export {
  getSelectedDivision,
  setSelectedDivision,
  loadSavedOption,
  updateSelectElement,
  edition,
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

// Pagine che non hanno una sequenzaEsecuzione: si caricano da sole
const pagineSenzaSequenza = [
  "regolamento",
  "regolamento-test",
  "invia-report",
  "iscrizione",
  "iscrizione-test",
  "classifica-completa",
  "referti",
  "referti-social",
  "gestionale",
  "contenuti-social",
];

const pagina = paginaCorrente();
let sequenzaEsecuzioneModule = null;

if (moduliPerPagina[pagina]) {
  sequenzaEsecuzioneModule = import(moduliPerPagina[pagina]);
} else if (!pagineSenzaSequenza.includes(pagina)) {
  console.error(
    "La pagina corrente non ha una funzione sequenzaEsecuzione definita."
  );
}

const pagineEscluse = [
  "invia-report",
  "inviareport",
  "classifica-completa",
  "referti",
  "referti-social",
]; // Aggiungi qui la pagina che vuoi escludere

if (!pagineEscluse.includes(pagina)) {
  document.addEventListener("DOMContentLoaded", function () {
    loadSavedOption();
    const selectedDivision = getSelectedDivision();
    updateSelectElement("division", selectedDivision);
    updateSelectElement("division-smartphone", selectedDivision);

    // Codice per gestire il cambiamento dell'opzione selezionata
    const divisionProps = document.getElementById("division");
    if (divisionProps) {
      divisionProps.addEventListener("change", function () {
        setSelectedDivision(this.value);
        updateSelectElement("division-smartphone", this.value);

        // Una volta caricato il modulo, esegui la funzione sequenzaEsecuzione corrispondente
        if (sequenzaEsecuzioneModule) {
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
      });
    }

    const divisionSmartphoneElement = document.getElementById(
      "division-smartphone"
    );
    if (divisionSmartphoneElement) {
      divisionSmartphoneElement.addEventListener("change", function () {
        setSelectedDivision(this.value);
        updateSelectElement("division", this.value);

        // Una volta caricato il modulo, esegui la funzione sequenzaEsecuzione corrispondente
        if (sequenzaEsecuzioneModule) {
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
      });
    }

    // Chiamata alla funzione sequenzaEsecuzione solo se `sequenzaEsecuzioneModule` è definita
    if (sequenzaEsecuzioneModule) {
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
  });
}
