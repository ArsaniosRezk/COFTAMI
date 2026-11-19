import { condividiImmagine, mostraToast } from "../utils/interfaccia.js";

const LARGHEZZA = 1080;
const MARGINE = 48;
const COLONNE = [48, 376, ...Array(8).fill(70)];
const FONT_TESTO = '"Montserrat", sans-serif';
const FONT_TITOLI = '"Bebas Neue", sans-serif';

// Spezza anche nomi senza spazi: nell'immagine nessuna squadra viene troncata.
function righeTesto(ctx, testo, larghezza) {
  const righe = [];
  let riga = "";
  for (const parola of testo.split(/\s+/)) {
    if (riga && ctx.measureText(`${riga} ${parola}`).width > larghezza) {
      righe.push(riga);
      riga = "";
    }
    for (const carattere of (riga ? " " : "") + parola) {
      if (riga && ctx.measureText(riga + carattere).width > larghezza) {
        righe.push(riga);
        riga = "";
      }
      riga += carattere;
    }
  }
  if (riga) righe.push(riga);
  return righe;
}

export async function generaImmagineClassifica(container, { divisione, girone = "" }) {
  // Legge tutte le celle, comprese quelle nascoste dalla vista compatta.
  // La fotografia dei dati precede le attese per i font e resta coerente
  // anche se nel frattempo arriva una nuova classifica in tempo reale.
  const gironi = [container].map((sezione) => ({
    titolo: girone,
    intestazioni: [...sezione.querySelectorAll("thead th")].map((th) => th.textContent),
    righe: [...sezione.querySelectorAll("tbody tr")].map((tr) => [...tr.cells].map((td) => td.textContent)),
    note: [...sezione.querySelectorAll(".penalty-message")].flatMap((nota) =>
      nota.innerHTML.split(/<br\s*\/?\s*>/i).map((parte) => {
        const elemento = document.createElement("div");
        elemento.innerHTML = parte;
        return elemento.textContent;
      })
    ),
  }));
  const stile = getComputedStyle(container);
  const colore = (nome) => stile.getPropertyValue(nome).trim();
  const colori = {
    sfondo: colore("--primary"),
    tabella: colore("--secondary"),
    testata: colore("--tertiary"),
    testo: colore("--testo"),
    tenue: colore("--testo-tenue"),
    accento: colore("--accento"),
  };

  // Se un font non è disponibile (per esempio offline), usa il fallback del sito.
  await Promise.allSettled([
    document.fonts.load(`400 64px ${FONT_TITOLI}`),
    document.fonts.load(`500 24px ${FONT_TESTO}`),
    document.fonts.load(`700 24px ${FONT_TESTO}`),
  ]);

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Impossibile creare l'immagine della classifica");
  ctx.font = `700 24px ${FONT_TESTO}`;
  for (const girone of gironi) {
    girone.righe = girone.righe.map((celle) => {
      const nome = righeTesto(ctx, celle[1], COLONNE[1] - 32);
      return { celle, nome, altezza: Math.max(60, nome.length * 30 + 24) };
    });
    ctx.font = `500 20px ${FONT_TESTO}`;
    girone.note = girone.note.flatMap((nota) => righeTesto(ctx, nota, LARGHEZZA - MARGINE * 2));
    ctx.font = `700 24px ${FONT_TESTO}`;
  }

  const inizioClassifica = divisione ? 170 : 134;
  const altezza =
    inizioClassifica +
    MARGINE +
    gironi.reduce(
      (totale, girone) =>
        totale +
        (girone.titolo ? 44 : 0) +
        56 +
        girone.righe.reduce((somma, riga) => somma + riga.altezza, 0) +
        girone.note.length * 28,
      0
    );
  // Limita dimensioni e memoria anche con molti gironi su Safari mobile.
  const scala = Math.min(1, 8192 / altezza, Math.sqrt(16000000 / (LARGHEZZA * altezza)));
  canvas.width = Math.round(LARGHEZZA * scala);
  canvas.height = Math.round(altezza * scala);
  ctx.scale(scala, scala);
  ctx.fillStyle = colori.sfondo;
  ctx.fillRect(0, 0, LARGHEZZA, altezza);
  ctx.textBaseline = "middle";

  function testo(valore, x, y, font, coloreTesto, allineamento = "left") {
    ctx.font = font;
    ctx.fillStyle = coloreTesto;
    ctx.textAlign = allineamento;
    ctx.fillText(valore, x, y);
  }

  testo("COFTA MILANO", MARGINE, 42, `400 34px ${FONT_TITOLI}`, colori.accento);
  testo("CLASSIFICA SQUADRE", MARGINE, 94, `400 60px ${FONT_TITOLI}`, colori.testo);
  if (divisione) testo(divisione, MARGINE, 142, `700 22px ${FONT_TESTO}`, colori.accento);

  let y = inizioClassifica;
  for (const girone of gironi) {
    if (girone.titolo) {
      testo(girone.titolo, MARGINE, y + 16, `400 34px ${FONT_TITOLI}`, colori.testo);
      y += 44;
    }
    const larghezzaTabella = LARGHEZZA - MARGINE * 2;
    const altezzaTabella = 56 + girone.righe.reduce((totale, riga) => totale + riga.altezza, 0);
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(MARGINE, y, larghezzaTabella, altezzaTabella, 14);
    ctx.clip();
    ctx.fillStyle = colori.tabella;
    ctx.fillRect(MARGINE, y, larghezzaTabella, altezzaTabella);
    ctx.fillStyle = colori.testata;
    ctx.fillRect(MARGINE, y, larghezzaTabella, 56);

    let x = MARGINE;
    girone.intestazioni.forEach((titolo, i) => {
      testo(
        titolo,
        x + (i === 1 ? 16 : COLONNE[i] / 2),
        y + 28,
        `400 30px ${FONT_TITOLI}`,
        colori.accento,
        i === 1 ? "left" : "center"
      );
      x += COLONNE[i];
    });
    y += 56;

    girone.righe.forEach(({ celle, nome, altezza: altezzaRiga }, indice) => {
      if (indice < 4) {
        ctx.fillStyle = colori.accento;
        ctx.fillRect(MARGINE, y, 3, altezzaRiga);
      }
      x = MARGINE;
      celle.forEach((valore, i) => {
        if (i === 1) {
          nome.forEach((riga, n) => {
            testo(
              riga,
              x + 16,
              y + altezzaRiga / 2 + (n - (nome.length - 1) / 2) * 30,
              `700 24px ${FONT_TESTO}`,
              colori.testo
            );
          });
        } else {
          testo(
            valore,
            x + COLONNE[i] / 2,
            y + altezzaRiga / 2,
            `${i === 9 ? 700 : 500} 24px ${FONT_TESTO}`,
            colori.testo,
            "center"
          );
        }
        x += COLONNE[i];
      });
      y += altezzaRiga;
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.fillRect(MARGINE, y - 1, larghezzaTabella, 1);
    });
    ctx.restore();
    girone.note.forEach((nota) => {
      y += 28;
      testo(nota, MARGINE, y, `500 20px ${FONT_TESTO}`, colori.tenue);
    });
  }

  try {
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    if (!blob) throw new Error("Impossibile esportare la classifica");
    const nome = ["COFTA", divisione, "Classifica", girone.replaceAll(" ", "-")].filter(Boolean).join("-");
    return new File([blob], `${nome}.png`, { type: "image/png" });
  } finally {
    canvas.width = canvas.height = 0;
  }
}

