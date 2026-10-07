import { calcolaStatistiche, confrontoDiretto } from "../utils/statistiche.js";
import { nomeSquadra, linkSquadra } from "../utils/torneo.js";

/*
===================================
STATISTICHE (pagina Campionato)
===================================
Numeri del campionato, record, forma delle squadre, migliore marcatore di
ogni squadra e confronto diretto tra due squadre a scelta.
I calcoli sono in utils/statistiche.js.
*/

const NOMI_ESITO = { V: "Vinta", N: "Pareggiata", P: "Persa" };

// Squadre scelte nel confronto diretto: restano uguali agli aggiornamenti in tempo reale
const sceltaConfronto = { divisione: null, a: "", b: "" };

function crea(tag, classe = "", testo = null) {
  const elemento = document.createElement(tag);
  if (classe) elemento.className = classe;
  if (testo !== null) elemento.textContent = testo;
  return elemento;
}

function linkA(squadra, divisione) {
  const link = crea("a", "link-squadra", nomeSquadra(squadra));
  link.href = linkSquadra(squadra, divisione);
  return link;
}

function elencoSquadre(squadre, divisione) {
  const contenitore = crea("span", "stat-squadre");
  squadre.forEach((squadra, indice) => {
    if (indice > 0) contenitore.append(", ");
    contenitore.appendChild(linkA(squadra, divisione));
  });
  return contenitore;
}

function tessera(valore, etichetta) {
  const scheda = crea("div", "stat-tessera");
  scheda.append(crea("span", "stat-valore", valore), crea("span", "stat-etichetta", etichetta));
  return scheda;
}

function record(titolo, valore, dettaglio) {
  const scheda = crea("div", "stat-record");
  scheda.appendChild(crea("h3", "stat-record-titolo", titolo));
  scheda.appendChild(crea("p", "stat-record-valore", valore));
  if (dettaglio) {
    const riga = crea("p", "stat-record-dettaglio");
    riga.append(dettaglio);
    scheda.appendChild(riga);
  }
  return scheda;
}

function risultato(partita, divisione) {
  const riga = crea("span", "stat-partita");
  riga.append(
    linkA(partita.casa, divisione),
    ` ${partita.golCasa} – ${partita.golOspite} `,
    linkA(partita.ospite, divisione)
  );
  return riga;
}

function bloccoRecord(stat, divisione) {
  const griglia = crea("div", "stat-griglia-record");

  if (stat.migliorAttacco) {
    griglia.appendChild(
      record(
        "Miglior attacco",
        `${stat.migliorAttacco.valore} gol fatti`,
        elencoSquadre(stat.migliorAttacco.squadre, divisione)
      )
    );
  }
  if (stat.migliorDifesa) {
    griglia.appendChild(
      record(
        "Miglior difesa",
        `${stat.migliorDifesa.valore} gol subiti`,
        elencoSquadre(stat.migliorDifesa.squadre, divisione)
      )
    );
  }
  if (stat.vittoriaPiuLarga) {
    const p = stat.vittoriaPiuLarga;
    griglia.appendChild(record("Vittoria più larga", `Giornata ${p.giornata}`, risultato(p, divisione)));
  }
  if (stat.partitaConPiuGol) {
    const p = stat.partitaConPiuGol;
    griglia.appendChild(
      record(
        "Partita con più gol",
        `${p.golCasa + p.golOspite} gol · giornata ${p.giornata}`,
        risultato(p, divisione)
      )
    );
  }
  return griglia;
}

function bloccoForma(forma, divisione) {
  const blocco = crea("div", "stat-blocco");
  blocco.appendChild(crea("h3", "stat-sottotitolo", "Forma: ultime 5 partite"));

  const elenco = crea("ul", "stat-forma");
  for (const { squadra, esiti } of forma) {
    const voce = crea("li");
    voce.appendChild(linkA(squadra, divisione));
    const pallini = crea("span", "stat-esiti");
    pallini.setAttribute("aria-label", esiti.map((e) => NOMI_ESITO[e]).join(", "));
    esiti.forEach((esito) => {
      const pallino = crea("span", `stat-esito esito-${esito}`, esito);
      pallino.setAttribute("aria-hidden", "true");
      pallini.appendChild(pallino);
    });
    voce.appendChild(pallini);
    elenco.appendChild(voce);
  }
  blocco.appendChild(elenco);

  const legenda = crea("p", "stat-legenda", "V vinta · N pareggiata · P persa (la più recente a destra)");
  blocco.appendChild(legenda);
  return blocco;
}

