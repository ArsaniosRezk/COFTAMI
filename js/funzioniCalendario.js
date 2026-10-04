import { recuperaCalendario, scheletroCalendario } from "./components/calendar.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";
import { osservaDivisione, mostraErroreCaricamento } from "./dati-torneo.js";

// Ascolto dei dati della divisione mostrata: va fermato quando si cambia divisione
let fermaAscolto = null;

// Sequenza esecuzione dei contenuti della pagina
// Chiamata da divisionAndVariables.js all'avvio e a ogni cambio di divisione
export async function sequenzaEsecuzione() {
  fermaAscolto?.();
  scheletroCalendario("giornate");

  fermaAscolto = osservaDivisione(
    async (dati) => {
      if (await gestisciAttesaTorneo(dati.squadre)) return;
      recuperaCalendario(dati);
    },
    { onLento: () => mostraErroreCaricamento(["giornate"]) }
  );
}
