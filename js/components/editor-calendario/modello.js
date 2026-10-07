/*
===================================
EDITOR CALENDARIO: MODELLO
===================================
Funzioni sulla bozza del calendario che non toccano la pagina né Firebase:
conversione dal calendario pubblicato, ricerca di giornate e partite,
impronta per capire se ci sono modifiche, forma in cui verrà pubblicato.
Lo stato della bozza è descritto in editor-calendario.js.
*/

export const ID_PARCHEGGIO = "parcheggio";
// Caratteri che Firebase non accetta nelle chiavi (vedi components/squadre.js)
export const CARATTERI_VIETATI = /[./#$[\]:]/;

// Firebase restituisce un array quando le chiavi sono tutte numeriche
export function voci(nodo) {
  return Object.entries(nodo || {}).filter(([, valore]) => valore && typeof valore === "object");
}

export const eNumerica = (chiave) => /^\d+$/.test(chiave);

export function statoDaCalendario(calendario, bloccate) {
  const bloccata = new Set(
    Object.entries(bloccate || {})
      .filter(([, valore]) => valore === true)
      .map(([chiave]) => chiave)
  );

  const giornata = (chiave, nome) => ({
    id: `g-${chiave}`,
    nome,
    bloccata: bloccata.has(chiave),
    partite: voci(calendario[chiave])
      .filter(([chiavePartita]) => chiavePartita.split(":").length === 2)
      .map(([chiavePartita, dati]) => {
        const [casa, ospite] = chiavePartita.split(":");
        return {
          id: `p-${chiave}-${chiavePartita}`,
          casa,
          ospite,
          Data: dati.Data ?? "",
          Orario: dati.Orario ?? "",
          Luogo: dati.Luogo ?? "",
          origine: { g: chiave, chiave: chiavePartita },
        };
      }),
  });

  const chiavi = voci(calendario).map(([chiave]) => chiave);
  return {
    giornate: chiavi
      .filter(eNumerica)
      .sort((a, b) => a - b)
      .map((chiave) => giornata(chiave, null)),
    speciali: chiavi.filter((chiave) => !eNumerica(chiave)).map((chiave) => giornata(chiave, chiave)),
    parcheggio: [],
  };
}

// Una partita è "giocata" se ha un risultato, un risultato confermato o un
// referto: da quel momento non le si possono cambiare le squadre
export function indiceGiocate(calendario, partite, referti) {
  const indice = new Map();
  const voce = (g, chiave) => {
    const k = `${g}|${chiave}`;
    if (!indice.has(k)) indice.set(k, { risultato: "", partita: false, referto: false });
    return indice.get(k);
  };

  for (const [g, giornata] of voci(calendario)) {
    for (const [chiave, dati] of voci(giornata)) {
      const risultato = String(dati.Risultato || "").trim();
      if (risultato && risultato !== "VS") voce(g, chiave).risultato = risultato;
    }
  }
  for (const [g, giornata] of voci(partite)) {
    for (const [chiave, dati] of voci(giornata)) {
      const v = voce(g, chiave);
      v.partita = true;
      if (!v.risultato && dati.GolSquadraCasa !== undefined) {
        v.risultato = `${dati.GolSquadraCasa}:${dati.GolSquadraOspite}`;
      }
    }
  }
  for (const [g, giornata] of voci(referti)) {
    for (const [chiave] of voci(giornata)) voce(g, chiave).referto = true;
  }
  return indice;
}

export const clona = (oggetto) => JSON.parse(JSON.stringify(oggetto));
export const nome = (chiave) => String(chiave || "").replace(/_/g, ".");
export const chiavePartita = (p) => `${p.casa}:${p.ospite}`;

let contatoreId = 0;
export const nuovoId = (prefisso) => `${prefisso}-${Date.now().toString(36)}-${(contatoreId++).toString(36)}`;

export function nuovaPartita(casa, ospite) {
  return { id: nuovoId("p"), casa, ospite, Data: "", Orario: "", Luogo: "", origine: null };
}

export function nuovaGiornata(nome = null) {
  return { id: nuovoId("g"), nome, bloccata: false, partite: [] };
}

// Tutte le liste di partite: giornate numerate, speciali e parcheggio
export function tutteLeListe(s) {
  return [
    ...s.giornate,
    ...s.speciali,
    { id: ID_PARCHEGGIO, nome: "Da collocare", bloccata: false, partite: s.parcheggio },
  ];
}

export function trovaLista(id, s) {
  return tutteLeListe(s).find((lista) => lista.id === id) || null;
}

export function trovaPartita(id, s) {
  for (const lista of tutteLeListe(s)) {
    const indice = lista.partite.findIndex((p) => p.id === id);
    if (indice !== -1) return { lista, indice, partita: lista.partite[indice] };
  }
  return null;
}

export function etichettaLista(lista, s) {
  if (lista.id === ID_PARCHEGGIO) return "Da collocare";
  if (lista.nome) return lista.nome;
  return `Giornata ${s.giornate.indexOf(lista) + 1}`;
}

// JSON con chiavi ordinate: serve a confrontare bozza e pubblicato
export function stabile(valore) {
  if (Array.isArray(valore)) return `[${valore.map(stabile).join(",")}]`;
  if (valore && typeof valore === "object") {
    return `{${Object.keys(valore)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stabile(valore[k])}`)
      .join(",")}}`;
  }
  return JSON.stringify(valore);
}

export function impronta(s) {
  const { calendario, bloccate } = perPubblicazione(s);
  const testo = stabile({ calendario, bloccate });
  let hash = 5381;
  for (let i = 0; i < testo.length; i++) hash = ((hash << 5) + hash + testo.charCodeAt(i)) | 0;
  return String(hash);
}

// Come verrà scritto Calendario: le giornate vuote spariscono e le numerate
// vengono rinumerate da 1 senza buchi
export function perPubblicazione(s) {
  const calendario = {};
  const bloccate = {};
  const numerazione = new Map(); // id giornata -> chiave su Firebase

  const aggiungi = (giornata, chiave) => {
    numerazione.set(giornata.id, chiave);
    if (giornata.bloccata) bloccate[chiave] = true;
    calendario[chiave] = {};
    for (const p of giornata.partite) {
      calendario[chiave][chiavePartita(p)] = {
        Data: p.Data || "",
        Orario: p.Orario || "",
        Luogo: p.Luogo || "",
      };
    }
  };

  let numero = 0;
  for (const giornata of s.giornate) {
    if (giornata.partite.length) aggiungi(giornata, String(++numero));
  }
  for (const giornata of s.speciali) {
    if (giornata.partite.length) aggiungi(giornata, giornata.nome);
  }
  return { calendario, bloccate, numerazione };
}
