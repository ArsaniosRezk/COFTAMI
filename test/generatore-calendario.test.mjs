import { test } from "node:test";
import assert from "node:assert/strict";
import {
  generaTuttiControTutti,
  descriviEstrazione,
  generaEstrazioneCasuale,
} from "../js/utils/generatore-calendario.js";

// Generatore casuale con seme fisso: i test danno sempre lo stesso risultato
function rngConSeme(seme) {
  let stato = seme;
  return () => {
    stato = (stato * 1664525 + 1013904223) % 4294967296;
    return stato / 4294967296;
  };
}

const coppia = ([a, b]) => [a, b].sort().join("-");

for (const n of [4, 5, 6, 7, 10]) {
  test(`tutti contro tutti con ${n} squadre: ogni coppia una volta, nessuno gioca due volte nella stessa giornata`, () => {
    const squadre = Array.from({ length: n }, (_, i) => `S${i + 1}`);
    const giornate = generaTuttiControTutti(squadre, {}, rngConSeme(n));

    assert.equal(giornate.length, n % 2 === 0 ? n - 1 : n);

    const coppie = giornate.flat().map(coppia);
    assert.equal(coppie.length, (n * (n - 1)) / 2);
    assert.equal(new Set(coppie).size, coppie.length);

    for (const partite of giornate) {
      const inCampo = partite.flat();
      assert.equal(new Set(inCampo).size, inCampo.length);
    }
  });
}

test("andata e ritorno: il ritorno inverte casa e trasferta", () => {
  const squadre = ["A", "B", "C", "D"];
  const giornate = generaTuttiControTutti(squadre, { andataRitorno: true }, rngConSeme(1));
  assert.equal(giornate.length, 6);
  const andata = giornate.slice(0, 3).flat();
  const ritorno = giornate.slice(3).flat();
  assert.deepEqual(
    ritorno.map(([casa, ospite]) => `${ospite}-${casa}`),
    andata.map(([casa, ospite]) => `${casa}-${ospite}`)
  );
});

test("estrazione: limiti e avvisi", () => {
  assert.equal(descriviEstrazione(1, 1).valido, false);
  assert.equal(descriviEstrazione(6, 6).valido, false);
  const dispari = descriviEstrazione(5, 3);
  assert.equal(dispari.valido, true);
  assert.equal(dispari.unaInMeno, true);
});

test("estrazione casuale: nessuna coppia ripetuta e al massimo x partite a testa", () => {
  for (const [n, x] of [
    [6, 3],
    [7, 2],
    [7, 3],
    [9, 4],
  ]) {
    const squadre = Array.from({ length: n }, (_, i) => `S${i + 1}`);
    const partite = generaEstrazioneCasuale(squadre, x, rngConSeme(n * 10 + x)).flat();
    const coppie = partite.map(coppia);
    assert.equal(new Set(coppie).size, coppie.length, `coppie ripetute con ${n} squadre`);
    const conteggio = {};
    partite.flat().forEach((s) => (conteggio[s] = (conteggio[s] || 0) + 1));
    assert.ok(
      Object.values(conteggio).every((volte) => volte <= x),
      `troppe partite con ${n} squadre`
    );
  }
});
