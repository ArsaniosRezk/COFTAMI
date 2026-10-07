import { test } from "node:test";
import assert from "node:assert/strict";
import {
  giornateNumerate,
  calcolaClassifiche,
  calcolaMarcatori,
  calcolaPosizioniGlobali,
  posizioneSquadra,
  squadraDeiGiocatori,
} from "../js/utils/classifica.js";

/*
 La classifica è il calcolo più importante del sito: questi test descrivono
 le regole (punti, penalità, scontri diretti, gironi) con piccoli esempi.
*/

// Partita giocata: "Casa:Ospite" -> dati come su Firebase
function partita(casa, ospite, golCasa, golOspite, marcatori = {}) {
  return {
    [`${casa}:${ospite}`]: {
      SquadraCasa: casa,
      SquadraOspite: ospite,
      GolSquadraCasa: golCasa,
      GolSquadraOspite: golOspite,
      Marcatori: marcatori,
    },
  };
}

const ordine = (classifica) => classifica.ranking.map(([squadra]) => squadra);

test("le giornate di campionato sono in ordine numerico e senza la fase finale", () => {
  assert.deepEqual(giornateNumerate({ 10: {}, 2: {}, 1: {}, SF: {}, F: {} }), ["1", "2", "10"]);
});

test("vittoria 3 punti, pareggio 1, sconfitta 0", () => {
  const squadre = { A: {}, B: {}, C: {} };
  const partite = {
    1: { ...partita("A", "B", 2, 0), ...partita("C", "A", 1, 1) },
  };
  const [{ girone, ranking }] = calcolaClassifiche(squadre, partite);
  assert.equal(girone, "unico");
  const punti = Object.fromEntries(ranking.map(([s, d]) => [s, d.points]));
  assert.deepEqual(punti, { A: 4, B: 0, C: 1 });

  const a = ranking.find(([s]) => s === "A")[1];
  assert.equal(a.playedMatches, 2);
  assert.equal(a.wonMatches, 1);
  assert.equal(a.drawnMatches, 1);
  assert.equal(a.scoredGoals, 3);
  assert.equal(a.concededGoals, 1);
  assert.equal(a.goalsDifference, 2);
});

test("le penalità tolgono punti in classifica", () => {
  const squadre = { A: { Penalità: 3 }, B: {} };
  const partite = { 1: partita("A", "B", 1, 0) };
  const [{ ranking }] = calcolaClassifiche(squadre, partite);
  // A ha 3 punti ma 3 di penalità: a pari punti con B (0) vale lo scontro diretto
  assert.equal(ranking[0][0], "A");
  assert.equal(ranking[0][1].points - ranking[0][1].penaltyPoints, 0);

  const squadreConPiuPenalita = { A: { Penalità: 4 }, B: {} };
  const [{ ranking: dopo }] = calcolaClassifiche(squadreConPiuPenalita, partite);
  assert.deepEqual(
    dopo.map(([s]) => s),
    ["B", "A"]
  );
});

test("a pari punti decide lo scontro diretto, anche contro la differenza reti", () => {
  const squadre = { A: {}, B: {}, C: {} };
  const partite = {
    1: partita("A", "B", 1, 0), // A batte B
    2: partita("B", "C", 9, 0), // B stravince con C
    3: partita("C", "A", 1, 0), // C batte A
  };
  // A e B hanno 3 punti; B ha differenza reti molto migliore ma ha perso con A
  const [classifica] = calcolaClassifiche(squadre, partite);
  const ordinate = ordine(classifica);
  assert.ok(ordinate.indexOf("A") < ordinate.indexOf("B"));
});

test("senza scontri diretti decidono differenza reti, gol fatti e gol subiti", () => {
  const squadre = { A: {}, B: {}, X: {}, Y: {} };
  const partite = {
    1: { ...partita("A", "X", 3, 0), ...partita("B", "Y", 2, 0) },
  };
  const [classifica] = calcolaClassifiche(squadre, partite);
  assert.deepEqual(ordine(classifica).slice(0, 2), ["A", "B"]);

  const pariDifferenza = {
    1: { ...partita("A", "X", 2, 1), ...partita("B", "Y", 3, 2) },
  };
  const [seconda] = calcolaClassifiche(squadre, pariDifferenza);
  // Stessa differenza (+1): B ha segnato di più
  assert.deepEqual(ordine(seconda).slice(0, 2), ["B", "A"]);
});

test("le squadre con girone formano classifiche separate, in ordine di girone", () => {
  const squadre = { A: { Girone: "B" }, B: { Girone: "A" }, C: { Girone: "A" }, D: { Girone: "B" } };
  const partite = { 1: { ...partita("B", "C", 1, 0), ...partita("A", "D", 0, 2) } };
  const classifiche = calcolaClassifiche(squadre, partite);
  assert.deepEqual(
    classifiche.map(({ girone }) => girone),
    ["A", "B"]
  );
  assert.deepEqual(ordine(classifiche[0]), ["B", "C"]);
  assert.deepEqual(ordine(classifiche[1]), ["D", "A"]);
});

test("le partite della fase finale non contano per la classifica", () => {
  const squadre = { A: {}, B: {} };
  const partite = { 1: partita("A", "B", 1, 0), F: partita("B", "A", 5, 0) };
  const [{ ranking }] = calcolaClassifiche(squadre, partite);
  assert.equal(ranking[0][0], "A");
  assert.equal(ranking[0][1].playedMatches, 1);
});

test("gol come stringhe o mancanti non rompono il calcolo", () => {
  const squadre = { A: {}, B: {} };
  const partite = {
    1: { "A:B": { SquadraCasa: "A", SquadraOspite: "B", GolSquadraCasa: "2", GolSquadraOspite: undefined } },
  };
  const [{ ranking }] = calcolaClassifiche(squadre, partite);
  assert.equal(ranking[0][0], "A");
  assert.equal(ranking[0][1].scoredGoals, 2);
});

test("posizione di una squadra nel suo girone", () => {
  const squadre = { A: { Girone: "A" }, B: { Girone: "A" }, C: { Girone: "B" } };
  const partite = { 1: partita("A", "B", 0, 1) };
  assert.deepEqual(
    {
      ...posizioneSquadra(squadre, partite, "A"),
      statistiche: undefined,
    },
    { girone: "A", posizione: 2, totale: 2, punti: 0, statistiche: undefined }
  );
  assert.equal(posizioneSquadra(squadre, partite, "Z"), null);
});

test("marcatori: somma dei gol, senza autogol, a pari gol in ordine alfabetico", () => {
  const partite = {
    1: partita("A", "B", 3, 1, {
      MarcatoriCasa: { Rossi: 2, AutogolOspite: 1 },
      MarcatoriOspite: { Bianchi: 1 },
    }),
    2: partita("B", "A", 1, 0, { MarcatoriCasa: { Bianchi: 1 }, MarcatoriOspite: true }),
  };
  assert.deepEqual(calcolaMarcatori(partite), [
    ["Bianchi", 2],
    ["Rossi", 2],
  ]);
});

test("a parità di gol la posizione è la stessa", () => {
  const posizioni = calcolaPosizioniGlobali([
    ["A", 5],
    ["B", 3],
    ["C", 3],
    ["D", 1],
  ]).map(({ position }) => position);
  assert.deepEqual(posizioni, [1, 2, 2, 4]);
});

test("ogni giocatore è associato alla sua squadra", () => {
  const squadre = { A: { Giocatori: { Rossi: true } }, B: { Giocatori: { Verdi: true } } };
  assert.deepEqual(squadraDeiGiocatori(squadre), { Rossi: "A", Verdi: "B" });
});
