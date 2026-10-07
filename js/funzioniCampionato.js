import {
  classificaGirone,
  classificaMarcatori,
  scheletroClassifica,
  scheletroMarcatori,
} from "./components/classifiche.js";
import { faseFinale } from "./components/fase-finale.js";
import { statisticheCampionato } from "./components/statistiche.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";
import { osservaDivisione, mostraErroreCaricamento } from "./dati-torneo.js";

// Ascolto dei dati della divisione mostrata: va fermato quando si cambia divisione
let fermaAscolto = null;

// Sequenza esecuzione dei contenuti della pagina
// Chiamata da divisione.js all'avvio e a ogni cambio di divisione
export async function sequenzaEsecuzione() {
  fermaAscolto?.();
  scheletroClassifica("classifica-squadre");
  scheletroMarcatori("classifica-gol");
  scheletroMarcatori("statistiche");

  let faseFinaleMostrata = false;

  fermaAscolto = osservaDivisione(
    async (dati) => {
      if (await gestisciAttesaTorneo(dati.squadre)) return;

      classificaGirone("classifica-squadre", false, dati);
      classificaMarcatori("classifica-gol", dati);
      statisticheCampionato("statistiche", dati);

      if (!faseFinaleMostrata) {
        faseFinaleMostrata = true;
        faseFinale();
      }
    },
    {
      onLento: () => mostraErroreCaricamento(["classifica-squadre", "classifica-gol", "statistiche"]),
    }
  );
}
