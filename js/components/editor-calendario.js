import { db, ref, update, set, getData, getPaths } from "../firebase.js";
import * as G from "../utils/generatore-calendario.js";
import { avviso, conferma, mostraToast } from "../utils/interfaccia.js";
import * as M from "./editor-calendario/modello.js";
import { el, icona, pulsanteIcona, dialogo, voceAzione } from "./editor-calendario/dom.js";

const {
  ID_PARCHEGGIO,
  CARATTERI_VIETATI,
  voci,
  eNumerica,
  statoDaCalendario,
  indiceGiocate,
  clona,
  nome,
  chiavePartita,
  nuovaPartita,
  nuovaGiornata,
  impronta,
  perPubblicazione,
} = M;

// Messaggio di errore breve, al posto di alert()
const errore = (testo) => mostraToast(testo, { errore: true });

/*
===================================
EDITOR CALENDARIO (GESTIONALE)
===================================

Si lavora su una BOZZA: ogni modifica (generazione, spostamenti, date...)
cambia solo la bozza, salvata in Calcio/<ed>/<div>/CalendarioBozza così da
sopravvivere a una ricarica o al passaggio su un altro dispositivo. Il sito
pubblico legge solo Calendario, che viene riscritto premendo "Pubblica".

Risultati (Partite) e referti (Referti) sono indicizzati per giornata e per
chiave "Casa:Ospite": ogni partita ricorda da dove viene (`origine`) e, alla
pubblicazione, i suoi dati vengono spostati nella nuova posizione.

Stato della bozza:
  giornate:   giornate numerate, in ordine (il numero è la posizione)
  speciali:   giornate con nome fisso della fase finale (QF, SF, F...)
  parcheggio: partite tolte dal calendario ma non ancora ricollocate
Ogni giornata è { id, nome, bloccata, partite: [partita] } e ogni partita
{ id, casa, ospite, Data, Orario, Luogo, origine: { g, chiave } | null }.
*/

const SORTABLE_URL = "https://cdn.jsdelivr.net/npm/sortablejs@1.15.2/modular/sortable.esm.js";
const MAX_ANNULLA = 100;

let percorsi = null;
let squadre = {}; // nodo Squadre
let pubblicato = null; // stato ricostruito dal calendario pubblicato
let giocate = new Map(); // "g|Casa:Ospite" -> { risultato, partita, referto }
let stato = null;
let annulla = [];
let ripeti = [];
let evidenziata = "";
let bozzaSalvataAlle = null;
let bozzaBaseCambiata = false;
let timerBozza = null;
let caricamento = 0; // scarta i caricamenti superati da uno più recente
let sortablePromise = null;

/*
-----------------------------------
AVVIO E CARICAMENTO
-----------------------------------
*/

export async function showCalendarEditor() {
  const contenitore = document.getElementById("calendar-content");
  if (!contenitore) return;
  contenitore.innerHTML = `<p class="cal-caricamento">Caricamento del calendario…</p>`;

  // Una bozza ancora da salvare della divisione precedente va scritta ora
  await salvaBozzaSubito();

  const mio = ++caricamento;
  annulla = [];
  ripeti = [];
  evidenziata = "";

  try {
    await carica();
  } catch (error) {
    console.error("Errore nel caricamento del calendario:", error);
    contenitore.innerHTML = `<p class="cal-caricamento">Impossibile caricare il calendario. Riprova.</p>`;
    return;
  }
  if (mio !== caricamento || !document.getElementById("calendar-content")) return;

  registraScorciatoie();
  render();
}

async function carica() {
  const { calendarPath, matchesPath, teamsPath } = getPaths();
  const base = calendarPath.replace(/\/Calendario$/, "");
  percorsi = {
    calendario: calendarPath,
    partite: matchesPath,
    squadre: teamsPath,
    referti: `${base}/Referti`,
    bozza: `${base}/CalendarioBozza`,
    bloccate: `${base}/CalendarioBloccate`,
  };

  const [calendario, partite, referti, datiSquadre, bozza, bloccate] = await Promise.all([
    getData(percorsi.calendario),
    getData(percorsi.partite),
    getData(percorsi.referti),
    getData(percorsi.squadre),
    getData(percorsi.bozza),
    getData(percorsi.bloccate),
  ]);

  squadre = datiSquadre || {};
  giocate = indiceGiocate(calendario, partite, referti);
  pubblicato = statoDaCalendario(calendario, bloccate);

  stato = null;
  bozzaSalvataAlle = null;
  bozzaBaseCambiata = false;
  if (bozza?.stato) {
    try {
      stato = JSON.parse(bozza.stato);
      bozzaSalvataAlle = bozza.aggiornata ? new Date(bozza.aggiornata) : null;
      bozzaBaseCambiata = bozza.base !== impronta(pubblicato);
    } catch (error) {
      console.error("Bozza del calendario illeggibile, la ignoro:", error);
    }
  }
  if (!stato) stato = clona(pubblicato);
}

/*
-----------------------------------
FUNZIONI DI SUPPORTO
-----------------------------------
*/

// Ricerche sulla bozza: senza indicarla si usa quella aperta
const tutteLeListe = (s = stato) => M.tutteLeListe(s);
const trovaLista = (id, s = stato) => M.trovaLista(id, s);
const trovaPartita = (id, s = stato) => M.trovaPartita(id, s);
const etichettaLista = (lista, s = stato) => M.etichettaLista(lista, s);

const gironeDi = (chiave) => squadre[chiave]?.Girone || "";
function infoGiocata(partita) {
  if (!partita.origine) return null;
  return giocate.get(`${partita.origine.g}|${partita.origine.chiave}`) || null;
}

const eGiocata = (partita) => infoGiocata(partita) !== null;

// Gironi delle squadre. Se nessuna ha un girone c'è un girone unico; se
// solo alcune ce l'hanno, le altre restano fuori (come in classifica)
function gironi() {
  const perGirone = {};
  for (const chiave of Object.keys(squadre).sort((a, b) => a.localeCompare(b))) {
    const girone = gironeDi(chiave);
    (perGirone[girone] ||= []).push(chiave);
  }
  const conLettera = Object.keys(perGirone).filter(Boolean).sort();
  if (conLettera.length === 0) {
    return { elenco: [{ nome: "", squadre: perGirone[""] || [] }], esclusi: [] };
  }
  return {
    elenco: conLettera.map((girone) => ({ nome: girone, squadre: perGirone[girone] })),
    esclusi: perGirone[""] || [],
  };
}

const etichettaGirone = (girone) => (girone ? `Girone ${girone}` : "Girone unico");

function gironeDellaPartita(partita) {
  const a = gironeDi(partita.casa);
  const b = gironeDi(partita.ospite);
  return a === b ? a : null; // null = squadre di gironi diversi
}

const ciSonoModifiche = () => impronta(stato) !== impronta(pubblicato);

/*
-----------------------------------
MODIFICHE, ANNULLA, BOZZA
-----------------------------------
*/

// Ogni modifica passa da qui: salva lo stato per "Annulla", applica la
// funzione e ridisegna. Se la funzione restituisce false non cambia nulla.
function modifica(descrizione, funzione, { ridisegna = true } = {}) {
  const prima = JSON.stringify(stato);
  const esito = funzione(stato);
  if (esito === false || JSON.stringify(stato) === prima) {
    stato = JSON.parse(prima);
    return false;
  }

  annulla.push({ stato: prima, descrizione });
  if (annulla.length > MAX_ANNULLA) annulla.shift();
  ripeti = [];

  if (ridisegna) render();
  else aggiornaBarra();
  programmaBozza();
  if (descrizione) mostraAvviso(descrizione, true);
  return true;
}

function annullaModifica() {
  const voce = annulla.pop();
  if (!voce) return;
  ripeti.push({ stato: JSON.stringify(stato), descrizione: voce.descrizione });
  stato = JSON.parse(voce.stato);
  render();
  programmaBozza();
  mostraAvviso(`Annullato: ${voce.descrizione || "modifica"}`);
}

function ripetiModifica() {
  const voce = ripeti.pop();
  if (!voce) return;
  annulla.push({ stato: JSON.stringify(stato), descrizione: voce.descrizione });
  stato = JSON.parse(voce.stato);
  render();
  programmaBozza();
  mostraAvviso(`Ripristinato: ${voce.descrizione || "modifica"}`);
}

// La bozza si salva poco dopo l'ultima modifica; senza modifiche rispetto al
// pubblicato viene cancellata. Il percorso è fissato adesso: se nel frattempo
// si cambia divisione, la bozza finisce comunque nella divisione giusta.
let bozzaInSospeso = null;
// Le scritture della bozza vanno in fila: una lenta non deve arrivare dopo
// la cancellazione fatta dalla pubblicazione
let scritturaBozza = Promise.resolve();

function programmaBozza() {
  clearTimeout(timerBozza);
  bozzaInSospeso = {
    percorso: percorsi.bozza,
    dati: ciSonoModifiche() ? { stato: JSON.stringify(stato), base: impronta(pubblicato) } : null,
  };
  timerBozza = setTimeout(salvaBozzaSubito, 800);
}

async function salvaBozzaSubito() {
  clearTimeout(timerBozza);
  timerBozza = null;
  const daSalvare = bozzaInSospeso;
  bozzaInSospeso = null;
  if (daSalvare) {
    scritturaBozza = scritturaBozza.then(() => scriviBozza(daSalvare.percorso, daSalvare.dati));
  }
  await scritturaBozza;
}

async function scriviBozza(percorso, dati) {
  try {
    const aggiornata = new Date();
    await set(ref(db, percorso), dati && { ...dati, aggiornata: aggiornata.toISOString() });
    if (percorso === percorsi?.bozza) {
      bozzaSalvataAlle = dati ? aggiornata : null;
      if (!dati) bozzaBaseCambiata = false;
      aggiornaBarra();
    }
  } catch (error) {
    console.error("Errore nel salvataggio della bozza:", error);
    mostraAvviso("Bozza non salvata: controlla la connessione.");
  }
}

async function scartaBozza() {
  if (!ciSonoModifiche()) return;
  if (
    !(await conferma("Scartare tutte le modifiche non pubblicate e tornare al calendario pubblicato?", {
      titolo: "Scarta la bozza",
      ok: "Scarta",
      pericolosa: true,
    }))
  )
    return;
  modifica("Bozza scartata", (s) => {
    Object.assign(s, clona(pubblicato));
  });
}

