import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  get,
  set as setSdk,
  child,
  update as updateSdk,
  remove as removeSdk,
  onValue,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { STAGING, PERCORSO_IMPOSTAZIONI, PERCORSO_REGISTRO } from "./ambiente.js";
import { getSelectedDivision, loadSavedOption, edition } from "./divisione.js";

// Storage serve solo per caricare file (iscrizione, loghi): l'SDK si scarica
// alla prima richiesta invece che su ogni pagina
const STORAGE_SDK = "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";
const APP_CHECK_SDK = "https://www.gstatic.com/firebasejs/10.12.2/firebase-app-check.js";

/*
 APP CHECK (facoltativo)
 Blocca i caricamenti su Storage che non arrivano dal sito (bot, script).
 Per attivarlo: Firebase console > App Check > registra l'app web con
 reCAPTCHA v3, incolla qui la chiave del sito e poi attiva l'applicazione
 obbligatoria solo per Storage. Finché la chiave è vuota non succede nulla.
*/
const CHIAVE_RECAPTCHA_APP_CHECK = "";

// La configurazione web di Firebase è pubblica per natura: a proteggere i dati
// sono le regole (database.rules.json e storage.rules), non questa chiave
const firebaseConfig = {
  apiKey: "AIzaSyB016Bj67OcUqsvrtPD21Yq4w2Uv5Apn5I",
  authDomain: "cofta-mi.firebaseapp.com",
  databaseURL: "https://cofta-mi-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "cofta-mi",
  storageBucket: "cofta-mi.appspot.com",
  messagingSenderId: "99662203430",
  appId: "1:99662203430:web:3cd23e844459925954b4e7",
  measurementId: "G-QB8RJEV0RX",
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);

let appCheckAttivo = null;

// Da chiamare sulle pagine che caricano file (iscrizione, gestionale)
export function attivaAppCheck() {
  if (!CHIAVE_RECAPTCHA_APP_CHECK) return Promise.resolve();
  appCheckAttivo ??= import(APP_CHECK_SDK)
    .then(({ initializeAppCheck, ReCaptchaV3Provider }) =>
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(CHIAVE_RECAPTCHA_APP_CHECK),
        isTokenAutoRefreshEnabled: true,
      })
    )
    .catch((errore) => console.error("App Check non disponibile:", errore));
  return appCheckAttivo;
}

/*
 PROTEZIONE DELLO STAGING
 Sullo staging (vedi ambiente.js) si scrive solo sui dati di prova: ogni
 scrittura del sito passa da set/update/remove/uploadFile qui sotto, e quelle
 fuori da questi percorsi vengono rifiutate prima di arrivare a Firebase.
*/
const DATI_DI_PROVA = ["Calcio/Test", PERCORSO_IMPOSTAZIONI, PERCORSO_REGISTRO];
const FILE_DI_PROVA = ["Loghi/Test", "Moduli/Test"];

// Percorso di un riferimento del database, es. "Calcio/Test/Superiori"
function percorsoDi(riferimento) {
  return decodeURIComponent(new URL(riferimento.toString()).pathname).replace(/^\/+|\/+$/g, "");
}

function unisci(...parti) {
  return parti
    .join("/")
    .replace(/\/+/g, "/")
    .replace(/^\/|\/$/g, "");
}

function scritturaVietata(percorsi, ammessi) {
  if (!STAGING) return null;
  const fuori = percorsi.find(
    (percorso) => !ammessi.some((base) => percorso === base || percorso.startsWith(`${base}/`))
  );
  if (fuori === undefined) return null;
  const errore = new Error(`Staging: scrittura bloccata su "${fuori || "/"}" (fuori dai dati di prova)`);
  console.error(errore);
  return errore;
}

/*
 REGISTRO DELLE MODIFICHE
 Nel gestionale, dopo l'accesso, accesso.js collega qui il registro
 (registro.js): ogni scrittura viene annotata con chi l'ha fatta e il valore
 precedente, così dalla dashboard si può vedere e annullare.
 Sulle pagine pubbliche (iscrizione, referto) il registro non c'è.
*/
let registro = null;

