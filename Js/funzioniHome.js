import { classificaGirone, faseFinale, prossimaGiornata } from "./funzioni.js";

// Sequenza esecuzione dei contenuti della pagina
// Esportata e importata nel header
export async function sequenzaEsecuzione() {
  classificaGirone("classifica-squadre");
  faseFinale();
  prossimaGiornata();
}
