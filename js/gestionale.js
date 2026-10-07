import { accessoAmministratore, esci } from "./accesso.js";
import { impostazioniPronte } from "./impostazioni.js";
import { edition, edizioneForzata, edizioneTest } from "./divisione.js";
import { contaDaFare } from "./components/da-fare.js";

/*
===================================
GESTIONALE
===================================

Una pagina con una sezione alla volta (#dashboard, #iscrizioni, ...).
Ogni sezione ha un frammento HTML (management/<sezione>.html), un modulo con
initSezione() (management/<sezione>.js) e un foglio di stile.
Prima di tutto serve l'accesso con un account Google abilitato (accesso.js).
*/

const SEZIONI = {
  dashboard: {
    titolo: "Dashboard",
    descrizione: "Cosa c'è da fare e impostazioni del sito pubblico",
    stile: "/css/dashboard.css",
  },
  partite: {
    titolo: "Risultati",
    descrizione: "Inserisci o correggi risultati e marcatori delle partite",
    stile: "/css/partiteM.css",
  },
  report: {
    titolo: "Referti",
    descrizione: "Referti inviati dagli arbitri: controllali e conferma il risultato",
    stile: "/css/reportM.css",
  },
  tabellone: {
    titolo: "Fase finale",
    descrizione: "Tabellone della fase finale: squadre, risultati, date e campi",
    stile: "/css/tabelloneM.css",
  },
  iscrizioni: {
    titolo: "Iscrizioni",
    descrizione: "Iscrizioni arrivate dal modulo pubblico: controllale e trasformale in squadre",
    stile: "/css/iscrizioniM.css",
  },
  squadre: {
    titolo: "Squadre",
    descrizione: "Gironi, loghi, rose e penalità delle squadre",
    stile: "/css/squadreM.css",
  },
  calendario: {
    titolo: "Calendario",
    descrizione: "Prepara il calendario in bozza e pubblicalo quando è pronto",
    stile: "/css/calendarioM.css",
  },
  social: {
    titolo: "Social",
    descrizione: "Immagini della giornata pronte da pubblicare su Instagram",
    stile: "/css/socialM.css",
  },
};

// Oltre questo tempo la sezione compare comunque, con i suoi messaggi di caricamento
const ATTESA_MASSIMA_SEZIONE = 6000;
// Lo spinner compare solo se il caricamento si fa notare
const RITARDO_SPINNER = 300;

const contentDiv = document.getElementById("content");
const main = document.querySelector("main");
const divisionSelect = document.getElementById("division");

// Carica il foglio di stile della sezione e toglie quello precedente solo
// quando il nuovo è pronto: il contenuto non compare mai senza stile.
// Uno solo alla volta, perché alcuni fogli hanno regole generiche (table, td...)
function caricaStileSezione(sezione) {
  const href = SEZIONI[sezione].stile;
  const attuale = document.getElementById("stile-sezione");
  if (attuale?.getAttribute("href") === href) return Promise.resolve();

  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.onload = link.onerror = () => {
      attuale?.remove();
      link.id = "stile-sezione";
      resolve();
    };
    document.head.appendChild(link);
  });
}

// Ogni caricamento ha un numero: se nel frattempo ne è partito un altro
// (clic veloci sul menu), il risultato vecchio viene scartato
let ultimoCaricamento = 0;
let timerSpinner;
let sezioneCorrente = null;

// La sezione resta invisibile finché i suoi dati non sono disegnati:
// niente scheletri o tabelle che si riempiono a pezzi sotto gli occhi
function nascondiContenuto() {
  contentDiv.classList.add("in-caricamento");
  clearTimeout(timerSpinner);
  timerSpinner = setTimeout(() => main.classList.add("in-attesa"), RITARDO_SPINNER);
}

function mostraContenuto() {
  clearTimeout(timerSpinner);
  main.classList.remove("in-attesa");
  contentDiv.classList.remove("in-caricamento");
}

