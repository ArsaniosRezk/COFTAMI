/*
===================================
CALCOLO DELLE CLASSIFICHE
===================================

Solo calcoli, niente pagina e niente Firebase: le stesse funzioni servono al
sito, al gestionale e ai test automatici (test/classifica.test.mjs).

Dati di partenza:
- squadre:  { chiave: { Girone, Penalità, Giocatori: { nome: ... } } }
- partite:  { giornata: { "Casa:Ospite": { SquadraCasa, SquadraOspite,
              GolSquadraCasa, GolSquadraOspite, Marcatori } } }

Ordine della classifica a parità di punti (punti già al netto delle penalità):
1. punti negli scontri diretti
2. differenza reti negli scontri diretti
3. differenza reti generale
4. gol fatti
5. gol subiti (meno è meglio)
*/

// Giornate di campionato (1, 2, 3...) in ordine numerico: le giornate della
// fase finale ("SF", "F") non contano per la classifica.
// Senza il confronto numerico "10" finirebbe tra "1" e "2".
export function giornateNumerate(oggetto) {
  return Object.keys(oggetto || {})
    .filter((chiave) => chiave.trim() !== "" && !isNaN(chiave))
    .sort((a, b) => a - b);
}

export function inizializzaPunteggi(teams) {
  const scores = {};
  for (const teamKey in teams) {
    const team = teams[teamKey] || {};
    scores[teamKey] = {
      playedMatches: 0,
      wonMatches: 0,
      drawnMatches: 0,
      lostMatches: 0,
      scoredGoals: 0,
      concededGoals: 0,
      goalsDifference: 0,
      points: 0,
      headToHead: {},
      penaltyPoints: Number(team.Penalità) || 0,
    };
  }
  return scores;
}

export function aggiornaScontriDiretti(scores, team, scoredGoals, concededGoals, opponent) {
  // Se l'avversaria non è nel girone corrente, niente scontri diretti
  if (!scores[opponent]) return;

  const headToHead = (scores[team].headToHead[opponent] ??= {
    playedMatches: 0,
    scoredGoals: 0,
    concededGoals: 0,
    goalsDifference: 0,
    points: 0,
  });

  headToHead.playedMatches++;
  headToHead.scoredGoals += scoredGoals;
  headToHead.concededGoals += concededGoals;
  headToHead.goalsDifference = headToHead.scoredGoals - headToHead.concededGoals;

  if (scoredGoals > concededGoals) headToHead.points += 3;
  else if (scoredGoals === concededGoals) headToHead.points += 1;
}

export function aggiornaPunteggi(scores, team, scoredGoals, concededGoals, opponent) {
  scoredGoals = Number(scoredGoals) || 0;
  concededGoals = Number(concededGoals) || 0;

  const teamStats = scores[team];
  teamStats.playedMatches++;
  teamStats.scoredGoals += scoredGoals;
  teamStats.concededGoals += concededGoals;
  teamStats.goalsDifference = teamStats.scoredGoals - teamStats.concededGoals;

  if (scoredGoals > concededGoals) {
    teamStats.wonMatches++;
    teamStats.points += 3;
  } else if (scoredGoals === concededGoals) {
    teamStats.drawnMatches++;
    teamStats.points += 1;
  } else {
    teamStats.lostMatches++;
  }

  aggiornaScontriDiretti(scores, team, scoredGoals, concededGoals, opponent);
}

export function ordinaClassifica(scores) {
  return Object.entries(scores).sort(([teamA, statsA], [teamB, statsB]) => {
    const totalPointsA = statsA.points - statsA.penaltyPoints;
    const totalPointsB = statsB.points - statsB.penaltyPoints;
    if (totalPointsB !== totalPointsA) return totalPointsB - totalPointsA;

    const headToHeadA = statsA.headToHead[teamB] || {};
    const headToHeadB = statsB.headToHead[teamA] || {};

    const puntiDirettiA = headToHeadA.points || 0;
    const puntiDirettiB = headToHeadB.points || 0;
    if (puntiDirettiA !== puntiDirettiB) return puntiDirettiB - puntiDirettiA;

    const differenzaDirettaA = headToHeadA.goalsDifference || 0;
    const differenzaDirettaB = headToHeadB.goalsDifference || 0;
    if (differenzaDirettaA !== differenzaDirettaB) return differenzaDirettaB - differenzaDirettaA;

    if (statsB.goalsDifference !== statsA.goalsDifference) {
      return statsB.goalsDifference - statsA.goalsDifference;
    }
    if (statsB.scoredGoals !== statsA.scoredGoals) return statsB.scoredGoals - statsA.scoredGoals;
    return statsA.concededGoals - statsB.concededGoals;
  });
}