/*
-----------------------------------
DISEGNO
-----------------------------------
*/

function render() {
  const contenitore = document.getElementById("calendar-content");
  if (!contenitore || !stato) return;

  const main = document.querySelector("main");
  const scorrimento = main?.scrollTop ?? 0;

  contenitore.innerHTML = "";
  contenitore.append(
    disegnaBarra(),
    disegnaStrumenti(),
    disegnaAvvisi(),
    disegnaParcheggio(),
    disegnaGiornate(),
    disegnaSpeciali(),
    el("div", { id: "cal-toast", role: "status", "aria-live": "polite" })
  );

  if (main) main.scrollTop = scorrimento;
  aggiornaBarra();
  attivaTrascinamento();
}

function disegnaBarra() {
  const barra = el("div", { id: "cal-barra" });
  barra.append(
    el("div", { id: "cal-stato" }),
    el(
      "div",
      { class: "cal-barra-azioni" },
      pulsanteIcona("icona-rotate-left", "Annulla (Ctrl+Z)", annullaModifica, { id: "cal-annulla" }),
      pulsanteIcona("icona-rotate-right", "Ripeti (Ctrl+Y)", ripetiModifica, { id: "cal-ripeti" }),
      el(
        "button",
        { type: "button", id: "cal-scarta", class: "cal-pulsante", onclick: scartaBozza },
        icona("icona-trash-can-arrow-up"),
        el("span", {}, "Scarta bozza")
      ),
      el(
        "button",
        { type: "button", id: "cal-pubblica", class: "custom-button btn-principale", onclick: pubblica },
        icona("icona-cloud-arrow-up"),
        el("span", {}, " Pubblica")
      )
    )
  );
  return barra;
}

function aggiornaBarra() {
  const testo = document.getElementById("cal-stato");
  if (!testo) return;

  const modifiche = ciSonoModifiche();
  testo.innerHTML = "";
  testo.className = modifiche ? "bozza" : "";
  if (modifiche) {
    const ora = bozzaSalvataAlle
      ? ` · salvata alle ${bozzaSalvataAlle.toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}`
      : "";
    testo.append(
      el("strong", {}, "Bozza non pubblicata"),
      el("span", {}, `${ora}. Il sito mostra ancora il calendario precedente.`)
    );
    if (bozzaBaseCambiata) {
      testo.append(
        el(
          "span",
          { class: "cal-attenzione" },
          " Il calendario pubblicato è cambiato dopo l'inizio di questa bozza: pubblicandola le sue date e i suoi luoghi verranno sostituiti da quelli della bozza (i risultati restano)."
        )
      );
    }
  } else {
    testo.append(el("strong", {}, "Calendario pubblicato"), el("span", {}, " · nessuna modifica in sospeso"));
  }

  const disabilita = (id, valore) => {
    const pulsante = document.getElementById(id);
    if (pulsante) pulsante.disabled = valore;
  };
  disabilita("cal-annulla", annulla.length === 0);
  disabilita("cal-ripeti", ripeti.length === 0);
  disabilita("cal-scarta", !modifiche);
  disabilita("cal-pubblica", !modifiche);
}

function disegnaStrumenti() {
  const selezione = el(
    "select",
    {
      id: "cal-evidenzia",
      "aria-label": "Evidenzia squadra",
      onchange: (e) => {
        evidenziata = e.target.value;
        render();
      },
    },
    el("option", { value: "" }, "Evidenzia squadra…"),
    Object.keys(squadre)
      .sort((a, b) => a.localeCompare(b))
      .map((chiave) => el("option", { value: chiave, selected: chiave === evidenziata }, nome(chiave)))
  );

  const strumento = (classiIcona, testo, azione) =>
    el(
      "button",
      { type: "button", class: "cal-pulsante", onclick: azione },
      icona(classiIcona),
      el("span", {}, testo)
    );

  return el(
    "div",
    { id: "cal-strumenti" },
    strumento("icona-wand-magic-sparkles", "Genera calendario", apriGenera),
    strumento("icona-layer-group", "Strumenti giornate", apriStrumentiGiornate),
    strumento("icona-users", "Strumenti squadra", () => apriStrumentiSquadra(evidenziata)),
    strumento("icona-plus", "Aggiungi partita", () => apriAggiungiPartita()),
    strumento("icona-table-list", "Riepilogo", apriRiepilogo),
    selezione
  );
}

// Problemi che impediscono o sconsigliano la pubblicazione
function analizza(s = stato) {
  const problemi = [];

  for (const giornata of [...s.giornate, ...s.speciali]) {
    const etichetta = etichettaLista(giornata, s);
    const conteggio = {};
    const chiavi = {};
    for (const p of giornata.partite) {
      conteggio[p.casa] = (conteggio[p.casa] || 0) + 1;
      conteggio[p.ospite] = (conteggio[p.ospite] || 0) + 1;
      chiavi[chiavePartita(p)] = (chiavi[chiavePartita(p)] || 0) + 1;
    }
    const doppie = Object.keys(conteggio).filter((squadra) => conteggio[squadra] > 1);
    if (doppie.length) {
      problemi.push({
        grave: false,
        testo: `${etichetta}: ${doppie.map(nome).join(", ")} ${doppie.length > 1 ? "giocano" : "gioca"} più di una partita`,
      });
    }
    for (const [chiave, volte] of Object.entries(chiavi)) {
      if (volte > 1) {
        problemi.push({
          grave: true,
          testo: `${etichetta}: la partita ${chiave.split(":").map(nome).join(" – ")} compare ${volte} volte`,
        });
      }
    }
  }

  const tutte = tutteLeListe(s).flatMap((lista) => lista.partite);
  const mancanti = new Set();
  for (const p of tutte) {
    for (const squadra of [p.casa, p.ospite]) if (!squadre[squadra]) mancanti.add(squadra);
    if (p.casa === p.ospite) {
      problemi.push({ grave: true, testo: `${nome(p.casa)} gioca contro se stessa` });
    }
  }
  if (mancanti.size) {
    problemi.push({
      grave: false,
      testo: `Squadre non più presenti in "Squadre": ${[...mancanti].map(nome).join(", ")}`,
    });
  }

  if (s.parcheggio.length) {
    problemi.push({
      grave: s.parcheggio.some(eGiocata),
      testo: `${s.parcheggio.length} partite in "Da collocare": se pubblichi così non saranno in calendario`,
    });
  }
  return problemi;
}

function disegnaAvvisi() {
  const problemi = analizza();
  const contenitore = el("div", { id: "cal-avvisi" });
  if (!problemi.length) return contenitore;

  contenitore.append(
    el(
      "ul",
      {},
      problemi.map((p) =>
        el(
          "li",
          { class: p.grave ? "grave" : "" },
          icona(p.grave ? "icona-circle-xmark" : "icona-triangle-exclamation"),
          " ",
          p.testo
        )
      )
    )
  );
  return contenitore;
}

function disegnaParcheggio() {
  const sezione = el(
    "section",
    { id: "cal-parcheggio", class: stato.parcheggio.length ? "" : "vuoto" },
    el(
      "header",
      {},
      el("h3", {}, icona("icona-inbox"), " Da collocare"),
      el(
        "small",
        {},
        stato.parcheggio.length
          ? `${stato.parcheggio.length} partite`
          : "Trascina qui una partita per toglierla dalla sua giornata senza eliminarla"
      )
    ),
    disegnaListaPartite({ id: ID_PARCHEGGIO, partite: stato.parcheggio, bloccata: false })
  );
  return sezione;
}

function disegnaGiornate() {
  const contenitore = el("div", { id: "cal-giornate" });

  if (stato.giornate.length === 0) {
    contenitore.append(
      el(
        "div",
        { class: "cal-vuoto" },
        el(
          "p",
          {},
          Object.keys(squadre).length
            ? "Il calendario è vuoto."
            : "Non ci sono squadre in questa divisione: aggiungile nella sezione Squadre."
        ),
        Object.keys(squadre).length > 1 &&
          el(
            "button",
            { type: "button", class: "custom-button", onclick: apriGenera },
            icona("icona-wand-magic-sparkles"),
            " Genera calendario"
          )
      )
    );
  }

  stato.giornate.forEach((giornata, indice) => contenitore.append(disegnaGiornata(giornata, indice)));

  const aggiungi = el(
    "button",
    {
      type: "button",
      class: "cal-nuova-giornata",
      onclick: () =>
        modifica("Giornata aggiunta", (s) => {
          s.giornate.push(nuovaGiornata());
        }),
    },
    icona("icona-plus"),
    " Nuova giornata"
  );

  return el("div", { class: "cal-sezione" }, contenitore, aggiungi);
}

function disegnaSpeciali() {
  const contenitore = el("div", { id: "cal-speciali" });
  stato.speciali.forEach((giornata) => contenitore.append(disegnaGiornata(giornata, -1)));

  const aggiungi = el(
    "button",
    { type: "button", class: "cal-nuova-giornata", onclick: aggiungiGiornataSpeciale },
    icona("icona-trophy"),
    " Nuova giornata fase finale (es. SF, F)"
  );

  return el(
    "div",
    { class: "cal-sezione" },
    el("h2", { class: "cal-titolo-sezione" }, "Fase finale"),
    el(
      "p",
      { class: "cal-nota" },
      "Giornate con nome fisso: restano sempre in fondo e non vengono rinumerate."
    ),
    contenitore,
    aggiungi
  );
}

