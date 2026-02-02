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

  const sections = ["dashboard", "squadre", "calendario", "partite", "report"];
  let currentSection = "dashboard"; // Traccia la sezione corrente

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

  sections.forEach((section) => {
    document
      .getElementById(`nav-${section}`)
      .addEventListener("click", (event) => {
        event.preventDefault();
        currentSection = section;
        loadContent(section);
        setActiveLink(section);
        document.getElementById("current-section").textContent =
          section.charAt(0).toUpperCase() + section.slice(1);
      });
  });

  // Aggiungi un event listener per il select
  const divisionSelect = document.getElementById("division");
  if (divisionSelect) {
    divisionSelect.addEventListener("change", () => {
      // Ricarica la sezione corrente quando cambia il parametro
      loadContent(currentSection);
    });
  }

  // Load the default section (Dashboard) when the page loads
  loadContent(currentSection);
  setActiveLink(currentSection);

  // --- MOBILE NAVIGATION LOGIC ---
  const hamburger = document.getElementById("hamburger-menu");
  const overlay = document.getElementById("nav-overlay");
  const nav = document.querySelector("nav");

  if (hamburger && overlay && nav) {
    // Toggle Menu
    hamburger.addEventListener("click", () => {
      nav.classList.toggle("active");
      overlay.classList.toggle("active");
    });

    // Close on Overlay Click
    overlay.addEventListener("click", () => {
      nav.classList.remove("active");
      overlay.classList.remove("active");
    });

    // Close on Nav Item Click (Mobile UX)
    const navLinks = document.querySelectorAll(".nav-links a");
    navLinks.forEach(link => {
      link.addEventListener("click", () => {
        if (window.innerWidth <= 1024) { // Only on mobile/tablet
          nav.classList.remove("active");
          overlay.classList.remove("active");
        }
      });
    });
  }
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