async function caricaSezione(sezione) {
  const numero = ++ultimoCaricamento;
  nascondiContenuto();
  try {
    const [frammento, modulo] = await Promise.all([
      fetch(`/management/${sezione}.html`).then((risposta) => {
        if (!risposta.ok) throw new Error(`HTTP ${risposta.status}`);
        return risposta.text();
      }),
      import(`/management/${sezione}.js`),
      caricaStileSezione(sezione),
    ]);
    if (numero !== ultimoCaricamento) return;

    contentDiv.innerHTML = frammento;

    const avvia = modulo[`init${sezione.charAt(0).toUpperCase()}${sezione.slice(1)}`];
    if (typeof avvia === "function") {
      await Promise.race([
        Promise.resolve(avvia()).catch((errore) =>
          console.error(`Errore nell'inizializzazione di ${sezione}:`, errore)
        ),
        new Promise((resolve) => setTimeout(resolve, ATTESA_MASSIMA_SEZIONE)),
      ]);
    }
  } catch (errore) {
    if (numero !== ultimoCaricamento) return;
    console.error("Errore nel caricamento della sezione:", errore);
    contentDiv.innerHTML =
      '<p class="vuoto">Impossibile caricare la sezione. Controlla la connessione e riprova.</p>';
  }
  if (numero === ultimoCaricamento) mostraContenuto();
}

function sezioneDaHash() {
  const sezione = location.hash.slice(1);
  return SEZIONI[sezione] ? sezione : "dashboard";
}

function mostraSezione(sezione) {
  sezioneCorrente = sezione;
  const { titolo, descrizione } = SEZIONI[sezione];

  document.querySelectorAll(".nav-links a, .menu-mobile [data-sezione]").forEach((link) => {
    const attiva = link.id === `nav-${sezione}` || link.dataset.sezione === sezione;
    link.classList.toggle("active", attiva);
    if (attiva) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  });
  // Su smartphone: se la sezione non è nella barra in basso si accende "Menu"
  const secondaria = document.getElementById(`nav-${sezione}`)?.closest(".nav-secondaria");
  document.getElementById("apri-menu").classList.toggle("active", Boolean(secondaria));
  document.getElementById("current-section").textContent = titolo;
  document.getElementById("descrizione-sezione").textContent = descrizione;
  document.title = `${titolo} - Gestionale Cofta`;
  main.scrollTop = 0;

  caricaSezione(sezione);
}

function vaiASezione(sezione) {
  if (sezione !== sezioneCorrente) history.pushState(null, "", `#${sezione}`);
  mostraSezione(sezione);
}

// Numeri accanto a Referti e Iscrizioni: cose che aspettano qualcuno
// (nella barra laterale e nel menu dello smartphone)
async function aggiornaConteggi() {
  try {
    const conteggi = await contaDaFare();
    let nelMenu = 0;
    for (const [chiave, numero] of Object.entries({
      report: conteggi.refertiDaConfermare,
      iscrizioni: conteggi.iscrizioniNuove,
    })) {
      document.querySelectorAll(`[data-conteggio="${chiave}"]`).forEach((badge) => {
        badge.textContent = numero;
        badge.hidden = !numero;
        badge.setAttribute("aria-label", `${numero} da controllare`);
      });
      if (document.getElementById(`nav-${chiave}`)?.closest(".nav-secondaria")) nelMenu += numero;
    }
    // Un pallino su "Menu" se qualcosa aspetta in una sezione che non è nella barra
    document.getElementById("menu-punto").hidden = !nelMenu;
  } catch (errore) {
    console.error("Conteggi non aggiornati:", errore);
  }
}

// --- DIVISIONE ---
// Il select nascosto resta l'unica fonte del valore: i pulsanti lo comandano
function aggiornaSelettoriDivisione() {
  document.querySelectorAll(".division-switch button").forEach((pulsante) => {
    const scelta = pulsante.dataset.division === divisionSelect.value;
    pulsante.classList.toggle("selected", scelta);
    pulsante.setAttribute("aria-pressed", String(scelta));
  });
}

document.querySelectorAll(".division-switch").forEach((selettore) => {
  selettore.addEventListener("click", (evento) => {
    const pulsante = evento.target.closest("button[data-division]");
    if (!pulsante || pulsante.dataset.division === divisionSelect.value) return;
    divisionSelect.value = pulsante.dataset.division;
    divisionSelect.dispatchEvent(new Event("change"));
  });
});

// --- MENU SU SMARTPHONE ---
// Le voci sono le stesse della barra laterale, divise negli stessi gruppi
const menuMobile = document.getElementById("menu-mobile");

