import { test } from "node:test";
import assert from "node:assert/strict";
import { calcolaStatistiche, confrontoDiretto, esitoPer, partiteGiocate } from "../js/utils/statistiche.js";
import { TELEFONO_REGEX, pulisciTelefono, telefonoValido } from "../js/utils/contatti.js";

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

const squadre = {
  A: { Giocatori: { Rossi: true, Neri: true } },
  B: { Giocatori: { Bianchi: true } },
  C: { Giocatori: { Verdi: true } },
};

const partite = {
  1: { ...partita("A", "B", 4, 0, { MarcatoriCasa: { Rossi: 3, Neri: 1 } }), ...partita("C", "C2", 0, 0) },
  2: { ...partita("B", "C", 2, 2, { MarcatoriCasa: { Bianchi: 2 }, MarcatoriOspite: { Verdi: 2 } }) },
  3: { ...partita("C", "A", 1, 3, { MarcatoriCasa: { Verdi: 1 }, MarcatoriOspite: { Rossi: 1, Neri: 2 } }) },
  F: partita("A", "C", 9, 9),
};

test("le partite giocate seguono l'ordine delle giornate e saltano la fase finale", () => {
  const elenco = partiteGiocate(partite);
  assert.deepEqual(
    elenco.map((p) => `${p.giornata} ${p.casa}-${p.ospite}`),
    ["1 A-B", "1 C-C2", "2 B-C", "3 C-A"]
  );
});

test("esito dal punto di vista di una squadra", () => {
  const [ab] = partiteGiocate(partite);
  assert.equal(esitoPer(ab, "A"), "V");
  assert.equal(esitoPer(ab, "B"), "P");
  assert.equal(esitoPer({ casa: "X", ospite: "Y", golCasa: 1, golOspite: 1 }, "Y"), "N");
});

test("numeri del campionato e record", () => {
  const stat = calcolaStatistiche(squadre, partite);
  assert.equal(stat.partite, 4);
  assert.equal(stat.totaleGol, 4 + 0 + 4 + 4);
  assert.equal(stat.mediaGol, 3);
  assert.equal(stat.pareggi, 2);

  assert.deepEqual(
    { casa: stat.vittoriaPiuLarga.casa, ospite: stat.vittoriaPiuLarga.ospite },
    { casa: "A", ospite: "B" }
  );
  // 4 gol in tre partite: a parità vince la prima giornata
  assert.equal(stat.partitaConPiuGol.giornata, "1");

  assert.deepEqual(stat.migliorAttacco, { valore: 7, squadre: ["A"] });
  // C2 non è tra le squadre del torneo: non entra nei record
  assert.deepEqual(stat.migliorDifesa, { valore: 1, squadre: ["A"] });
});

test("forma: ultimi risultati di ogni squadra, dal più vecchio", () => {
  const { forma } = calcolaStatistiche(squadre, partite);
  const di = (squadra) => forma.find((voce) => voce.squadra === squadra)?.esiti;
  assert.deepEqual(di("A"), ["V", "V"]);
  assert.deepEqual(di("B"), ["P", "N"]);
  assert.deepEqual(di("C"), ["N", "N", "P"]);
});

test("il bomber di ogni squadra", () => {
  const { capocannonieri } = calcolaStatistiche(squadre, partite);
  assert.deepEqual(capocannonieri.A, { giocatore: "Rossi", gol: 4 });
  assert.deepEqual(capocannonieri.C, { giocatore: "Verdi", gol: 3 });
});

test("confronto diretto tra due squadre", () => {
  const confronto = confrontoDiretto(partite, "C", "A");
  assert.equal(confronto.incontri.length, 1);
  assert.deepEqual(
    {
      v: confronto.vittorieA,
      n: confronto.pareggi,
      p: confronto.vittorieB,
      fatti: confronto.golA,
      subiti: confronto.golB,
    },
    { v: 0, n: 0, p: 1, fatti: 1, subiti: 3 }
  );
  assert.equal(confrontoDiretto(partite, "A", "Z").incontri.length, 0);
});

test("senza partite le statistiche sono vuote", () => {
  const stat = calcolaStatistiche(squadre, {});
  assert.equal(stat.partite, 0);
  assert.equal(stat.mediaGol, 0);
  assert.equal(stat.vittoriaPiuLarga, null);
  assert.equal(stat.migliorAttacco, null);
});

test("numeri di telefono di iscrizioni e rose", () => {
  assert.equal(pulisciTelefono("+39 333.123-45/67 (0)"), "+393331234567" + "0");
  assert.ok(telefonoValido("333 1234567"));
  assert.ok(telefonoValido("+39 333 1234567"));
  assert.ok(!telefonoValido("12345"));
  assert.ok(!telefonoValido("333-abc-4567"));
  assert.ok(TELEFONO_REGEX.test("12345678"));
});
