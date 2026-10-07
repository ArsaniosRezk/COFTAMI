import { impostazioniPronte } from "./impostazioni.js";
import { osservaDivisione, mostraErroreCaricamento } from "./dati-torneo.js";
import { classificaGirone, scheletroClassifica } from "./components/classifiche.js";

/*
===================================
CLASSIFICA COMPLETA
===================================
Le classifiche di entrambe le divisioni nella stessa pagina (es. da
proiettare durante le partite). Si aggiornano in tempo reale.

La divisione si passa esplicitamente: la scelta salvata dal visitatore
nell'header del sito non viene toccata.
*/

const DIVISIONI = [
  { divisione: "Superiori", contenitore: "superiori" },
  { divisione: "Giovani", contenitore: "giovani" },
];

DIVISIONI.forEach(({ contenitore }) => scheletroClassifica(contenitore));

await impostazioniPronte;

for (const { divisione, contenitore } of DIVISIONI) {
  osservaDivisione((dati) => classificaGirone(contenitore, false, dati), {
    divisione,
    onLento: () => mostraErroreCaricamento([contenitore]),
  });
}
