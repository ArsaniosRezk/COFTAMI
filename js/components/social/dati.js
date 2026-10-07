import { getData } from "../../firebase.js";
import { edition } from "../../divisione.js";
import { giornataCorrente } from "../../utils/torneo.js";
import { inizializzaPunteggi, aggiornaPunteggi, ordinaClassifica } from "../../utils/classifica.js";

/*
===================================
GRAFICHE SOCIAL: DATI
===================================
Lettura dei dati della divisione e preparazione di partite e classifiche.
*/

/*
-----------------------------------
DATI
-----------------------------------
*/

// Carica tutto ciò che serve alle grafiche di una divisione
export async function caricaDatiSocial(division) {
  const base = `Calcio/${edition}/${division}`;

  const [calendario, squadre, partite, giornataDivisione, giornataGlobale] = await Promise.all([
    getData(`${base}/Calendario`),
    getData(`${base}/Squadre`),
    getData(`${base}/Partite`),
    getData(`${base}/GiornataDaMostrare`),
    getData(`Calcio/${edition}/GiornataDaMostrare`),
  ]);

  const giornate = Object.keys(calendario || {})
    .filter((key) => !isNaN(key))
    .sort((a, b) => a - b);

  return {
    division,
    calendario: calendario || {},
    squadre: squadre || {},
    partite: partite || {},
    giornate,
    // "auto" o non impostata: la prima giornata con partite da giocare
    giornataDaMostrare: String(giornataCorrente(calendario, giornataDivisione ?? giornataGlobale) ?? ""),
  };
}

export function nomeSquadra(chiave) {
  return chiave.replace(/_/g, ".");
}

// Minuti dall'inizio dell'anno: serve solo a ordinare le partite
export function momentoPartita(data, orario) {
  const [giorno, mese] = (data || "").split("/").map(Number);
  const [ore, minuti] = (orario || "").split(":").map(Number);
  if (!giorno || !mese) return Infinity;
  return ((mese * 31 + giorno) * 24 + (ore || 0)) * 60 + (minuti || 0);
}

export function partiteGiornata(dati, giornata) {
  const calendario = dati.calendario[giornata] || {};
  const giocate = dati.partite[giornata] || {};

  return Object.entries(calendario)
    .map(([chiave, info]) => {
      const [casa, ospite] = chiave.split(":");
      const referto = giocate[chiave];

      // Il risultato ufficiale è quello delle Partite; il campo
      // Risultato del calendario è solo una copia per il sito
      let golCasa = referto?.GolSquadraCasa;
      let golOspite = referto?.GolSquadraOspite;
      if (golCasa === undefined || golOspite === undefined) {
        const match = /^\s*(\d+)\s*[:-]\s*(\d+)\s*$/.exec(info.Risultato || "");
        if (match) {
          golCasa = Number(match[1]);
          golOspite = Number(match[2]);
        }
      }

      return {
        casa,
        ospite,
        data: info.Data || "",
        orario: info.Orario || "",
        luogo: info.Luogo || "",
        golCasa,
        golOspite,
        marcatori: referto?.Marcatori || null,
        giocata: golCasa !== undefined && golOspite !== undefined,
      };
    })
    .sort((a, b) => momentoPartita(a.data, a.orario) - momentoPartita(b.data, b.orario));
}

// Stessa logica di classificaGirone() in components/classifiche.js
export function calcolaClassifiche(dati) {
  const { squadre, partite } = dati;

  const gironi = {};
  for (const chiave in squadre) {
    const girone = squadre[chiave].Girone || "";
    if (girone === "") continue;
    if (!gironi[girone]) gironi[girone] = {};
    gironi[girone][chiave] = squadre[chiave];
  }
  if (Object.keys(gironi).length === 0) gironi[""] = squadre;

  const numeriGiornate = Object.keys(partite).filter((key) => !isNaN(key));
  let ultimaGiornata = 0;

  const classifiche = Object.keys(gironi)
    .sort()
    .map((girone) => {
      const squadreGirone = gironi[girone];
      const punteggi = inizializzaPunteggi(squadreGirone);

      for (const giornata of numeriGiornate) {
        for (const match of Object.values(partite[giornata] || {})) {
          const casaIn = !!squadreGirone[match.SquadraCasa];
          const ospiteIn = !!squadreGirone[match.SquadraOspite];
          if (casaIn || ospiteIn) {
            ultimaGiornata = Math.max(ultimaGiornata, Number(giornata));
          }
          if (casaIn) {
            aggiornaPunteggi(
              punteggi,
              match.SquadraCasa,
              match.GolSquadraCasa,
              match.GolSquadraOspite,
              match.SquadraOspite
            );
          }
          if (ospiteIn) {
            aggiornaPunteggi(
              punteggi,
              match.SquadraOspite,
              match.GolSquadraOspite,
              match.GolSquadraCasa,
              match.SquadraCasa
            );
          }
        }
      }

      return { girone, righe: ordinaClassifica(punteggi) };
    });

  return { classifiche, ultimaGiornata };
}
