/*
    SERVICE WORKER
    --------------
    Strategia "prima la rete":
    - HTML, JS e CSS vengono sempre chiesti al server, così ogni
      aggiornamento pubblicato arriva subito a tutti i visitatori.
      La copia in cache si usa solo se la rete non risponde (offline).
    - Immagini e font rispondono subito dalla cache e si aggiornano in
      background: al massimo si vede la versione nuova alla visita dopo.
    - Le richieste verso altri domini (Firebase, Google Fonts, CDN) non
      passano da qui: le gestisce il browser.

    Non serve più cambiare CACHE_NAME a ogni pubblicazione: va cambiato
    solo se si modifica il funzionamento di questo file.

    PASSAGGIO DALLE VERSIONI VECCHIE
    Fino alla "v6" il service worker serviva tutto dalla cache prima di
    chiedere al server, quindi chi aveva già visitato il sito vedeva i file
    vecchi. Quando questa versione si attiva e trova quelle cache, le
    cancella e ricarica le pagine aperte: il visitatore vede subito la
    versione aggiornata invece che alla visita successiva.
*/

const CACHE_NAME = "cofta-rete-v1";

// Nomi delle cache create dalle versioni "prima la cache" (v1 ... v6)
const CACHE_VERSIONE_VECCHIA = /^v\d+$/;

// Copie per l'uso offline (Core)
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/campionato.html",
    "/squadre.html",
    "/calendario.html",
    "/gestionale.html",
    "/iscrizione.html",
    "/style.css",
    "/css/home.css",
    "/css/header.css",
    "/css/footer.css",
    "/css/colors.css",
    "/css/gestionale.css",
    "/css/iscrizione.css",
    "/css/iscrizioniM.css",
    "/css/dashboard.css",
    "/css/pre-torneo.css",
    "/css/squadreM.css",
    "/css/tabelle.css",
    "/js/firebase.js",
    "/js/edition-sync.js",
    "/js/utils/percorso.js",
    "/js/components/pre-torneo.js",
    "/js/gestionale.js",
    "/js/iscrizione.js",
    "/assets/images/favicon.svg",
    "/assets/images/LOGO_COFTA_SITO_2.svg",
    "/assets/fonts/UaCadet-2068.ttf"
];

const FILE_STATICI = /\.(png|jpe?g|gif|svg|webp|ico|ttf|otf|woff2?)$/i;

// INSTALLAZIONE
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installazione nuova versione:", CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) =>
            // Un file mancante non deve bloccare l'installazione: con addAll
            // basterebbe un 404 per lasciare tutti sulla versione vecchia
            Promise.allSettled(
                ASSETS_TO_CACHE.map((url) =>
                    fetch(url, { cache: "no-cache" }).then((risposta) => {
                        if (risposta.ok) return cache.put(url, risposta);
                    })
                )
            )
        )
    );
    // Forza l'attivazione immediata del nuovo SW
    self.skipWaiting();
});

// ATTIVAZIONE
self.addEventListener("activate", (event) => {
    const attivazione = (async () => {
        const chiavi = await caches.keys();
        const daVersioneVecchia = chiavi.some((chiave) =>
            CACHE_VERSIONE_VECCHIA.test(chiave)
        );

        await Promise.all(
            chiavi
                .filter((chiave) => chiave !== CACHE_NAME)
                .map((chiave) => {
                    console.log("[Service Worker] Rimozione vecchia cache:", chiave);
                    return caches.delete(chiave);
                })
        );

        // Prende il controllo delle pagine già aperte
        await self.clients.claim();
        return daVersioneVecchia;
    })();

    event.waitUntil(attivazione);

    // Le pagine aperte sono state servite dalla cache vecchia: ricaricandole il
    // visitatore vede subito la versione nuova. Succede una sola volta, al
    // passaggio da una versione "prima la cache".
    // Fuori da waitUntil: la ricarica passa da questo service worker, che non
    // risponde finché l'attivazione non è conclusa (si bloccherebbero a vicenda)
    attivazione.then(async (daVersioneVecchia) => {
        if (!daVersioneVecchia) return;

        const finestre = await self.clients.matchAll({ type: "window" });
        finestre
            .filter((finestra) => "navigate" in finestra)
            .forEach((finestra) => finestra.navigate(finestra.url).catch(() => {}));
    });
});

// GESTIONE RICHIESTE (FETCH)
self.addEventListener("fetch", (event) => {
    const richiesta = event.request;

    // Escludi richieste non GET e le richieste parziali (es. video, PDF)
    if (richiesta.method !== "GET" || richiesta.headers.has("range")) return;

    // Firebase, font e CDN: il service worker non interviene
    const url = new URL(richiesta.url);
    if (url.origin !== self.location.origin) return;

    if (richiesta.mode !== "navigate" && FILE_STATICI.test(url.pathname)) {
        event.respondWith(primaLaCache(event));
    } else {
        event.respondWith(primaLaRete(richiesta));
    }
});

async function primaLaRete(richiesta) {
    try {
        const risposta =
            richiesta.mode === "navigate"
                ? // Con redirect "manual" un eventuale redirect viene seguito dal
                  // browser: una risposta già rediretta non si può dare a una navigazione
                  await fetch(richiesta.url, {
                      cache: "no-cache",
                      credentials: "same-origin",
                      redirect: "manual",
                  })
                : // "no-cache": il browser ricontrolla col server invece di usare la
                  // sua copia, che GitHub Pages lascia valida per 10 minuti
                  await fetch(richiesta, { cache: "no-cache" });

        salvaInCache(richiesta, risposta);
        return risposta;
    } catch (errore) {
        // Offline: si usa l'ultima copia salvata
        const inCache = await caches.match(richiesta);
        if (inCache) return inCache;
        throw errore;
    }
}

async function primaLaCache(event) {
    const richiesta = event.request;
    const inCache = await caches.match(richiesta);

    const dallaRete = fetch(richiesta).then((risposta) => {
        salvaInCache(richiesta, risposta);
        return risposta;
    });

    if (inCache) {
        // Aggiorna la copia in background per la prossima volta
        event.waitUntil(dallaRete.catch(() => {}));
        return inCache;
    }

    return dallaRete;
}

function salvaInCache(richiesta, risposta) {
    if (!risposta.ok || risposta.type !== "basic") return;

    const copia = risposta.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(richiesta, copia));
}