function bloccoCapocannonieri(capocannonieri, divisione) {
  const blocco = crea("div", "stat-blocco");
  blocco.appendChild(crea("h3", "stat-sottotitolo", "Il bomber di ogni squadra"));

  const elenco = crea("ul", "stat-bomber");
  Object.entries(capocannonieri)
    .sort((a, b) => b[1].gol - a[1].gol || a[0].localeCompare(b[0], "it"))
    .forEach(([squadra, { giocatore, gol }]) => {
      const voce = crea("li");
      const chi = crea("span", "stat-bomber-nome");
      chi.append(crea("b", "", giocatore), " · ", linkA(squadra, divisione));
      voce.append(chi, crea("span", "stat-bomber-gol", `${gol} gol`));
      elenco.appendChild(voce);
    });
  blocco.appendChild(elenco);
  return blocco;
}

function bloccoConfronto(dati) {
  const { squadre, partite, divisione } = dati;
  const nomi = Object.keys(squadre || {}).sort((a, b) => a.localeCompare(b, "it"));

  if (sceltaConfronto.divisione !== divisione) {
    Object.assign(sceltaConfronto, { divisione, a: "", b: "" });
  }

  const blocco = crea("div", "stat-blocco stat-confronto");
  blocco.appendChild(crea("h3", "stat-sottotitolo", "Confronto diretto"));

  const scelte = crea("div", "stat-confronto-scelte");
  const risultatoConfronto = crea("div", "stat-confronto-risultato");
  risultatoConfronto.setAttribute("aria-live", "polite");

  const select = (campo, etichetta) => {
    const label = crea("label", "stat-confronto-campo");
    label.appendChild(crea("span", "sr-only", etichetta));
    const menu = crea("select");
    menu.appendChild(new Option(etichetta, ""));
    nomi.forEach((nome) => menu.appendChild(new Option(nomeSquadra(nome), nome)));
    menu.value = sceltaConfronto[campo];
    menu.addEventListener("change", () => {
      sceltaConfronto[campo] = menu.value;
      mostra();
    });
    label.appendChild(menu);
    return label;
  };

  scelte.append(select("a", "Squadra 1"), crea("span", "stat-confronto-vs", "vs"), select("b", "Squadra 2"));

  const mostra = () => {
    const { a, b } = sceltaConfronto;
    risultatoConfronto.replaceChildren();
    if (!a || !b) {
      risultatoConfronto.appendChild(
        crea("p", "stat-legenda", "Scegli due squadre per vedere i loro precedenti.")
      );
      return;
    }
    if (a === b) {
      risultatoConfronto.appendChild(crea("p", "stat-legenda", "Scegli due squadre diverse."));
      return;
    }
    const confronto = confrontoDiretto(partite, a, b);
    if (!confronto.incontri.length) {
      risultatoConfronto.appendChild(
        crea("p", "stat-legenda", "Non si sono ancora affrontate in questa edizione.")
      );
      return;
    }
    const bilancio = crea("div", "stat-confronto-bilancio");
    bilancio.append(
      tessera(String(confronto.vittorieA), `Vittorie ${nomeSquadra(a)}`),
      tessera(String(confronto.pareggi), "Pareggi"),
      tessera(String(confronto.vittorieB), `Vittorie ${nomeSquadra(b)}`)
    );
    const elenco = crea("ul", "stat-confronto-partite");
    confronto.incontri.forEach((p) => {
      const voce = crea("li");
      voce.append(crea("span", "stat-legenda", `Giornata ${p.giornata}`), risultato(p, divisione));
      elenco.appendChild(voce);
    });
    risultatoConfronto.append(bilancio, elenco);
  };

  mostra();
  blocco.append(scelte, risultatoConfronto);
  return blocco;
}

export function statisticheCampionato(containerId, dati) {
  const container = document.getElementById(containerId);
  if (!container) return;

  const stat = calcolaStatistiche(dati.squadre, dati.partite);
  if (!stat.partite) {
    container.replaceChildren(
      crea("p", "avviso-vuoto", "Le statistiche compariranno dopo le prime partite.")
    );
    return;
  }

  const tessere = crea("div", "stat-tessere");
  tessere.append(
    tessera(String(stat.partite), stat.partite === 1 ? "Partita giocata" : "Partite giocate"),
    tessera(String(stat.totaleGol), "Gol segnati"),
    tessera(stat.mediaGol.toLocaleString("it-IT", { maximumFractionDigits: 1 }), "Gol a partita"),
    tessera(String(stat.pareggi), stat.pareggi === 1 ? "Pareggio" : "Pareggi")
  );

  const colonne = crea("div", "stat-colonne");
  colonne.append(
    bloccoForma(stat.forma, dati.divisione),
    bloccoCapocannonieri(stat.capocannonieri, dati.divisione)
  );

  container.replaceChildren(tessere, bloccoRecord(stat, dati.divisione), colonne, bloccoConfronto(dati));
}