function disegnaGiornata(giornata, indice) {
  const numerata = !giornata.nome;
  const giocateQui = giornata.partite.filter(eGiocata).length;

  // Squadre impegnate due volte nella stessa giornata
  const conteggio = {};
  for (const p of giornata.partite) {
    conteggio[p.casa] = (conteggio[p.casa] || 0) + 1;
    conteggio[p.ospite] = (conteggio[p.ospite] || 0) + 1;
  }
  const doppie = new Set(Object.keys(conteggio).filter((s) => conteggio[s] > 1));

  const intestazione = el(
    "header",
    {},
    numerata && !giornata.bloccata
      ? el(
          "span",
          { class: "cal-giornata-maniglia", title: "Trascina per spostare la giornata" },
          icona("icona-grip-vertical")
        )
      : null,
    el(
      "div",
      { class: "cal-giornata-titolo" },
      el("h3", {}, numerata ? `Giornata ${indice + 1}` : giornata.nome),
      el(
        "small",
        {},
        `${giornata.partite.length} partite`,
        giocateQui ? ` · ${giocateQui} giocate` : "",
        doppie.size ? el("span", { class: "cal-conflitto-badge" }, " · conflitto") : null
      )
    ),
    el(
      "div",
      { class: "cal-giornata-azioni" },
      numerata &&
        pulsanteIcona("icona-arrow-up", "Sposta prima", () => spostaGiornata(giornata.id, -1), {
          disabled: indice === 0 || giornata.bloccata,
        }),
      numerata &&
        pulsanteIcona("icona-arrow-down", "Sposta dopo", () => spostaGiornata(giornata.id, 1), {
          disabled: indice === stato.giornate.length - 1 || giornata.bloccata,
        }),
      pulsanteIcona(
        giornata.bloccata ? "icona-lock" : "icona-lock-open",
        giornata.bloccata
          ? "Giornata bloccata: le sue partite e la sua posizione sono protette. Premi per sbloccare"
          : "Blocca la giornata",
        () =>
          modifica(giornata.bloccata ? "Giornata sbloccata" : "Giornata bloccata", (s) => {
            const g = trovaLista(giornata.id, s);
            g.bloccata = !g.bloccata;
          }),
        { class: `cal-icona ${giornata.bloccata ? "attivo" : ""}` }
      ),
      pulsanteIcona("icona-ellipsis-vertical", "Altre azioni sulla giornata", () =>
        apriAzioniGiornata(giornata.id)
      )
    )
  );

  // Chi riposa: le squadre dei gironi presenti in questa giornata che non giocano
  let riposo = null;
  if (numerata && giornata.partite.length) {
    const gironiPresenti = new Set(giornata.partite.flatMap((p) => [gironeDi(p.casa), gironeDi(p.ospite)]));
    const inCampo = new Set(Object.keys(conteggio));
    const riposano = Object.keys(squadre)
      .filter((s) => gironiPresenti.has(gironeDi(s)) && !inCampo.has(s))
      .sort((a, b) => a.localeCompare(b));
    if (riposano.length) {
      riposo = el(
        "footer",
        {},
        el("span", {}, "Riposa: "),
        riposano.map((s, i) => [
          i ? ", " : "",
          el("span", { class: s === evidenziata ? "cal-evidenziata-testo" : "" }, nome(s)),
        ])
      );
    }
  }

  return el(
    "section",
    {
      class: [
        "cal-giornata",
        giornata.bloccata ? "bloccata" : "",
        doppie.size ? "conflitto" : "",
        evidenziata && !conteggio[evidenziata] && giornata.partite.length ? "senza-evidenziata" : "",
      ].join(" "),
      dataset: { id: giornata.id },
    },
    intestazione,
    disegnaListaPartite(giornata, doppie),
    riposo
  );
}

function disegnaListaPartite(lista, doppie = new Set()) {
  const ul = el("ul", {
    class: "cal-lista",
    dataset: { lista: lista.id, vuota: lista.partite.length ? "" : "1", bloccata: lista.bloccata ? "1" : "" },
  });
  for (const partita of lista.partite) ul.append(disegnaPartita(partita, lista, doppie));
  return ul;
}

function disegnaPartita(partita, lista, doppie) {
  const info = infoGiocata(partita);
  const girone = gironeDellaPartita(partita);
  const coinvolta = evidenziata && (partita.casa === evidenziata || partita.ospite === evidenziata);

  const squadraEl = (chiave) =>
    el(
      "span",
      { class: `cal-squadra ${doppie.has(chiave) ? "doppia" : ""} ${squadre[chiave] ? "" : "mancante"}` },
      nome(chiave)
    );

  const campo = (chiaveCampo, segnaposto, modalita, verifica) => {
    const input = el("input", {
      type: "text",
      value: partita[chiaveCampo] || "",
      placeholder: segnaposto,
      "aria-label": `${segnaposto} di ${nome(partita.casa)} – ${nome(partita.ospite)}`,
      inputMode: modalita,
      class: `cal-campo cal-campo-${chiaveCampo.toLowerCase()}`,
    });
    const controlla = () => input.classList.toggle("non-valido", !!input.value && !verifica(input.value));
    controlla();
    input.addEventListener("input", controlla);
    input.addEventListener("change", () => {
      const valore = normalizzaCampo(chiaveCampo, input.value);
      input.value = valore;
      controlla();
      modifica(
        "",
        (s) => {
          trovaPartita(partita.id, s).partita[chiaveCampo] = valore;
        },
        { ridisegna: false }
      );
    });
    return input;
  };

  return el(
    "li",
    {
      class: [
        "cal-partita",
        info ? "giocata" : "",
        coinvolta ? "evidenziata" : "",
        evidenziata && !coinvolta ? "attenuata" : "",
      ].join(" "),
      dataset: { id: partita.id },
    },
    el(
      "div",
      { class: "cal-partita-riga", title: lista.bloccata ? "" : "Trascina per spostare la partita" },
      el(
        "span",
        { class: "cal-squadre" },
        squadraEl(partita.casa),
        el("span", { class: "cal-vs" }, info?.risultato || "–"),
        squadraEl(partita.ospite)
      ),
      girone === null
        ? el("span", { class: "cal-girone misto", title: "Squadre di gironi diversi" }, "Misto")
        : girone
          ? el("span", { class: "cal-girone", title: etichettaGirone(girone) }, girone)
          : null,
      info
        ? el(
            "span",
            {
              class: "cal-giocata-badge",
              title: info.referto && !info.partita ? "Referto ricevuto" : "Partita giocata",
            },
            icona(info.partita || info.risultato ? "icona-check-semplice" : "icona-file-lines")
          )
        : null,
      el(
        "span",
        { class: "cal-partita-azioni" },
        pulsanteIcona(
          "icona-right-left",
          info ? "Partita giocata: casa e trasferta non si possono invertire" : "Inverti casa e trasferta",
          () => invertiPartita(partita.id),
          {
            disabled: !!info,
          }
        ),
        pulsanteIcona("icona-ellipsis", "Altre azioni sulla partita", () => apriAzioniPartita(partita.id))
      )
    ),
    el(
      "div",
      { class: "cal-partita-campi" },
      campo("Data", "gg/mm", "numeric", (v) => /^\d{1,2}\/\d{1,2}$/.test(v)),
      campo("Orario", "hh:mm", "numeric", (v) => /^\d{1,2}:\d{2}$/.test(v)),
      campo("Luogo", "Luogo", "text", () => true)
    )
  );
}

// "6/4" -> "06/04", "16.00" -> "16:00": il sito ordina le partite leggendo
// questi due formati (convertiDataOra)
function normalizzaCampo(campo, valore) {
  const testo = valore.trim();
  if (campo === "Data") {
    const m = testo.match(/^(\d{1,2})[/.-](\d{1,2})$/);
    return m ? `${m[1].padStart(2, "0")}/${m[2].padStart(2, "0")}` : testo;
  }
  if (campo === "Orario") {
    const m = testo.match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
    return m ? `${m[1].padStart(2, "0")}:${m[2] || "00"}` : testo;
  }
  return testo;
}

/*
-----------------------------------
TRASCINAMENTO
-----------------------------------
*/

function caricaSortable() {
  sortablePromise ||= import(SORTABLE_URL).then((modulo) => modulo.default);
  return sortablePromise;
}

async function attivaTrascinamento() {
  let Sortable;
  try {
    Sortable = await caricaSortable();
  } catch (error) {
    console.error("Impossibile caricare il trascinamento:", error);
    document.getElementById("calendar-content")?.classList.add("senza-trascinamento");
    return;
  }

  const comuni = {
    animation: 150,
    // Su smartphone serve una breve pressione, così lo scorrimento resta libero
    delay: 200,
    delayOnTouchOnly: true,
    ghostClass: "cal-fantasma",
    chosenClass: "cal-scelta",
  };

  // Partite: tra giornate, fase finale e "Da collocare"
  // Due ridisegni ravvicinati arrivano qui entrambi: niente doppioni
  document.querySelectorAll("#calendar-content .cal-lista").forEach((lista) => {
    if (Sortable.get(lista)) return;
    const bloccata = lista.dataset.bloccata === "1";
    Sortable.create(lista, {
      ...comuni,
      group: { name: "cal-partite", pull: !bloccata, put: !bloccata },
      sort: !bloccata,
      handle: ".cal-partita-riga",
      filter: "button",
      preventOnFilter: false,
      onEnd: (evento) => {
        if (evento.from === evento.to && evento.oldIndex === evento.newIndex) return;
        const id = evento.item.dataset.id;
        const destinazione = evento.to.dataset.lista;
        const posizione = evento.newDraggableIndex ?? evento.newIndex;
        // Il ridisegno sostituisce le liste: lo si fa a trascinamento concluso
        setTimeout(() => spostaPartita(id, destinazione, posizione), 0);
      },
    });
  });

  // Ordine delle giornate numerate
  const giornate = document.getElementById("cal-giornate");
  if (giornate && !Sortable.get(giornate)) {
    Sortable.create(giornate, {
      ...comuni,
      handle: ".cal-giornata-maniglia",
      draggable: ".cal-giornata",
      onEnd: (evento) => {
        if (evento.oldIndex === evento.newIndex) return;
        const ordine = [...giornate.querySelectorAll(":scope > .cal-giornata")].map((g) => g.dataset.id);
        setTimeout(() => riordinaGiornate(ordine), 0);
      },
    });
  }
}

/*
-----------------------------------
OPERAZIONI SULLE PARTITE
-----------------------------------
*/

