/*
===================================
INTERFACCIA
===================================

Piccoli elementi condivisi da sito pubblico e gestionale:
- mostraToast: messaggio breve in basso al posto di alert()
- conferma / avviso: finestre al posto di confirm() e alert(), che su
  smartphone bloccano la pagina e non si possono personalizzare
- condividi: menu di condivisione del telefono, oppure copia del link
- rendiCliccabile: un div cliccabile diventa usabile anche da tastiera
- gestisciPannello: un pannello a schermo intero si chiude con Esc, con un
  clic sullo sfondo o con il tasto "indietro" del telefono

Gli stili vengono aggiunti dal modulo stesso, così funziona su ogni pagina.
*/

const STILI = `
.ui-toast {
  position: fixed;
  left: 50%;
  bottom: calc(20px + env(safe-area-inset-bottom));
  z-index: 10000;
  max-width: 90vw;
  padding: 12px 20px;
  border-radius: 10px;
  background-color: #262f3e;
  color: #fff;
  font-family: "Montserrat", sans-serif;
  font-size: 0.9rem;
  font-weight: 600;
  text-align: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
  transform: translate(-50%, 20px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s, transform 0.25s;
}
.ui-toast.visibile { transform: translate(-50%, 0); opacity: 1; }
.ui-toast.errore { background-color: #b3261e; }
.ui-dialogo {
  width: min(440px, 92vw);
  padding: 0;
  border: none;
  border-radius: 14px;
  color: #262f3e;
  font-family: "Montserrat", sans-serif;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3);
}
.ui-dialogo::backdrop { background: rgba(0, 0, 0, 0.5); }
.ui-dialogo h3 { margin: 0; padding: 20px 22px 0; font-size: 1.1rem; }
.ui-dialogo p {
  margin: 0;
  padding: 12px 22px 0;
  font-size: 0.95rem;
  line-height: 1.5;
  white-space: pre-line;
}
.ui-dialogo footer {
  display: flex;
  justify-content: flex-end;
  flex-wrap: wrap;
  gap: 10px;
  padding: 20px 22px;
}
.ui-dialogo button {
  border: none;
  border-radius: 8px;
  padding: 10px 18px;
  font-family: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
.ui-dialogo .ui-secondario { background: #eceff1; color: #262f3e; }
.ui-dialogo .ui-principale { background: #2e684e; color: #fff; }
.ui-dialogo .ui-principale.pericoloso { background: #b3261e; }
`;

function aggiungiStili() {
    if (document.getElementById("ui-stili")) return;
    const stile = document.createElement("style");
    stile.id = "ui-stili";
    stile.textContent = STILI;
    document.head.appendChild(stile);
}

/*
-----------------------------------
TOAST
-----------------------------------
*/

let timerToast = null;

export function mostraToast(testo, { errore = false, durata = 3500 } = {}) {
    aggiungiStili();
    let toast = document.querySelector(".ui-toast");
    if (!toast) {
        toast = document.createElement("div");
        toast.className = "ui-toast";
        toast.setAttribute("role", "status");
        toast.setAttribute("aria-live", "polite");
        document.body.appendChild(toast);
    }
    toast.textContent = testo;
    toast.classList.toggle("errore", errore);
    // Il reflow fa ripartire l'animazione anche se il toast era già visibile
    void toast.offsetWidth;
    toast.classList.add("visibile");
    clearTimeout(timerToast);
    timerToast = setTimeout(() => toast.classList.remove("visibile"), durata);
}

/*
-----------------------------------
FINESTRE (conferma / avviso)
-----------------------------------
*/