export function pulsanteCondivisioneClassifica(container, opzioni) {
  const pulsante = document.createElement("button");
  pulsante.type = "button";
  pulsante.className = "classifica-condividi";
  pulsante.innerHTML = '<i class="icona icona-share" aria-hidden="true"></i>';
  const etichetta = ["Condividi classifica", opzioni.girone].filter(Boolean).join(" · ");
  function etichettaPulsante(testo) {
    pulsante.setAttribute("aria-label", testo);
    pulsante.title = testo;
  }
  let file = null;

  async function prepara() {
    pulsante.disabled = true;
    pulsante.setAttribute("aria-busy", "true");
    etichettaPulsante("Preparo immagine…");
    try {
      file = await generaImmagineClassifica(container, opzioni);
      etichettaPulsante(etichetta);
    } catch (errore) {
      console.error("Errore nella creazione della classifica da condividere:", errore);
      etichettaPulsante("Riprova a preparare l’immagine");
    } finally {
      pulsante.disabled = false;
      pulsante.removeAttribute("aria-busy");
    }
  }

  pulsante.addEventListener("click", async () => {
    if (!file) {
      await prepara();
      return;
    }
    pulsante.disabled = true;
    try {
      await condividiImmagine(file, "Classifica squadre COFTA");
    } catch (errore) {
      console.error("Errore nella condivisione della classifica:", errore);
      mostraToast("Impossibile condividere l’immagine. Riprova.", { errore: true });
    } finally {
      pulsante.disabled = false;
    }
  });

  prepara();
  return pulsante;
}
