/*
===================================
TABELLONE DELLA FASE FINALE (logica)
===================================
Funzioni pure, senza Firebase né DOM: le usano il gestionale (dove si
compila il tabellone), il sito (dove si mostra) e i test.

Calcio/{edizione}/{divisione}/FaseFinale:

  {
    Squadre: 8,                 squadre al primo turno (2, 4, 8 o 16)
    TerzoPosto: true,           c'è la finale per il 3° posto
    Turni: [                    dal primo turno alla finale
      { Nome: "Quarti di finale", Partite: [ partita, ... ] },
      { Nome: "Semifinali", Partite: [ ... ] },
      { Nome: "Finale", Partite: [ partita ] }
    ],
    Finale3: partita            solo con TerzoPosto
  }

  partita = { Casa, Ospite, GolCasa, GolOspite, RigoriCasa, RigoriOspite, Data, Orario, Luogo }

- Casa e Ospite: la chiave della squadra (per il logo) oppure un nome libero.
  Vuoti finché la squadra non è nota: si mostra "Vincente Semifinale 1".
- La partita 2i e la 2i+1 di un turno mandano le vincenti alla partita i del
  turno dopo: la prima in casa, la seconda ospite.
- Data "gg/mm" e Orario "hh:mm", come nel calendario.
*/

export const FORMATI = [2, 4, 8, 16];

const NOMI_TURNI = { 1: "Finale", 2: "Semifinali", 4: "Quarti di finale", 8: "Ottavi di finale" };
const NOMI_PARTITA = { 1: "Finale", 2: "Semifinale", 4: "Quarto", 8: "Ottavo" };

// Nome predefinito del turno con quel numero di partite
export function nomeTurno(partite) {
  return NOMI_TURNI[partite] || `Turno da ${partite * 2}`;
}

// "Semifinale 2", "Quarto 3", "Finale"
export function nomePartita(partiteNelTurno, indice) {
  const nome = NOMI_PARTITA[partiteNelTurno] || "Partita";
  return partiteNelTurno === 1 ? nome : `${nome} ${indice + 1}`;
}

export function partitaVuota() {
  return {
    Casa: "",
    Ospite: "",
    GolCasa: null,
    GolOspite: null,
    RigoriCasa: null,
    RigoriOspite: null,
    Data: "",
    Orario: "",
    Luogo: "",
  };
}

// Firebase restituisce gli array come array o come oggetti { "0": ..., "1": ... }
function comeArray(valore) {
  if (Array.isArray(valore)) return valore;
  if (!valore || typeof valore !== "object") return [];
  return Object.keys(valore)
    .filter((chiave) => /^\d+$/.test(chiave))
    .sort((a, b) => a - b)
    .map((chiave) => valore[chiave]);
}

const numero = (valore) =>
  valore === null || valore === undefined || valore === "" || Number.isNaN(Number(valore))
    ? null
    : Number(valore);

function normalizzaPartita(partita) {
  const p = { ...partitaVuota(), ...(partita && typeof partita === "object" ? partita : {}) };
  for (const campo of ["Casa", "Ospite", "Data", "Orario", "Luogo"]) p[campo] = String(p[campo] ?? "");
  for (const campo of ["GolCasa", "GolOspite", "RigoriCasa", "RigoriOspite"]) p[campo] = numero(p[campo]);
  return p;
}

/*
 Tabellone completo e ordinato a partire da quello salvato (anche parziale o
 vecchio). Con squadre/terzoPosto diversi da quelli salvati ricostruisce la
 struttura tenendo i dati dei turni che restano: la finale resta la finale,
 le semifinali restano semifinali, e così via.
*/
export function creaTabellone({ squadre = null, terzoPosto = null, precedente = null } = {}) {
  const prima = precedente && typeof precedente === "object" ? precedente : {};
  const numeroSquadre = FORMATI.includes(Number(squadre))
    ? Number(squadre)
    : FORMATI.includes(Number(prima.Squadre))
      ? Number(prima.Squadre)
      : 4;
  const conTerzo = terzoPosto ?? Boolean(prima.TerzoPosto);
  const turniPrima = comeArray(prima.Turni);

  const turni = [];
  for (let partite = numeroSquadre / 2; partite >= 1; partite /= 2) turni.push(partite);

  return {
    Squadre: numeroSquadre,
    TerzoPosto: conTerzo && numeroSquadre >= 4,
    Turni: turni.map((partite, indice) => {
      // Stessa distanza dalla finale nel tabellone di prima
      const vecchio = turniPrima[turniPrima.length - (turni.length - indice)];
      const vecchiePartite = comeArray(vecchio?.Partite);
      const stessoTurno = vecchiePartite.length === partite;
      return {
        Nome: stessoTurno && vecchio?.Nome ? String(vecchio.Nome) : nomeTurno(partite),
        Partite: Array.from({ length: partite }, (_, i) =>
          normalizzaPartita(stessoTurno ? vecchiePartite[i] : null)
        ),
      };
    }),
    Finale3: conTerzo && numeroSquadre >= 4 ? normalizzaPartita(prima.Finale3) : null,
  };
}

// Un tabellone salvato ha almeno una squadra o un risultato inseriti
export function tabelloneCompilato(tabellone) {
  if (!tabellone) return false;
  const t = creaTabellone({ precedente: tabellone });
  const partite = [...t.Turni.flatMap((turno) => turno.Partite), ...(t.Finale3 ? [t.Finale3] : [])];
  return partite.some((p) => p.Casa.trim() || p.Ospite.trim() || p.GolCasa !== null);
}

