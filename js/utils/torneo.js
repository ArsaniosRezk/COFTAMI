import { edition } from "../divisione.js";
import { giornateNumerate } from "./classifica.js";

/*
===================================
FUNZIONI DEL TORNEO
===================================

Piccole funzioni sui dati del torneo usate da più pagine (home, calendario,
pagina squadra, gestionale).
*/

// Le chiavi su Firebase non ammettono il punto: "S_ Giorgio" -> "S. Giorgio"
export function nomeSquadra(chiave) {
  return String(chiave || "").replace(/_/g, ".");
}

// Indirizzo della pagina di una squadra
export function linkSquadra(chiave, divisione) {
  const parametri = new URLSearchParams({ divisione, nome: chiave });
  return `/squadra.html?${parametri}`;
}

// Giornate di campionato in ordine numerico (vedi utils/classifica.js)
export { giornateNumerate };

// Una partita del calendario è giocata quando ha un risultato
export function haRisultato(partita) {
  const risultato = String(partita?.Risultato ?? "").trim();
  return risultato !== "" && risultato !== "VS";
}

/*
 Giornata da mostrare in home.
 Il gestionale può fissarla a mano; se non è impostata (o è "auto") si parte
 dall'ultima giornata con almeno un risultato: se ha ancora partite in
 programma è quella in corso, altrimenti si passa alla successiva. Senza
 nessun risultato si mostra la prima.
 Le partite senza risultato con la data già passata o svuotata ("da definire")
 sono recuperi e non tengono ferma la giornata.
*/
export const GIORNATA_AUTOMATICA = "auto";

export function giornataCorrente(calendario, impostata = null, adesso = new Date()) {
  const valore = impostata === null || impostata === undefined ? "" : String(impostata).trim();
  if (valore !== "" && valore !== GIORNATA_AUTOMATICA) return valore;

  const giornate = giornateNumerate(calendario);
  if (giornate.length === 0) return null;

  const partiteDi = (giornata) => Object.values(calendario[giornata] || {});

  let indice = giornate.length - 1;
  while (indice >= 0 && !partiteDi(giornate[indice]).some(haRisultato)) indice--;
  if (indice < 0) return giornate[0];

  const ultima = giornate[indice];
  const partite = partiteDi(ultima);
  const oggi = new Date(adesso.getFullYear(), adesso.getMonth(), adesso.getDate());
  // Se la giornata non ha date non si distingue un recupero da una partita in programma
  const conDate = partite.some((partita) => dataPartita(partita));
  const inProgramma = partite.some((partita) => {
    if (haRisultato(partita)) return false;
    const data = dataPartita(partita);
    return data ? data >= oggi : !conDate;
  });
  if (inProgramma) return ultima;
  return giornate[indice + 1] ?? ultima;
}

// Anno delle partite: le date sul calendario sono "gg/mm" senza anno
function annoEdizione() {
  const anno = parseInt(edition, 10);
  return Number.isNaN(anno) ? new Date().getFullYear() : anno;
}

// Data e ora di una partita, oppure null se mancano
export function dataPartita(partita) {
  const [giorno, mese] = String(partita?.Data || "")
    .split("/")
    .map(Number);
  if (!giorno || !mese) return null;

  const [ore, minuti] = String(partita?.Orario || "")
    .split(":")
    .map(Number);
  return new Date(annoEdizione(), mese - 1, giorno, ore || 0, minuti || 0);
}

export function stessoGiorno(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

// "giocata", "oggi" o "da giocare"
export function statoPartita(partita, adesso = new Date()) {
  if (haRisultato(partita)) return "giocata";
  const data = dataPartita(partita);
  if (data && stessoGiorno(data, adesso)) return "oggi";
  return "da giocare";
}

// Tutte le partite del calendario in cui gioca una squadra, in ordine di giornata
export function partiteDellaSquadra(calendario, squadra) {
  const elenco = [];
  for (const giornata of giornateNumerate(calendario)) {
    for (const [chiave, dati] of Object.entries(calendario[giornata] || {})) {
      const [casa, ospite] = chiave.split(":");
      if (casa === squadra || ospite === squadra) {
        elenco.push({ giornata, chiave, casa, ospite, dati });
      }
    }
  }
  return elenco;
}

// Link a Google Maps per il campo di gioco
export function linkMappa(luogo) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(luogo)}`;
}

/*
-----------------------------------
SQUADRA PREFERITA
-----------------------------------
Salvata solo su questo dispositivo: { divisione, nome }
*/

const CHIAVE_PREFERITA = "cofta_squadra_preferita";

export function squadraPreferita() {
  try {
    const salvata = JSON.parse(localStorage.getItem(CHIAVE_PREFERITA));
    return salvata && salvata.nome && salvata.divisione ? salvata : null;
  } catch (errore) {
    return null;
  }
}

export function impostaSquadraPreferita(divisione, nome) {
  try {
    if (nome) {
      localStorage.setItem(CHIAVE_PREFERITA, JSON.stringify({ divisione, nome }));
    } else {
      localStorage.removeItem(CHIAVE_PREFERITA);
    }
  } catch (errore) {
    console.warn("Impossibile salvare la squadra preferita", errore);
  }
}

export function eSquadraPreferita(divisione, nome) {
  const preferita = squadraPreferita();
  return Boolean(preferita && preferita.divisione === divisione && preferita.nome === nome);
}
