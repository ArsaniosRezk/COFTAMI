import { classificaGirone } from "./components/standings.js";
import { faseFinale } from "./components/final-phase.js";
import { prossimaGiornata } from "./components/calendar.js";
import { getData, ref, db, get } from "./firebase.js";
import { maintenanceGuard } from "./maintenance-guard.js";

// Sequenza esecuzione dei contenuti della pagina
// Esportata e importata nel header
export async function sequenzaEsecuzione() {
  // 1. Check Guard FIRST. If maintenance is on, this throws and stops everything.
  await maintenanceGuard();

  const settingsRef = ref(db, "Impostazioni");
  try {
    const snapshot = await get(settingsRef);
    if (snapshot.exists()) {
      const data = snapshot.val();

      // Gestione Fase Finale
      if (data.faseFinale) {
        faseFinale();
      }
    }
  } catch (error) {
    console.error("Errore recupero impostazioni:", error);
  }

  classificaGirone("classifica-squadre");
  // faseFinale(); // Spostato dentro il check
  prossimaGiornata();
}
