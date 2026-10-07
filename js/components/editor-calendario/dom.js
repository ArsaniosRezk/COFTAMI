/*
===================================
EDITOR CALENDARIO: ELEMENTI DELLA PAGINA
===================================
Costruzione degli elementi e finestre di dialogo dell'editor.
*/

// Crea un elemento: el("div", { class: "x", onclick: fn }, figli...)
export function el(tag, attributi = {}, ...figli) {
  const elemento = document.createElement(tag);
  for (const [chiave, valore] of Object.entries(attributi || {})) {
    if (valore === undefined || valore === null || valore === false) continue;
    if (chiave === "class") elemento.className = valore;
    else if (chiave === "dataset") Object.assign(elemento.dataset, valore);
    else if (chiave.startsWith("on")) elemento.addEventListener(chiave.slice(2), valore);
    else if (chiave in elemento && chiave !== "list") elemento[chiave] = valore;
    else elemento.setAttribute(chiave, valore === true ? "" : valore);
  }
  for (const figlio of figli.flat(Infinity)) {
    if (figlio === null || figlio === undefined || figlio === false) continue;
    elemento.append(figlio instanceof Node ? figlio : String(figlio));
  }
  return elemento;
}

export const icona = (classi) => el("i", { class: `icona ${classi}`, "aria-hidden": "true" });

export function pulsanteIcona(classiIcona, titolo, azione, extra = {}) {
  return el(
    "button",
    { type: "button", class: "cal-icona", title: titolo, "aria-label": titolo, onclick: azione, ...extra },
    icona(classiIcona)
  );
}

// Finestra modale riutilizzabile. `pulsanti`: [{ testo, azione, principale }]
// dove azione() può restituire false per lasciare la finestra aperta
export function dialogo(titolo, corpo, pulsanti = []) {
  document.getElementById("cal-dialogo")?.remove();

  const finestra = el("dialog", { id: "cal-dialogo" });
  const chiudi = () => {
    finestra.close();
    finestra.remove();
  };

  finestra.append(
    el("header", {}, el("h3", {}, titolo), pulsanteIcona("icona-xmark", "Chiudi", chiudi)),
    el("div", { class: "cal-dialogo-corpo" }, corpo),
    pulsanti.length
      ? el(
          "footer",
          {},
          pulsanti.map(({ testo, azione, principale }) =>
            el(
              "button",
              {
                type: "button",
                class: principale ? "custom-button btn-principale" : "cal-pulsante",
                onclick: () => {
                  if (azione() !== false) chiudi();
                },
              },
              testo
            )
          )
        )
      : "" // append() scriverebbe "null"
  );
  finestra.addEventListener("cancel", (e) => {
    e.preventDefault();
    chiudi();
  });
  // Clic sullo sfondo: chiude
  finestra.addEventListener("click", (e) => {
    if (e.target === finestra) chiudi();
  });

  document.getElementById("calendar-content").append(finestra);
  finestra.showModal();
  return { finestra, chiudi };
}

// Riga "azione" nelle finestre: titolo, descrizione e pulsante
export function voceAzione(
  titolo,
  descrizione,
  testoPulsante,
  azione,
  { controlli = null, disabilitata = false, pericolosa = false } = {}
) {
  const pulsante = el(
    "button",
    {
      type: "button",
      class: `cal-pulsante ${pericolosa ? "pericoloso" : ""}`,
      disabled: disabilitata,
      onclick: azione,
    },
    testoPulsante
  );
  // Con dei controlli il pulsante va dopo di loro, sulla stessa riga
  return el(
    "div",
    { class: `cal-voce ${disabilitata ? "disabilitata" : ""} ${controlli ? "con-controlli" : ""}` },
    el(
      "div",
      { class: "cal-voce-testo" },
      el("strong", {}, titolo),
      descrizione ? el("p", {}, descrizione) : null
    ),
    controlli ? el("div", { class: "cal-voce-controlli" }, controlli, pulsante) : pulsante
  );
}