function spostaPartita(id, idDestinazione, posizione = Infinity) {
  const trovata = trovaPartita(id);
  if (!trovata) return;
  if (idDestinazione === ID_PARCHEGGIO && eGiocata(trovata.partita)) {
    mostraAvviso(
      'Le partite già giocate non possono andare in "Da collocare": spostale in un\'altra giornata.'
    );
    render();
    return;
  }

  const destinazione = trovaLista(idDestinazione);
  modifica(
    `Partita spostata in ${destinazione ? etichettaLista(destinazione) : "una nuova giornata"}`,
    (s) => {
      const { lista, indice } = trovaPartita(id, s);
      const [partita] = lista.partite.splice(indice, 1);
      let arrivo = trovaLista(idDestinazione, s);
      if (!arrivo) {
        arrivo = nuovaGiornata();
        s.giornate.push(arrivo);
      }
      arrivo.partite.splice(Math.min(posizione, arrivo.partite.length), 0, partita);
    }
  );
}

function invertiPartita(id) {
  const trovata = trovaPartita(id);
  if (!trovata || eGiocata(trovata.partita)) return;
  modifica("Casa e trasferta invertite", (s) => {
    const { partita } = trovaPartita(id, s);
    [partita.casa, partita.ospite] = [partita.ospite, partita.casa];
  });
}

async function eliminaPartita(id) {
  const trovata = trovaPartita(id);
  if (!trovata) return false;
  const { partita } = trovata;
  const testo = `${nome(partita.casa)} – ${nome(partita.ospite)}`;
  if (eGiocata(partita)) {
    const continua = await conferma(
      `${testo} è già stata giocata o ha un referto.\n\nEliminandola, alla pubblicazione verranno cancellati anche il risultato e il referto. Continuare?`,
      { titolo: "Partita già giocata", ok: "Elimina", pericolosa: true }
    );
    if (!continua) return false;
  }
  return modifica(`Partita ${testo} eliminata`, (s) => {
    const { lista, indice } = trovaPartita(id, s);
    lista.partite.splice(indice, 1);
  });
}

function scambiaPartite(idA, idB) {
  modifica("Partite scambiate", (s) => {
    const a = trovaPartita(idA, s);
    const b = trovaPartita(idB, s);
    if (!a || !b) return false;
    a.lista.partite[a.indice] = b.partita;
    b.lista.partite[b.indice] = a.partita;
  });
}

/*
-----------------------------------
OPERAZIONI SULLE GIORNATE
-----------------------------------
*/

function spostaGiornata(id, verso) {
  modifica("Giornata spostata", (s) => {
    const indice = s.giornate.findIndex((g) => g.id === id);
    const nuovo = indice + verso;
    if (indice === -1 || nuovo < 0 || nuovo >= s.giornate.length) return false;
    const [giornata] = s.giornate.splice(indice, 1);
    s.giornate.splice(nuovo, 0, giornata);
  });
}

function portaGiornataInPosizione(id, posizione) {
  modifica(`Giornata spostata in posizione ${posizione + 1}`, (s) => {
    const indice = s.giornate.findIndex((g) => g.id === id);
    if (indice === -1) return false;
    const [giornata] = s.giornate.splice(indice, 1);
    s.giornate.splice(posizione, 0, giornata);
  });
}

function riordinaGiornate(ordineId) {
  modifica("Giornate riordinate", (s) => {
    const perId = new Map(s.giornate.map((g) => [g.id, g]));
    s.giornate = ordineId.map((id) => perId.get(id)).filter(Boolean);
  });
}

function scambiaGiornate(idA, idB) {
  modifica("Giornate scambiate", (s) => {
    const a = s.giornate.findIndex((g) => g.id === idA);
    const b = s.giornate.findIndex((g) => g.id === idB);
    if (a === -1 || b === -1 || a === b) return false;
    [s.giornate[a], s.giornate[b]] = [s.giornate[b], s.giornate[a]];
  });
}

// Le giornate bloccate o con partite giocate restano al loro posto; le altre
// si scambiano tra le posizioni rimaste libere
function riordinaMobili(s, trasforma) {
  const mobili = s.giornate
    .map((g, i) => ({ g, i }))
    .filter(({ g }) => !g.bloccata && !g.partite.some(eGiocata));
  const nuove = trasforma(mobili.map(({ g }) => g));
  mobili.forEach(({ i }, k) => {
    s.giornate[i] = nuove[k];
  });
  return mobili.length > 1;
}

function aggiungiGiornataSpeciale() {
  const campo = el("input", {
    type: "text",
    class: "cal-campo",
    placeholder: "Es. QF, SF1, SF2, F",
    "aria-label": "Nome della giornata",
  });

  // false = la finestra resta aperta per correggere il nome
  const aggiungi = () => {
    const nomeGiornata = campo.value.trim();
    if (!nomeGiornata) {
      errore("Scrivi il nome della giornata.");
      return false;
    }
    if (eNumerica(nomeGiornata)) {
      errore('Le giornate numerate si aggiungono con "Nuova giornata": qui serve un nome come SF o F.');
      return false;
    }
    if (CARATTERI_VIETATI.test(nomeGiornata)) {
      errore("Il nome non può contenere i caratteri . / # $ [ ] :");
      return false;
    }
    if (stato.speciali.some((g) => g.nome === nomeGiornata)) {
      errore(`Esiste già una giornata "${nomeGiornata}".`);
      return false;
    }
    modifica(`Giornata ${nomeGiornata} aggiunta`, (s) => {
      s.speciali.push(nuovaGiornata(nomeGiornata));
    });
    return true;
  };

  const { chiudi } = dialogo("Nuova giornata della fase finale", campo, [
    { testo: "Annulla", azione: () => true },
    { testo: "Aggiungi", principale: true, azione: aggiungi },
  ]);
  campo.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter" && aggiungi()) chiudi();
  });
  campo.focus();
}

/*
-----------------------------------
FINESTRE DI DIALOGO
-----------------------------------
*/

function selectGiornate({
  escludi = null,
  conParcheggio = false,
  conNuova = false,
  soloNumerate = false,
  selezionata = null,
} = {}) {
  const liste = soloNumerate
    ? stato.giornate
    : tutteLeListe().filter((l) => conParcheggio || l.id !== ID_PARCHEGGIO);
  return el(
    "select",
    { class: "cal-select" },
    liste
      .filter((l) => l.id !== escludi)
      .map((l) => el("option", { value: l.id, selected: l.id === selezionata }, etichettaLista(l))),
    conNuova ? el("option", { value: "__nuova__" }, "Nuova giornata in fondo") : null
  );
}

function selectSquadra(selezionata = "", { vuota = null, escludi = null } = {}) {
  return el(
    "select",
    { class: "cal-select" },
    vuota !== null ? el("option", { value: "" }, vuota) : null,
    Object.keys(squadre)
      .filter((s) => s !== escludi)
      .sort((a, b) => a.localeCompare(b))
      .map((s) =>
        el(
          "option",
          { value: s, selected: s === selezionata },
          `${nome(s)}${gironeDi(s) ? ` (${gironeDi(s)})` : ""}`
        )
      )
  );
}

/* --- Azioni su una partita --- */

function apriAzioniPartita(id) {
  const trovata = trovaPartita(id);
  if (!trovata) return;
  const { partita, lista } = trovata;
  const giocata = eGiocata(partita);
  const info = infoGiocata(partita);
  const titolo = `${nome(partita.casa)} – ${nome(partita.ospite)}`;
  let chiudi = () => {};

  const destinazione = selectGiornate({ escludi: lista.id, conParcheggio: !giocata, conNuova: true });
  const altre = el(
    "select",
    { class: "cal-select" },
    tutteLeListe()
      .filter((l) => l.partite.length)
      .map((l) =>
        el(
          "optgroup",
          { label: etichettaLista(l) },
          l.partite
            .filter((p) => p.id !== id)
            .map((p) => el("option", { value: p.id }, `${nome(p.casa)} – ${nome(p.ospite)}`))
        )
      )
  );
  const casa = selectSquadra(partita.casa);
  const ospite = selectSquadra(partita.ospite);

  const corpo = el(
    "div",
    {},
    el(
      "p",
      { class: "cal-nota" },
      `${etichettaLista(lista)}${info ? ` · giocata${info.risultato ? ` (${info.risultato})` : ""}` : ""}`
    ),
    voceAzione(
      "Sposta in un'altra giornata",
      "Data, orario e luogo restano quelli attuali.",
      "Sposta",
      () => {
        const valore = destinazione.value;
        spostaPartita(id, valore === "__nuova__" ? null : valore);
        chiudi();
      },
      { controlli: destinazione, disabilitata: lista.bloccata }
    ),
    voceAzione(
      "Scambia con un'altra partita",
      "Le due partite si scambiano di giornata (e di posizione).",
      "Scambia",
      () => {
        if (!altre.value) return;
        const altra = trovaPartita(altre.value);
        if (altra?.lista.bloccata) {
          errore("L'altra partita è in una giornata bloccata.");
          return;
        }
        if (giocata && altra?.lista.id === ID_PARCHEGGIO) {
          errore('Una partita giocata non può andare in "Da collocare".');
          return;
        }
        scambiaPartite(id, altre.value);
        chiudi();
      },
      { controlli: altre, disabilitata: lista.bloccata }
    ),
    voceAzione(
      "Inverti casa e trasferta",
      giocata ? "Non possibile: la partita è già giocata." : "",
      "Inverti",
      () => {
        invertiPartita(id);
        chiudi();
      },
      { disabilitata: giocata }
    ),
    voceAzione(
      "Cambia le squadre",
      giocata ? "Non possibile: la partita è già giocata." : "Per correggere un abbinamento sbagliato.",
      "Applica",
      () => {
        if (casa.value === ospite.value) {
          errore("Una squadra non può giocare contro se stessa.");
          return;
        }
        modifica("Squadre della partita cambiate", (s) => {
          const p = trovaPartita(id, s).partita;
          p.casa = casa.value;
          p.ospite = ospite.value;
        });
        chiudi();
      },
      { controlli: [casa, el("span", {}, " – "), ospite], disabilitata: giocata }
    ),
    voceAzione("Svuota data, orario e luogo", "", "Svuota", () => {
      modifica("Data, orario e luogo svuotati", (s) => {
        Object.assign(trovaPartita(id, s).partita, { Data: "", Orario: "", Luogo: "" });
      });
      chiudi();
    }),
    voceAzione(
      "Togli dal calendario",
      'Va in "Da collocare", da dove puoi rimetterla in qualsiasi giornata.',
      "Togli",
      () => {
        spostaPartita(id, ID_PARCHEGGIO, Infinity);
        chiudi();
      },
      { disabilitata: giocata || lista.id === ID_PARCHEGGIO || lista.bloccata }
    ),
    voceAzione(
      "Elimina la partita",
      giocata ? "Alla pubblicazione verranno cancellati anche risultato e referto." : "",
      "Elimina",
      () => {
        eliminaPartita(id).then((eliminata) => eliminata && chiudi());
      },
      { pericolosa: true, disabilitata: lista.bloccata }
    )
  );

  ({ chiudi } = dialogo(titolo, corpo));
}

