import { getData, getPaths } from "../firebase.js";
import { abbreviateName, separateScorers } from "../utils/formatters.js";
import { nomeSquadra } from "../utils/torneo.js";
import { condividi, gestisciPannello } from "../utils/interfaccia.js";

/*
===================================
DETTAGLIO PARTITA
===================================
Pannello con risultato e marcatori di una partita giocata.
Si chiude con la X, con Esc o con il tasto "indietro" del telefono.

opzioni = { partite, calendario, divisione }: con i dati già in pagina
(aggiornamenti in tempo reale) non serve una nuova lettura.
*/

export async function showOverlayMatchResult(
    matchString,
    teamsSnapshot,
    matchday,
    { partite = null, calendario = null, divisione = null } = {}
) {
    let matchData = partite?.[matchday]?.[matchString] ?? null;
    if (!matchData) {
        const { matchesPath } = getPaths(divisione);
        matchData = await getData(`${matchesPath}/${matchday}/${matchString}`);
    }

    const [homeTeam, awayTeam] = matchString.split(":");

    // Risultato inserito nel calendario ma partita senza dettaglio: si mostra
    // comunque il punteggio, senza marcatori
    if (!matchData) {
        const [golCasa, golOspite] = String(calendario?.[matchday]?.[matchString]?.Risultato || "")
            .split(":")
            .map((valore) => valore.trim());
        matchData = {
            SquadraCasa: homeTeam,
            SquadraOspite: awayTeam,
            GolSquadraCasa: golCasa ?? "-",
            GolSquadraOspite: golOspite ?? "-",
        };
    }

    const casa = matchData.SquadraCasa || homeTeam;
    const ospite = matchData.SquadraOspite || awayTeam;

    // Crea l'overlay
    const overlay = document.createElement("div");
    overlay.classList.add("overlay");
    overlay.setAttribute("aria-label", `${nomeSquadra(casa)} - ${nomeSquadra(ospite)}`);

    const azioni = document.createElement("div");
    azioni.className = "overlay-azioni";

    const shareButton = document.createElement("button");
    shareButton.type = "button";
    shareButton.className = "overlay-pulsante";
    shareButton.setAttribute("aria-label", "Condividi il risultato");
    shareButton.innerHTML = `<i class="icona icona-share" aria-hidden="true"></i>`;

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.className = "overlay-pulsante";
    closeButton.setAttribute("aria-label", "Chiudi");
    closeButton.innerHTML = `<i class="icona icona-xmark" aria-hidden="true"></i>`;

    azioni.append(shareButton, closeButton);
    overlay.appendChild(azioni);

    // Crea il contenuto dell'overlay
    const content = document.createElement("div");
    content.classList.add("overlay-content");

    // Squadre
    const matchInfoDiv = document.createElement("div");
    matchInfoDiv.classList.add("match-info-div");
    matchInfoDiv.append(
        bloccoSquadra(casa, teamsSnapshot),
        bloccoSquadra(ospite, teamsSnapshot)
    );

    // Gol
    const golDiv = document.createElement("div");
    golDiv.className = "gols-div";
    golDiv.append(numeroGol(matchData.GolSquadraCasa), numeroGol(matchData.GolSquadraOspite));

    // Marcatori
    const scorersDiv = document.createElement("div");
    scorersDiv.classList.add("scorers-div");
    scorersDiv.append(
        listaMarcatori(matchData?.Marcatori?.MarcatoriCasa, "home-scorers", false),
        listaMarcatori(matchData?.Marcatori?.MarcatoriOspite, "away-scorers", true)
    );

    content.append(matchInfoDiv, golDiv, scorersDiv);
    overlay.appendChild(content);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    // Inizialmente posiziona l'overlay fuori dalla vista, poi lo fa salire
    overlay.style.bottom = "-100%";
    overlay.style.opacity = "0";
    requestAnimationFrame(() =>
        requestAnimationFrame(() => {
            overlay.style.bottom = "0%";
            overlay.style.opacity = "1";
        })
    );

    const chiudi = gestisciPannello(overlay, () => {
        document.body.style.overflow = "";
        overlay.style.bottom = "-100%";
        overlay.style.opacity = "0";
        // Rimuove l'overlay dopo la transizione (o subito se non c'è animazione)
        const rimuovi = () => overlay.remove();
        overlay.addEventListener("transitionend", rimuovi, { once: true });
        setTimeout(rimuovi, 600);
    });

    closeButton.addEventListener("click", () => chiudi());
    closeButton.focus();

    shareButton.addEventListener("click", () => {
        const testo =
            `${nomeSquadra(casa)} ${matchData.GolSquadraCasa}-${matchData.GolSquadraOspite} ` +
            `${nomeSquadra(ospite)} · ${isNaN(matchday) ? matchday : `Giornata ${matchday}`} · COFTA`;
        condividi({ titolo: "Risultato COFTA", testo, url: `${location.origin}/calendario.html` });
    });
}

