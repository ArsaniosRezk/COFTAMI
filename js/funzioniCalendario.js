import { recuperaCalendario } from "./components/calendar.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";

// Sequenza esecuzione dei contenuti della pagina
// Esportata e importata nel header
export async function sequenzaEsecuzione() {
  if (await gestisciAttesaTorneo()) return;

  recuperaCalendario();
}
