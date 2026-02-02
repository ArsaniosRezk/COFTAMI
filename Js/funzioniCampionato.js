import { classificaGirone, classificaMarcatori } from "./components/standings.js";
import { faseFinale } from "./components/final-phase.js";

// Sequenza esecuzione dei contenuti della pagina
// Esportata e importata nel header
export async function sequenzaEsecuzione() {
  classificaGirone("classifica-squadre");
  classificaMarcatori("classifica-gol");
  faseFinale();
}
