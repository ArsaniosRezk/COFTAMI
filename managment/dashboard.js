import {
  editMatchdayToShow,
  classificaGirone,
  classificaMarcatori,
  prossimaGiornata,
  recuperaCalendario,
  faseFinale,
  visualizzaSquadreConMembri,
} from "/Js/funzioni.js";

export const initDashboard = () => {
  // Codice di inizializzazione per la sezione dashboard
  editMatchdayToShow();
  classificaGirone("classifica-squadre");
  classificaMarcatori("classifica-gol");
};
