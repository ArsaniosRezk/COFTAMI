import { classificaGirone, scheletroClassifica } from "./components/classifiche.js";
import { faseFinale } from "./components/fase-finale.js";
import { prossimaGiornata, scheletroProssimaGiornata } from "./components/calendario.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";
import { laTuaSquadra } from "./components/squadra-preferita.js";
import { osservaDivisione, mostraErroreCaricamento } from "./dati-torneo.js";
import { osservaImpostazioni, leggiImpostazioni } from "./impostazioni.js";
import { paginaAttiva } from "./pagine-attive.js";

// Ascolto dei dati della divisione mostrata: va fermato quando si cambia divisione
let fermaAscolto = null;

// La scheda resta visibile finché non viene spenta dalla dashboard, con il suo
// interruttore o con quello della pagina Calendario
osservaImpostazioni((impostazioni) => {
  const sezione = document.getElementById("sezione-prossima-giornata");
  if (sezione) {
    sezione.hidden =
      impostazioni?.prossimaGiornataHome === false || !paginaAttiva(impostazioni, "calendario");
  }
});

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

      // Con la pagina Calendario spenta le partite non si vedono nemmeno qui
      // (divisione.js riesegue la sequenza quando viene riaccesa)
      const calendarioVisibile = paginaAttiva(await leggiImpostazioni(), "calendario");

      faseFinale(dati);
      laTuaSquadra(dati, { conPartite: calendarioVisibile });
      classificaGirone("classifica-squadre", false, dati);
      if (calendarioVisibile) prossimaGiornata(dati);
    },
    {
      onLento: () => mostraErroreCaricamento(["classifica-squadre", "prossima-giornata"]),
    }
  );
}