/* --- Azioni su una giornata --- */

function apriAzioniGiornata(id) {
  const giornata = trovaLista(id);
  if (!giornata) return;
  const numerata = !giornata.nome;
  const indice = stato.giornate.indexOf(giornata);
  const etichetta = etichettaLista(giornata);
  const nonGiocate = giornata.partite.filter((p) => !eGiocata(p));
  const giocateQui = giornata.partite.length - nonGiocate.length;
  let chiudi = () => {};

  const posizione = el(
    "select",
    { class: "cal-select" },
    stato.giornate.map((_, i) => el("option", { value: i, selected: i === indice }, `Posizione ${i + 1}`))
  );
  const conChi = selectGiornate({ escludi: id, soloNumerate: true });
  const unisciCon = selectGiornate({ escludi: id });

  const data = el("input", { type: "text", placeholder: "gg/mm", class: "cal-campo", inputMode: "numeric" });
  const orario = el("input", {
    type: "text",
    placeholder: "hh:mm",
    class: "cal-campo",
    inputMode: "numeric",
  });
  const luogo = el("input", { type: "text", placeholder: "Luogo", class: "cal-campo" });
  const soloVuoti = el("input", { type: "checkbox", id: "cal-solo-vuoti" });

  const corpo = el(
    "div",
    {},
    voceAzione(
      "Imposta data, orario e luogo",
      "Per tutte le partite della giornata. I campi lasciati vuoti non vengono toccati.",
      "Applica",
      () => {
        const valori = {
          Data: normalizzaCampo("Data", data.value),
          Orario: normalizzaCampo("Orario", orario.value),
          Luogo: normalizzaCampo("Luogo", luogo.value),
        };
        modifica(`Date e luoghi impostati per ${etichetta}`, (s) => {
          for (const p of trovaLista(id, s).partite) {
            for (const [campo, valore] of Object.entries(valori)) {
              if (valore && (!soloVuoti.checked || !p[campo])) p[campo] = valore;
            }
          }
        });
        chiudi();
      },
      {
        controlli: [data, orario, luogo, el("label", { class: "cal-check" }, soloVuoti, " solo dove manca")],
        disabilitata: !giornata.partite.length,
      }
    ),
    numerata &&
      voceAzione(
        "Sposta in un'altra posizione",
        "Le giornate in mezzo scalano di un posto.",
        "Sposta",
        () => {
          portaGiornataInPosizione(id, Number(posizione.value));
          chiudi();
        },
        { controlli: posizione, disabilitata: giornata.bloccata || stato.giornate.length < 2 }
      ),
    numerata &&
      voceAzione(
        "Scambia con un'altra giornata",
        "Le due giornate si scambiano di posto.",
        "Scambia",
        () => {
          const altra = trovaLista(conChi.value);
          if (altra?.bloccata) {
            errore("L'altra giornata è bloccata.");
            return;
          }
          scambiaGiornate(id, conChi.value);
          chiudi();
        },
        { controlli: conChi, disabilitata: giornata.bloccata || stato.giornate.length < 2 }
      ),
    numerata &&
      voceAzione(
        "Inserisci una giornata vuota",
        "Prima o dopo questa.",
        "Dopo",
        () => {
          modifica("Giornata vuota inserita", (s) => {
            s.giornate.splice(s.giornate.findIndex((g) => g.id === id) + 1, 0, nuovaGiornata());
          });
          chiudi();
        },
        {
          controlli: el(
            "button",
            {
              type: "button",
              class: "cal-pulsante",
              onclick: () => {
                modifica("Giornata vuota inserita", (s) => {
                  s.giornate.splice(
                    s.giornate.findIndex((g) => g.id === id),
                    0,
                    nuovaGiornata()
                  );
                });
                chiudi();
              },
            },
            "Prima"
          ),
        }
      ),
    voceAzione(
      "Unisci a un'altra giornata",
      "Tutte le partite passano nell'altra giornata e questa viene eliminata.",
      "Unisci",
      () => {
        const altra = trovaLista(unisciCon.value);
        if (altra?.bloccata) {
          errore("L'altra giornata è bloccata.");
          return;
        }
        modifica(`${etichetta} unita a ${etichettaLista(altra)}`, (s) => {
          const sorgente = trovaLista(id, s);
          trovaLista(unisciCon.value, s).partite.push(...sorgente.partite);
          rimuoviGiornata(s, id);
        });
        chiudi();
      },
      { controlli: unisciCon, disabilitata: giornata.bloccata || !giornata.partite.length }
    ),
    voceAzione(
      "Inverti casa e trasferta di tutte",
      giocateQui ? `Le ${giocateQui} partite giocate restano come sono.` : "",
      "Inverti",
      () => {
        modifica(`Casa e trasferta invertite in ${etichetta}`, (s) => {
          for (const p of trovaLista(id, s).partite) {
            if (!eGiocata(p)) [p.casa, p.ospite] = [p.ospite, p.casa];
          }
        });
        chiudi();
      },
      { disabilitata: !nonGiocate.length || giornata.bloccata }
    ),
    voceAzione(
      "Togli tutte le partite non giocate",
      'Vanno in "Da collocare".',
      "Togli",
      () => {
        modifica(`Partite di ${etichetta} tolte dal calendario`, (s) => {
          const g = trovaLista(id, s);
          s.parcheggio.push(...g.partite.filter((p) => !eGiocata(p)));
          g.partite = g.partite.filter(eGiocata);
        });
        chiudi();
      },
      { disabilitata: !nonGiocate.length || giornata.bloccata }
    ),
    voceAzione(
      "Elimina la giornata",
      giornata.partite.length
        ? giocateQui
          ? "Non possibile: contiene partite giocate. Spostale prima in un'altra giornata."
          : 'Le sue partite vanno in "Da collocare".'
        : "",
      "Elimina",
      () => {
        modifica(`${etichetta} eliminata`, (s) => {
          s.parcheggio.push(...trovaLista(id, s).partite);
          rimuoviGiornata(s, id);
        });
        chiudi();
      },
      { pericolosa: true, disabilitata: giocateQui > 0 || giornata.bloccata }
    )
  );

  ({ chiudi } = dialogo(etichetta, corpo));
}

function rimuoviGiornata(s, id) {
  s.giornate = s.giornate.filter((g) => g.id !== id);
  s.speciali = s.speciali.filter((g) => g.id !== id);
}

/* --- Strumenti su tutte le giornate --- */

function apriStrumentiGiornate() {
  let chiudi = () => {};
  const pulisciDate = el("input", { type: "checkbox", checked: true });
  const conParcheggio = el("input", { type: "checkbox", checked: stato.parcheggio.length > 0 });
  const vuote = stato.giornate.filter((g) => !g.partite.length).length;
  const nonGiocate = stato.giornate.flatMap((g) =>
    g.bloccata ? [] : g.partite.filter((p) => !eGiocata(p))
  ).length;

  const corpo = el(
    "div",
    {},
    el(
      "p",
      { class: "cal-nota" },
      "Le giornate bloccate (lucchetto) e quelle con partite già giocate restano al loro posto."
    ),
    voceAzione(
      "Mescola l'ordine delle giornate",
      "Le partite di ogni giornata restano insieme; cambia solo l'ordine.",
      "Mescola",
      () => {
        modifica("Ordine delle giornate mescolato", (s) => riordinaMobili(s, (g) => G.mescola(g)) || false);
        chiudi();
      }
    ),
    voceAzione("Inverti l'ordine delle giornate", "L'ultima diventa la prima.", "Inverti", () => {
      modifica("Ordine delle giornate invertito", (s) => riordinaMobili(s, (g) => [...g].reverse()) || false);
      chiudi();
    }),
    voceAzione(
      "Ridistribuisci le partite",
      "Rimette le partite non giocate nelle giornate non bloccate in modo che nessuna squadra giochi due volte nella stessa giornata, con giornate il più possibile equilibrate. Utile dopo molti spostamenti a mano o per risolvere i conflitti.",
      "Ridistribuisci",
      () => {
        ridistribuisciPartite({ includiParcheggio: conParcheggio.checked, pulisciDate: pulisciDate.checked });
        chiudi();
      },
      {
        controlli: [
          el("label", { class: "cal-check" }, conParcheggio, ' includi "Da collocare"'),
          el("label", { class: "cal-check" }, pulisciDate, " svuota data/ora/luogo di chi cambia giornata"),
        ],
        disabilitata: nonGiocate + stato.parcheggio.length === 0,
      }
    ),
    voceAzione(
      "Riequilibra casa e trasferta",
      "Inverte il minimo di partite non giocate perché ogni squadra abbia al massimo una partita in casa in più delle trasferte (o viceversa).",
      "Riequilibra",
      () => {
        riequilibraCasaTrasferta();
        chiudi();
      }
    ),
    voceAzione(
      "Inverti casa e trasferta di tutte le partite",
      "Solo partite non giocate di giornate non bloccate.",
      "Inverti",
      () => {
        modifica("Casa e trasferta invertite in tutto il calendario", (s) => {
          for (const g of s.giornate) {
            if (g.bloccata) continue;
            for (const p of g.partite) if (!eGiocata(p)) [p.casa, p.ospite] = [p.ospite, p.casa];
          }
        });
        chiudi();
      },
      { disabilitata: !nonGiocate }
    ),
    voceAzione(
      "Rimuovi le giornate vuote",
      vuote ? `${vuote} giornate vuote.` : "Nessuna giornata vuota.",
      "Rimuovi",
      () => {
        modifica("Giornate vuote rimosse", (s) => {
          s.giornate = s.giornate.filter((g) => g.partite.length);
        });
        chiudi();
      },
      { disabilitata: !vuote }
    ),
    voceAzione(
      "Blocca le giornate già giocate",
      "Mette il lucchetto a tutte le giornate con almeno una partita giocata.",
      "Blocca",
      () => {
        modifica("Giornate giocate bloccate", (s) => {
          for (const g of s.giornate) if (g.partite.some(eGiocata)) g.bloccata = true;
        });
        chiudi();
      }
    ),
    voceAzione("Sblocca tutte le giornate", "", "Sblocca", () => {
      modifica("Giornate sbloccate", (s) => {
        for (const g of [...s.giornate, ...s.speciali]) g.bloccata = false;
      });
      chiudi();
    }),
    voceAzione(
      "Svuota il calendario",
      "Elimina tutte le partite non giocate delle giornate numerate non bloccate (la fase finale non viene toccata).",
      "Svuota",
      async () => {
        if (
          !(await conferma("Eliminare tutte le partite non giocate dalla bozza? Puoi sempre annullare.", {
            titolo: "Svuota il calendario",
            ok: "Svuota",
            pericolosa: true,
          }))
        )
          return;
        modifica("Calendario svuotato", (s) => {
          for (const g of s.giornate) if (!g.bloccata) g.partite = g.partite.filter(eGiocata);
          s.giornate = s.giornate.filter((g) => g.partite.length || g.bloccata);
          s.parcheggio = [];
        });
        chiudi();
      },
      { pericolosa: true, disabilitata: !nonGiocate && !stato.parcheggio.length }
    )
  );

  ({ chiudi } = dialogo("Strumenti giornate", corpo));
}

