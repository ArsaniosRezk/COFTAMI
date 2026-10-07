import { giornateNumerate, calcolaClassifiche, calcolaMarcatori, squadraDeiGiocatori } from "./classifica.js";

/*
===================================
STATISTICHE DEL CAMPIONATO
===================================

Solo calcoli (provati in test/statistiche.test.mjs), sulle partite delle
giornate di campionato: la fase finale non conta, come per la classifica.
*/

// Partite con risultato, dalla prima giornata all'ultima
export function partiteGiocate(partite) {
  const elenco = [];
  for (const giornata of giornateNumerate(partite)) {
    for (const partita of Object.values(partite[giornata] || {})) {
      if (!partita?.SquadraCasa || !partita?.SquadraOspite) continue;
      elenco.push({
        giornata,
        casa: partita.SquadraCasa,
        ospite: partita.SquadraOspite,
        golCasa: Number(partita.GolSquadraCasa) || 0,
        golOspite: Number(partita.GolSquadraOspite) || 0,
      });
    }
  }
  return elenco;
}

// Esito per una squadra: "V" vinta, "N" pareggiata, "P" persa
export function esitoPer(partita, squadra) {
  const fatti = partita.casa === squadra ? partita.golCasa : partita.golOspite;
  const subiti = partita.casa === squadra ? partita.golOspite : partita.golCasa;
  if (fatti > subiti) return "V";
  return fatti === subiti ? "N" : "P";
}

// Le squadre con il valore migliore (a pari merito sono più di una)
function migliori(voci, valore, { minimo = false } = {}) {
  if (!voci.length) return null;
  const valori = voci.map(valore);
  const record = minimo ? Math.min(...valori) : Math.max(...valori);
  return { valore: record, squadre: voci.filter((_, i) => valori[i] === record).map((voce) => voce.squadra) };
}

export function calcolaStatistiche(squadre, partite, { ultime = 5 } = {}) {
  const giocate = partiteGiocate(partite);
  const totaleGol = giocate.reduce((somma, p) => somma + p.golCasa + p.golOspite, 0);

  // Prima la differenza più ampia, poi più gol, poi la giornata più vecchia
  const vittoriaPiuLarga = giocate
    .filter((p) => p.golCasa !== p.golOspite)
    .reduce((record, p) => {
      if (!record) return p;
      const scarto = Math.abs(p.golCasa - p.golOspite);
      const scartoRecord = Math.abs(record.golCasa - record.golOspite);
      if (scarto !== scartoRecord) return scarto > scartoRecord ? p : record;
      return p.golCasa + p.golOspite > record.golCasa + record.golOspite ? p : record;
    }, null);

  const partitaConPiuGol = giocate.reduce(
    (record, p) => (!record || p.golCasa + p.golOspite > record.golCasa + record.golOspite ? p : record),
    null
  );

  const perSquadra = calcolaClassifiche(squadre || {}, partite || {})
    .flatMap(({ ranking }) => ranking)
    .map(([squadra, dati]) => ({ squadra, ...dati }))
    .filter((voce) => voce.playedMatches > 0);

  // Ultimi risultati di ogni squadra, dal più vecchio al più recente
  const forma = Object.keys(squadre || {})
    .map((squadra) => ({
      squadra,
      esiti: giocate
        .filter((p) => p.casa === squadra || p.ospite === squadra)
        .slice(-ultime)
        .map((p) => esitoPer(p, squadra)),
    }))
    .filter((voce) => voce.esiti.length > 0)
    .sort((a, b) => a.squadra.localeCompare(b.squadra, "it"));

  // Il migliore marcatore di ogni squadra (a parità di gol, il primo in ordine alfabetico)
  const squadraDi = squadraDeiGiocatori(squadre);
  const capocannonieri = {};
  for (const [giocatore, gol] of calcolaMarcatori(partite)) {
    const squadra = squadraDi[giocatore];
    if (squadra && !capocannonieri[squadra]) capocannonieri[squadra] = { giocatore, gol };
  }

  return {
    partite: giocate.length,
    totaleGol,
    mediaGol: giocate.length ? totaleGol / giocate.length : 0,
    pareggi: giocate.filter((p) => p.golCasa === p.golOspite).length,
    vittoriaPiuLarga,
    partitaConPiuGol,
    migliorAttacco: migliori(perSquadra, (voce) => voce.scoredGoals),
    migliorDifesa: migliori(perSquadra, (voce) => voce.concededGoals, { minimo: true }),
    forma,
    capocannonieri,
  };
}

// Partite tra due squadre e bilancio dal punto di vista della prima
export function confrontoDiretto(partite, squadraA, squadraB) {
  const incontri = partiteGiocate(partite).filter(
    (p) => (p.casa === squadraA && p.ospite === squadraB) || (p.casa === squadraB && p.ospite === squadraA)
  );
  const bilancio = { vittorieA: 0, pareggi: 0, vittorieB: 0, golA: 0, golB: 0 };
  for (const p of incontri) {
    const esito = esitoPer(p, squadraA);
    if (esito === "V") bilancio.vittorieA++;
    else if (esito === "N") bilancio.pareggi++;
    else bilancio.vittorieB++;
    bilancio.golA += p.casa === squadraA ? p.golCasa : p.golOspite;
    bilancio.golB += p.casa === squadraA ? p.golOspite : p.golCasa;
  }
  return { incontri, ...bilancio };
}
