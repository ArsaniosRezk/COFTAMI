import { gestisciPannello } from "./utils/interfaccia.js";

/*
===================================
GALLERIA
===================================
Foto in due misure: miniatura WebP (400 px) per la griglia e versione
grande (1080 px) per il visualizzatore, che si scarica solo quando si apre.
La versione grande è in AVIF (circa metà del peso) con la WebP per i
browser che non lo leggono (iPhone con iOS precedente al 16).

Per aggiungere foto: metterle in assets/images/galleria/foto con lo stesso
schema di nomi (foto-65.avif, foto-65.webp e foto-65-mini.webp) e aumentare
NUMERO_FOTO. L'AVIF si ricava dalla WebP con:
  ffmpeg -i foto-65.webp -c:v libaom-av1 -still-picture 1 -crf 32 foto-65.avif
*/

const CARTELLA_FOTO = "/assets/images/galleria/foto";
const NUMERO_FOTO = 64;
const LARGHEZZA_FOTO = 1080;
const ALTEZZA_FOTO = 720;

const foto = Array.from({ length: NUMERO_FOTO }, (_, indice) => {
  const numero = String(indice + 1).padStart(2, "0");
  return {
    mini: `${CARTELLA_FOTO}/foto-${numero}-mini.webp`,
    grande: `${CARTELLA_FOTO}/foto-${numero}.webp`,
    avif: `${CARTELLA_FOTO}/foto-${numero}.avif`,
  };
});

/*
-----------------------------------
GRIGLIE
-----------------------------------
*/

function disegnaFoto() {
  const griglia = document.getElementById("galleria-foto");
  foto.forEach((immagine, indice) => {
    const pulsante = document.createElement("button");
    pulsante.type = "button";
    pulsante.className = "miniatura";
    pulsante.setAttribute("aria-label", `Apri la foto ${indice + 1} di ${foto.length}`);

    const img = document.createElement("img");
    img.src = immagine.mini;
    img.alt = "";
    img.width = 400;
    img.height = Math.round((400 * ALTEZZA_FOTO) / LARGHEZZA_FOTO);
    img.loading = "lazy";
    img.decoding = "async";

    pulsante.appendChild(img);
    pulsante.addEventListener("click", () => apri(indice));
    griglia.appendChild(pulsante);
  });
}

/*
-----------------------------------
VISUALIZZATORE
-----------------------------------
*/

const visualizzatore = document.getElementById("visualizzatore");
const contenuto = document.getElementById("visualizzatore-contenuto");
const contatore = document.getElementById("visualizzatore-contatore");
const precedente = document.getElementById("visualizzatore-precedente");
const successiva = document.getElementById("visualizzatore-successiva");

let corrente = 0;
let chiudiPannello = null;

function mostra(indice) {
  corrente = (indice + foto.length) % foto.length;

  const immagine = document.createElement("picture");
  const avif = document.createElement("source");
  avif.type = "image/avif";
  avif.srcset = foto[corrente].avif;
  const img = document.createElement("img");
  img.src = foto[corrente].grande;
  img.alt = `Foto ${corrente + 1} di ${foto.length}`;
  img.width = LARGHEZZA_FOTO;
  img.height = ALTEZZA_FOTO;
  immagine.append(avif, img);
  contenuto.replaceChildren(immagine);

  // Caricata questa, si prepara la successiva nello stesso formato scelto dal browser
  img.addEventListener(
    "load",
    () => {
      const successiva = foto[(corrente + 1) % foto.length];
      new Image().src = img.currentSrc.endsWith(".avif") ? successiva.avif : successiva.grande;
    },
    { once: true }
  );

  contatore.textContent = `Foto ${corrente + 1} / ${foto.length}`;
}

function apri(indice) {
  visualizzatore.hidden = false;
  document.body.style.overflow = "hidden";
  mostra(indice);

  chiudiPannello = gestisciPannello(visualizzatore, () => {
    contenuto.replaceChildren();
    visualizzatore.hidden = true;
    document.body.style.overflow = "";
    chiudiPannello = null;
  });
  document.getElementById("visualizzatore-chiudi").focus();
}

document.getElementById("visualizzatore-chiudi").addEventListener("click", () => chiudiPannello?.());
precedente.addEventListener("click", () => mostra(corrente - 1));
successiva.addEventListener("click", () => mostra(corrente + 1));

// Tocco sullo sfondo nero: chiude
visualizzatore.addEventListener("click", (evento) => {
  if (evento.target === visualizzatore || evento.target === contenuto) chiudiPannello?.();
});

document.addEventListener("keydown", (evento) => {
  if (visualizzatore.hidden) return;
  if (evento.key === "ArrowLeft") mostra(corrente - 1);
  if (evento.key === "ArrowRight") mostra(corrente + 1);
});

// Scorrimento col dito tra le foto
let inizioTocco = null;
contenuto.addEventListener(
  "touchstart",
  (evento) => {
    inizioTocco = evento.touches.length === 1 ? evento.touches[0].clientX : null;
  },
  { passive: true }
);
contenuto.addEventListener("touchend", (evento) => {
  if (inizioTocco === null) return;
  const spostamento = evento.changedTouches[0].clientX - inizioTocco;
  if (Math.abs(spostamento) > 50) mostra(corrente + (spostamento < 0 ? 1 : -1));
  inizioTocco = null;
});

disegnaFoto();
