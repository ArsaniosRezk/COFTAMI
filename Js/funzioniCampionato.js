import {
  classificaGirone,
  classificaMarcatori,
  faseFinale,
} from "./funzioni.js";

// Sequenza esecuzione dei contenuti della pagina
// Esportata e importata nel header
export async function sequenzaEsecuzione() {
  classificaGirone("classifica-squadre");
  classificaMarcatori("classifica-gol");
  faseFinale();
}
