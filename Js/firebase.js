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