// "casa", "ospite" oppure null (non giocata o pareggio senza rigori)
export function vincente(partita) {
  const p = normalizzaPartita(partita);
  if (p.GolCasa === null || p.GolOspite === null) return null;
  if (p.GolCasa !== p.GolOspite) return p.GolCasa > p.GolOspite ? "casa" : "ospite";
  if (p.RigoriCasa === null || p.RigoriOspite === null || p.RigoriCasa === p.RigoriOspite) return null;
  return p.RigoriCasa > p.RigoriOspite ? "casa" : "ospite";
}

export function giocata(partita) {
  const p = normalizzaPartita(partita);
  return p.GolCasa !== null && p.GolOspite !== null;
}

const squadraDi = (partita, lato) => (lato === "casa" ? partita.Casa : partita.Ospite);
const altroLato = (lato) => (lato === "casa" ? "ospite" : "casa");

// Testo al posto di una squadra non ancora nota
export function segnaposto(tabellone, turno, indice, lato) {
  if (turno === "terzo") {
    const semifinali = tabellone.Turni.at(-2);
    if (!semifinali) return "Da definire";
    return `Perdente ${nomePartita(semifinali.Partite.length, lato === "casa" ? 0 : 1)}`;
  }
  if (turno === 0) return "Da definire";
  const precedente = tabellone.Turni[turno - 1];
  const origine = indice * 2 + (lato === "casa" ? 0 : 1);
  return `Vincente ${nomePartita(precedente.Partite.length, origine)}`;
}

/*
 Mette nel turno dopo le squadre che hanno vinto (e nella finale per il
 3° posto chi ha perso le semifinali). Tocca solo i posti vuoti o quelli già
 occupati da una delle due squadre della partita d'origine: un nome scritto a
 mano per altri motivi resta com'è.
 Restituisce { tabellone, cambiate } con il numero di posti aggiornati.
*/
export function portaAvantiVincenti(tabelloneSalvato) {
  const tabellone = creaTabellone({ precedente: tabelloneSalvato });
  let cambiate = 0;

  const assegna = (partita, lato, origine, chi) => {
    const campo = lato === "casa" ? "Casa" : "Ospite";
    const nuovo = squadraDi(origine, chi);
    const attuale = partita[campo].trim();
    if (!nuovo.trim() || attuale === nuovo) return;
    if (attuale && attuale !== origine.Casa && attuale !== origine.Ospite) return;
    partita[campo] = nuovo;
    cambiate++;
  };

  for (let t = 1; t < tabellone.Turni.length; t++) {
    const precedenti = tabellone.Turni[t - 1].Partite;
    tabellone.Turni[t].Partite.forEach((partita, i) => {
      for (const lato of ["casa", "ospite"]) {
        const origine = precedenti[i * 2 + (lato === "casa" ? 0 : 1)];
        const chi = vincente(origine);
        if (chi) assegna(partita, lato, origine, chi);
      }
    });
  }

  if (tabellone.Finale3) {
    const semifinali = tabellone.Turni.at(-2).Partite;
    for (const lato of ["casa", "ospite"]) {
      const origine = semifinali[lato === "casa" ? 0 : 1];
      const chi = vincente(origine);
      if (chi) assegna(tabellone.Finale3, lato, origine, altroLato(chi));
    }
  }

  return { tabellone, cambiate };
}

// Chiave o nome di chi ha vinto la finale, oppure null
export function campione(tabelloneSalvato) {
  const tabellone = creaTabellone({ precedente: tabelloneSalvato });
  const finale = tabellone.Turni.at(-1).Partite[0];
  const chi = vincente(finale);
  return chi ? squadraDi(finale, chi) || null : null;
}

/*
 Per salvare su Firebase: niente valori vuoti (Firebase li scarterebbe
 comunque), ma Casa e Ospite restano sempre, così nessuna partita sparisce
 e gli array restano senza buchi.
*/
export function perSalvare(tabelloneModificato) {
  const tabellone = creaTabellone({ precedente: tabelloneModificato });
  const pulisci = (partita) => {
    const p = { Casa: partita.Casa.trim(), Ospite: partita.Ospite.trim() };
    for (const campo of ["GolCasa", "GolOspite", "RigoriCasa", "RigoriOspite"]) {
      if (partita[campo] !== null) p[campo] = partita[campo];
    }
    for (const campo of ["Data", "Orario", "Luogo"]) {
      if (partita[campo].trim()) p[campo] = partita[campo].trim();
    }
    // I rigori contano solo dopo un pareggio
    if (p.GolCasa === undefined || p.GolCasa !== p.GolOspite) {
      delete p.RigoriCasa;
      delete p.RigoriOspite;
    }
    return p;
  };
  return {
    Squadre: tabellone.Squadre,
    TerzoPosto: tabellone.TerzoPosto,
    Turni: tabellone.Turni.map((turno) => ({
      Nome: turno.Nome.trim() || nomeTurno(turno.Partite.length),
      Partite: turno.Partite.map(pulisci),
    })),
    Finale3: tabellone.Finale3 ? pulisci(tabellone.Finale3) : null,
  };
}

// "gg/mm" <-> "aaaa-mm-gg" (campo data del browser)
export function dataPerCampo(data, anno) {
  const [giorno, mese] = String(data || "")
    .split("/")
    .map((parte) => parseInt(parte, 10));
  if (!giorno || !mese) return "";
  return `${anno}-${String(mese).padStart(2, "0")}-${String(giorno).padStart(2, "0")}`;
}

export function dataDaCampo(valore) {
  const [, mese, giorno] = String(valore || "").split("-");
  return giorno && mese ? `${giorno}/${mese}` : "";
}