function ridistribuisciPartite({ includiParcheggio, pulisciDate }) {
  modifica("Partite ridistribuite", (s) => {
    const mobili = s.giornate.filter((g) => !g.bloccata);
    const daSpostare = [];
    const provenienza = new Map();
    for (const g of mobili) {
      for (const p of g.partite) {
        if (!eGiocata(p)) {
          daSpostare.push(p);
          provenienza.set(p.id, g.id);
        }
      }
      g.partite = g.partite.filter(eGiocata);
    }
    if (includiParcheggio) {
      daSpostare.push(...s.parcheggio);
      s.parcheggio = [];
    }
    if (!daSpostare.length) return false;

    const disponibili = mobili.map((g) => ({
      occupate: g.partite.flatMap((p) => [p.casa, p.ospite]),
      partite: g.partite.length,
    }));
    const { assegnazioni } = G.ridistribuisci(
      daSpostare.map((p) => [p.casa, p.ospite]),
      disponibili
    );

    const destinazioni = [...mobili];
    daSpostare.forEach((p, i) => {
      while (assegnazioni[i] >= destinazioni.length) {
        const nuova = nuovaGiornata();
        s.giornate.push(nuova);
        destinazioni.push(nuova);
      }
      const destinazione = destinazioni[assegnazioni[i]];
      if (pulisciDate && provenienza.get(p.id) !== destinazione.id) {
        Object.assign(p, { Data: "", Orario: "", Luogo: "" });
      }
      destinazione.partite.push(p);
    });
  });
}

function riequilibraCasaTrasferta() {
  modifica("Casa e trasferta riequilibrate", (s) => {
    // Solo fase a gironi: le giornate della fase finale fanno storia a sé
    const voci = s.giornate.flatMap((g) =>
      g.partite.map((p) => ({ coppia: [p.casa, p.ospite], p, fissa: g.bloccata || eGiocata(p) }))
    );
    const fisse = new Set(voci.filter((v) => v.fissa).map((v) => v.coppia));
    const invertite = G.bilanciaCasaTrasferta(
      voci.map((v) => v.coppia),
      (coppia) => fisse.has(coppia)
    );
    if (!invertite) {
      mostraAvviso("Casa e trasferta sono già equilibrate.");
      return false;
    }
    for (const { coppia, p } of voci) [p.casa, p.ospite] = coppia;
  });
}

/* --- Strumenti su una squadra --- */

function apriStrumentiSquadra(iniziale = "") {
  let chiudi = () => {};
  const squadra = selectSquadra(iniziale || Object.keys(squadre).sort((a, b) => a.localeCompare(b))[0] || "");
  const sostituta = selectSquadra("");
  const dettagli = el("div", { class: "cal-squadra-dettagli" });

  const partiteDi = (s, chiave, soloNonGiocate) =>
    tutteLeListe(s).flatMap((lista) =>
      lista.partite
        .filter(
          (p) =>
            (p.casa === chiave || p.ospite === chiave) && (!soloNonGiocate || !eGiocata(p)) && !lista.bloccata
        )
        .map((p) => ({ lista, p }))
    );

  const aggiornaDettagli = () => {
    const chiave = squadra.value;
    dettagli.innerHTML = "";
    if (!chiave) return;
    const righe = tutteLeListe()
      .filter((l) => l.id !== ID_PARCHEGGIO || l.partite.length)
      .map((lista) => {
        const p = lista.partite.find((x) => x.casa === chiave || x.ospite === chiave);
        if (!p && lista.nome) return null;
        const avversario = p ? (p.casa === chiave ? p.ospite : p.casa) : null;
        return el(
          "li",
          { class: p ? "" : "riposo" },
          el("strong", {}, etichettaLista(lista)),
          ": ",
          p
            ? `${p.casa === chiave ? "in casa contro" : "in trasferta contro"} ${nome(avversario)}${eGiocata(p) ? " (giocata)" : ""}`
            : "riposa"
        );
      });
    dettagli.append(el("ul", {}, righe));
  };
  squadra.addEventListener("change", aggiornaDettagli);
  aggiornaDettagli();

  const corpo = el(
    "div",
    {},
    el("div", { class: "cal-riga-campo" }, el("label", {}, "Squadra"), squadra),
    dettagli,
    voceAzione(
      "Evidenzia nel calendario",
      "Mette in risalto le sue partite e le giornate in cui riposa.",
      "Evidenzia",
      () => {
        evidenziata = squadra.value;
        render();
        chiudi();
      }
    ),
    voceAzione(
      "Togli le sue partite non giocate",
      'Vanno in "Da collocare" (es. squadra temporaneamente indisponibile).',
      "Togli",
      () => {
        modifica(`Partite di ${nome(squadra.value)} tolte dal calendario`, (s) => {
          for (const { lista, p } of partiteDi(s, squadra.value, true)) {
            if (lista.id === ID_PARCHEGGIO) continue;
            lista.partite.splice(lista.partite.indexOf(p), 1);
            s.parcheggio.push(p);
          }
        });
        chiudi();
      }
    ),
    voceAzione(
      "Elimina le sue partite non giocate",
      "Per una squadra che si ritira.",
      "Elimina",
      async () => {
        if (
          !(await conferma(`Eliminare tutte le partite non giocate di ${nome(squadra.value)}?`, {
            titolo: "Elimina partite",
            ok: "Elimina",
            pericolosa: true,
          }))
        )
          return;
        modifica(`Partite di ${nome(squadra.value)} eliminate`, (s) => {
          for (const { lista, p } of partiteDi(s, squadra.value, true)) {
            lista.partite.splice(lista.partite.indexOf(p), 1);
          }
        });
        chiudi();
      },
      { pericolosa: true }
    ),
    voceAzione(
      "Sostituisci con un'altra squadra",
      "Nelle sue partite non giocate al suo posto gioca la squadra scelta.",
      "Sostituisci",
      () => {
        const da = squadra.value;
        const a = sostituta.value;
        if (!a || a === da) return;
        let saltate = 0;
        modifica(`${nome(da)} sostituita da ${nome(a)}`, (s) => {
          for (const { p } of partiteDi(s, da, true)) {
            if (p.casa === a || p.ospite === a) {
              saltate++;
              continue;
            }
            if (p.casa === da) p.casa = a;
            else p.ospite = a;
          }
        });
        if (saltate) mostraAvviso(`${saltate} partite tra le due squadre non sono state cambiate.`);
        chiudi();
      },
      { controlli: sostituta }
    )
  );

  ({ chiudi } = dialogo("Strumenti squadra", corpo));
}

/* --- Aggiungi partita --- */

function apriAggiungiPartita(idGiornata = null) {
  let chiudi = () => {};
  const chiavi = Object.keys(squadre).sort((a, b) => a.localeCompare(b));
  const casa = selectSquadra(chiavi[0]);
  const ospite = selectSquadra(chiavi[1]);
  const giornata = selectGiornate({ conParcheggio: true, conNuova: true, selezionata: idGiornata });
  const avviso = el("p", { class: "cal-nota cal-attenzione" });

  const controlla = () => {
    const doppie = tutteLeListe()
      .filter((l) =>
        l.partite.some(
          (p) =>
            (p.casa === casa.value && p.ospite === ospite.value) ||
            (p.casa === ospite.value && p.ospite === casa.value)
        )
      )
      .map((l) => etichettaLista(l));
    avviso.textContent = doppie.length
      ? `Queste due squadre si affrontano già in: ${doppie.join(", ")}.`
      : "";
  };
  casa.addEventListener("change", controlla);
  ospite.addEventListener("change", controlla);
  controlla();

  const corpo = el(
    "div",
    { class: "cal-form" },
    el("div", { class: "cal-riga-campo" }, el("label", {}, "Casa"), casa),
    el("div", { class: "cal-riga-campo" }, el("label", {}, "Ospite"), ospite),
    el("div", { class: "cal-riga-campo" }, el("label", {}, "Giornata"), giornata),
    avviso
  );

  ({ chiudi } = dialogo("Aggiungi partita", corpo, [
    { testo: "Annulla", azione: () => true },
    {
      testo: "Aggiungi",
      principale: true,
      azione: () => {
        if (!casa.value || !ospite.value || casa.value === ospite.value) {
          errore("Scegli due squadre diverse.");
          return false;
        }
        const destinazione = trovaLista(giornata.value);
        if (destinazione?.bloccata) {
          errore("La giornata scelta è bloccata.");
          return false;
        }
        if (destinazione?.partite.some((p) => p.casa === casa.value && p.ospite === ospite.value)) {
          errore("Questa partita è già in quella giornata.");
          return false;
        }
        modifica(`Partita ${nome(casa.value)} – ${nome(ospite.value)} aggiunta`, (s) => {
          let arrivo = trovaLista(giornata.value, s);
          if (!arrivo) {
            arrivo = nuovaGiornata();
            s.giornate.push(arrivo);
          }
          arrivo.partite.push(nuovaPartita(casa.value, ospite.value));
        });
      },
    },
  ]));
}

