import { nomeSquadra, dataPartita } from "../utils/torneo.js";
import { creaLogo } from "../utils/logo.js";
import { creaTabellone, vincente, giocata, segnaposto, campione, nomePartita } from "../utils/tabellone.js";

/*
===================================
TABELLONE DELLA FASE FINALE (disegno)
===================================
Lo stesso disegno per il sito (fase-finale.js) e per l'anteprima nel
gestionale. Stile delle grafiche social: fondo scuro, giallo, Bebas Neue.

- Schermi larghi: tabellone a specchio, metà squadre a sinistra e metà a
  destra, con la finale al centro e le linee che uniscono le partite.
- Smartphone: un turno sotto l'altro, dal primo alla finale.
Le due versioni sono entrambe nel DOM: le alterna il CSS (css/tabellone.css).
*/

const GIORNI = ["Dom", "Lun", "Mar", "Mer", "Gio", "Ven", "Sab"];

function crea(tag, classe = "", testo = null) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (testo !== null) elemento.textContent = testo;
  return elemento;
}

function icona(nome, classe = "") {
  const i = crea("i", `icona icona-${nome} ${classe}`.trim());
  i.setAttribute("aria-hidden", "true");
  return i;
}

// "Sab 12/04 · 15:30 · Oratorio S. Marco"
function quando(partita) {
  const data = dataPartita({ Data: partita.Data, Orario: partita.Orario });
  const giorno = partita.Data ? `${data ? `${GIORNI[data.getDay()]} ` : ""}${partita.Data}` : "";
  return [giorno, partita.Orario, partita.Luogo].filter(Boolean).join(" · ");
}

function rigaSquadra(contesto, partita, lato, esito) {
  const { tabellone, squadre, turno, indice } = contesto;
  const chiave = lato === "casa" ? partita.Casa : partita.Ospite;
  const gol = lato === "casa" ? partita.GolCasa : partita.GolOspite;
  const rigori = lato === "casa" ? partita.RigoriCasa : partita.RigoriOspite;

  const riga = crea("div", "tb-riga");
  if (!chiave.trim()) {
    riga.classList.add("tb-vuota");
    riga.append(
      crea("span", "tb-logo tb-logo-vuoto"),
      crea("span", "tb-nome", segnaposto(tabellone, turno, indice, lato))
    );
  } else {
    riga.append(creaLogo(squadre, chiave, "tb-logo"), crea("span", "tb-nome", nomeSquadra(chiave)));
  }
  if (esito) riga.classList.add(esito === lato ? "tb-vince" : "tb-perde");

  const punteggio = crea("span", "tb-gol", gol === null ? "" : String(gol));
  if (gol !== null && partita.GolCasa === partita.GolOspite && rigori !== null) {
    punteggio.appendChild(crea("small", "tb-rigori", `(${rigori})`));
  }
  riga.appendChild(punteggio);
  return riga;
}

function cartaPartita(contesto, partita, { grande = false, titolo = "" } = {}) {
  const esito = vincente(partita);
  const carta = crea(
    "article",
    `tb-partita${grande ? " tb-grande" : ""}${giocata(partita) ? " tb-giocata" : ""}`
  );

  const nome = (chiave, lato) =>
    chiave.trim()
      ? nomeSquadra(chiave)
      : segnaposto(contesto.tabellone, contesto.turno, contesto.indice, lato);
  const risultato = giocata(partita) ? ` ${partita.GolCasa} a ${partita.GolOspite}` : "";
  carta.setAttribute(
    "aria-label",
    `${titolo}: ${nome(partita.Casa, "casa")} contro ${nome(partita.Ospite, "ospite")}${risultato}`
  );

  carta.append(
    rigaSquadra(contesto, partita, "casa", esito),
    rigaSquadra(contesto, partita, "ospite", esito)
  );
  const testoQuando = quando(partita);
  if (testoQuando) carta.appendChild(crea("p", "tb-quando", testoQuando));
  return carta;
}

/*
-----------------------------------
SCHERMI LARGHI: TABELLONE A SPECCHIO
-----------------------------------
*/

function colonna(tabellone, squadre, turno, lato) {
  const { Nome, Partite } = tabellone.Turni[turno];
  const meta = Partite.length / 2;
  const inizio = lato === "sinistra" ? 0 : meta;

  const blocco = crea("div", `tb-colonna tb-${lato}`);
  blocco.appendChild(crea("p", "tb-turno", Nome));

  const partite = crea("div", "tb-partite");
  const slot = (indice) => {
    const contenitore = crea("div", "tb-slot");
    contenitore.appendChild(
      cartaPartita({ tabellone, squadre, turno, indice }, Partite[indice], {
        titolo: nomePartita(Partite.length, indice),
      })
    );
    return contenitore;
  };

  if (meta === 1) {
    const unico = slot(inizio);
    unico.classList.add("tb-singolo");
    partite.appendChild(unico);
  } else {
    for (let i = inizio; i < inizio + meta; i += 2) {
      const coppia = crea("div", "tb-coppia");
      coppia.append(slot(i), slot(i + 1));
      partite.appendChild(coppia);
    }
  }
  blocco.appendChild(partite);
  return blocco;
}

