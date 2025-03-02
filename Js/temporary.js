document.addEventListener("DOMContentLoaded", function () {
  let container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.justifyContent = "center";
  container.style.alignItems = "center";
  container.style.height = "100vh"; // Occupa tutta l'altezza dello schermo
  container.style.backgroundColor = "#121212"; // Sfondo scuro

  // Creiamo il testo "AGGIORNAMENTO"
  let text = document.createElement("h1");
  text.innerText = "AGGIORNAMENTO";
  text.style.color = "#fff";
  text.style.fontSize = window.innerWidth > 768 ? "48px" : "25px";
  text.style.fontWeight = "bold";
  text.style.textAlign = "center";
  text.style.marginBottom = "20px";

  // Creiamo l'immagine della locandina
  let img = document.createElement("img");
  img.src = "Asset/Locandina.svg"; // Percorso del file SVG
  img.alt = "Locandina";
  img.style.maxWidth = "90vw"; // Adatta alla larghezza dello schermo
  img.style.maxHeight = "80vh"; // La locandina occupa il 70% dello schermo
  img.style.objectFit = "contain"; // Mantiene le proporzioni corrette

  // Creiamo il bottone per il regolamento
  let button = document.createElement("a");
  button.innerText = "REGOLAMENTO";
  button.href = "regolamento.html"; // Link alla pagina del regolamento
  button.style.display = "inline-block";
  button.style.marginTop = "20px";
  button.style.padding = "10px 20px";
  button.style.fontSize = "18px";
  button.style.color = "#fff";
  button.style.backgroundColor = "#2e684e"; // Colore del bottone
  button.style.border = "none";
  button.style.borderRadius = "5px";
  button.style.textDecoration = "none";
  button.style.textAlign = "center";
  button.style.transition = "background 0.3s";
  button.style.cursor = "pointer";

  // Effetto hover
  button.addEventListener(
    "mouseover",
    () => (button.style.backgroundColor = "#f26a1b")
  );
  button.addEventListener(
    "mouseout",
    () => (button.style.backgroundColor = "#2e684e")
  );

  // Aggiungiamo tutto al contenitore
  container.appendChild(text);
  // container.appendChild(img);
  // container.appendChild(button);

  // Sostituiamo il contenuto della pagina con il nuovo layout
  document.body.innerHTML = "";
  document.body.style.overflow = "hidden"; // Evita lo scroll
  document.body.appendChild(container);
});
