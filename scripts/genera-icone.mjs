/*
===================================
GENERA ICONE
===================================

node scripts/genera-icone.mjs

Scarica le icone SVG di Font Awesome Free e scrive due fogli di stile:
- css/icone.css            icone del sito pubblico
- css/icone-gestionale.css icone in più usate solo dal gestionale

Ogni icona diventa una maschera CSS: prende il colore del testo e la
dimensione del font, come le icone a carattere, senza scaricare i font di
Font Awesome (centinaia di KB).

Per aggiungere un'icona: aggiungila a una delle liste qui sotto e rilancia lo
script. Nome = nome di Font Awesome (https://fontawesome.com/search?ic=free),
eventualmente con lo stile davanti ("regular/star", "brands/instagram").
Nel codice si usa con <i class="icona icona-NOME" aria-hidden="true"></i>.
*/

import { writeFileSync } from "node:fs";

const VERSIONE = "6.5.1";
const BASE = `https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@${VERSIONE}/svgs`;

// nome della classe -> icona di Font Awesome (stile/nome)
const PUBBLICHE = {
  bars: "solid/bars",
  xmark: "solid/xmark",
  envelope: "solid/envelope",
  futbol: "solid/futbol",
  plus: "solid/plus",
  info: "solid/circle-info",
  paperclip: "solid/paperclip",
  lock: "solid/lock",
  check: "solid/circle-check",
  share: "solid/share-nodes",
  location: "solid/location-dot",
  star: "solid/star",
  "star-vuota": "regular/star",
  search: "solid/magnifying-glass",
  "chevron-left": "solid/chevron-left",
  "chevron-right": "solid/chevron-right",
  images: "solid/images",
  "arrow-left": "solid/arrow-left",
  rotate: "solid/rotate-right",
  instagram: "brands/instagram",
  trophy: "solid/trophy",
  clock: "solid/clock",
  "chart-simple": "solid/chart-simple",
};

const GESTIONALE = {
  "wand-magic-sparkles": "solid/wand-magic-sparkles",
  users: "solid/users",
  "triangle-exclamation": "solid/triangle-exclamation",
  "file-lines": "solid/file-lines",
  download: "solid/download",
  "check-semplice": "solid/check",
  "calendar-days": "solid/calendar-days",
  "user-tie": "solid/user-tie",
  "trash-can-arrow-up": "solid/trash-can-arrow-up",
  trash: "solid/trash",
  "table-list": "solid/table-list",
  "shield-halved": "solid/shield-halved",
  "rotate-right": "solid/rotate-right",
  "rotate-left": "solid/rotate-left",
  "right-left": "solid/right-left",
  "people-group": "solid/people-group",
  pen: "solid/pen",
  "mobile-screen-button": "solid/mobile-screen-button",
  "lock-open": "solid/lock-open",
  "list-ol": "solid/list-ol",
  "layer-group": "solid/layer-group",
  inbox: "solid/inbox",
  image: "solid/image",
  "grip-vertical": "solid/grip-vertical",
  "gauge-high": "solid/gauge-high",
  "floppy-disk": "solid/floppy-disk",
  flag: "solid/flag",
  "file-csv": "solid/file-csv",
  "file-arrow-down": "solid/file-arrow-down",
  "ellipsis-vertical": "solid/ellipsis-vertical",
  ellipsis: "solid/ellipsis",
  "cloud-arrow-up": "solid/cloud-arrow-up",
  "clipboard-user": "solid/clipboard-user",
  "clipboard-list": "solid/clipboard-list",
  "circle-xmark": "solid/circle-xmark",
  "check-double": "solid/check-double",
  "arrow-up": "solid/arrow-up",
  "arrow-down": "solid/arrow-down",
  "right-from-bracket": "solid/right-from-bracket",
  "clock-rotate-left": "solid/clock-rotate-left",
  key: "solid/key",
  "user-shield": "solid/user-shield",
  "chevron-down": "solid/chevron-down",
  globe: "solid/globe",
  eye: "solid/eye",
  "eye-slash": "solid/eye-slash",
  "list-check": "solid/list-check",
  whistle: "solid/flag-checkered",
};

async function svg(percorso) {
  const risposta = await fetch(`${BASE}/${percorso}.svg`);
  if (!risposta.ok) throw new Error(`${percorso}: HTTP ${risposta.status}`);
  const testo = await risposta.text();
  const viewBox = testo.match(/viewBox="([^"]+)"/)[1];
  const tracciato = testo.match(/<path d="([^"]+)"/)[1];
  return `<svg xmlns='http://www.w3.org/2000/svg' viewBox='${viewBox}'><path d='${tracciato}'/></svg>`;
}

// Le maschere vanno in un URL: si codificano solo i caratteri che lo romperebbero
function comeUrl(markup) {
  return `url("data:image/svg+xml,${markup
    .replace(/%/g, "%25")
    .replace(/</g, "%3C")
    .replace(/>/g, "%3E")
    .replace(/#/g, "%23")
    .replace(/"/g, "'")}")`;
}

async function regole(icone) {
  const voci = await Promise.all(
    Object.entries(icone).map(
      async ([nome, percorso]) => `.icona-${nome} {\n  --icona: ${comeUrl(await svg(percorso))};\n}`
    )
  );
  return voci.join("\n\n");
}

const AVVISO = `/*
  FILE GENERATO da scripts/genera-icone.mjs: non modificarlo a mano.
  Icone di Font Awesome Free ${VERSIONE} (https://fontawesome.com), licenza CC BY 4.0.
*/`;

const BASE_ICONA = `
/* Uso: <i class="icona icona-xmark" aria-hidden="true"></i> */
.icona {
  display: inline-block;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  vertical-align: -0.125em;
  background-color: currentColor;
  -webkit-mask: var(--icona) center / contain no-repeat;
  mask: var(--icona) center / contain no-repeat;
}`;

writeFileSync("css/icone.css", `${AVVISO}\n${BASE_ICONA}\n\n${await regole(PUBBLICHE)}\n`);
writeFileSync(
  "css/icone-gestionale.css",
  `${AVVISO}\n/* Si aggiunge a css/icone.css, solo nel gestionale */\n\n${await regole(GESTIONALE)}\n`
);
console.log(
  `Icone generate: ${Object.keys(PUBBLICHE).length} pubbliche, ${Object.keys(GESTIONALE).length} del gestionale`
);
