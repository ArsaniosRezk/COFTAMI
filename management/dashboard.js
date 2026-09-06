import { editMatchdayToShow, prossimaGiornata, recuperaCalendario } from "/js/components/calendar.js";
import { classificaGirone, classificaMarcatori } from "/js/components/standings.js";
import { faseFinale } from "/js/components/final-phase.js";
import { visualizzaSquadreConMembri } from "/js/components/teams.js";
import { ref, get, update, db } from "/js/firebase.js";

export const initDashboard = async () => {
  // Codice di inizializzazione per la sezione dashboard
  editMatchdayToShow();
  classificaGirone("classifica-squadre", true);
  classificaMarcatori("classifica-gol");

  // Gestione Impostazioni
  const settingsRef = ref(db, "Impostazioni");
  const faseFinaleCheckbox = document.getElementById("toggle-fase-finale");
  const manutenzioneCheckbox = document.getElementById("toggle-manutenzione");
  const iscrizioniCheckbox = document.getElementById("toggle-iscrizioni");

  const editionSelect = document.getElementById("edition-select");

  // Le iscrizioni sono considerate aperte finché non vengono chiuse esplicitamente
  iscrizioniCheckbox.checked = true;

  // Recupera stato iniziale
  try {
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();
      faseFinaleCheckbox.checked = data.faseFinale || false;
      manutenzioneCheckbox.checked = data.manutenzione || false;

      // Iscrizioni aperte di default: si chiudono solo esplicitamente
      iscrizioniCheckbox.checked = data.iscrizioniAperte !== false;

      // Set Edition (Default 2025)
      if (editionSelect) {
        editionSelect.value = data.edizioneCorrente || "2025";
      }

      // Check for Admin PIN and set default if missing (BOOTSTRAP)
      if (!data.adminPin) {
        update(settingsRef, { adminPin: "COFTA" });
        console.log("Admin PIN set to default: COFTA");
      }
    }
  } catch (error) {
    console.error("Errore recupero impostazioni:", error);
  }

  // Listener aggiornamenti
  faseFinaleCheckbox.addEventListener("change", () => {
    update(settingsRef, { faseFinale: faseFinaleCheckbox.checked });
  });

  manutenzioneCheckbox.addEventListener("change", () => {
    update(settingsRef, { manutenzione: manutenzioneCheckbox.checked });
  });

  iscrizioniCheckbox.addEventListener("change", () => {
    update(settingsRef, { iscrizioniAperte: iscrizioniCheckbox.checked });
  });

  if (editionSelect) {
    editionSelect.addEventListener("change", () => {
      update(settingsRef, { edizioneCorrente: editionSelect.value });
    });
  }
};
