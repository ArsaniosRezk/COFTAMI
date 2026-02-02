import { recuperaCalendario } from "./components/calendar.js";

// Sequenza esecuzione dei contenuti della pagina
// Esportata e importata nel header
export async function sequenzaEsecuzione() {
  recuperaCalendario();
}
