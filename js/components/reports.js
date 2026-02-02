import {
    getData,
    setData,
    updateData,
    getPaths,
} from "../firebase.js";
import { edition } from "../divisionAndVariables.js";
import { formatDateTime } from "../utils/formatters.js";
import { isMobileDevice } from "../utils/device.js";

/*
===================================
REPORT
===================================
*/

export async function showReportOptions() {
    loadMatchReports();
}

// Funzione per ottenere i referti e popolare la tabella per il GESTIONALE
async function loadMatchReports() {
    const reportsDiv = document.getElementById("report-content");
    reportsDiv.innerHTML = "";

    const scrollContainer = document.createElement("div");
    scrollContainer.id = "scroll-container";
    reportsDiv.appendChild(scrollContainer);

    const table = document.createElement("table");

    const headers = [
        "Data Ricezione",
        "Nome Arbitro",
        "Partita",
        "Marcatori",
        "MVP",
        "Commenti/Espulsioni",
        "Conferma",
    ];
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headers.forEach((headerText) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    const reportsPath = `Calcio/${edition}/`;
    const allReports = [];

    const divisions = ["Superiori", "Giovani"];
    for (let division of divisions) {
        const divisionRefPath = `${reportsPath}${division}/Referti`;
        const giornateSnapshot = await getData(divisionRefPath);
        if (!giornateSnapshot) continue;

        for (let giornata in giornateSnapshot) {
            const matchesSnapshot = giornateSnapshot[giornata] || {};
            for (let match in matchesSnapshot) {
                const report = matchesSnapshot[match];
                allReports.push({ report, division, giornata, match });
            }
        }
    }

    allReports.sort(
        (a, b) =>
            new Date(b.report?.OraInvio || 0) - new Date(a.report?.OraInvio || 0)
    );

    for (let { report, division, giornata } of allReports) {
        const row = document.createElement("tr");

        const dataRicezione = document.createElement("td");
        dataRicezione.textContent = formatDateTime(
            report?.OraInvio || new Date(0).toISOString()
        );
        row.appendChild(dataRicezione);

        const nomeArbitro = document.createElement("td");
        nomeArbitro.textContent = report?.NomeArbitro || "";
        row.appendChild(nomeArbitro);

        const partita = document.createElement("td");
        const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
        const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
        const golCasa = report?.GolSquadraCasa ?? "";
        const golOspite = report?.GolSquadraOspite ?? "";
        partita.innerHTML = `
          <div>${squadraCasa}: ${golCasa}</div>
          <div>${squadraOspite}: ${golOspite}</div>
          <br>
          <div>D: ${report?.Divisione || division} - G: ${giornata}</div>
      `;
        row.appendChild(partita);

        // Marcatori (con fallback sicuri)
        const marcatori = document.createElement("td");
        const marcatoriCasaObj = report?.Marcatori?.MarcatoriCasa || {};
        const marcatoriOspiteObj = report?.Marcatori?.MarcatoriOspite || {};

        const generateMarcatoriHTML = (squadra, obj) => {
            let html = `<strong>${squadra}</strong><br>`;
            for (let [nome, gol] of Object.entries(obj)) {
                if (String(nome).startsWith("Autogol")) continue;
                html += `${nome}: ${gol}<br>`;
            }
            return html;
        };

        const generateAutogolHTML = (obj) => {
            let autogolTotale = 0;
            for (let [nome, gol] of Object.entries(obj)) {
                if (String(nome).startsWith("Autogol")) autogolTotale += gol;
            }
            return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
        };

        let marcatoriCasaHTML = generateMarcatoriHTML(
            squadraCasa,
            marcatoriCasaObj
        );
        let marcatoriOspiteHTML = generateMarcatoriHTML(
            squadraOspite,
            marcatoriOspiteObj
        );
        marcatoriCasaHTML += generateAutogolHTML(marcatoriCasaObj);
        marcatoriOspiteHTML += generateAutogolHTML(marcatoriOspiteObj);

        marcatori.innerHTML = `${marcatoriCasaHTML}<br>${marcatoriOspiteHTML}`;
        row.appendChild(marcatori);

        const mvp = document.createElement("td");
        mvp.textContent = report?.MVP || "";
        row.appendChild(mvp);

        const commenti = document.createElement("td");
        commenti.textContent = report?.Commenti || "";
        row.appendChild(commenti);

        // Conferma
        const conferma = document.createElement("td");
        const confermaButton = document.createElement("button");
        confermaButton.classList.add("confirm-button");

        const matchKey = `${report?.SquadraCasa || ""}:${report?.SquadraOspite || ""
            }`;
        const matchPath = `Calcio/${edition}/${division}/Partite/${giornata}/${matchKey}`;
        const existingMatchData = await getData(matchPath);

        if (existingMatchData) {
            confermaButton.classList.add("confirmed");
        } else {
            confermaButton.classList.add("not-confirmed");
        }

        confermaButton.innerHTML = "✔";
        confermaButton.onclick = () => confermaReport(giornata, report);
        conferma.appendChild(confermaButton);
        row.appendChild(conferma);

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    scrollContainer.appendChild(table);
}

//PER I PADRI E I SOCIAL
export async function loadMatchReports2() {
    const reportsDiv = document.getElementById("reports");
    reportsDiv.innerHTML = "";

    // Crea il contenitore per la tabella
    const tableContainer = document.createElement("div");
    tableContainer.className = "table-container";
    reportsDiv.appendChild(tableContainer);

    // Crea la tabella
    const table = document.createElement("table");

    // Intestazioni delle colonne (rimuovi "Conferma")
    const headers = [
        "Data Ricezione",
        "Nome Arbitro",
        "Partita",
        "Marcatori",
        "MVP",
        "Commenti/Espulsioni",
    ];
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    headers.forEach((headerText) => {
        const th = document.createElement("th");
        th.textContent = headerText;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    tbody.className = "scrollable-tbody";

    const reportsPath = `Calcio/${edition}/`;
    const allReports = [];

    const divisions = ["Superiori", "Giovani"];
    for (let division of divisions) {
        const divisionRefPath = `${reportsPath}${division}/Referti`;
        const giornateSnapshot = await getData(divisionRefPath);
        if (!giornateSnapshot) continue;

        for (let giornata in giornateSnapshot) {
            const matchesSnapshot = giornateSnapshot[giornata] || {};
            for (let match in matchesSnapshot) {
                const report = matchesSnapshot[match];
                allReports.push({ report, division, giornata, match });
            }
        }
    }

    // Ordina per data invio (robusto ai valori mancanti)
    allReports.sort(
        (a, b) =>
            new Date(b.report?.OraInvio || 0) - new Date(a.report?.OraInvio || 0)
    );

    // Popola la tabella
    for (let { report, division, giornata } of allReports) {
        const row = document.createElement("tr");

        // Data Ricezione
        const dataRicezione = document.createElement("td");
        dataRicezione.textContent = formatDateTime(
            report?.OraInvio || new Date(0).toISOString()
        );
        row.appendChild(dataRicezione);

        // Nome Arbitro
        const nomeArbitro = document.createElement("td");
        nomeArbitro.textContent = report?.NomeArbitro || "";
        row.appendChild(nomeArbitro);

        // Partita
        const partita = document.createElement("td");
        const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
        const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
        const golCasa = report?.GolSquadraCasa ?? "";
        const golOspite = report?.GolSquadraOspite ?? "";
        partita.innerHTML = `
          <div>${squadraCasa}: ${golCasa}</div>
          <div>${squadraOspite}: ${golOspite}</div>
          <br>
          <div>D: ${report?.Divisione || division} - G: ${giornata}</div>
      `;
        row.appendChild(partita);

        // Marcatori (safe)
        const marcatori = document.createElement("td");
        const marcatoriCasa = report?.Marcatori?.MarcatoriCasa || {};
        const marcatoriOspite = report?.Marcatori?.MarcatoriOspite || {};

        const generateMarcatoriHTML = (squadra, obj) => {
            let html = `<strong>${squadra}</strong><br>`;
            for (let [nome, gol] of Object.entries(obj)) {
                if (String(nome).startsWith("Autogol")) continue;
                html += `${nome}: ${gol}<br>`;
            }
            return html;
        };

        const generateAutogolHTML = (obj) => {
            let autogolTotale = 0;
            for (let [nome, gol] of Object.entries(obj)) {
                if (String(nome).startsWith("Autogol")) autogolTotale += gol;
            }
            return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
        };

        let marcatoriCasaHTML = generateMarcatoriHTML(squadraCasa, marcatoriCasa);
        let marcatoriOspiteHTML = generateMarcatoriHTML(
            squadraOspite,
            marcatoriOspite
        );

        marcatoriCasaHTML += generateAutogolHTML(marcatoriCasa);
        marcatoriOspiteHTML += generateAutogolHTML(marcatoriOspite);

        marcatori.innerHTML = `${marcatoriCasaHTML}<br>${marcatoriOspiteHTML}`;
        row.appendChild(marcatori);

        // MVP
        const mvp = document.createElement("td");
        mvp.textContent = report?.MVP || "";
        row.appendChild(mvp);

        // Commenti/Espulsioni
        const commenti = document.createElement("td");
        commenti.textContent = report?.Commenti || "";
        row.appendChild(commenti);

        // Click su riga -> overlay (safe)
        row.addEventListener("click", () => {
            if (isMobileDevice()) {
                const currentPage = window.location.pathname;
                if (currentPage === "/referti.html") {
                    openOverlay(report, division, giornata);
                } else if (currentPage === "/referti-social.html") {
                    openOverlay2(report, division, giornata);
                }
            }
        });

        tbody.appendChild(row);
    }

    table.appendChild(tbody);
    tableContainer.appendChild(table);
}

//PADRI
function openOverlay(report, division, giornata) {
    const generateMarcatoriHTML = (squadra, obj = {}) => {
        let html = `<strong>${squadra}</strong><br>`;
        for (let [nome, gol] of Object.entries(obj)) {
            if (String(nome).startsWith("Autogol")) continue;
            html += `${nome}: ${gol}<br>`;
        }
        return html;
    };

    const generateAutogolHTML = (obj = {}) => {
        let autogolTotale = 0;
        for (let [nome, gol] of Object.entries(obj)) {
            if (String(nome).startsWith("Autogol")) autogolTotale += gol;
        }
        return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
    };

    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    const overlayContent = document.createElement("div");
    overlayContent.classList.add("overlay-content");

    const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
    const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
    const golCasa = report?.GolSquadraCasa ?? "";
    const golOspite = report?.GolSquadraOspite ?? "";

    const marcatoriCasaObj = report?.Marcatori?.MarcatoriCasa || {};
    const marcatoriOspiteObj = report?.Marcatori?.MarcatoriOspite || {};

    overlayContent.innerHTML = `
    <i class="fa-solid fa-xmark close-overlay"></i>
    <h2>Referto</h2>
    <p><strong>Arbitro:</strong> ${report?.NomeArbitro || ""}</p>
    <p><strong>Divisione:</strong> ${division} <strong>Giornata:</strong> ${giornata}</p>
    <h3><strong>Partita</strong></h3>
    <p>${squadraCasa}: ${golCasa}</p>
    <p>${squadraOspite}: ${golOspite}</p>

    <h3><strong>Marcatori e MVP</strong></h3>
    <p>${generateMarcatoriHTML(squadraCasa, marcatoriCasaObj)}</p>
    <p>${generateMarcatoriHTML(squadraOspite, marcatoriOspiteObj)}
       ${generateAutogolHTML(marcatoriCasaObj)}${generateAutogolHTML(
        marcatoriOspiteObj
    )}</p>
    <p><strong>MVP:</strong> ${report?.MVP || ""}</p>
    <h3><strong>Commenti/Espulsioni:</strong></h3>
    <p>${report?.Commenti || ""}</p>
  `;

    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);

    const closeButton = overlayContent.querySelector(".close-overlay");
    closeButton.addEventListener("click", () => {
        document.body.removeChild(overlay);
    });
}

//SOCIAL
function openOverlay2(report, division, giornata) {
    const generateMarcatoriHTML = (squadra, obj = {}) => {
        let html = `<strong>${squadra}</strong><br>`;
        for (let [nome, gol] of Object.entries(obj)) {
            if (String(nome).startsWith("Autogol")) continue;
            html += `${nome}: ${gol}<br>`;
        }
        return html;
    };

    const generateAutogolHTML = (obj = {}) => {
        let autogolTotale = 0;
        for (let [nome, gol] of Object.entries(obj)) {
            if (String(nome).startsWith("Autogol")) autogolTotale += gol;
        }
        return autogolTotale > 0 ? `Autogol: ${autogolTotale}<br>` : "";
    };

    const overlay = document.createElement("div");
    overlay.classList.add("overlay");

    const overlayContent = document.createElement("div");
    overlayContent.classList.add("overlay-content");

    const squadraCasa = (report?.SquadraCasa || "").replace(/_/g, ".");
    const squadraOspite = (report?.SquadraOspite || "").replace(/_/g, ".");
    const golCasa = report?.GolSquadraCasa ?? "";
    const golOspite = report?.GolSquadraOspite ?? "";

    const marcatoriCasaObj = report?.Marcatori?.MarcatoriCasa || {};
    const marcatoriOspiteObj = report?.Marcatori?.MarcatoriOspite || {};

    overlayContent.innerHTML = `
    <i class="fa-solid fa-xmark close-overlay"></i>
    <h3>Referto Partita</h3>
    <p><strong>Divisione:</strong> ${division} <strong>Giornata:</strong> ${giornata}</p>  
    <p><strong>${squadraCasa}: ${golCasa}</strong></p>
    <p><strong>${squadraOspite}: ${golOspite}</strong></p>
    <h3><strong>Marcatori</strong></h3>
    <p>${generateMarcatoriHTML(squadraCasa, marcatoriCasaObj)}</p>
    <p>${generateMarcatoriHTML(squadraOspite, marcatoriOspiteObj)}
       ${generateAutogolHTML(marcatoriCasaObj)}${generateAutogolHTML(
        marcatoriOspiteObj
    )}</p>
  `;

    overlay.appendChild(overlayContent);
    document.body.appendChild(overlay);

    const closeButton = overlayContent.querySelector(".close-overlay");
    closeButton.addEventListener("click", () => {
        document.body.removeChild(overlay);
    });
}

// Funzione per gestire la conferma del referto
async function confermaReport(giornata, report) {
    const matchKey = `${report.SquadraCasa}:${report.SquadraOspite}`;

    const division = report.Divisione;
    // Prepara i dati da inviare per la partita
    const matchData = {
        GolSquadraCasa: report.GolSquadraCasa,
        GolSquadraOspite: report.GolSquadraOspite,
        SquadraCasa: report.SquadraCasa,
        SquadraOspite: report.SquadraOspite,
        Marcatori: report.Marcatori,
    };

    // Prepara il risultato nel formato "GolCasa:GolOspite"
    const risultato = `${report.GolSquadraCasa}:${report.GolSquadraOspite}`;

    // Ottieni il percorso della chiave specifica nel database per la partita
    const matchPath = `Calcio/${edition}/${division}/Partite/${giornata}/${matchKey}`;

    // Ottieni il percorso della chiave specifica nel database per il calendario
    const calendarioPath = `Calcio/${edition}/${division}/Calendario/${giornata}/${matchKey}`;

    try {
        // Aggiorna i dati nel database per la partita
        await setData(matchPath, matchData);

        // Aggiorna il risultato nel calendario
        await updateData(calendarioPath, { Risultato: risultato });

        alert(
            `Dati della partita per ${division}, giornata ${giornata}, partita ${matchKey} aggiornati con successo.`
        );
    } catch (error) {
        console.error("Errore nell'aggiornamento dei dati:", error);
        alert(
            "Si è verificato un errore nell'aggiornamento dei dati della partita."
        );
    }
}
