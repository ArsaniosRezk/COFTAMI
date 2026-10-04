import { classificaGirone, scheletroClassifica } from "./components/standings.js";
import { faseFinale } from "./components/final-phase.js";
import { prossimaGiornata, scheletroProssimaGiornata } from "./components/calendar.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";
import { laTuaSquadra } from "./components/squadra-preferita.js";
import { osservaDivisione, mostraErroreCaricamento } from "./dati-torneo.js";
import { leggiImpostazioni } from "./impostazioni.js";

// Ascolto dei dati della divisione mostrata: va fermato quando si cambia divisione
let fermaAscolto = null;

// Sequenza esecuzione dei contenuti della pagina
// Chiamata da divisionAndVariables.js all'avvio e a ogni cambio di divisione
export async function sequenzaEsecuzione() {
  fermaAscolto?.();
  scheletroClassifica("classifica-squadre");
  scheletroProssimaGiornata("prossima-giornata");

  let faseFinaleMostrata = false;

  fermaAscolto = osservaDivisione(
    async (dati) => {
      // Se il torneo dell'edizione corrente non è ancora iniziato mostra
      // l'avviso d'attesa al posto di classifica e prossima giornata
      if (await gestisciAttesaTorneo(dati.squadre)) return;

      if (!faseFinaleMostrata) {
        faseFinaleMostrata = true;
        const impostazioni = await leggiImpostazioni();
        if (impostazioni.faseFinale) faseFinale();
      }

      laTuaSquadra(dati);
      classificaGirone("classifica-squadre", false, dati);
      prossimaGiornata(dati);
    },
    {
      onLento: () => mostraErroreCaricamento(["classifica-squadre", "prossima-giornata"]),
    }
  );
}
