import { getData, setData } from "./firebase.js";
import { edition } from "./divisionAndVariables.js";
import { capitalize } from "./utils/formatters.js";

/*
===================================
ISCRIZIONE SQUADRA (form pubblico)
===================================
Salva su: Calcio/{edizione}/Iscrizioni/{Divisione}-{NomeSquadra}
*/

// Numero di righe mostrate all'apertura del modulo
const RIGHE_INIZIALI = {
  responsabili: 2,
  allenatori: 2,
  giocatori: 10,
  arbitri: 1,
};

// Quante persone servono come minimo per ogni sezione (0 = facoltativa)
const MINIMI = {
  responsabili: 1,
  allenatori: 1,
  giocatori: 7,
  arbitri: 0,
};

// Nome e cognome: almeno due parole di 2+ lettere, niente numeri
const NOME_REGEX =
  /^[A-Za-zÀ-ÖØ-öø-ÿ'’\-]{2,}(?:\s+[A-Za-zÀ-ÖØ-öø-ÿ'’\-]{2,})+$/;

// Telefono: 8-15 cifre, prefisso internazionale opzionale
const TELEFONO_REGEX = /^\+?\d{8,15}$/;

const BOZZA_KEY = `cofta_iscrizione_bozza_${edition}`;

const SEZIONI = ["responsabili", "allenatori", "giocatori", "arbitri"];

const PLACEHOLDER = {
  responsabili: "Nome e Cognome",
  allenatori: "Nome e Cognome",
  giocatori: "Nome e Cognome",
  arbitri: "Nome e Cognome",
};

const ETICHETTA = {
  responsabili: { singolare: "responsabile", plurale: "responsabili" },
  allenatori: { singolare: "allenatore", plurale: "allenatori" },
  giocatori: { singolare: "giocatore", plurale: "giocatori" },
  arbitri: { singolare: "arbitro", plurale: "arbitri" },
};

/*
-----------------------------------
HELPER
-----------------------------------
*/

function normalizzaSpazi(valore) {
  return valore.replace(/\s+/g, " ").trim();
}

function nomeValido(nome) {
  return NOME_REGEX.test(normalizzaSpazi(nome));
}

function pulisciTelefono(telefono) {
  return telefono.replace(/[\s.\-/()]/g, "");
}

function telefonoValido(telefono) {
  return TELEFONO_REGEX.test(pulisciTelefono(telefono));
}

