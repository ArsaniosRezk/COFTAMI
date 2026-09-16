import { classificaGirone, classificaMarcatori } from "./components/standings.js";
import { faseFinale } from "./components/final-phase.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";

// Sequenza esecuzione dei contenuti della pagina
// Esportata e importata nel header
export async function sequenzaEsecuzione() {
  if (await gestisciAttesaTorneo()) return;

  classificaGirone("classifica-squadre");
  classificaMarcatori("classifica-gol");
  faseFinale();
}
