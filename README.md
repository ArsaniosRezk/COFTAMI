# Cofta Milano

Sito del campionato di calcio diocesano: [coftamilano.com](https://coftamilano.com).
HTML, CSS e JavaScript senza framework, pubblicato con GitHub Pages; i dati
stanno su Firebase (Realtime Database, Storage, Authentication).

## Comandi

| Comando               | A cosa serve                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------------- |
| `npm install`         | Scarica gli strumenti di sviluppo (una volta sola)                                                |
| `npm run dev`         | Sito in locale su http://localhost:3000 (dati di prova `Calcio/Test`)                             |
| `npm run staging`     | Pubblica la cartella su staging.coftamilano.com                                                   |
| `npm run pagine`      | Riscrive head, header e footer delle pagine pubbliche (dopo aver cambiato il menu o un titolo)    |
| `npm run icone`       | Rigenera `css/icone.css` e `css/icone-gestionale.css`                                             |
| `npm run sitemap`     | Rigenera `sitemap.xml` con le squadre dell'edizione corrente                                      |
| `npm run controlla`   | Lint, test, formattazione, percorsi dei file e pagine generate (gira anche su GitHub a ogni push) |
| `npm test`            | Test di classifica, statistiche e generatore del calendario                                       |
| `npm run test:regole` | Test delle regole del database sull'emulatore Firebase (serve Java 17+)                           |
| `npm run regole`      | Pubblica `database.rules.json` e `storage.rules` su Firebase                                      |

## Struttura

- `*.html` pagine pubbliche: si modifica solo il blocco tra `<!-- inizio contenuto -->` e `<!-- fine contenuto -->`, il resto lo scrive `npm run pagine`
- `gestionale.html` + `management/` + `js/gestionale.js` il gestionale (accesso con Google)
- `js/` moduli del sito; `js/utils/` funzioni pure (testate in `test/`)
- `css/base.css` colori, struttura, header e footer comuni; un foglio per pagina
- `database.rules.json`, `storage.rules` chi può leggere e scrivere cosa

## Primo passaggio all'accesso con Google

Il PIN del gestionale è stato sostituito dall'accesso con un account Google e
da regole del database che proteggono davvero i dati. Prima di pubblicare
questa versione:

1. **Firebase console > Authentication > Metodo di accesso**: attivare **Google**.
2. **Authentication > Impostazioni > Domini autorizzati**: aggiungere
   `coftamilano.com`, `www.coftamilano.com` e `staging.coftamilano.com`.
3. **Realtime Database > Dati**: creare il nodo `Amministratori` con una voce
   per ogni account abilitato, con le virgole al posto dei punti e valore `true`:
   `Amministratori/mario,rossi@gmail,com = true`.
   Gli altri si possono poi aggiungere dalla dashboard (Chi può accedere).
4. Aggiungere gli stessi indirizzi all'elenco in `storage.rules`.
5. Pubblicare il sito (merge su `main`) e verificare di riuscire a entrare nel gestionale.
6. Pubblicare le regole: `npx firebase-tools login` e poi `npm run regole`
   (oppure incollarle a mano in Firebase console).
7. Mandare agli arbitri il link al modulo dei referti (dashboard > Arbitri > Copia il link).

Facoltativo: **App Check** (reCAPTCHA v3) per bloccare i caricamenti non fatti
dal sito; le istruzioni sono in `js/firebase.js`.
