// I separatori vengono inseriti anche con la tastiera numerica del telefono.
function formatta(valore, separatore, eliminazione) {
  const esplicito = valore.match(/^(\d{1,2})[/.:,-](\d{0,2})$/);
  if (esplicito) return `${esplicito[1].padStart(2, "0")}${separatore}${esplicito[2]}`;
  const cifre = valore.replace(/\D/g, "").slice(0, 4);
  if (cifre.length < 2 || (eliminazione && cifre.length === 2)) return cifre;
  return `${cifre.slice(0, 2)}${separatore}${cifre.slice(2)}`;
}

export function attivaSeparatore(input, campo) {
  const separatore = campo === "Data" ? "/" : ":";
  input.inputMode = "numeric";
  input.addEventListener("input", (evento) => {
    if (evento.isComposing) return;
    const prima = input.value;
    const eliminazione = evento.inputType?.startsWith("delete") || false;
    const dopo = formatta(prima, separatore, eliminazione);
    if (prima === dopo) return;

    // Conserva il cursore anche quando si corregge una cifra in mezzo al testo.
    const posizione = (indice) => {
      const prefisso = prima.slice(0, indice);
      let cifre = prefisso.replace(/\D/g, "").length;
      if (/^\d[/.:,-]/.test(prima) && indice > 0) cifre++;
      let i = 0;
      while (i < dopo.length && cifre > 0) {
        if (/\d/.test(dopo[i])) cifre--;
        i++;
      }
      if (dopo[i] === separatore && (!eliminazione || /[/.:,-]$/.test(prefisso))) i++;
      return i;
    };
    const inizio = posizione(input.selectionStart ?? prima.length);
    const fine = posizione(input.selectionEnd ?? prima.length);
    input.value = dopo;
    input.setSelectionRange(inizio, fine);
  });
}
