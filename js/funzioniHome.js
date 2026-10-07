import { classificaGirone, scheletroClassifica } from "./components/classifiche.js";
import { faseFinale } from "./components/fase-finale.js";
import { prossimaGiornata, scheletroProssimaGiornata } from "./components/calendario.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";
import { laTuaSquadra } from "./components/squadra-preferita.js";
import { osservaDivisione, mostraErroreCaricamento } from "./dati-torneo.js";

// Ascolto dei dati della divisione mostrata: va fermato quando si cambia divisione
let fermaAscolto = null;

// Sequenza esecuzione dei contenuti della pagina
// Chiamata da divisione.js all'avvio e a ogni cambio di divisione
export async function sequenzaEsecuzione() {
  fermaAscolto?.();
  scheletroClassifica("classifica-squadre");
  scheletroProssimaGiornata("prossima-giornata");

  fermaAscolto = osservaDivisione(
    async (dati) => {
      // Se il torneo dell'edizione corrente non è ancora iniziato mostra
      // l'avviso d'attesa al posto di classifica e prossima giornata
      if (await gestisciAttesaTorneo(dati.squadre)) return;

      faseFinale(dati);
      laTuaSquadra(dati);
      classificaGirone("classifica-squadre", false, dati);
      prossimaGiornata(dati);
    },
    {
      onLento: () => mostraErroreCaricamento(["classifica-squadre", "prossima-giornata"]),
    }
  );
}
