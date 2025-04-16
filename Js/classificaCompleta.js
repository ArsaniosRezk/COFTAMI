import { classificaGirone } from "./funzioni.js";
import { setSelectedDivision, edition } from "./divisionAndVariables.js";

// Funzione per caricare entrambe le classifiche
async function caricaClassificheComplete() {
  // Carica classifica "Superiori"
  setSelectedDivision("Superiori");
  await classificaGirone("superiori");

  // Carica classifica "Giovani"
  setSelectedDivision("Giovani");
  await classificaGirone("giovani");
}

// Avvia dopo caricamento pagina
window.onload = caricaClassificheComplete;