function preparaMenuMobile() {
  const contenitore = document.getElementById("menu-mobile-sezioni");
  let griglia = null;
  document.querySelectorAll(".nav-links > li").forEach((voce) => {
    if (voce.classList.contains("nav-gruppo")) {
      const titolo = document.createElement("h3");
      titolo.className = "menu-mobile-gruppo";
      titolo.textContent = voce.textContent;
      griglia = document.createElement("div");
      griglia.className = "menu-mobile-griglia";
      contenitore.append(titolo, griglia);
      return;
    }
    const link = voce.querySelector("a");
    if (!link || !griglia) return;

    const tessera = document.createElement("a");
    tessera.href = link.getAttribute("href");
    tessera.className = "menu-mobile-voce";
    tessera.dataset.sezione = link.id.replace("nav-", "");
    tessera.append(link.querySelector(".icona").cloneNode(), link.querySelector("span").cloneNode(true));
    const badge = link.querySelector(".nav-conteggio");
    if (badge) tessera.appendChild(badge.cloneNode(true));
    tessera.addEventListener("click", (evento) => {
      evento.preventDefault();
      menuMobile.close();
      vaiASezione(tessera.dataset.sezione);
    });
    griglia.appendChild(tessera);
  });
}

preparaMenuMobile();
document.getElementById("apri-menu").addEventListener("click", () => menuMobile.showModal());
document.getElementById("chiudi-menu").addEventListener("click", () => menuMobile.close());
// Tocco sullo sfondo scuro: chiude
menuMobile.addEventListener("click", (evento) => {
  if (evento.target === menuMobile) menuMobile.close();
});
// Tornando al computer (finestra allargata) il menu dello smartphone non serve
matchMedia("(min-width: 1025px)").addEventListener("change", (evento) => {
  if (evento.matches) menuMobile.close();
});

// --- TASTIERA SU SMARTPHONE ---
// Con la tastiera aperta la barra in basso ruberebbe spazio ai campi
const campoDiTesto = (el) =>
  el instanceof HTMLElement && el.matches("textarea, input:not([type=checkbox]):not([type=radio])");

document.addEventListener("focusin", (evento) => {
  if (campoDiTesto(evento.target)) document.body.classList.add("keyboard-open");
});
document.addEventListener("focusout", () => {
  // Passando da un campo all'altro il focus resta su un campo: niente sfarfallio
  setTimeout(() => {
    if (!campoDiTesto(document.activeElement)) document.body.classList.remove("keyboard-open");
  }, 100);
});

// --- AVVIO ---
const utente = await accessoAmministratore();
document.getElementById("account-email").textContent = utente.email;
document.getElementById("menu-mobile-email").textContent = utente.email;
document.getElementById("esci").addEventListener("click", esci);
document.getElementById("esci-mobile").addEventListener("click", esci);

// I percorsi Firebase dipendono dall'edizione corrente
await impostazioniPronte;
document.getElementById("edizione-attiva").textContent = edition;

// Con ?edizione=Test (o un anno) si lavora su un'altra edizione: deve essere evidente
if (edizioneForzata) {
  const badge = document.createElement("span");
  badge.className = "badge-test";
  badge.textContent = edizioneTest ? "Dati di prova" : `Edizione ${edizioneForzata}`;
  badge.title = edizioneTest
    ? "Stai modificando Calcio/Test, non i dati del torneo"
    : `Stai modificando l'edizione ${edizioneForzata}, non quella corrente`;
  document.querySelector(".app-titolo").appendChild(badge);
}

// La divisione salvata (la stessa del sito) la imposta divisione.js,
// che a ogni cambio la salva: qui si allineano i pulsanti e si ricarica la sezione
aggiornaSelettoriDivisione();
divisionSelect.addEventListener("change", () => {
  aggiornaSelettoriDivisione();
  caricaSezione(sezioneCorrente);
});

document.querySelectorAll(".nav-links a").forEach((link) => {
  link.addEventListener("click", (evento) => {
    evento.preventDefault();
    // Una voce di cronologia per sezione: il tasto "indietro" del telefono
    // torna alla sezione precedente invece di uscire dal gestionale
    vaiASezione(link.id.replace("nav-", ""));
  });
});

window.addEventListener("popstate", () => mostraSezione(sezioneDaHash()));

// Le sezioni comunicano con la cornice tramite eventi (vedi utils/gestionale-eventi.js)
window.addEventListener("gestionale:vai", (evento) => {
  if (SEZIONI[evento.detail]) vaiASezione(evento.detail);
});
window.addEventListener("gestionale:aggiorna-conteggi", aggiornaConteggi);

mostraSezione(sezioneDaHash());
aggiornaConteggi();

// Service worker (copie per l'uso offline)
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").catch((errore) => console.warn("Service worker:", errore));
}
