import { test } from "node:test";
import assert from "node:assert/strict";
import { attivaSeparatore } from "../js/utils/campi-data-ora.js";

// Simula il testo e la selezione lasciati dal browser prima dell'evento input.
function campo(tipo) {
  const input = new EventTarget();
  input.value = "";
  input.selectionStart = input.selectionEnd = 0;
  input.setSelectionRange = (inizio, fine) => {
    input.selectionStart = inizio;
    input.selectionEnd = fine;
  };
  attivaSeparatore(input, tipo);
  const modifica = (testo, cursore = testo.length, inputType = "insertText", fine = cursore) => {
    input.value = testo;
    input.setSelectionRange(cursore, fine);
    const evento = new Event("input");
    Object.defineProperty(evento, "inputType", { value: inputType });
    input.dispatchEvent(evento);
  };
  const digita = (testo) => {
    for (const cifra of testo) {
      const inizio = input.selectionStart;
      modifica(input.value.slice(0, inizio) + cifra + input.value.slice(input.selectionEnd), inizio + 1);
    }
  };
  const cancella = () => {
    const cursore = input.selectionStart;
    modifica(
      input.value.slice(0, cursore - 1) + input.value.slice(cursore),
      cursore - 1,
      "deleteContentBackward"
    );
  };
  return { input, modifica, digita, cancella };
}

for (const [tipo, numeri, atteso] of [
  ["Data", "0611", "06/11"],
  ["Orario", "0930", "09:30"],
]) {
  test(`${tipo}: i numeri digitati ricevono il separatore e il cursore rimane alla fine`, () => {
    const { input, digita } = campo(tipo);
    assert.equal(input.inputMode, "numeric");
    digita(numeri.slice(0, 2));
    assert.equal(input.value, atteso.slice(0, 3));
    assert.equal(input.selectionStart, 3);
    digita(numeri.slice(2));
    assert.equal(input.value, atteso);
    assert.equal(input.selectionStart, 5);
  });

  test(`${tipo}: incolla numeri o testo già formattato`, () => {
    const { input, modifica } = campo(tipo);
    modifica(numeri, numeri.length, "insertFromPaste");
    assert.equal(input.value, atteso);
    modifica(atteso, atteso.length, "insertFromPaste");
    assert.equal(input.value, atteso);
  });

  test(`${tipo}: il backspace può attraversare il separatore e svuotare il campo`, () => {
    const { input, digita, cancella } = campo(tipo);
    digita(numeri);
    for (let i = 0; i < 5; i++) cancella();
    assert.equal(input.value, "");
    assert.equal(input.selectionStart, 0);
  });

  test(`${tipo}: corregge cifre e selezioni senza portare il cursore alla fine`, () => {
    const { input, digita } = campo(tipo);
    digita(numeri);
    input.setSelectionRange(0, 1);
    digita("1");
    assert.equal(input.value, `1${atteso.slice(1)}`);
    assert.equal(input.selectionStart, 1);
    input.setSelectionRange(3, 5);
    digita("20");
    assert.equal(input.value, `1${atteso.slice(1, 3)}20`);
    assert.equal(input.selectionStart, 5);
  });
}

test("accetta anche i separatori manuali e aggiunge lo zero iniziale", () => {
  const data = campo("Data");
  data.digita("6/4");
  assert.equal(data.input.value, "06/4");
  const ora = campo("Orario");
  ora.digita("9:30");
  assert.equal(ora.input.value, "09:30");
  ora.modifica("16.00");
  assert.equal(ora.input.value, "16:00");
});

test("rifiuta lettere e cifre oltre gg/mm o hh:mm", () => {
  const { input, modifica } = campo("Data");
  modifica("ab061199");
  assert.equal(input.value, "06/11");
});