function finestra({ titolo, testo, pulsanti }) {
    aggiungiStili();
    return new Promise((resolve) => {
        const dialogo = document.createElement("dialog");
        dialogo.className = "ui-dialogo";

        if (titolo) {
            const intestazione = document.createElement("h3");
            intestazione.textContent = titolo;
            dialogo.appendChild(intestazione);
        }

        const corpo = document.createElement("p");
        corpo.textContent = testo;
        dialogo.appendChild(corpo);

        const piede = document.createElement("footer");
        let risultato = false;

        for (const { testo: etichetta, valore, classe } of pulsanti) {
            const pulsante = document.createElement("button");
            pulsante.type = "button";
            pulsante.className = classe;
            pulsante.textContent = etichetta;
            pulsante.addEventListener("click", () => {
                risultato = valore;
                dialogo.close();
            });
            piede.appendChild(pulsante);
        }
        dialogo.appendChild(piede);

        // Esc o clic sullo sfondo: come "Annulla"
        dialogo.addEventListener("click", (evento) => {
            if (evento.target === dialogo) dialogo.close();
        });
        dialogo.addEventListener("close", () => {
            dialogo.remove();
            resolve(risultato);
        });

        document.body.appendChild(dialogo);
        dialogo.showModal();
        piede.lastElementChild?.focus();
    });
}

// Sostituisce confirm(): restituisce una Promise<boolean>
export function conferma(
    testo,
    { titolo = "Conferma", ok = "Conferma", annulla = "Annulla", pericolosa = false } = {}
) {
    return finestra({
        titolo,
        testo,
        pulsanti: [
            { testo: annulla, valore: false, classe: "ui-secondario" },
            { testo: ok, valore: true, classe: `ui-principale${pericolosa ? " pericoloso" : ""}` },
        ],
    });
}

// Sostituisce alert() per i messaggi lunghi da leggere con calma
export function avviso(testo, { titolo = "Attenzione" } = {}) {
    return finestra({
        titolo,
        testo,
        pulsanti: [{ testo: "OK", valore: true, classe: "ui-principale" }],
    });
}

/*
-----------------------------------
CONDIVISIONE
-----------------------------------
*/

export async function condividi({ titolo, testo, url = location.href }) {
    if (navigator.share) {
        try {
            await navigator.share({ title: titolo, text: testo, url });
            return;
        } catch (errore) {
            // Condivisione annullata dall'utente: niente da fare
            if (errore.name === "AbortError") return;
        }
    }

    try {
        await navigator.clipboard.writeText(testo ? `${testo}\n${url}` : url);
        mostraToast("Link copiato negli appunti");
    } catch (errore) {
        mostraToast("Impossibile condividere da questo browser", { errore: true });
    }
}

/*
-----------------------------------
ACCESSIBILITÀ
-----------------------------------
*/

// Un elemento non nativamente cliccabile diventa un "pulsante" per tastiera e screen reader
export function rendiCliccabile(elemento, azione, etichetta = null) {
    elemento.setAttribute("role", "button");
    elemento.tabIndex = 0;
    if (etichetta) elemento.setAttribute("aria-label", etichetta);
    elemento.addEventListener("click", azione);
    elemento.addEventListener("keydown", (evento) => {
        if (evento.key === "Enter" || evento.key === " ") {
            evento.preventDefault();
            azione(evento);
        }
    });
}

/*
 Pannello a schermo intero (dettaglio partita, foto...).
 Restituisce la funzione per chiuderlo. chiudi() esegue onChiuso una volta.
 Il tasto "indietro" chiude il pannello invece di lasciare la pagina.
*/
export function gestisciPannello(pannello, onChiuso, { sfondo = null } = {}) {
    const focusPrecedente = document.activeElement;
    let chiuso = false;

    const chiudi = ({ daCronologia = false } = {}) => {
        if (chiuso) return;
        chiuso = true;
        document.removeEventListener("keydown", suTasto);
        window.removeEventListener("popstate", suIndietro);
        if (!daCronologia && history.state?.pannello) history.back();
        onChiuso();
        if (focusPrecedente instanceof HTMLElement) focusPrecedente.focus();
    };

    const suTasto = (evento) => {
        if (evento.key === "Escape") chiudi();
    };
    const suIndietro = () => chiudi({ daCronologia: true });

    document.addEventListener("keydown", suTasto);
    history.pushState({ pannello: true }, "");
    window.addEventListener("popstate", suIndietro);

    if (sfondo) {
        sfondo.addEventListener("click", (evento) => {
            if (evento.target === sfondo) chiudi();
        });
    }

    pannello.setAttribute("role", "dialog");
    pannello.setAttribute("aria-modal", "true");
    return chiudi;
}
