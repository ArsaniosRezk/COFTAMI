import { posizioneSquadra } from "./classifiche.js";
import { rappresentaPartita, nomeGiornata } from "./calendario.js";
import {
  squadraPreferita,
  partiteDellaSquadra,
  haRisultato,
  nomeSquadra,
  linkSquadra,
} from "../utils/torneo.js";

/*
===================================
LA TUA SQUADRA (home)
===================================
Chi ha scelto una squadra preferita (stella nella pagina della squadra) trova
in cima alla home la sua prossima partita, l'ultimo risultato e la posizione
in classifica.
*/

export function laTuaSquadra(dati) {
  const sezione = document.getElementById("sezione-tua-squadra");
  const contenuto = document.getElementById("tua-squadra");
  if (!sezione || !contenuto) return;

  const preferita = squadraPreferita();
  if (!preferita || preferita.divisione !== dati.divisione || !dati.squadre?.[preferita.nome]) {
    sezione.hidden = true;
    return;
  }

  const chiave = preferita.nome;
  const squadra = dati.squadre[chiave];
  const contesto = {
    squadre: dati.squadre,
    partite: dati.partite,
    calendario: dati.calendario,
    divisione: dati.divisione,
  };

  contenuto.innerHTML = "";

  // Intestazione: logo, nome e posizione
  const intestazione = document.createElement("a");
  intestazione.className = "tua-squadra-intestazione";
  intestazione.href = linkSquadra(chiave, dati.divisione);

  const logoUrl = squadra.LogoLR || squadra.Logo;
  if (logoUrl) {
    const logo = document.createElement("img");
    logo.src = logoUrl;
    logo.alt = "";
    logo.width = 56;
    logo.height = 56;
    intestazione.appendChild(logo);
  }

  const testi = document.createElement("div");
  const nome = document.createElement("strong");
  nome.textContent = nomeSquadra(chiave);
  testi.appendChild(nome);

  const posizione = posizioneSquadra(dati.squadre, dati.partite, chiave);
  if (posizione && posizione.statistiche.playedMatches > 0) {
    const riga = document.createElement("span");
    riga.textContent =
      `${posizione.posizione}ª in classifica` +
      (posizione.girone ? ` (girone ${posizione.girone})` : "") +
      ` · ${posizione.punti} punti`;
    testi.appendChild(riga);
  }
  intestazione.appendChild(testi);

  const freccia = document.createElement("i");
  freccia.className = "icona icona-chevron-right";
  freccia.setAttribute("aria-hidden", "true");
  intestazione.appendChild(freccia);
  contenuto.appendChild(intestazione);

  // Prossima partita e ultimo risultato
  const partite = partiteDellaSquadra(dati.calendario, chiave);
  const prossima = partite.find(({ dati: partita }) => !haRisultato(partita));
  const ultima = [...partite].reverse().find(({ dati: partita }) => haRisultato(partita));

  const blocchi = document.createElement("div");
  blocchi.className = "tua-squadra-partite";

  const blocco = (titolo, voce) => {
    if (!voce) return;
    const contenitore = document.createElement("div");
    contenitore.className = "tua-squadra-blocco";
    const etichetta = document.createElement("p");
    etichetta.className = "tua-squadra-etichetta";
    etichetta.textContent = `${titolo} · ${nomeGiornata(voce.giornata)}`;
    contenitore.append(etichetta, rappresentaPartita(voce.chiave, voce.dati, contesto, voce.giornata));
    blocchi.appendChild(contenitore);
  };
  blocco("Prossima partita", prossima);
  blocco("Ultimo risultato", ultima);

  if (blocchi.children.length > 0) contenuto.appendChild(blocchi);
  sezione.hidden = false;
}
