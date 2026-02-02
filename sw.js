/*
    SERVICE WORKER
    --------------
    Gestisce la cache del sito per permettere il funzionamento offline
    e il caricamento veloce delle risorse.
    
    COME AGGIORNARE:
    Per forzare l'aggiornamento su tutti i dispositivi, cambia il valore
    di CACHE_NAME (es. da "v1" a "v2").
*/

const CACHE_NAME = "v1";

// Lista dei file da scaricare subito (Core)
const ASSETS_TO_CACHE = [
    "/",
    "/index.html",
    "/campionato.html",
    "/squadre.html",
    "/calendario.html",
    "/gestionale.html",
    "/style.css",
    "/css/home.css",
    "/css/header.css",
    "/css/footer.css",
    "/css/colors.css",
    "/css/gestionale.css",
    "/css/dashboard.css",
    "/css/squadreM.css",
    "/css/tabelle.css",
    "/js/firebase.js",
    "/js/gestionale.js",
    "/assets/images/favicon.svg",
    "/assets/images/LOGO_COFTA_SITO_2.svg",
    "/assets/fonts/UaCadet-2068.ttf"
];

// INSTALLAZIONE
// Scarica e salva i file nella cache
self.addEventListener("install", (event) => {
    console.log("[Service Worker] Installazione nuova versione:", CACHE_NAME);
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log("[Service Worker] Caching files principali");
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    // Forza l'attivazione immediata del nuovo SW
    self.skipWaiting();
});

// ATTIVAZIONE
// Pulisce le vecchie cache se il nome della versione è cambiato
self.addEventListener("activate", (event) => {
    console.log("[Service Worker] Attivazione...");
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(
                keyList.map((key) => {
                    if (key !== CACHE_NAME) {
                        console.log("[Service Worker] Rimozione vecchia cache:", key);
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    // Prende il controllo della pagina immediatamente
    return self.clients.claim();
});

// GESTIONE RICHIESTE (FETCH)
// "Cache first, falling back to network"
self.addEventListener("fetch", (event) => {
    // Escludi richieste non GET (es. POST verso Firebase) o richieste esterne se necessario
    if (event.request.method !== "GET") return;

    // IGNORA SKEMI NON SUPPORTATI (es. chrome-extension://)
    if (!event.request.url.startsWith("http")) return;

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Se c'è in cache, restituiscilo
            if (cachedResponse) {
                return cachedResponse;
            }

            // Altrimenti scaricalo dalla rete
            return fetch(event.request).then((networkResponse) => {
                // Controlla che la risposta sia valida
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Clona la risposta per salvarla in cache per il futuro
                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseToCache);
                });

                return networkResponse;
            });
        })
    );
});
