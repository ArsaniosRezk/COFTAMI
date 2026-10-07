/*
===================================
CONTROLLA PERCORSI
===================================

node scripts/controlla-percorsi.mjs

Verifica che ogni file citato dal sito esista: import dei moduli JavaScript,
script, fogli di stile e immagini nelle pagine, file precaricati dal service
worker. Un percorso sbagliato su GitHub Pages non dà errori finché qualcuno
non apre la pagina: questo controllo li trova prima.
*/

import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const ESCLUSI = new Set(["node_modules", ".git", ".claude", "test", "scripts"]);

function file(cartella = ".") {
  return readdirSync(cartella).flatMap((nome) => {
    if (ESCLUSI.has(nome)) return [];
    const percorso = path.posix.join(cartella, nome);
    return statSync(percorso).isDirectory() ? file(percorso) : [percorso];
  });
}

const MODELLI = [
  /\bfrom\s+["']([^"']+)["']/g,
  /\bimport\(\s*["']([^"'$`]+)["']\s*\)/g,
  /\bimport\s+["']([^"']+)["']/g,
  /\b(?:src|href)=["']([^"'#?]+\.(?:js|css|svg|png|webp|avif|jpg|pdf|woff2|webmanifest))["']/g,
  /^\s*["'](\/[^"']+\.(?:js|css|html|svg|png|webp|woff2|webmanifest))["'],?$/gm,
];

const problemi = [];
for (const sorgente of file().filter((f) => /\.(js|html)$/.test(f))) {
  const testo = readFileSync(sorgente, "utf8");
  for (const modello of MODELLI) {
    for (const [, specificatore] of testo.matchAll(modello)) {
      if (/^(https?:)?\/\//.test(specificatore) || specificatore.startsWith("data:")) continue;
      // Pacchetti npm (solo negli strumenti di sviluppo): non sono file del sito
      const relativo = /^\.{0,2}\//.test(specificatore) || /\.\w+$/.test(specificatore);
      if (!relativo || sorgente === "eslint.config.js") continue;
      const bersaglio = specificatore.startsWith("/")
        ? specificatore.slice(1)
        : path.posix.normalize(path.posix.join(path.posix.dirname(sorgente), specificatore));
      if (!existsSync(bersaglio)) problemi.push(`${sorgente}: "${specificatore}" non esiste`);
    }
  }
}

if (problemi.length) {
  console.error([...new Set(problemi)].join("\n"));
  process.exit(1);
}
console.log("Tutti i percorsi esistono");
