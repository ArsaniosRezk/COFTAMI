import { db, ref, update, getPaths } from "../firebase.js";
import { conferma, mostraToast } from "../utils/interfaccia.js";
import { aggiornaConteggi } from "../utils/gestionale-eventi.js";

export function creaAnnullaPubblicazione({ giornata, chiave, divisione = null, ridisegna }) {
  const { matchesPath, calendarPath } = getPaths(divisione);
  const pulsante = document.createElement("button");
  pulsante.type = "button";
  pulsante.className = "btn btn-testo btn-elimina";
  pulsante.textContent = "Annulla pubblicazione";
  pulsante.addEventListener("click", async () => {
    const ok = await conferma(
      'Risultato e marcatori spariranno dal sito e dalle classifiche: la partita tornerà "da giocare". Il calendario e il referto resteranno disponibili per pubblicarla di nuovo.',
      { titolo: "Annullare la pubblicazione?", ok: "Annulla pubblicazione", annulla: "Lascia pubblicato" }
    );
    if (!ok) return;
    pulsante.disabled = true;
    try {
      // Un'unica scrittura: risultato e marcatori vengono ritirati insieme.
      await update(ref(db), {
        [`${matchesPath}/${giornata}/${chiave}`]: null,
        // Il valore vuoto mantiene in calendario anche una partita senza data o luogo.
        [`${calendarPath}/${giornata}/${chiave}/Risultato`]: "",
      });
    } catch (errore) {
      console.error("Errore nell'annullamento della pubblicazione:", errore);
      mostraToast("Impossibile annullare la pubblicazione. Riprova.", { errore: true });
      pulsante.disabled = false;
      return;
    }
    mostraToast("Pubblicazione annullata");
    aggiornaConteggi();
    await ridisegna?.();
  });
  return pulsante;
}
