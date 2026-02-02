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

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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

export function getPaths() {
  loadSavedOption();
  const selectedDivision = getSelectedDivision();
  const teamsPath = `Calcio/${edition}/${selectedDivision}/Squadre`;
  const matchesPath = `Calcio/${edition}/${selectedDivision}/Partite`;
  const calendarPath = `Calcio/${edition}/${selectedDivision}/Calendario`;
  const matchdayToShowPath = `Calcio/${edition}/GiornataDaMostrare`;

  return {
    teamsPath,
    matchesPath,
    calendarPath,
    matchdayToShowPath,
  };
}
