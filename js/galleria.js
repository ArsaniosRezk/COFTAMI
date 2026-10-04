import { gestisciPannello, rendiCliccabile } from "./utils/interfaccia.js";

/*
===================================
GALLERIA
===================================
Foto in WebP in due misure: miniatura (400 px) per la griglia e versione
grande (1080 px) per il visualizzatore, che si scarica solo quando si apre.
I video partono solo al tocco (preload="none"): la pagina non scarica
nessun video finché non lo si guarda.

Per aggiungere foto: metterle in assets/images/galleria/foto con lo stesso
schema di nomi (foto-65.webp e foto-65-mini.webp) e aumentare NUMERO_FOTO.
*/

const CARTELLA_FOTO = "/assets/images/galleria/foto";
const NUMERO_FOTO = 64;
const LARGHEZZA_FOTO = 1080;
const ALTEZZA_FOTO = 720;

const VIDEO = [
  { file: "giornata-1", titolo: "1ª giornata" },
  { file: "giornata-2", titolo: "2ª giornata" },
  { file: "giornata-3", titolo: "3ª giornata" },
  { file: "giornata-4", titolo: "4ª giornata" },
  { file: "giornata-5", titolo: "5ª giornata" },
  { file: "semifinali", titolo: "Semifinali" },
  { file: "finale-superiori", titolo: "Finale Superiori" },
  { file: "finale-giovani", titolo: "Finale Giovani" },
];

const foto = Array.from({ length: NUMERO_FOTO }, (_, indice) => {
  const numero = String(indice + 1).padStart(2, "0");
  return {
    mini: `${CARTELLA_FOTO}/foto-${numero}-mini.webp`,
    grande: `${CARTELLA_FOTO}/foto-${numero}.webp`,
  };
});

/*
-----------------------------------
GRIGLIE
-----------------------------------
*/

function disegnaVideo() {
  const griglia = document.getElementById("galleria-video");
  VIDEO.forEach((video, indice) => {
    const scheda = document.createElement("div");
    scheda.className = "scheda-video";

    const copertina = document.createElement("img");
    copertina.src = `/assets/images/galleria/video/${video.file}.webp`;
    copertina.alt = "";
    copertina.width = 360;
    copertina.height = 640;
    copertina.loading = "lazy";
    copertina.decoding = "async";

    const play = document.createElement("span");
    play.className = "play-video";
    play.innerHTML = `<i class="icona icona-play" aria-hidden="true"></i>`;

    const titolo = document.createElement("span");
    titolo.className = "titolo-video";
    titolo.textContent = video.titolo;

    scheda.append(copertina, play, titolo);
    rendiCliccabile(scheda, () => apri("video", indice), `Guarda il video: ${video.titolo}`);
    griglia.appendChild(scheda);
  });
}

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
    pulsante.addEventListener("click", () => apri("foto", indice));
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

let tipo = "foto";
let corrente = 0;
let chiudiPannello = null;

const elenco = () => (tipo === "foto" ? foto : VIDEO);

function mostra(indice) {
  const voci = elenco();
  corrente = (indice + voci.length) % voci.length;
  contenuto.replaceChildren();

  if (tipo === "foto") {
    const img = document.createElement("img");
    img.src = foto[corrente].grande;
    img.alt = `Foto ${corrente + 1} di ${foto.length}`;
    img.width = LARGHEZZA_FOTO;
    img.height = ALTEZZA_FOTO;
    contenuto.appendChild(img);

    // La foto successiva è già pronta quando si scorre
    new Image().src = foto[(corrente + 1) % foto.length].grande;
  } else {
    const video = document.createElement("video");
    video.src = `/assets/videos/${VIDEO[corrente].file}.mp4`;
    video.poster = `/assets/images/galleria/video/${VIDEO[corrente].file}.webp`;
    video.controls = true;
    video.autoplay = true;
    video.playsInline = true;
    video.preload = "auto";
    video.setAttribute("aria-label", VIDEO[corrente].titolo);
    contenuto.appendChild(video);
  }

  const etichetta = tipo === "foto" ? "Foto" : VIDEO[corrente].titolo;
  contatore.textContent = `${etichetta} · ${corrente + 1} / ${voci.length}`;
  precedente.setAttribute("aria-label", tipo === "foto" ? "Foto precedente" : "Video precedente");
  successiva.setAttribute("aria-label", tipo === "foto" ? "Foto successiva" : "Video successivo");
}

function apri(nuovoTipo, indice) {
  tipo = nuovoTipo;
  visualizzatore.hidden = false;
  document.body.style.overflow = "hidden";
  mostra(indice);

  chiudiPannello = gestisciPannello(visualizzatore, () => {
    contenuto.replaceChildren(); // ferma l'eventuale video
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
  if (inizioTocco === null || tipo !== "foto") return;
  const spostamento = evento.changedTouches[0].clientX - inizioTocco;
  if (Math.abs(spostamento) > 50) mostra(corrente + (spostamento < 0 ? 1 : -1));
  inizioTocco = null;
});

disegnaVideo();
disegnaFoto();
