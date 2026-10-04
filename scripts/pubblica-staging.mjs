/*
===================================
PUBBLICA SU STAGING
===================================

npm run staging          pubblica su staging.coftamilano.com
npm run staging -- --prova   mostra cosa verrebbe pubblicato, senza pubblicare

Pubblica il sito così com'è nella cartella, comprese le modifiche non ancora
salvate in un commit, sul repository COFTAMI-staging. Nella copia pubblicata
CNAME e robots.txt vengono sostituiti con quelli dello staging: nel repository
del sito restano sempre quelli di produzione, quindi un merge su main non può
mai spostare il dominio vero.

Non tocca i file, i commit o il branch su cui si sta lavorando: la copia viene
preparata in un indice temporaneo di Git.
*/

import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO_STAGING = "https://github.com/ArsaniosRezk/COFTAMI-staging.git";

const FILE_STAGING = {
  CNAME: "staging.coftamilano.com",
  "robots.txt": "User-agent: *\nDisallow: /\n",
};

const prova = process.argv.includes("--prova");
const cartella = mkdtempSync(join(tmpdir(), "cofta-staging-"));
const ambienteGit = { ...process.env, GIT_INDEX_FILE: join(cartella, "index") };

function git(argomenti, { input, indiceTemporaneo = true } = {}) {
  // safecrlf=false: niente avvisi sui fine riga per ogni file copiato
  return execFileSync("git", ["-c", "core.safecrlf=false", ...argomenti], {
    encoding: "utf8",
    input,
    env: indiceTemporaneo ? ambienteGit : process.env,
  }).trim();
}

try {
  const ramo = git(["rev-parse", "--abbrev-ref", "HEAD"], { indiceTemporaneo: false });
  const base = git(["rev-parse", "--short", "HEAD"], { indiceTemporaneo: false });
  const nonSalvate = git(["status", "--porcelain"], { indiceTemporaneo: false });

  // Copia della cartella (rispetta .gitignore) con i file dello staging
  git(["read-tree", "HEAD"]);
  git(["add", "-A"]);
  for (const [nome, contenuto] of Object.entries(FILE_STAGING)) {
    const hash = git(["hash-object", "-w", "--stdin"], { input: contenuto });
    git(["update-index", "--add", "--cacheinfo", `100644,${hash},${nome}`]);
  }
  const albero = git(["write-tree"]);

  console.log(`Branch: ${ramo} (${base})`);
  if (nonSalvate) console.log("Comprese le modifiche non ancora salvate in un commit.");

  const differenze = git(["diff", "--stat", "HEAD", albero]);
  console.log(`\nDifferenze rispetto all'ultimo commit:\n${differenze}\n`);

  if (prova) {
    console.log("Prova: niente è stato pubblicato.");
  } else {
    const messaggio = `Staging da ${ramo} (${base})${nonSalvate ? " + modifiche non salvate" : ""}`;
    const commit = git(["commit-tree", albero, "-p", "HEAD", "-m", messaggio]);
    execFileSync("git", ["push", "--force", REPO_STAGING, `${commit}:refs/heads/main`], {
      stdio: "inherit",
    });
    console.log("\nPubblicato: https://staging.coftamilano.com (GitHub ci mette circa un minuto)");
  }
} finally {
  rmSync(cartella, { recursive: true, force: true });
}