/*
 Classifiche di tutti i gironi.
 Restituisce [{ girone, ranking }] con ranking = [[chiaveSquadra, statistiche], ...]
 già ordinato. girone vale "unico" se nessuna squadra ha un girone.
*/
export function calcolaClassifiche(teams, giornate) {
  const numeriGiornate = giornateNumerate(giornate);

  const gironi = {};
  let almenoUnGirone = false;

  for (const teamKey in teams) {
    const girone = teams[teamKey]?.Girone || "";
    if (girone !== "") {
      almenoUnGirone = true;
      (gironi[girone] ??= {})[teamKey] = teams[teamKey];
    }
  }

  // Se nessuna squadra ha un girone, raggruppale tutte in un unico girone "unico"
  if (!almenoUnGirone) gironi.unico = teams;

  return Object.keys(gironi)
    .sort()
    .map((girone) => {
      const gironeTeams = gironi[girone];
      const scores = inizializzaPunteggi(gironeTeams);

      // Se almeno una delle due squadre è del girone si aggiorna quella
      // (o entrambe se la partita è interna al girone)
      for (const giornata of numeriGiornate) {
        const matches = giornate[giornata] || {};
        for (const matchKey in matches) {
          const match = matches[matchKey] || {};
          if (gironeTeams[match.SquadraCasa]) {
            aggiornaPunteggi(
              scores,
              match.SquadraCasa,
              match.GolSquadraCasa,
              match.GolSquadraOspite,
              match.SquadraOspite
            );
          }
          if (gironeTeams[match.SquadraOspite]) {
            aggiornaPunteggi(
              scores,
              match.SquadraOspite,
              match.GolSquadraOspite,
              match.GolSquadraCasa,
              match.SquadraCasa
            );
          }
        }
      }

      return { girone, ranking: ordinaClassifica(scores) };
    });
}

// Posizione e statistiche di una squadra nel suo girone, oppure null
export function posizioneSquadra(squadre, partite, chiave) {
  if (!squadre?.[chiave]) return null;
  for (const { girone, ranking } of calcolaClassifiche(squadre, partite || {})) {
    const indice = ranking.findIndex(([squadra]) => squadra === chiave);
    if (indice === -1) continue;
    const statistiche = ranking[indice][1];
    return {
      girone: girone === "unico" ? null : girone,
      posizione: indice + 1,
      totale: ranking.length,
      statistiche,
      punti: statistiche.points - statistiche.penaltyPoints,
    };
  }
  return null;
}

/*
-----------------------------------
MARCATORI
-----------------------------------
*/

const AUTOGOL = new Set(["AutogolCasa", "AutogolOspite"]);

function sommaGol(ranking, players) {
  if (!players || typeof players !== "object") return;
  for (const player of Object.keys(players)) {
    if (AUTOGOL.has(player)) continue;
    const gol = Number(players[player]) || 0;
    if (gol > 0) ranking[player] = (ranking[player] || 0) + gol;
  }
}

// Gol per giocatore: [[nome, gol], ...] dal più prolifico (a parità, in ordine alfabetico)
export function calcolaMarcatori(partite) {
  const scorers = {};
  for (const giornata of Object.values(partite || {})) {
    for (const match of Object.values(giornata || {})) {
      sommaGol(scorers, match?.Marcatori?.MarcatoriCasa);
      sommaGol(scorers, match?.Marcatori?.MarcatoriOspite);
    }
  }
  return Object.entries(scorers).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

// A parità di gol la posizione è la stessa: 1, 2, 2, 4...
export function calcolaPosizioniGlobali(rankingArray) {
  let posizione = 1;
  let golPrecedenti = null;
  return rankingArray.map(([player, value], index) => {
    if (value !== golPrecedenti) posizione = index + 1;
    golPrecedenti = value;
    return { position: posizione, player, value };
  });
}

// Giocatore -> squadra
export function squadraDeiGiocatori(squadre) {
  const squadraDi = {};
  for (const teamName in squadre || {}) {
    for (const player in squadre[teamName]?.Giocatori || {}) {
      squadraDi[player] = teamName;
    }
  }
  return squadraDi;
}
