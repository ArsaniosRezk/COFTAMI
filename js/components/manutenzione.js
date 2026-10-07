const ID_OVERLAY = "maintenance-overlay";

export function manutenzione() {
  // Controllo se esiste già per evitare duplicati
  if (document.getElementById(ID_OVERLAY)) return;

  const container = document.createElement("div");
  container.id = ID_OVERLAY; // ID per identificarlo
  container.setAttribute("role", "alert");
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "100%";
  container.style.height = "100%";
  container.style.zIndex = "9999"; // Sopra tutto
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = "center";
  container.style.alignItems = "center";
  container.style.backgroundColor = "#121212"; // Sfondo scuro

  // Creiamo il testo "AGGIORNAMENTO"
  const text = document.createElement("h1");
  text.innerText = "IN AGGIORNAMENTO";
  text.style.color = "#fff";
  text.style.fontFamily = "'Bebas Neue', sans-serif"; // Assicuro il font corretto se caricato
  text.style.fontSize = window.innerWidth > 768 ? "48px" : "35px";
  text.style.fontWeight = "bold";
  text.style.textAlign = "center";
  text.style.marginBottom = "20px";

  // Locandina e pulsante del regolamento sono disattivati: l'immagine
  // (1,3 MB) non va nemmeno creata, altrimenti il browser la scarica comunque
  container.appendChild(text);

  // Si può partire prima che il body esista (avviso immediato all'apertura)
  const aggiungi = () => {
    document.body.appendChild(container);
    document.body.style.overflow = "hidden"; // Evita lo scroll sotto
  };
  if (document.body) aggiungi();
  else document.addEventListener("DOMContentLoaded", aggiungi, { once: true });
}

export function rimuoviManutenzione() {
  const overlay = document.getElementById(ID_OVERLAY);
  if (!overlay) return;
  overlay.remove();
  document.body.style.overflow = "";
}
