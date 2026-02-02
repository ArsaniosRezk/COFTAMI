import { getDataCached } from "../firebase.js";

/*
===================================
ALBO D'ORO
===================================
*/

export async function getAlboOro() {
    try {
        let container = document.getElementById("albo-d'oro");
        if (container) {
            container.innerHTML = `
            <div class="albo-table-container">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-albo-table"></div>
            </div>
            <div class="albo-table-container">
                <div class="skeleton skeleton-title"></div>
                <div class="skeleton skeleton-albo-table"></div>
            </div>`;
        }

        // Recupero tutti gli anni disponibili sotto il nodo Calcio/AlboOro (cache 24h = 1440 min)
        let alboOroData = await getDataCached("Calcio/AlboOro", 1440);

        if (!container) {
            console.error("Elemento #albo-d'oro non trovato.");
            return;
        }

        container.innerHTML = ""; // Pulisce il contenuto prima di stampare i dati

        let anniDisponibili = new Set();

        // Scansioniamo tutte le categorie per trovare tutti gli anni
        for (let categoria in alboOroData) {
            for (let anno in alboOroData[categoria]) {
                anniDisponibili.add(anno);
            }
        }

        // Ordiniamo gli anni dal più recente al più vecchio
        let anniOrdinati = Array.from(anniDisponibili).sort((b, a) =>
            b.localeCompare(a)
        );

        // Per ogni anno disponibile, creiamo una tabella con le classi corrette
        anniOrdinati.forEach((anno) => {
            let superiori = alboOroData.Superiori?.[anno] || {};
            let giovani = alboOroData.Giovani?.[anno] || {};

            // Sostituiamo "_" con "." nei nomi delle squadre
            let superioriPrimo = superiori.PrimoClassificato
                ? `🥇 ${superiori.PrimoClassificato.replace(/_/g, ".")}`
                : "-";

            let superioriSecondo = superiori.SecondoClassificato
                ? `🥈 ${superiori.SecondoClassificato.replace(/_/g, ".")}`
                : "-";

            let giovaniPrimo = giovani.PrimoClassificato
                ? `🥇 ${giovani.PrimoClassificato.replace(/_/g, ".")}`
                : "-";

            let giovaniSecondo = giovani.SecondoClassificato
                ? `🥈 ${giovani.SecondoClassificato.replace(/_/g, ".")}`
                : "-";

            // Creiamo il blocco HTML con la tabella, utilizzando le classi già definite nel sito
            let block = document.createElement("div");
            block.classList.add("albo-table-container"); // Classe per il contenitore della tabella

            block.innerHTML = `
            <h3 class="albo-table-title">${anno}</h3>
            <table class="albo-table">
                <thead>
                    <tr>
                        <th class="albo-table-header">Superiori</th>
                        <th class="albo-table-header">Giovani</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td class="albo-table-cell">${superioriPrimo}</td>
                        <td class="albo-table-cell">${giovaniPrimo}</td>
                    </tr>
                    <tr>
                        <td class="albo-table-cell">${superioriSecondo}</td>
                        <td class="albo-table-cell">${giovaniSecondo}</td>
                    </tr>
                </tbody>
            </table>
            <br>
        `;

            container.appendChild(block);
        });
    } catch (error) {
        console.error("Errore nel recupero dell'Albo d'Oro:", error);
        let container = document.getElementById("albo-d'oro");
        if (container) {
            container.innerHTML =
                "<p class='error-message'>⚠️ Nessun dato disponibile.</p>";
        }
    }
}
