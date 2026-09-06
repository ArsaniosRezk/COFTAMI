import { manutenzione } from "./components/manutenzione.js";
import { ref, db, get } from "./firebase.js";

/*
    TEMPORANEO (fase di test)
    -------------------------
    Pagine raggiungibili anche con la manutenzione attiva.
    Le pagine pubbliche (regolamento, iscrizione) sono bloccate: restano
    accessibili solo le rispettive copie di test.
    Svuotare l'array per rimettere il blocco su tutto il sito.
*/
const PAGINE_ESENTI = ["regolamento-test", "iscrizione-test"];

function paginaEsenteDaManutenzione() {
    // Funziona sia con /iscrizione.html sia con /iscrizione
    const percorso = window.location.pathname
        .toLowerCase()
        .replace(/\.html$/, "")
        .replace(/\/$/, "");
    const nomePagina = percorso.substring(percorso.lastIndexOf("/") + 1);

    return PAGINE_ESENTI.includes(nomePagina);
}

/**
 * Checks maintenance status and strictly blocks execution if active.
 * Handles page visibility to prevent flashing.
 * @returns {Promise<void>} Resolves if safe to proceed, rejects/hangs if maintenance is active.
 */
export async function maintenanceGuard() {
    const settingsRef = ref(db, "Impostazioni");

    try {
        const snapshot = await get(settingsRef);

        if (
            snapshot.exists() &&
            snapshot.val().manutenzione &&
            !paginaEsenteDaManutenzione()
        ) {
            // 1. Show Overlay
            manutenzione();

            // 2. Reveal Body (so overlay is seen)
            document.body.style.opacity = "1";
            document.body.style.pointerEvents = "auto";

            // 3. STOP EVERYTHING
            console.warn("Maintenance Mode Active: Blocking further execution.");
            // Throwing an error creates a rejected promise, stopping await chains
            throw new Error("MAINTENANCE_MODE_BLOCK");
        }

        // If we get here, no maintenance.
        // Reveal body for normal content
        document.body.style.opacity = "1";
        document.body.style.pointerEvents = "auto";

    } catch (error) {
        if (error.message === "MAINTENANCE_MODE_BLOCK") {
            // Re-throw to stop caller
            throw error;
        }

        console.error("Maintenance Guard Error:", error);
        // In case of error (e.g. offline), we usually want to fail safe or show content?
        // Let's show content to avoid permanent white screen if DB fails
        document.body.style.opacity = "1";
        document.body.style.pointerEvents = "auto";
    }
}
