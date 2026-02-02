import { ref, get, db } from "../firebase.js";

/*
===================================
FASE FINALE
===================================
*/

export async function faseFinale() {
    // 1. Check Firebase Settings first
    const settingsRef = ref(db, "Impostazioni");
    try {
        const snapshot = await get(settingsRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            // If "faseFinale" is false or undefined, do not show
            if (!data.faseFinale) {
                // If it exists (e.g. from previous state), remove it? 
                // Currently this runs on page load, so just don't create it.
                return;
            }
        } else {
            return; // No settings, safe default: don't show
        }
    } catch (error) {
        console.error("Errore recupero impostazioni fase finale:", error);
        return;
    }

    // Creazione dinamica della sezione
    const mainElement = document.querySelector("main");
    if (!mainElement) return;

    // Controllo se esiste già per evitare duplicati
    if (document.getElementById("section-fase-finale")) return;

    const section = document.createElement("section");
    section.id = "section-fase-finale";

    const title = document.createElement("p");
    title.className = "section-title";
    title.textContent = "Fase Finale";

    const img = document.createElement("img");
    img.id = "tabellone";
    img.alt = "";

    section.appendChild(title);
    section.appendChild(img);

    // Inserisci come primo elemento del main
    mainElement.prepend(section);

    const tabelloneImg = document.getElementById("tabellone");
    const divisionSelect = document.getElementById("division");

    const supExists = await fileExists("assets/images/Tabellone_Sup.png");
    const giovExists = await fileExists("assets/images/Tabellone_Giov.png");

    function updateImage() {
        if (supExists && giovExists) {
            if (divisionSelect.value === "Superiori") {
                tabelloneImg.src = "assets/images/Tabellone_Sup.png";
            } else if (divisionSelect.value === "Giovani") {
                tabelloneImg.src = "assets/images/Tabellone_Giov.png";
            }
        } else {
            tabelloneImg.src = "assets/images/Tabellone.png";
        }
    }

    // Initial update
    updateImage();

    // Listen for changes
    divisionSelect.addEventListener("change", updateImage);
}

async function fileExists(url) {
    try {
        const response = await fetch(url, { method: "HEAD" });
        return response.ok;
    } catch (error) {
        console.error(`Errore durante la verifica del file ${url}:`, error);
        return false;
    }
}
