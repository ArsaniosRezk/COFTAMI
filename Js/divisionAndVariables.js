// Edizione Torneo/Anno
const edition = "2023-2024";

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
let sequenzaEsecuzioneModule;

switch (window.location.pathname) {
  case "/":
    sequenzaEsecuzioneModule = import("./funzioniHome.js");
    break;
  case "/index.html":
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
  case "/invia-report.html":
  case "/classifica-completa.html":
  case "/referti.html":
  case "/referti-social.html":
  case "/gestionale.html":
    // Per queste pagine, non è necessario definire `sequenzaEsecuzioneModule`
    sequenzaEsecuzioneModule = null;
    break;
  default:
    console.error(
      "La pagina corrente non ha una funzione sequenzaEsecuzione definita."
    );
    sequenzaEsecuzioneModule = null;
    break;
}

const excludedPaths = [
  "/invia-report.html",
  "/inviareport",
  "/classifica-completa.html",
  "/referti.html",
  "/referti-social.html",
]; // Aggiungi qui la pagina che vuoi escludere

if (!excludedPaths.includes(window.location.pathname)) {
  window.onload = function () {
    loadSavedOption();
    const selectedDivision = getSelectedDivision();
    updateSelectElement("division", selectedDivision);
    updateSelectElement("division-smartphone", selectedDivision);

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
  };

  // Codice per gestire il cambiamento dell'opzione selezionata
  document.getElementById("division").addEventListener("change", function () {
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
}
