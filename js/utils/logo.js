import { nomeSquadra } from "./torneo.js";

/*
===================================
LOGO DI UNA SQUADRA
===================================
Il logo leggero (LogoLR) se c'è, altrimenti quello grande. Senza logo, o se
l'immagine non si carica, un cerchio con le iniziali: la riga resta allineata
alle altre.
*/

export function iniziali(nome) {
  return (
    String(nome || "")
      .replace(/\b(S\.?\s?t[ia]|S\.|e|ed)\b/gi, " ")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((parola) => parola[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function segnaposto(nome, classe) {
  const cerchio = document.createElement("span");
  cerchio.className = `${classe} logo-segnaposto`;
  cerchio.textContent = iniziali(nome);
  cerchio.setAttribute("aria-hidden", "true");
  return cerchio;
}

// squadre: il nodo Squadre della divisione; chiave: la chiave della squadra (o un nome libero)
export function creaLogo(squadre, chiave, classe = "logo-squadra") {
  const dati = squadre?.[chiave];
  const url = dati?.LogoLR || dati?.Logo;
  const nome = nomeSquadra(chiave);
  if (!url) return segnaposto(nome, classe);

  const img = document.createElement("img");
  img.className = classe;
  img.src = url;
  img.alt = "";
  img.loading = "lazy";
  img.decoding = "async";
  img.addEventListener("error", () => img.replaceWith(segnaposto(nome, classe)), { once: true });
  return img;
}
