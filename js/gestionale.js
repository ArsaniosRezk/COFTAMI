import { impostazioniPronte } from "./impostazioni.js";

// Stile di ogni sezione: uno solo alla volta, perché alcuni fogli contengono
// regole generiche (table, td, .custom-button) che si pesterebbero i piedi
const STILI_SEZIONE = {
  dashboard: "/css/dashboard.css",
  iscrizioni: "/css/iscrizioniM.css",
  squadre: "/css/squadreM.css",
  calendario: "/css/calendarioM.css",
  report: "/css/reportM.css",
  partite: "/css/partiteM.css",
  social: "/css/socialM.css",
};

// Carica il foglio di stile della sezione e toglie quello precedente solo
// quando il nuovo è pronto: il contenuto non compare mai senza stile
function caricaStileSezione(section) {
  const href = STILI_SEZIONE[section];
  const attuale = document.getElementById("stile-sezione");
  if (!href || attuale?.getAttribute("href") === href) return Promise.resolve();

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

// Oltre questo tempo la sezione compare comunque, con i suoi messaggi di caricamento
const ATTESA_MASSIMA_SEZIONE = 6000;
// Lo spinner compare solo se il caricamento si fa notare
const RITARDO_SPINNER = 300;

document.addEventListener("DOMContentLoaded", async () => {
  const contentDiv = document.getElementById("content");
  const main = document.querySelector("main");

  // Ogni caricamento ha un numero: se nel frattempo ne è partito un altro
  // (clic veloci sul menu), il risultato vecchio viene scartato
  let ultimoCaricamento = 0;
  let timerSpinner;

  // La sezione resta invisibile finché i suoi dati non sono disegnati:
  // niente scheletri o tabelle che si riempiono a pezzi sotto gli occhi
  const nascondiContenuto = () => {
    contentDiv.classList.add("in-caricamento");
    clearTimeout(timerSpinner);
    timerSpinner = setTimeout(
      () => main.classList.add("in-attesa"),
      RITARDO_SPINNER
    );
  };

  const mostraContenuto = () => {
    clearTimeout(timerSpinner);
    main.classList.remove("in-attesa");
    contentDiv.classList.remove("in-caricamento");
  };

  const loadContent = async (section) => {
    const numero = ++ultimoCaricamento;
    nascondiContenuto();
    try {
      const [content, module] = await Promise.all([
        fetch(`management/${section}.html`).then((response) => {
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          return response.text();
        }),
        import(`/management/${section}.js`),
        caricaStileSezione(section),
      ]);
      if (numero !== ultimoCaricamento) return;

      contentDiv.innerHTML = content;

      const initFunction =
        module[`init${section.charAt(0).toUpperCase() + section.slice(1)}`];
      if (typeof initFunction === "function") {
        await Promise.race([
          Promise.resolve(initFunction()).catch((error) =>
            console.error(`Errore nell'inizializzazione di ${section}:`, error)
          ),
          new Promise((resolve) => setTimeout(resolve, ATTESA_MASSIMA_SEZIONE)),
        ]);
      }
    } catch (error) {
      if (numero !== ultimoCaricamento) return;
      console.error("Error loading content:", error);
      contentDiv.innerHTML =
        "<p>Impossibile caricare la sezione. Controlla la connessione e riprova.</p>";
    }
    if (numero === ultimoCaricamento) mostraContenuto();
  };

  // I percorsi Firebase dipendono dall'edizione corrente
  await impostazioniPronte;

  const sections = [
    "dashboard",
    "iscrizioni",
    "squadre",
    "calendario",
    "partite",
    "report",
    "social",
  ];

  const sezioneDaHash = () => {
    const section = location.hash.slice(1);
    return sections.includes(section) ? section : "dashboard";
  };

  // La sezione sta nell'hash: una ricarica (es. cambio edizione) non riporta alla dashboard
  let currentSection = sezioneDaHash();

  const setActiveLink = (section) => {
    sections.forEach((sec) => {
      const link = document.getElementById(`nav-${sec}`);
      if (sec === section) {
        link.classList.add("active");
      } else {
        link.classList.remove("active");
      }
    });
  };

  const showSection = (section) => {
    currentSection = section;
    loadContent(section);
    setActiveLink(section);
    document.getElementById("current-section").textContent =
      section.charAt(0).toUpperCase() + section.slice(1);
    document.querySelector("main").scrollTop = 0;
  };

  sections.forEach((section) => {
    document
      .getElementById(`nav-${section}`)
      .addEventListener("click", (event) => {
        event.preventDefault();
        // Una voce di cronologia per sezione: il tasto "indietro" del telefono
        // torna alla sezione precedente invece di uscire dal gestionale
        if (section !== currentSection) {
          history.pushState(null, "", `#${section}`);
        }
        showSection(section);
      });
  });

  window.addEventListener("popstate", () => showSection(sezioneDaHash()));

  // --- DIVISIONE ---
  // Su smartphone il select è nascosto: i due pulsanti dell'header lo comandano
  const divisionSelect = document.getElementById("division");
  const divisionSwitch = document.getElementById("division-switch");

  const updateDivisionSwitch = () => {
    divisionSwitch.querySelectorAll("button").forEach((button) => {
      const selected = button.dataset.division === divisionSelect.value;
      button.classList.toggle("selected", selected);
      button.setAttribute("aria-pressed", selected);
    });
  };

  divisionSwitch.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-division]");
    if (!button || button.dataset.division === divisionSelect.value) return;

    divisionSelect.value = button.dataset.division;
    divisionSelect.dispatchEvent(new Event("change"));
  });

  divisionSelect.addEventListener("change", () => {
    updateDivisionSwitch();
    // Ricarica la sezione corrente quando cambia il parametro
    loadContent(currentSection);
  });

  showSection(currentSection);
  updateDivisionSwitch();

  // --- TASTIERA SU SMARTPHONE ---
  // Con la tastiera aperta la barra in basso ruberebbe spazio ai campi
  const isTextField = (el) =>
    el instanceof HTMLElement &&
    el.matches("textarea, input:not([type=checkbox]):not([type=radio])");

  document.addEventListener("focusin", (event) => {
    if (isTextField(event.target)) {
      document.body.classList.add("keyboard-open");
    }
  });

  document.addEventListener("focusout", () => {
    // Passando da un campo all'altro il focus resta su un campo: niente sfarfallio
    setTimeout(() => {
      if (!isTextField(document.activeElement)) {
        document.body.classList.remove("keyboard-open");
      }
    }, 100);
  });
});

// SERVICE WORKER REGISTRATION (Admin)
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW Registered (Admin)', registration.scope);
      })
      .catch((error) => {
        console.log('SW Registration Failed:', error);
      });
  });
}
