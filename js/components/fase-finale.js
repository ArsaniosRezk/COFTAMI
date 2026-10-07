import { db, ref, onValue, getPaths } from "../firebase.js";
import { edition } from "../divisione.js";
import { osservaImpostazioni } from "../impostazioni.js";
import { tabelloneCompilato } from "../utils/tabellone.js";
import { disegnaTabellone } from "./tabellone.js";

/*
===================================
FASE FINALE (sito)
===================================
Il tabellone si compila nel gestionale (sezione Fase finale) e sta in
Calcio/{edizione}/{divisione}/FaseFinale. Compare in cima alla home e alla
pagina Campionato quando:
- l'interruttore "Fase finale" della dashboard è acceso, e
- la divisione mostrata ha un tabellone con almeno una squadra o un risultato.

Si aggiorna da solo: un risultato inserito nel gestionale compare subito.
L'ascolto è separato da quello dei dati della divisione: un problema qui non
blocca classifica e calendario.
*/

const ID_SEZIONE = "section-fase-finale";

const stato = {
  avviato: false,
  visibile: false,
  divisione: null,
  fermaAscolto: null,
  tabellone: null,
  squadre: null,
};

function sezione() {
  let elemento = document.getElementById(ID_SEZIONE);
  if (elemento) return elemento;

  elemento = document.createElement("section");
  elemento.id = ID_SEZIONE;
  const titolo = document.createElement("h2");
  titolo.className = "section-title";
  titolo.textContent = "Fase finale";
  const contenuto = document.createElement("div");
  contenuto.className = "fase-finale-contenuto";
  elemento.append(titolo, contenuto);
  document.querySelector("main")?.prepend(elemento);
  return elemento;
}

function disegna() {
  if (!stato.visibile || !tabelloneCompilato(stato.tabellone)) {
    document.getElementById(ID_SEZIONE)?.remove();
    return;
  }
  sezione()
    .querySelector(".fase-finale-contenuto")
    .replaceChildren(disegnaTabellone(stato.tabellone, { squadre: stato.squadre || {}, edizione: edition }));
}

function ascoltaDivisione(divisione) {
  stato.fermaAscolto?.();
  stato.divisione = divisione;
  stato.tabellone = null;
  const { divisionPath } = getPaths(divisione);
  stato.fermaAscolto = onValue(
    ref(db, `${divisionPath}/FaseFinale`),
    (snapshot) => {
      stato.tabellone = snapshot.val();
      disegna();
    },
    (errore) => {
      console.warn("Tabellone della fase finale non disponibile:", errore);
      stato.tabellone = null;
      disegna();
    }
  );
}

// Da chiamare a ogni arrivo dei dati della divisione (osservaDivisione)
export function faseFinale(dati) {
  stato.squadre = dati.squadre;

  if (!stato.avviato) {
    stato.avviato = true;
    osservaImpostazioni((impostazioni) => {
      stato.visibile = Boolean(impostazioni?.faseFinale);
      disegna();
    });
  }

  if (stato.divisione !== dati.divisione) ascoltaDivisione(dati.divisione);
  else disegna();
}
