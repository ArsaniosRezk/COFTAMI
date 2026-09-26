import { initSocial } from "../management/social.js";
import {
  edition,
  loadSavedOption,
  getSelectedDivision,
  setSelectedDivision,
} from "./divisionAndVariables.js";

/*
===================================
CONTENUTI SOCIAL
===================================

La stessa sezione "Social" del gestionale, in una pagina a sé.
L'interfaccia non è duplicata: si carica management/social.html e la si
inizializza con initSocial(), come fa gestionale.js.
*/

const divisionSelect = document.getElementById("division");
const divisionSwitch = document.getElementById("cs-divisione");
const contenuto = document.getElementById("cs-contenuto");

let frammento = null;

async function caricaFrammento() {
  if (frammento) return frammento;
  const risposta = await fetch("management/social.html");
  const pagina = new DOMParser().parseFromString(await risposta.text(), "text/html");
  frammento = pagina.getElementById("social-content").outerHTML;
  return frammento;
}

// A ogni cambio di divisione si riparte da un'interfaccia pulita
async function mostraSezione() {
  try {
    contenuto.innerHTML = await caricaFrammento();
    initSocial();
  } catch (errore) {
    console.error("Errore caricamento contenuti social:", errore);
    contenuto.innerHTML = "<p class='cs-errore'>Impossibile caricare la pagina. Riprova più tardi.</p>";
  }
}

function aggiornaSwitch() {
  divisionSwitch.querySelectorAll("button").forEach((bottone) => {
    const selezionato = bottone.dataset.division === divisionSelect.value;
    bottone.classList.toggle("selected", selezionato);
    bottone.setAttribute("aria-pressed", selezionato);
  });
}

divisionSwitch.addEventListener("click", (event) => {
  const bottone = event.target.closest("button[data-division]");
  if (!bottone || bottone.dataset.division === divisionSelect.value) return;

  divisionSelect.value = bottone.dataset.division;
  setSelectedDivision(divisionSelect.value);
  aggiornaSwitch();
  mostraSezione();
});

loadSavedOption();
divisionSelect.value = getSelectedDivision();
document.getElementById("cs-edizione").textContent = `Edizione ${edition}`;
aggiornaSwitch();
mostraSezione();
