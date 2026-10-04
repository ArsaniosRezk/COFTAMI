/*
===================================
AMBIENTE
===================================

Sul sito di staging (staging.coftamilano.com) e in locale si lavora sempre
sui dati di prova, mai su quelli del torneo:
- edizione Calcio/Test (vedi divisionAndVariables.js)
- impostazioni in ImpostazioniTest invece che in Impostazioni, così
  manutenzione, pagine attive, iscrizioni aperte ecc. provate qui non
  cambiano il sito vero.
Sul sito di produzione l'edizione Test non è raggiungibile.
*/

const HOST_DI_PROVA = ["staging.coftamilano.com", "localhost", "127.0.0.1"];

export const STAGING = HOST_DI_PROVA.includes(location.hostname);

export const PERCORSO_IMPOSTAZIONI = STAGING ? "ImpostazioniTest" : "Impostazioni";
