document.addEventListener("DOMContentLoaded", () => {
  const contentDiv = document.getElementById("content");

  const loadContent = async (section) => {
    try {
      const response = await fetch(`management/${section}.html`);
      const content = await response.text();
      contentDiv.innerHTML = content;

      // Rimuove eventuali script precedenti con lo stesso src
      const existingScript = document.querySelector(
        `script[src="management/${section}.js"]`
      );
      if (existingScript) {
        existingScript.remove();
      }

      // Trova e carica gli script associati alla sezione caricata
      const script = document.createElement("script");
      script.src = `management/${section}.js`;
      script.type = "module";
      document.body.appendChild(script);

      // Esegue la funzione di inizializzazione dopo che lo script è stato caricato
      script.onload = async () => {
        const module = await import(`/management/${section}.js`);
        const initFunction =
          module[`init${section.charAt(0).toUpperCase() + section.slice(1)}`];
        if (typeof initFunction === "function") {
          initFunction();
        }
      };
    } catch (error) {
      console.error("Error loading content:", error);
      contentDiv.innerHTML =
        "<p>Unable to load content. Please try again later.</p>";
    }
  };

  const sections = [
    "dashboard",
    "iscrizioni",
    "squadre",
    "calendario",
    "partite",
    "report",
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

// Active Section //
const navLinkEls = document.querySelectorAll(".nav-links");
const headerText = document.getElementById("current-section");

navLinkEls.forEach((navLinkEl) => {
  // const navLinkPathname = new URL(navLinkEl.href).pathname;

  if (navLinkEl === headerText) {
    navLinkEl.classList.add("active");
  }
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
