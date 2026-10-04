import { visualizzaSquadreConMembri } from "./components/teams.js";
import { gestisciAttesaTorneo } from "./components/pre-torneo.js";
import { osservaDivisione, mostraErroreCaricamento } from "./dati-torneo.js";

// Ascolto dei dati della divisione mostrata: va fermato quando si cambia divisione
let fermaAscolto = null;

// Sequenza esecuzione dei contenuti della pagina
// Chiamata da divisionAndVariables.js all'avvio e a ogni cambio di divisione
export async function sequenzaEsecuzione() {
  fermaAscolto?.();
  const contenitore = document.getElementById("teams-container");
  if (contenitore) {
    contenitore.innerHTML = Array(6)
      .fill('<div class="squadra skeleton" aria-hidden="true"></div>')
      .join("");
  }

  fermaAscolto = osservaDivisione(
    async (dati) => {
      if (await gestisciAttesaTorneo(dati.squadre)) return;
      visualizzaSquadreConMembri(dati);
    },
    { onLento: () => mostraErroreCaricamento(["teams-container"]) }
  );
}
