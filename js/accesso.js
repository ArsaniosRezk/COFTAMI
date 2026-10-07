import { PERCORSO_AMMINISTRATORI } from "./ambiente.js";
import { app, db, ref, get, collegaRegistro, attivaAppCheck } from "./firebase.js";
import { creaRegistro } from "./registro.js";

/*
===================================
ACCESSO AL GESTIONALE
===================================

Si entra con un account Google. Possono entrare solo gli indirizzi elencati
in Amministratori (vedi database.rules.json): per esempio

  Amministratori/mario,rossi@gmail,com = true

(nelle chiavi di Firebase i punti non sono ammessi: diventano virgole).
Le regole del database controllano lo stesso elenco, quindi anche chi
aggirasse questa schermata non potrebbe leggere o modificare nulla.

accessoAmministratore() si risolve con l'utente quando l'accesso è riuscito:
il gestionale lo aspetta prima di caricare le sezioni.
*/

const AUTH_SDK = "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

export function chiaveEmail(email) {
  return String(email || "")
    .toLowerCase()
    .replace(/\./g, ",");
}

let sdk = null;
let auth = null;
let utenteCorrente = null;

async function caricaAuth() {
  if (!auth) {
    sdk = await import(AUTH_SDK);
    auth = sdk.getAuth(app);
    auth.languageCode = "it";
  }
  return auth;
}

export function utente() {
  return utenteCorrente;
}

export async function esci() {
  await caricaAuth();
  await sdk.signOut(auth);
  location.reload();
}

async function eAmministratore(user) {
  if (!user?.email) return false;
  try {
    const snapshot = await get(ref(db, `${PERCORSO_AMMINISTRATORI}/${chiaveEmail(user.email)}`));
    return snapshot.val() === true;
  } catch (errore) {
    // Le regole negano la lettura a chi non è nell'elenco
    return false;
  }
}

function creaSchermata() {
  document.body.classList.add("bloccato");

  const schermata = document.createElement("div");
  schermata.id = "auth-overlay";
  schermata.innerHTML = `
    <div class="auth-card" role="dialog" aria-labelledby="auth-titolo" aria-describedby="auth-testo">
      <img src="/assets/images/LOGO_COFTA_SITO_2.svg" alt="" width="90" height="90" />
      <h2 id="auth-titolo">Area riservata</h2>
      <p id="auth-testo">Accedi con l'account Google che ti è stato abilitato.</p>
      <button type="button" id="auth-btn" class="auth-google">
        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg>
        <span>Accedi con Google</span>
      </button>
      <p id="auth-error" class="auth-errore" role="alert" hidden></p>
      <button type="button" id="auth-esci" class="auth-link" hidden>Usa un altro account</button>
    </div>
  `;
  document.body.appendChild(schermata);
  return schermata;
}

function sblocca(schermata) {
  document.body.classList.remove("bloccato");
  schermata.classList.add("in-uscita");
  setTimeout(() => schermata.remove(), 300);
}

/*
 Mostra la schermata di accesso finché non entra un amministratore.
 Restituisce l'utente Google che ha fatto l'accesso.
*/
export function accessoAmministratore() {
  return new Promise((resolve) => {
    const schermata = creaSchermata();
    const pulsante = schermata.querySelector("#auth-btn");
    const errore = schermata.querySelector("#auth-error");
    const altroAccount = schermata.querySelector("#auth-esci");

    const mostraErrore = (testo) => {
      errore.textContent = testo;
      errore.hidden = !testo;
    };

    pulsante.addEventListener("click", async () => {
      mostraErrore("");
      pulsante.disabled = true;
      try {
        await caricaAuth();
        const provider = new sdk.GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        try {
          await sdk.signInWithPopup(auth, provider);
        } catch (e) {
          // Finestre bloccate (alcuni browser su smartphone): si passa dal redirect
          if (
            e.code === "auth/popup-blocked" ||
            e.code === "auth/operation-not-supported-in-this-environment"
          ) {
            await sdk.signInWithRedirect(auth, provider);
          } else if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") {
            throw e;
          }
        }
      } catch (e) {
        console.error("Accesso non riuscito:", e);
        mostraErrore(
          e.code === "auth/unauthorized-domain"
            ? "Questo indirizzo non è abilitato all'accesso (Firebase > Authentication > Domini autorizzati)."
            : String(e.code).startsWith("auth/requests-from-referer")
              ? `La chiave API non accetta richieste da ${location.host} (Google Cloud > Credenziali > Limitazioni per le applicazioni).`
              : e.code === "auth/operation-not-allowed"
                ? "L'accesso con Google non è attivo (Firebase > Authentication > Metodo di accesso)."
                : `Accesso non riuscito. Controlla la connessione e riprova.${e.code ? ` (${e.code})` : ""}`
        );
      } finally {
        pulsante.disabled = false;
      }
    });

    altroAccount.addEventListener("click", esci);

    caricaAuth().then(() => {
      sdk.onAuthStateChanged(auth, async (user) => {
        if (!user) {
          utenteCorrente = null;
          altroAccount.hidden = true;
          return;
        }

        if (!(await eAmministratore(user))) {
          altroAccount.hidden = false;
          mostraErrore(
            `L'account ${user.email} non è abilitato al gestionale. ` +
              "Chiedi a un amministratore di aggiungerlo."
          );
          return;
        }

        if (utenteCorrente) return;
        utenteCorrente = user;
        collegaRegistro(creaRegistro(user));
        attivaAppCheck();
        sblocca(schermata);
        resolve(user);
      });
    });
  });
}
