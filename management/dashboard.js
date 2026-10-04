import { editMatchdayToShow, prossimaGiornata, recuperaCalendario } from "/js/components/calendar.js";
import { classificaGirone, classificaMarcatori } from "/js/components/standings.js";
import { faseFinale } from "/js/components/final-phase.js";
import { visualizzaSquadreConMembri } from "/js/components/teams.js";
import { ref, get, update, db } from "/js/firebase.js";
import { impostaEdizioneLocale } from "/js/edition-sync.js";
import { PAGINE_CONTROLLABILI, paginaAttiva } from "/js/pagine-attive.js";
import { mostraToast } from "/js/utils/interfaccia.js";

// Un interruttore per ogni pagina pubblica (Impostazioni/pagineAttive/<pagina>)
function creaInterruttoriPagine(settingsRef, impostazioni) {
  const contenitore = document.getElementById("pagine-attive");
  if (!contenitore) return;
  contenitore.replaceChildren();

  for (const { chiave, nome } of PAGINE_CONTROLLABILI) {
    const voce = document.createElement("div");
    voce.className = "setting-item";

    const etichetta = document.createElement("span");
    etichetta.className = "setting-label";
    etichetta.id = `etichetta-pagina-${chiave}`;
    etichetta.textContent = nome;

    const interruttore = document.createElement("label");
    interruttore.className = "modern-switch";

    const casella = document.createElement("input");
    casella.type = "checkbox";
    casella.id = `toggle-pagina-${chiave}`;
    casella.checked = paginaAttiva(impostazioni, chiave);
    casella.setAttribute("aria-labelledby", etichetta.id);

    const cursore = document.createElement("span");
    cursore.className = "slider";

    casella.addEventListener("change", async () => {
      const attiva = casella.checked;
      try {
        await update(settingsRef, { [`pagineAttive/${chiave}`]: attiva });
        mostraToast(`${nome}: ${attiva ? "visibile" : "nascosta"} sul sito`);
      } catch (errore) {
        console.error("Errore nel salvataggio della pagina:", errore);
        casella.checked = !attiva;
        mostraToast("Impossibile salvare. Riprova.", { errore: true });
      }
    });

    interruttore.append(casella, cursore);
    voce.append(etichetta, interruttore);
    contenitore.appendChild(voce);
  }
}

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

      creaInterruttoriPagine(settingsRef, data);

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
    editionSelect.addEventListener("change", async () => {
      await update(settingsRef, { edizioneCorrente: editionSelect.value });

      // I moduli già caricati hanno letto l'edizione vecchia: senza ricarica
      // il gestionale continuerebbe a scrivere sull'annata precedente
      impostaEdizioneLocale(editionSelect.value);
      location.reload();
    });
  }
};