/* --- Riepilogo --- */

function apriRiepilogo() {
  const { elenco, esclusi } = gironi();
  const corpo = el("div", { class: "cal-riepilogo" });

  for (const girone of elenco) {
    const statistiche = Object.fromEntries(
      girone.squadre.map((s) => [s, { partite: 0, casa: 0, giocate: 0, riposi: 0, avversari: {} }])
    );
    const presenti = new Set(girone.squadre);

    stato.giornate.forEach((giornata) => {
      const inCampo = new Set();
      let toccaGirone = false;
      for (const p of giornata.partite) {
        for (const [squadra, avversario, inCasa] of [
          [p.casa, p.ospite, true],
          [p.ospite, p.casa, false],
        ]) {
          if (!presenti.has(squadra)) continue;
          toccaGirone = true;
          inCampo.add(squadra);
          const st = statistiche[squadra];
          st.partite++;
          if (inCasa) st.casa++;
          if (eGiocata(p)) st.giocate++;
          st.avversari[avversario] = (st.avversari[avversario] || 0) + 1;
        }
      }
      if (toccaGirone) for (const s of girone.squadre) if (!inCampo.has(s)) statistiche[s].riposi++;
    });

    const coppieMancanti = [];
    const coppieRipetute = [];
    girone.squadre.forEach((a, i) =>
      girone.squadre.slice(i + 1).forEach((b) => {
        const volte = statistiche[a].avversari[b] || 0;
        if (volte === 0) coppieMancanti.push(`${nome(a)} – ${nome(b)}`);
        if (volte > 1) coppieRipetute.push(`${nome(a)} – ${nome(b)} (${volte})`);
      })
    );

    corpo.append(
      el("h4", {}, `${etichettaGirone(girone.nome)} · ${girone.squadre.length} squadre`),
      el(
        "div",
        { class: "cal-tabella-scorrevole" },
        el(
          "table",
          { class: "cal-tabella" },
          el(
            "thead",
            {},
            el(
              "tr",
              {},
              ["Squadra", "Partite", "Casa", "Trasf.", "Giocate", "Riposi"].map((t) => el("th", {}, t))
            )
          ),
          el(
            "tbody",
            {},
            girone.squadre.map((s) => {
              const st = statistiche[s];
              const squilibrio = Math.abs(st.casa - (st.partite - st.casa)) > 1;
              return el(
                "tr",
                {},
                el("td", {}, nome(s)),
                el("td", {}, st.partite),
                el("td", { class: squilibrio ? "cal-attenzione" : "" }, st.casa),
                el("td", { class: squilibrio ? "cal-attenzione" : "" }, st.partite - st.casa),
                el("td", {}, st.giocate),
                el("td", {}, st.riposi)
              );
            })
          )
        )
      ),
      el(
        "p",
        { class: "cal-nota" },
        coppieMancanti.length
          ? `Coppie che non si affrontano (${coppieMancanti.length}): ${coppieMancanti.join(", ")}`
          : "Tutte le squadre del girone si affrontano almeno una volta."
      ),
      coppieRipetute.length
        ? el("p", { class: "cal-nota" }, `Coppie che si affrontano più volte: ${coppieRipetute.join(", ")}`)
        : ""
    );
  }

  const miste = stato.giornate.flatMap((g) => g.partite).filter((p) => gironeDellaPartita(p) === null);
  if (miste.length) {
    corpo.append(
      el(
        "p",
        { class: "cal-nota cal-attenzione" },
        `${miste.length} partite tra squadre di gironi diversi (contano nella classifica di entrambi i gironi).`
      )
    );
  }
  if (esclusi.length) {
    corpo.append(
      el(
        "p",
        { class: "cal-nota cal-attenzione" },
        `Squadre senza girone (escluse dalla classifica): ${esclusi.map(nome).join(", ")}`
      )
    );
  }

  dialogo("Riepilogo calendario", corpo);
}

/*
-----------------------------------
GENERAZIONE
-----------------------------------
*/

function apriGenera() {
  const { elenco, esclusi } = gironi();
  const validi = elenco.filter((g) => g.squadre.length >= 2);
  if (!validi.length) {
    avviso("Servono almeno 2 squadre nello stesso girone per generare un calendario.", {
      titolo: "Impossibile generare",
    });
    return;
  }

  let chiudi = () => {};
  const radio = (nomeGruppo, valore, testo, selezionato = false) =>
    el(
      "label",
      { class: "cal-radio" },
      el("input", { type: "radio", name: nomeGruppo, value: valore, checked: selezionato }),
      ` ${testo}`
    );

  const modalita = el(
    "fieldset",
    { class: "cal-gruppo" },
    el("legend", {}, "Partite"),
    radio("cal-modalita", "completo", "Tutti contro tutti", true),
    radio("cal-modalita", "casuale", "Estrazione casuale di x partite per squadra")
  );
  const andataRitorno = el("input", { type: "checkbox" });
  const opzioneAR = el(
    "label",
    { class: "cal-check" },
    andataRitorno,
    " Andata e ritorno (il ritorno inverte casa e trasferta)"
  );
  const minimo = Math.min(...validi.map((g) => g.squadre.length - 1));
  const x = el("input", {
    type: "number",
    min: 1,
    max: Math.max(...validi.map((g) => g.squadre.length - 1)),
    value: Math.min(3, minimo),
    class: "cal-numero",
  });
  const opzioneX = el("label", { class: "cal-riga-campo" }, el("span", {}, "Partite per squadra (x)"), x);

  const ambito = el(
    "select",
    { class: "cal-select" },
    el(
      "option",
      { value: "__tutti__" },
      validi.length > 1 ? "Tutti i gironi" : etichettaGirone(validi[0].nome)
    ),
    validi.length > 1
      ? validi.map((g) => el("option", { value: g.nome }, `Solo ${etichettaGirone(g.nome)}`))
      : null
  );
  const disposizione = el(
    "fieldset",
    { class: "cal-gruppo" },
    el("legend", {}, "Giornate con più gironi"),
    radio("cal-disposizione", "insieme", "In parallelo: in ogni giornata giocano tutti i gironi", true),
    radio(
      "cal-disposizione",
      "sequenza",
      "Un girone alla volta: prima tutte le giornate del girone A, poi quelle del B…"
    )
  );
  const anteprima = el("div", { class: "cal-anteprima" });

  const leggi = () => ({
    modalita: modalita.querySelector("input:checked").value,
    andataRitorno: andataRitorno.checked,
    x: parseInt(x.value, 10),
    ambito: ambito.value,
    disposizione: disposizione.querySelector("input:checked").value,
  });

  const aggiorna = () => {
    const o = leggi();
    opzioneAR.hidden = o.modalita !== "completo";
    opzioneX.hidden = o.modalita !== "casuale";
    disposizione.hidden = validi.length < 2 || o.ambito !== "__tutti__";

    const coinvolti = o.ambito === "__tutti__" ? validi : validi.filter((g) => g.nome === o.ambito);
    anteprima.innerHTML = "";
    const righe = coinvolti.map((g) => {
      const n = g.squadre.length;
      if (o.modalita === "completo") {
        const giornate = (n % 2 ? n : n - 1) * (o.andataRitorno ? 2 : 1);
        const partite = ((n * (n - 1)) / 2) * (o.andataRitorno ? 2 : 1);
        return el(
          "li",
          {},
          `${etichettaGirone(g.nome)}: ${n} squadre → ${partite} partite in ${giornate} giornate${n % 2 ? " (a turno una squadra riposa)" : ""}`
        );
      }
      const info = G.descriviEstrazione(n, o.x);
      if (!info.valido)
        return el("li", { class: "cal-attenzione" }, `${etichettaGirone(g.nome)}: ${info.messaggio}`);
      return el(
        "li",
        {},
        `${etichettaGirone(g.nome)}: ${n} squadre → ${info.partite} partite in circa ${info.giornateMinime} giornate`,
        info.messaggio ? el("span", { class: "cal-attenzione" }, ` · ${info.messaggio}`) : ""
      );
    });
    anteprima.append(el("ul", {}, righe));

    const inGioco = new Set(coinvolti.flatMap((g) => g.squadre));
    const giaGiocate = partiteNellAmbito(o.ambito, inGioco).filter(eGiocata).length;
    if (giaGiocate) {
      anteprima.append(
        el(
          "p",
          { class: "cal-attenzione" },
          `Ci sono già ${giaGiocate} partite giocate: non si può rigenerare. Usa le modifiche manuali o "Ridistribuisci le partite".`
        )
      );
    } else if (o.ambito === "__tutti__" && stato.giornate.some((g) => g.partite.length)) {
      anteprima.append(
        el(
          "p",
          { class: "cal-nota" },
          "Le giornate numerate attuali verranno sostituite (la fase finale resta). Potrai sempre annullare."
        )
      );
    } else if (o.ambito !== "__tutti__") {
      anteprima.append(
        el(
          "p",
          { class: "cal-nota" },
          `Le partite attuali del girone vengono tolte e quelle nuove inserite a partire dalla giornata 1, accanto agli altri gironi (giornate bloccate escluse).`
        )
      );
    }
  };

  [modalita, andataRitorno, x, ambito, disposizione].forEach((controllo) => {
    controllo.addEventListener("change", aggiorna);
    controllo.addEventListener("input", aggiorna);
  });

  const corpo = el(
    "div",
    { class: "cal-form" },
    el(
      "p",
      { class: "cal-nota" },
      elenco.map((g) => `${etichettaGirone(g.nome)}: ${g.squadre.length} squadre`).join(" · ")
    ),
    esclusi.length
      ? el(
          "p",
          { class: "cal-nota cal-attenzione" },
          `Senza girone, quindi escluse: ${esclusi.map(nome).join(", ")}`
        )
      : null,
    el("div", { class: "cal-riga-campo" }, el("label", {}, "Per"), ambito),
    modalita,
    opzioneAR,
    opzioneX,
    disposizione,
    el("h4", {}, "Anteprima"),
    anteprima
  );
  aggiorna();

  ({ chiudi } = dialogo("Genera calendario", corpo, [
    { testo: "Annulla", azione: () => true },
    {
      testo: "Genera",
      principale: true,
      azione: () => genera(leggi(), validi),
    },
  ]));
}