export function collegaRegistro(funzione) {
  registro = funzione;
}

async function scrivi(tipo, valoriPerPercorso, operazione) {
  const percorsi = Object.keys(valoriPerPercorso);
  const vietata = scritturaVietata(percorsi, DATI_DI_PROVA);
  if (vietata) throw vietata;

  const annota = registro ? await registro.prima(tipo, valoriPerPercorso) : null;
  const esito = await operazione();
  annota?.();
  return esito;
}

function set(riferimento, valore) {
  return scrivi("set", { [percorsoDi(riferimento)]: valore }, () => setSdk(riferimento, valore));
}

function update(riferimento, valori) {
  const base = percorsoDi(riferimento);
  const perPercorso = Object.fromEntries(
    Object.entries(valori || {}).map(([chiave, valore]) => [unisci(base, chiave), valore])
  );
  return scrivi("update", perPercorso, () => updateSdk(riferimento, valori));
}

function remove(riferimento) {
  return scrivi("remove", { [percorsoDi(riferimento)]: null }, () => removeSdk(riferimento));
}

export { ref, update, get, set, child, remove, onValue };

let storagePronto = null;

function caricaStorage() {
  storagePronto ??= import(STORAGE_SDK).then((sdk) => ({
    sdk,
    storage: sdk.getStorage(app),
  }));
  return storagePronto;
}

/*
 Carica un file su Firebase Storage.
 I percorsi usati contengono sempre un codice univoco (loghi, moduli): un file
 non cambia mai allo stesso indirizzo, quindi il browser può tenerlo in cache
 per un anno invece di ricontrollarlo a ogni visita.
 - onProgress (facoltativo) riceve l'avanzamento da 0 a 1.
 - conUrl: false per i file privati (moduli firmati), che chi li carica non
   può rileggere: si restituisce solo il percorso.
*/
export async function uploadFile(path, file, { onProgress, conUrl = true } = {}) {
  const vietata = scritturaVietata([unisci(path)], FILE_DI_PROVA);
  if (vietata) throw vietata;

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

  registro?.file(path);
  return conUrl ? sdk.getDownloadURL(fileRef) : path;
}

// Indirizzo di un file privato (solo amministratori), es. un modulo firmato
export async function urlFile(path) {
  const { sdk, storage } = await caricaStorage();
  return sdk.getDownloadURL(sdk.ref(storage, path));
}

export async function getData(refPath) {
  const snapshot = await get(ref(db, refPath));
  return snapshot.exists() ? snapshot.val() : null;
}

export async function setData(path, data) {
  await set(ref(db, path), data);
}

export async function updateData(refPath, data) {
  await update(ref(db, refPath), data);
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

// Dati pesanti che cambiano di rado (albo d'oro): ttl in minuti
export async function getDataCached(refPath, ttl = 60) {
  const cacheKey = `cache_${refPath}`;
  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached && (Date.now() - cached.timestamp) / 60000 < ttl) return cached.data;
  } catch (errore) {
    // Copia illeggibile o storage non disponibile: si scarica di nuovo
  }

  const data = await getData(refPath);
  if (data) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (errore) {
      // Storage pieno o disattivato: si prosegue senza cache
    }
  }
  return data;
}

// Percorsi della divisione scelta nell'header, oppure di quella indicata
// (pagina squadra, classifica completa, modulo del referto)
export function getPaths(divisione = null) {
  loadSavedOption();
  const selectedDivision = divisione || getSelectedDivision();
  const divisionPath = `Calcio/${edition}/${selectedDivision}`;

  return {
    divisionPath,
    teamsPath: `${divisionPath}/Squadre`,
    matchesPath: `${divisionPath}/Partite`,
    calendarPath: `${divisionPath}/Calendario`,
    reportsPath: `${divisionPath}/Referti`,
    matchdayToShowPath: `Calcio/${edition}/GiornataDaMostrare`,
  };
}