function colonnaFinale(tabellone, squadre) {
  const turno = tabellone.Turni.length - 1;
  const { Nome, Partite } = tabellone.Turni[turno];

  const blocco = crea("div", "tb-colonna tb-centro");
  const etichetta = crea("p", "tb-turno tb-turno-finale");
  etichetta.append(icona("trophy"), ` ${Nome}`);
  blocco.appendChild(etichetta);

  const partite = crea("div", "tb-partite");
  const contenitore = crea("div", "tb-slot tb-slot-finale");
  contenitore.appendChild(
    cartaPartita({ tabellone, squadre, turno, indice: 0 }, Partite[0], { grande: true, titolo: Nome })
  );
  partite.appendChild(contenitore);
  blocco.appendChild(partite);
  return blocco;
}

function albero(tabellone, squadre) {
  const turni = tabellone.Turni.length;
  const contenitore = crea("div", "tb-albero");
  // La colonna della finale è più larga: la sua carta è più grande
  const lati = `repeat(${turni - 1}, minmax(0, 1fr))`;
  contenitore.style.gridTemplateColumns =
    turni > 1 ? `${lati} minmax(0, 1.35fr) ${lati}` : "minmax(0, 340px)";

  for (let t = 0; t < turni - 1; t++) contenitore.appendChild(colonna(tabellone, squadre, t, "sinistra"));
  contenitore.appendChild(colonnaFinale(tabellone, squadre));
  for (let t = turni - 2; t >= 0; t--) contenitore.appendChild(colonna(tabellone, squadre, t, "destra"));
  return contenitore;
}

/*
-----------------------------------
SMARTPHONE: UN TURNO SOTTO L'ALTRO
-----------------------------------
*/

function elenco(tabellone, squadre) {
  const contenitore = crea("div", "tb-elenco");
  tabellone.Turni.forEach(({ Nome, Partite }, turno) => {
    const finale = turno === tabellone.Turni.length - 1;
    const blocco = crea("div", `tb-elenco-turno${finale ? " tb-elenco-finale" : ""}`);
    const titolo = crea("h3", "tb-turno", Nome);
    if (finale) titolo.prepend(icona("trophy"), " ");
    blocco.appendChild(titolo);

    const griglia = crea("div", "tb-elenco-partite");
    Partite.forEach((partita, indice) =>
      griglia.appendChild(
        cartaPartita({ tabellone, squadre, turno, indice }, partita, {
          grande: finale,
          titolo: nomePartita(Partite.length, indice),
        })
      )
    );
    blocco.appendChild(griglia);
    contenitore.appendChild(blocco);
  });
  return contenitore;
}

/*
-----------------------------------
TABELLONE COMPLETO
-----------------------------------
*/

function bannerCampione(chiave, squadre, edizione) {
  const banner = crea("div", "tb-campione");
  banner.append(icona("trophy", "tb-campione-coppa"), creaLogo(squadre, chiave, "tb-campione-logo"));
  const testo = crea("div", "tb-campione-testo");
  testo.append(
    crea("span", "tb-campione-etichetta", edizione ? `Campioni ${edizione}` : "Campioni"),
    crea("strong", "tb-campione-nome", nomeSquadra(chiave))
  );
  banner.appendChild(testo);
  return banner;
}

export function disegnaTabellone(salvato, { squadre = {}, edizione = "" } = {}) {
  const tabellone = creaTabellone({ precedente: salvato });
  const radice = crea("div", "tabellone");
  // Il CSS sceglie tra tabellone a specchio ed elenco in base alle colonne
  radice.dataset.colonne = String(tabellone.Turni.length * 2 - 1);

  const vincitore = campione(tabellone);
  if (vincitore) radice.appendChild(bannerCampione(vincitore, squadre, edizione));

  radice.append(albero(tabellone, squadre), elenco(tabellone, squadre));

  if (tabellone.Finale3) {
    const terzo = crea("div", "tb-terzo");
    terzo.appendChild(crea("h3", "tb-turno", "Finale 3° posto"));
    terzo.appendChild(
      cartaPartita({ tabellone, squadre, turno: "terzo", indice: 0 }, tabellone.Finale3, {
        titolo: "Finale 3° posto",
      })
    );
    radice.appendChild(terzo);
  }
  return radice;
}