function bloccoSquadra(chiave, squadre) {
    const teamDiv = document.createElement("div");
    teamDiv.className = "team-div";

    const logoDiv = document.createElement("div");
    logoDiv.className = "logo-div";
    const url = squadre?.[chiave]?.LogoLR || squadre?.[chiave]?.Logo;
    if (url) {
        const logo = document.createElement("img");
        logo.className = "logo-img";
        logo.src = url;
        logo.alt = "";
        logo.width = 110;
        logo.height = 110;
        logoDiv.appendChild(logo);
    }

    const nome = document.createElement("span");
    nome.className = "team-name";
    nome.textContent = nomeSquadra(chiave);

    teamDiv.append(logoDiv, nome);
    return teamDiv;
}

function numeroGol(gol) {
    const contenitore = document.createElement("div");
    contenitore.className = "gol-div";
    const numero = document.createElement("span");
    numero.className = "gol-number";
    numero.textContent = gol ?? "-";
    contenitore.appendChild(numero);
    return contenitore;
}

// Palloni dopo il nome (casa) o prima (ospite); oltre 3 gol si scrive il numero
function palloni(conteggio, numeroPrima) {
    const frammento = document.createDocumentFragment();
    const pallone = () => {
        const icona = document.createElement("i");
        icona.className = "icona icona-futbol pallone";
        icona.setAttribute("aria-hidden", "true");
        return icona;
    };

    if (conteggio > 3) {
        const numero = document.createElement("span");
        numero.className = "goals-count";
        numero.textContent = numeroPrima ? `${conteggio} ` : ` ${conteggio}`;
        if (numeroPrima) frammento.append(numero, pallone());
        else frammento.append(pallone(), numero);
    } else {
        for (let i = 0; i < conteggio; i++) frammento.appendChild(pallone());
    }
    return frammento;
}

function listaMarcatori(marcatori, classe, ospite) {
    const contenitore = document.createElement("div");
    contenitore.classList.add(classe);
    const lista = document.createElement("ul");

    const { normalScorers, ownGoals } = separateScorers(
        marcatori && typeof marcatori === "object" ? marcatori : {}
    );

    // Gli autogol vanno in fondo alla lista
    for (const { name, count, autogol } of [
        ...normalScorers,
        ...ownGoals.map((voce) => ({ ...voce, autogol: true })),
    ]) {
        const conteggio = Number(count) || 0;
        const voce = document.createElement("li");
        voce.setAttribute("aria-label", `${name}: ${conteggio} gol`);

        const nome = document.createElement("span");
        nome.textContent = autogol ? name : abbreviateName(name);

        if (ospite) {
            voce.append(palloni(conteggio, true), " ", nome);
        } else {
            voce.append(nome, " ", palloni(conteggio, autogol));
        }
        lista.appendChild(voce);
    }

    contenitore.appendChild(lista);
    return contenitore;
}
