import { db, ref, onValue, getPaths } from "./firebase.js";

/*
===================================
DATI DEL TORNEO IN TEMPO REALE
===================================

Le pagine pubbliche ascoltano i nodi della divisione invece di leggerli una
volta: le letture partono tutte insieme (non una dopo l'altra) e quando il
gestionale conferma un risultato classifica e calendario si aggiornano da soli.

osservaDivisione(callback, opzioni) chiama callback(dati) quando sono arrivati
tutti i nodi e poi a ogni modifica. Restituisce una funzione che interrompe
l'ascolto (da chiamare quando si cambia divisione).

dati = { divisione, squadre, partite, calendario, giornataImpostata, daCopia }

COPIA LOCALE
L'ultima versione ricevuta resta salvata nel browser: alla visita successiva
la pagina si disegna subito con quella (daCopia = true) e un attimo dopo
arrivano i dati aggiornati, che la sostituiscono. Senza rete restano visibili
i dati dell'ultima visita invece degli scheletri di caricamento.

STATO DEL COLLEGAMENTO
Gli elementi con l'attributo data-stato-aggiornamento mostrano se i dati sono
in tempo reale, quando è arrivato l'ultimo aggiornamento o se si è offline.
*/

const RITARDO_AGGIORNAMENTO_MS = 50;
const ATTESA_LENTA_MS = 10000;
const RITARDO_SALVATAGGIO_MS = 1000;
const PREFISSO_COPIA = "cofta_copia_";

function leggiCopia(chiave) {
  try {
    return JSON.parse(localStorage.getItem(PREFISSO_COPIA + chiave));
  } catch (errore) {
    return null;
  }
}

function salvaCopia(chiave, dati) {
  try {
    localStorage.setItem(PREFISSO_COPIA + chiave, JSON.stringify({ dati, quando: Date.now() }));
  } catch (errore) {
    // Storage pieno o non disponibile: alla prossima visita si aspetta la rete
  }
}

/*
-----------------------------------
STATO DEL COLLEGAMENTO
-----------------------------------
*/

const stato = { collegato: null, ultimoAggiornamento: null, copiaDel: null };
const formatoOra = new Intl.DateTimeFormat("it-IT", { hour: "2-digit", minute: "2-digit" });
const formatoGiorno = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "2-digit" });

function testoStato() {
  if (stato.collegato === false) {
    if (!stato.copiaDel) return "Offline";
    const quando = new Date(stato.copiaDel);
    return `Offline · dati del ${formatoGiorno.format(quando)} alle ${formatoOra.format(quando)}`;
  }
  if (stato.collegato === null) return "";
  if (stato.ultimoAggiornamento) return `Aggiornato alle ${formatoOra.format(stato.ultimoAggiornamento)}`;
  return "Risultati in tempo reale";
}

function mostraStato() {
  const testo = testoStato();
  document.querySelectorAll("[data-stato-aggiornamento]").forEach((elemento) => {
    elemento.textContent = testo;
    elemento.classList.toggle("offline", stato.collegato === false);
  });
}

let statoAvviato = false;

function avviaStato() {
  if (statoAvviato) return;
  statoAvviato = true;
  // .info/connected: true quando il collegamento in tempo reale con Firebase è attivo
  onValue(ref(db, ".info/connected"), (snapshot) => {
    stato.collegato = snapshot.val() === true;
    mostraStato();
  });
}

/*
-----------------------------------
ASCOLTO DELLA DIVISIONE
-----------------------------------
*/

export function osservaDivisione(callback, { divisione = null, onLento = null, onErrore = null } = {}) {
  const { divisionPath, matchdayToShowPath } = getPaths(divisione);
  const divisioneScelta = divisionPath.split("/").pop();

  const percorsi = {
    squadre: `${divisionPath}/Squadre`,
    partite: `${divisionPath}/Partite`,
    calendario: `${divisionPath}/Calendario`,
    giornata: `${divisionPath}/GiornataDaMostrare`,
    giornataGlobale: matchdayToShowPath,
  };

  const valori = {};
  const arrivati = new Set();
  let attivo = true;
  let primaVolta = true;
  let timer = null;
  let timerSalvataggio = null;

  avviaStato();

  const componi = () => ({
    divisione: divisioneScelta,
    squadre: valori.squadre || null,
    partite: valori.partite || null,
    calendario: valori.calendario || null,
    giornataImpostata: valori.giornata ?? valori.giornataGlobale ?? null,
    daCopia: false,
  });

  // Copia dell'ultima visita: si disegna subito, in attesa dei dati veri
  const copia = leggiCopia(divisionPath);
  if (copia?.dati) {
    stato.copiaDel = copia.quando;
    mostraStato();
    callback({ ...copia.dati, divisione: divisioneScelta, daCopia: true });
  }

  const notifica = () => {
    if (!attivo || arrivati.size < Object.keys(percorsi).length) return;

    const dati = componi();
    clearTimeout(timerSalvataggio);
    timerSalvataggio = setTimeout(() => salvaCopia(divisionPath, dati), RITARDO_SALVATAGGIO_MS);

    // Il primo disegno è immediato; le modifiche successive arrivano spesso
    // a gruppi (risultato + marcatori): si aspetta un attimo e si ridisegna una volta
    if (primaVolta) {
      primaVolta = false;
      stato.copiaDel = null;
      callback(dati);
      return;
    }
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!attivo) return;
      stato.ultimoAggiornamento = new Date();
      mostraStato();
      callback(componi());
    }, RITARDO_AGGIORNAMENTO_MS);
  };

  const annulla = Object.entries(percorsi).map(([nome, percorso]) =>
    onValue(
      ref(db, percorso),
      (snapshot) => {
        valori[nome] = snapshot.val();
        arrivati.add(nome);
        notifica();
      },
      (errore) => {
        console.error(`Errore nella lettura di ${percorso}:`, errore);
        if (attivo) onErrore?.(errore);
      }
    )
  );

  // Senza rete Firebase resta in attesa: dopo qualche secondo lo si dice
  // (solo se non c'è nemmeno la copia dell'ultima visita da mostrare)
  const timerLento = setTimeout(() => {
    if (attivo && primaVolta) onLento?.();
  }, ATTESA_LENTA_MS);

  return () => {
    attivo = false;
    clearTimeout(timer);
    clearTimeout(timerLento);
    clearTimeout(timerSalvataggio);
    annulla.forEach((stop) => stop());
  };
}

// Messaggio al posto degli scheletri di caricamento quando la rete non risponde
export function mostraErroreCaricamento(idContenitori, messaggio = null) {
  const testo =
    messaggio ||
    (navigator.onLine === false
      ? "Sei offline: i dati compariranno appena torna la connessione."
      : "Il caricamento sta impiegando più del previsto.");

  for (const id of idContenitori) {
    const contenitore = document.getElementById(id);
    if (!contenitore || !contenitore.querySelector(".skeleton")) continue;

    contenitore.innerHTML = "";
    const avviso = document.createElement("div");
    avviso.className = "avviso-vuoto avviso-errore";

    const paragrafo = document.createElement("p");
    paragrafo.textContent = testo;
    avviso.appendChild(paragrafo);

    const riprova = document.createElement("button");
    riprova.type = "button";
    riprova.className = "btn-riprova";
    riprova.textContent = "Riprova";
    riprova.addEventListener("click", () => location.reload());
    avviso.appendChild(riprova);

    contenitore.appendChild(avviso);
  }
}
