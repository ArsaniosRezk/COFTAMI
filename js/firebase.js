// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set,
  child,
  update,
  remove,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

// Storage serve solo per caricare file (iscrizione, loghi): l'SDK si scarica
// alla prima richiesta invece che su ogni pagina
const STORAGE_SDK = "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB016Bj67OcUqsvrtPD21Yq4w2Uv5Apn5I",
  authDomain: "cofta-mi.firebaseapp.com",
  databaseURL:
    "https://cofta-mi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cofta-mi",
  storageBucket: "cofta-mi.appspot.com",
  messagingSenderId: "99662203430",
  appId: "1:99662203430:web:3cd23e844459925954b4e7",
  measurementId: "G-QB8RJEV0RX",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { db, ref, update, get, set, child, remove, onValue };

let storagePronto = null;

function caricaStorage() {
  storagePronto ??= import(STORAGE_SDK).then((sdk) => ({
    sdk,
    storage: sdk.getStorage(app),
  }));
  return storagePronto;
}

/*
 Carica un file su Firebase Storage e restituisce l'URL da cui scaricarlo.
 I percorsi usati contengono sempre un codice univoco (loghi, moduli): un file
 non cambia mai allo stesso indirizzo, quindi il browser può tenerlo in cache
 per un anno invece di ricontrollarlo a ogni visita.
 onProgress (facoltativo) riceve l'avanzamento da 0 a 1.
*/
export async function uploadFile(path, file, { onProgress } = {}) {
  const { sdk, storage } = await caricaStorage();
  const fileRef = sdk.ref(storage, path);
  const metadata = {
    contentType: file.type,
    cacheControl: "public, max-age=31536000, immutable",
  };

  if (!onProgress) {
    await sdk.uploadBytes(fileRef, file, metadata);
  } else {
    const caricamento = sdk.uploadBytesResumable(fileRef, file, metadata);
    await new Promise((resolve, reject) => {
      caricamento.on(
        "state_changed",
        (stato) => onProgress(stato.bytesTransferred / (stato.totalBytes || 1)),
        reject,
        resolve
      );
    });
  }

  return sdk.getDownloadURL(fileRef);
}

// Funzione per ottenere i dati da Firebase
export async function getData(refPath) {
  const dbRef = ref(db, refPath);
  const snapshot = await get(dbRef);
  return snapshot.exists() ? snapshot.val() : null;
}

// Funzione per impostare i dati su Firebase
export async function setData(path, data) {
  const dbRef = ref(db, path);
  try {
    await set(dbRef, data);
    console.log(`Dati impostati correttamente su ${path}`);
  } catch (error) {
    console.error("Errore durante l'impostazione dei dati:", error);
    throw error;
  }
}

// Funzione per aggiornare i dati in Firebase
export async function updateData(refPath, data) {
  const dbRef = ref(db, refPath);
  try {
    await update(dbRef, data);
    console.log(`Dati aggiornati con successo a ${refPath}`);
  } catch (error) {
    console.error(
      `Errore durante l'aggiornamento dei dati a ${refPath}:`,
      error
    );
    throw error;
  }
}

// Fino alla versione precedente calendario e squadre venivano tenuti in cache
// per un'ora (risultati vecchi sul calendario): le copie rimaste si eliminano
try {
  Object.keys(localStorage)
    .filter((chiave) => chiave.startsWith("cache_Calcio/") && chiave !== "cache_Calcio/AlboOro")
    .forEach((chiave) => localStorage.removeItem(chiave));
} catch (errore) {
  // Storage non disponibile: niente da pulire
}

// Funzione per ottenere dati con caching (per dati pesanti che non cambiano spesso)
// ttl in minuti (default 60 minuti)
export async function getDataCached(refPath, ttl = 60) {
  const cacheKey = `cache_${refPath}`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    const { data, timestamp } = JSON.parse(cached);
    const now = new Date().getTime();
    const ageMinutes = (now - timestamp) / (1000 * 60);

    if (ageMinutes < ttl) {
      console.log(`Recupero dati da cache per: ${refPath}`);
      return data;
    }
  }

  // Se non c'è cache o è scaduta, scarica di nuovo
  const data = await getData(refPath);

  if (data) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        data: data,
        timestamp: new Date().getTime()
      }));
    } catch (e) {
      console.warn(" localStorage full or disabled, skipping cache save", e);
    }
  }

  return data;
}

import {
  getSelectedDivision,
  loadSavedOption,
  edition,
} from "./divisionAndVariables.js";

// Percorsi della divisione scelta nell'header, oppure di quella indicata
// (pagina squadra, classifica completa)
export function getPaths(divisione = null) {
  loadSavedOption();
  const selectedDivision = divisione || getSelectedDivision();
  const divisionPath = `Calcio/${edition}/${selectedDivision}`;
  const teamsPath = `Calcio/${edition}/${selectedDivision}/Squadre`;
  const matchesPath = `Calcio/${edition}/${selectedDivision}/Partite`;
  const calendarPath = `Calcio/${edition}/${selectedDivision}/Calendario`;
  const matchdayToShowPath = `Calcio/${edition}/GiornataDaMostrare`;

  return {
    divisionPath,
    teamsPath,
    matchesPath,
    calendarPath,
    matchdayToShowPath,
  };
}
