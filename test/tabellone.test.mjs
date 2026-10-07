import { test } from "node:test";
import assert from "node:assert/strict";
import {
  creaTabellone,
  vincente,
  portaAvantiVincenti,
  campione,
  segnaposto,
  perSalvare,
  tabelloneCompilato,
  dataPerCampo,
  dataDaCampo,
} from "../js/utils/tabellone.js";

test("creaTabellone: turni dal primo alla finale", () => {
  const t = creaTabellone({ squadre: 8, terzoPosto: true });
  assert.deepEqual(
    t.Turni.map((turno) => [turno.Nome, turno.Partite.length]),
    [
      ["Quarti di finale", 4],
      ["Semifinali", 2],
      ["Finale", 1],
    ]
  );
  assert.ok(t.Finale3);
  assert.equal(creaTabellone({ squadre: 2, terzoPosto: true }).Finale3, null);
});

test("creaTabellone: cambiando formato restano i turni in comune", () => {
  const prima = creaTabellone({ squadre: 4 });
  prima.Turni[1].Partite[0].Casa = "Leoni";
  prima.Turni[0].Nome = "Semi";
  const dopo = creaTabellone({ squadre: 8, precedente: prima });
  assert.equal(dopo.Turni[2].Partite[0].Casa, "Leoni");
  assert.equal(dopo.Turni[1].Nome, "Semi");
  assert.equal(dopo.Turni[0].Nome, "Quarti di finale");
});

test("creaTabellone: accetta gli array salvati come oggetti", () => {
  const salvato = {
    Squadre: 4,
    Turni: {
      0: {
        Nome: "Semifinali",
        Partite: { 0: { Casa: "A", Ospite: "B", GolCasa: 2, GolOspite: 1 }, 1: { Casa: "C", Ospite: "" } },
      },
      1: { Nome: "Finale", Partite: { 0: { Casa: "", Ospite: "" } } },
    },
  };
  const t = creaTabellone({ precedente: salvato });
  assert.equal(t.Turni[0].Partite[0].Casa, "A");
  assert.equal(t.Turni[0].Partite[0].GolCasa, 2);
  assert.equal(t.Turni[0].Partite[1].Casa, "C");
  assert.equal(t.Turni[1].Partite[0].GolCasa, null);
});

test("vincente: gol, rigori, non giocata", () => {
  assert.equal(vincente({ GolCasa: 2, GolOspite: 1 }), "casa");
  assert.equal(vincente({ GolCasa: 0, GolOspite: 3 }), "ospite");
  assert.equal(vincente({ GolCasa: 1, GolOspite: 1 }), null);
  assert.equal(vincente({ GolCasa: 1, GolOspite: 1, RigoriCasa: 3, RigoriOspite: 4 }), "ospite");
  assert.equal(vincente({ GolCasa: null, GolOspite: 1 }), null);
  assert.equal(vincente({ GolCasa: "", GolOspite: "" }), null);
});

test("portaAvantiVincenti: vincenti in finale, perdenti nella finale per il 3° posto", () => {
  const t = creaTabellone({ squadre: 4, terzoPosto: true });
  Object.assign(t.Turni[0].Partite[0], { Casa: "A", Ospite: "B", GolCasa: 2, GolOspite: 0 });
  Object.assign(t.Turni[0].Partite[1], {
    Casa: "C",
    Ospite: "D",
    GolCasa: 1,
    GolOspite: 1,
    RigoriCasa: 2,
    RigoriOspite: 4,
  });
  const { tabellone, cambiate } = portaAvantiVincenti(t);
  assert.equal(cambiate, 4);
  assert.deepEqual([tabellone.Turni[1].Partite[0].Casa, tabellone.Turni[1].Partite[0].Ospite], ["A", "D"]);
  assert.deepEqual([tabellone.Finale3.Casa, tabellone.Finale3.Ospite], ["B", "C"]);
});

test("portaAvantiVincenti: corregge un risultato ma non tocca i nomi scritti a mano", () => {
  const t = creaTabellone({ squadre: 4 });
  Object.assign(t.Turni[0].Partite[0], { Casa: "A", Ospite: "B", GolCasa: 0, GolOspite: 1 });
  Object.assign(t.Turni[0].Partite[1], { Casa: "C", Ospite: "D", GolCasa: 3, GolOspite: 1 });
  t.Turni[1].Partite[0].Casa = "A"; // messa prima della correzione del risultato
  t.Turni[1].Partite[0].Ospite = "Squadra ripescata";
  const { tabellone } = portaAvantiVincenti(t);
  assert.equal(tabellone.Turni[1].Partite[0].Casa, "B");
  assert.equal(tabellone.Turni[1].Partite[0].Ospite, "Squadra ripescata");
});

test("campione e segnaposto", () => {
  const t = creaTabellone({ squadre: 4, terzoPosto: true });
  assert.equal(campione(t), null);
  Object.assign(t.Turni[1].Partite[0], { Casa: "A", Ospite: "D", GolCasa: 1, GolOspite: 2 });
  assert.equal(campione(t), "D");
  assert.equal(segnaposto(t, 1, 0, "ospite"), "Vincente Semifinale 2");
  assert.equal(segnaposto(t, "terzo", 0, "casa"), "Perdente Semifinale 1");
  assert.equal(segnaposto(t, 0, 1, "casa"), "Da definire");
});

test("perSalvare: niente campi vuoti, rigori solo dopo un pareggio", () => {
  const t = creaTabellone({ squadre: 2 });
  Object.assign(t.Turni[0].Partite[0], {
    Casa: " A ",
    Ospite: "B",
    GolCasa: 2,
    GolOspite: 1,
    RigoriCasa: 5,
    RigoriOspite: 4,
    Luogo: " ",
  });
  assert.deepEqual(perSalvare(t).Turni[0].Partite[0], { Casa: "A", Ospite: "B", GolCasa: 2, GolOspite: 1 });
  assert.equal(tabelloneCompilato(perSalvare(creaTabellone({ squadre: 8 }))), false);
  assert.equal(tabelloneCompilato(perSalvare(t)), true);
});

test("date tra calendario (gg/mm) e campo data", () => {
  assert.equal(dataPerCampo("5/6", 2026), "2026-06-05");
  assert.equal(dataPerCampo("", 2026), "");
  assert.equal(dataDaCampo("2026-06-05"), "05/06");
  assert.equal(dataDaCampo(""), "");
});