// Firebase non accetta . # $ / [ ] nelle chiavi
function chiaveSicura(valore) {
  return normalizzaSpazi(valore)
    .replace(/[.#$/[\]]/g, "_")
    .replace(/\s/g, "_");
}

/*
-----------------------------------
COSTRUZIONE RIGHE
-----------------------------------
*/

function creaRiga(sezione, rimovibile) {
  const riga = document.createElement("div");
  riga.className = "persona-row";

  const nomeInput = document.createElement("input");
  nomeInput.type = "text";
  nomeInput.className = "p-nome";
  nomeInput.placeholder = PLACEHOLDER[sezione];
  nomeInput.spellcheck = false;
  nomeInput.autocomplete = "off";

  const telInput = document.createElement("input");
  telInput.type = "tel";
  telInput.className = "p-tel";
  telInput.placeholder = "Telefono";
  telInput.inputMode = "tel";
  telInput.autocomplete = "off";

  const rimuovi = document.createElement("button");
  rimuovi.type = "button";
  rimuovi.className = rimovibile ? "row-remove" : "row-remove placeholder";
  rimuovi.innerHTML = '<i class="fa-solid fa-xmark"></i>';
  rimuovi.title = "Rimuovi";
  if (rimovibile) {
    rimuovi.addEventListener("click", () => {
      riga.remove();
      salvaBozza();
    });
  } else {
    rimuovi.disabled = true;
    rimuovi.setAttribute("aria-hidden", "true");
  }

  const errore = document.createElement("p");
  errore.className = "row-error";

  riga.appendChild(nomeInput);
  riga.appendChild(telInput);
  riga.appendChild(rimuovi);
  riga.appendChild(errore);

  return riga;
}

function aggiungiRiga(sezione, rimovibile = true, valori = null) {
  const lista = document.getElementById(`lista-${sezione}`);
  const riga = creaRiga(sezione, rimovibile);
  if (valori) {
    riga.querySelector(".p-nome").value = valori.Nome || "";
    riga.querySelector(".p-tel").value = valori.Telefono || "";
  }
  lista.appendChild(riga);
  return riga;
}

/*
-----------------------------------
VALIDAZIONE
-----------------------------------
*/

function segnalaErroreRiga(riga, messaggio) {
  riga.querySelector(".row-error").textContent = messaggio;
  riga.querySelector(".p-nome").classList.add("invalid");
}

function pulisciErrori() {
  document
    .querySelectorAll(".row-error, .group-error, .field-error")
    .forEach((el) => (el.textContent = ""));
  document
    .querySelectorAll(".invalid")
    .forEach((el) => el.classList.remove("invalid"));
  document.getElementById("form-error").textContent = "";
}

// Legge una sezione e restituisce le persone valide + il numero di errori
function raccogliSezione(sezione) {
  const lista = document.getElementById(`lista-${sezione}`);
  const righe = [...lista.querySelectorAll(".persona-row")];
  const persone = [];
  const nomiVisti = new Set();
  let errori = 0;

  righe.forEach((riga) => {
    const nomeInput = riga.querySelector(".p-nome");
    const telInput = riga.querySelector(".p-tel");
    const nome = normalizzaSpazi(nomeInput.value);
    const telefono = telInput.value.trim();

    // Riga completamente vuota: viene semplicemente ignorata
    if (!nome && !telefono) return;

    if (!nome) {
      segnalaErroreRiga(
        riga,
        "Inserisci il nome: è obbligatorio se indichi un numero."
      );
      errori++;
      return;
    }

    if (!nomeValido(nome)) {
      segnalaErroreRiga(
        riga,
        "Scrivi nome e cognome per esteso (niente soprannomi)."
      );
      errori++;
      return;
    }

    if (!telefono) {
      segnalaErroreRiga(
        riga,
        "Il numero di telefono è obbligatorio quando inserisci un nome."
      );
      telInput.classList.add("invalid");
      errori++;
      return;
    }

    if (!telefonoValido(telefono)) {
      segnalaErroreRiga(riga, "Numero di telefono non valido (8-15 cifre).");
      telInput.classList.add("invalid");
      errori++;
      return;
    }

    const nomeNormalizzato = capitalize(nome);
    if (nomiVisti.has(nomeNormalizzato.toLowerCase())) {
      segnalaErroreRiga(
        riga,
        `${nomeNormalizzato} è già stato inserito in questa sezione.`
      );
      errori++;
      return;
    }
    nomiVisti.add(nomeNormalizzato.toLowerCase());

    persone.push({
      Nome: nomeNormalizzato,
      Telefono: pulisciTelefono(telefono),
    });
  });

  const minimo = MINIMI[sezione];
  if (errori === 0 && persone.length < minimo) {
    const etichetta =
      minimo === 1
        ? ETICHETTA[sezione].singolare
        : ETICHETTA[sezione].plurale;
    document.getElementById(`err-${sezione}`).textContent =
      `Inserisci almeno ${minimo} ${etichetta} con il relativo numero di telefono.`;
    errori++;
  }

  return { persone, errori };
}

/*
-----------------------------------
BOZZA (salvataggio locale)
-----------------------------------
*/

function leggiSezioneGrezza(sezione) {
  const lista = document.getElementById(`lista-${sezione}`);
  return [...lista.querySelectorAll(".persona-row")].map((riga) => ({
    Nome: riga.querySelector(".p-nome").value,
    Telefono: riga.querySelector(".p-tel").value,
  }));
}

function salvaBozza() {
  try {
    const bozza = {
      Divisione: document.getElementById("isc-divisione").value,
      NomeSquadra: document.getElementById("isc-chiesa").value,
    };
    SEZIONI.forEach((sezione) => {
      bozza[sezione] = leggiSezioneGrezza(sezione);
    });
    localStorage.setItem(BOZZA_KEY, JSON.stringify(bozza));
    document.getElementById("draft-info").textContent =
      "I dati inseriti restano salvati su questo dispositivo finché non invii il modulo.";
  } catch (error) {
    console.warn("Impossibile salvare la bozza:", error);
  }
}

function cancellaBozza() {
  try {
    localStorage.removeItem(BOZZA_KEY);
  } catch (error) {
    console.warn("Impossibile cancellare la bozza:", error);
  }
  document.getElementById("draft-info").textContent = "";
}

function caricaBozza() {
  try {
    const salvata = localStorage.getItem(BOZZA_KEY);
    return salvata ? JSON.parse(salvata) : null;
  } catch (error) {
    console.warn("Bozza non leggibile:", error);
    return null;
  }
}

/*
-----------------------------------
INIZIALIZZAZIONE MODULO
-----------------------------------
*/

function costruisciModulo(bozza) {
  SEZIONI.forEach((sezione) => {
    document.getElementById(`lista-${sezione}`).innerHTML = "";

    const salvate = bozza?.[sezione]?.length ? bozza[sezione] : null;
    const totale = salvate
      ? Math.max(salvate.length, RIGHE_INIZIALI[sezione])
      : RIGHE_INIZIALI[sezione];

    // Le righe di responsabili e allenatori sono fisse: non si possono rimuovere
    const fissa = sezione === "responsabili" || sezione === "allenatori";

    for (let i = 0; i < totale; i++) {
      aggiungiRiga(sezione, !fissa, salvate?.[i] || null);
    }
  });

  if (bozza) {
    if (bozza.Divisione) {
      document.getElementById("isc-divisione").value = bozza.Divisione;
    }
    document.getElementById("isc-chiesa").value = bozza.NomeSquadra || "";
    document.getElementById("draft-info").textContent =
      "I dati inseriti restano salvati su questo dispositivo finché non invii il modulo.";
  }
}

/*
-----------------------------------
INVIO
-----------------------------------
*/

async function inviaIscrizione(event) {
  event.preventDefault();
  pulisciErrori();

  const submitBtn = document.getElementById("submit-btn");
  const divisioneEl = document.getElementById("isc-divisione");
  const chiesaEl = document.getElementById("isc-chiesa");

  let errori = 0;

  const divisione = divisioneEl.value;
  if (!divisione) {
    document.getElementById("err-divisione").textContent =
      "Seleziona la divisione.";
    divisioneEl.classList.add("invalid");
    errori++;
  }

  const nomeSquadra = normalizzaSpazi(chiesaEl.value);
  if (nomeSquadra.length < 3) {
    document.getElementById("err-chiesa").textContent =
      "Inserisci il nome della chiesa (almeno 3 caratteri).";
    chiesaEl.classList.add("invalid");
    errori++;
  }

  const raccolte = {};
  SEZIONI.forEach((sezione) => {
    raccolte[sezione] = raccogliSezione(sezione);
    errori += raccolte[sezione].errori;
  });

  if (errori > 0) {
    document.getElementById("form-error").textContent =
      "Controlla i campi evidenziati e riprova.";
    document
      .querySelector(".invalid, .group-error:not(:empty)")
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  const chiave = `${divisione}-${chiaveSicura(nomeSquadra)}`;
  const percorso = `Calcio/${edition}/Iscrizioni/${chiave}`;

  submitBtn.disabled = true;
  submitBtn.textContent = "Invio in corso...";

  try {
    // Ricontrollo: le iscrizioni potrebbero essere state chiuse mentre il modulo era aperto
    const impostazioni = await getData("Impostazioni");
    if (impostazioni && impostazioni.iscrizioniAperte === false) {
      document.getElementById("iscrizione-form").classList.add("hidden");
      document.getElementById("iscrizioni-chiuse").classList.remove("hidden");
      return;
    }

    const esistente = await getData(percorso);
    if (esistente) {
      const conferma = confirm(
        `Risulta già un'iscrizione per "${esistente.NomeSquadra}" (${divisione}).\n` +
          "Vuoi sostituirla con i dati che hai appena inserito?"
      );
      if (!conferma) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Invia iscrizione";
        return;
      }
    }

    const iscrizione = {
      Divisione: divisione,
      NomeSquadra: nomeSquadra,
      Responsabili: raccolte.responsabili.persone,
      Allenatori: raccolte.allenatori.persone,
      Giocatori: raccolte.giocatori.persone,
      Arbitri: raccolte.arbitri.persone,
      OraInvio: new Date().toISOString(),
      Stato: "Nuova",
    };

    await setData(percorso, iscrizione);

    cancellaBozza();

    const confermaEl = document.getElementById("conferma-testo");
    confermaEl.textContent =
      `Per completare l'iscrizione, riceverai istruzioni per versare la quota entro il ---------.`+
      "Per qualsiasi modifica scrivi a info@coftamilano.com.";

    document.getElementById("iscrizione-form").classList.add("hidden");
    document.getElementById("iscrizione-inviata").classList.remove("hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    console.error("Errore durante l'invio dell'iscrizione:", error);
    document.getElementById("form-error").textContent =
      "Errore durante l'invio. Controlla la connessione e riprova.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Invia iscrizione";
  }
}

/*
-----------------------------------
AVVIO
-----------------------------------
*/

document.addEventListener("DOMContentLoaded", async () => {
  const form = document.getElementById("iscrizione-form");

  // Il modulo viene costruito subito: se la rete è lenta l'utente vede comunque i campi
  costruisciModulo(caricaBozza());

  document.getElementById("add-giocatore").addEventListener("click", () => {
    aggiungiRiga("giocatori").querySelector(".p-nome").focus();
  });

  document.getElementById("add-arbitro").addEventListener("click", () => {
    aggiungiRiga("arbitri").querySelector(".p-nome").focus();
  });

  form.addEventListener("submit", inviaIscrizione);

  // Salvataggio bozza (con debounce)
  let timerBozza;
  form.addEventListener("input", () => {
    clearTimeout(timerBozza);
    timerBozza = setTimeout(salvaBozza, 800);
  });

  document
    .getElementById("nuova-iscrizione-btn")
    .addEventListener("click", () => {
      document.getElementById("iscrizione-inviata").classList.add("hidden");
      form.classList.remove("hidden");
      form.reset();
      pulisciErrori();
      costruisciModulo(null);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

  // Iscrizioni aperte/chiuse (interruttore nel gestionale)
  try {
    const impostazioni = await getData("Impostazioni");
    if (impostazioni && impostazioni.iscrizioniAperte === false) {
      form.classList.add("hidden");
      document.getElementById("iscrizioni-chiuse").classList.remove("hidden");
    }
  } catch (error) {
    console.warn("Impossibile verificare lo stato delle iscrizioni:", error);
  }
});