// Partite (giornate numerate e "Da collocare") che coinvolgono le squadre indicate
function partiteNellAmbito(ambito, inGioco) {
  const liste = [...stato.giornate, { partite: stato.parcheggio }];
  return liste.flatMap((l) =>
    l.partite.filter((p) => ambito === "__tutti__" || inGioco.has(p.casa) || inGioco.has(p.ospite))
  );
}

function genera(opzioni, gironiValidi) {
  const coinvolti =
    opzioni.ambito === "__tutti__" ? gironiValidi : gironiValidi.filter((g) => g.nome === opzioni.ambito);
  const inGioco = new Set(coinvolti.flatMap((g) => g.squadre));

  if (partiteNellAmbito(opzioni.ambito, inGioco).some(eGiocata)) {
    errore("Ci sono partite già giocate: non si può rigenerare.");
    return false;
  }

  let perGirone;
  try {
    perGirone = coinvolti.map((g) =>
      opzioni.modalita === "completo"
        ? G.generaTuttiControTutti(g.squadre, { andataRitorno: opzioni.andataRitorno })
        : G.generaEstrazioneCasuale(g.squadre, opzioni.x)
    );
  } catch (error) {
    avviso(`${error.message}.`, { titolo: "Impossibile generare" });
    return false;
  }

  const descrizione =
    opzioni.ambito === "__tutti__"
      ? "Calendario generato"
      : `Calendario del ${etichettaGirone(opzioni.ambito)} rigenerato`;

  modifica(descrizione, (s) => {
    if (opzioni.ambito === "__tutti__") {
      const giornate = G.unisciGironi(perGirone, opzioni.disposizione);
      s.giornate = giornate.map((partite) => ({
        ...nuovaGiornata(),
        partite: partite.map(([casa, ospite]) => nuovaPartita(casa, ospite)),
      }));
      s.parcheggio = [];
      return;
    }

    // Un solo girone: via le sue partite, poi la giornata k del girone va
    // nella k-esima giornata non bloccata
    const delGirone = (p) => inGioco.has(p.casa) || inGioco.has(p.ospite);
    for (const g of s.giornate) if (!g.bloccata) g.partite = g.partite.filter((p) => !delGirone(p));
    s.parcheggio = s.parcheggio.filter((p) => !delGirone(p));

    const libere = s.giornate.filter((g) => !g.bloccata);
    perGirone[0].forEach((partite, k) => {
      while (k >= libere.length) {
        const nuova = nuovaGiornata();
        s.giornate.push(nuova);
        libere.push(nuova);
      }
      libere[k].partite.push(...partite.map(([casa, ospite]) => nuovaPartita(casa, ospite)));
    });
  });
}

/*
-----------------------------------
PUBBLICAZIONE
-----------------------------------
*/

async function pubblica() {
  const problemi = analizza();
  const gravi = problemi.filter((p) => p.grave);
  if (gravi.length) {
    avviso(`• ${gravi.map((p) => p.testo).join("\n• ")}`, { titolo: "Prima di pubblicare correggi" });
    return;
  }

  const pulsante = document.getElementById("cal-pubblica");
  if (pulsante) pulsante.disabled = true;

  try {
    // Una bozza in attesa di salvataggio, scritta dopo la pubblicazione,
    // ricomparirebbe al prossimo accesso
    await salvaBozzaSubito();

    // Dati freschi: nel frattempo può essere arrivato un referto o un risultato
    const [calendarioAttuale, partiteAttuali, refertiAttuali] = await Promise.all([
      getData(percorsi.calendario),
      getData(percorsi.partite),
      getData(percorsi.referti),
    ]);
    giocate = indiceGiocate(calendarioAttuale, partiteAttuali, refertiAttuali);

    const { calendario, bloccate, numerazione } = perPubblicazione(stato);
    const updates = {};

    // Calendario: si riscrive giornata per giornata
    for (const [chiave] of voci(calendarioAttuale)) updates[`${percorsi.calendario}/${chiave}`] = null;
    const risultatoAttuale = (origine) => {
      const r = calendarioAttuale?.[origine.g]?.[origine.chiave]?.Risultato;
      return r && String(r).trim() ? r : null;
    };

    // Dove finisce ogni partita che esisteva già
    const spostamenti = []; // { da: {g, chiave}, a: {g, chiave} }
    const origini = new Set();
    for (const giornata of [...stato.giornate, ...stato.speciali]) {
      const chiaveGiornata = numerazione.get(giornata.id);
      if (!chiaveGiornata) continue;
      for (const p of giornata.partite) {
        if (!p.origine) continue;
        origini.add(`${p.origine.g}|${p.origine.chiave}`);
        const a = { g: chiaveGiornata, chiave: chiavePartita(p) };
        const risultato = risultatoAttuale(p.origine);
        if (risultato) calendario[a.g][a.chiave].Risultato = risultato;
        if (a.g !== p.origine.g || a.chiave !== p.origine.chiave) {
          spostamenti.push({ da: p.origine, a });
        }
      }
    }
    for (const [chiave, giornata] of Object.entries(calendario)) {
      updates[`${percorsi.calendario}/${chiave}`] = giornata;
    }

    // Partite oggi in calendario: se una di queste sparisce dalla bozza,
    // sparisce anche il suo risultato. Dati che già non corrispondevano a
    // nessuna partita del calendario restano dove sono.
    const pubblicate = new Set();
    for (const [g, giornata] of voci(calendarioAttuale)) {
      for (const [chiave] of voci(giornata)) pubblicate.add(`${g}|${chiave}`);
    }

    // Risultati e referti seguono le loro partite. Prima si liberano le
    // posizioni vecchie, poi si scrivono le nuove (che hanno la precedenza)
    const cancellati = [];
    const scritture = {};
    let spostati = 0;
    for (const [percorso, nodo] of [
      [percorsi.partite, partiteAttuali],
      [percorsi.referti, refertiAttuali],
    ]) {
      for (const [g, giornata] of voci(nodo)) {
        for (const [chiave] of voci(giornata)) {
          const voce = `${g}|${chiave}`;
          if (pubblicate.has(voce) && !origini.has(voce)) {
            updates[`${percorso}/${g}/${chiave}`] = null;
            cancellati.push(
              `${eNumerica(g) ? `Giornata ${g}` : g}: ${chiave.split(":").map(nome).join(" – ")}`
            );
          }
        }
      }
      for (const { da, a } of spostamenti) {
        const dati = nodo?.[da.g]?.[da.chiave];
        if (!dati) continue;
        updates[`${percorso}/${da.g}/${da.chiave}`] ??= null;
        scritture[`${percorso}/${a.g}/${a.chiave}`] = dati;
        spostati++;
      }
    }
    Object.assign(updates, scritture);

    updates[percorsi.bloccate] = Object.keys(bloccate).length ? bloccate : null;
    updates[percorsi.bozza] = null;

    // Riepilogo per la conferma
    const righe = [];
    const vuote =
      stato.giornate.filter((g) => !g.partite.length).length +
      stato.speciali.filter((g) => !g.partite.length).length;
    righe.push(
      `Il calendario pubblico verrà sostituito con questa bozza (${Object.keys(calendario).length} giornate).`
    );
    if (vuote) righe.push(`Le ${vuote} giornate vuote verranno eliminate e le successive rinumerate.`);
    if (stato.parcheggio.length)
      righe.push(`Le ${stato.parcheggio.length} partite in "Da collocare" NON verranno pubblicate.`);
    if (spostati)
      righe.push(`${spostati} tra risultati e referti verranno spostati insieme alle loro partite.`);
    if (cancellati.length) {
      righe.push(
        `ATTENZIONE: verranno cancellati risultati/referti delle partite eliminate:\n  - ${[...new Set(cancellati)].join("\n  - ")}`
      );
    }
    const avvisi = problemi.filter((p) => !p.grave && !p.testo.includes("Da collocare"));
    if (avvisi.length) righe.push(`Avvisi:\n  - ${avvisi.map((p) => p.testo).join("\n  - ")}`);

    if (!(await conferma(righe.join("\n\n"), { titolo: "Pubblicare il calendario?", ok: "Pubblica" }))) {
      aggiornaBarra();
      return;
    }

    await update(ref(db), updates);

    await carica();
    annulla = [];
    ripeti = [];
    render();
    mostraAvviso("Calendario pubblicato");
  } catch (error) {
    console.error("Errore nella pubblicazione del calendario:", error);
    avviso("La bozza è ancora salvata: riprova.", { titolo: "Errore nella pubblicazione" });
    aggiornaBarra();
  }
}

/*
-----------------------------------
AVVISI E SCORCIATOIE
-----------------------------------
*/

let timerAvviso = null;

function mostraAvviso(testo, conAnnulla = false) {
  const toast = document.getElementById("cal-toast");
  if (!toast) return;
  toast.innerHTML = "";
  toast.append(el("span", {}, testo));
  if (conAnnulla) {
    toast.append(
      el("button", { type: "button", class: "cal-toast-annulla", onclick: annullaModifica }, "Annulla")
    );
  }
  toast.classList.add("visibile");
  clearTimeout(timerAvviso);
  timerAvviso = setTimeout(() => toast.classList.remove("visibile"), 5000);
}

let scorciatoieRegistrate = false;

function registraScorciatoie() {
  if (scorciatoieRegistrate) return;
  scorciatoieRegistrate = true;

  document.addEventListener("keydown", (evento) => {
    // Solo nella sezione calendario e fuori dai campi di testo
    if (!document.getElementById("calendar-content") || !stato) return;
    if (document.getElementById("cal-dialogo")) return;
    if (evento.target.closest?.("input, textarea, select")) return;
    if (!(evento.ctrlKey || evento.metaKey)) return;

    const tasto = evento.key.toLowerCase();
    if (tasto === "z" && !evento.shiftKey) {
      evento.preventDefault();
      annullaModifica();
    } else if (tasto === "y" || (tasto === "z" && evento.shiftKey)) {
      evento.preventDefault();
      ripetiModifica();
    }
  });

  // Chiudendo la pagina subito dopo una modifica, la bozza va salvata
  window.addEventListener("pagehide", () => {
    salvaBozzaSubito();
  });
}
