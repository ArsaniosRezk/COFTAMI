import { ref, get, db } from "../firebase.js";

/*
    AUTH GUARD
    ----------
    Checks if the user has a valid 'admin_token' in localStorage.
    If not, it covers the screen with a lock overlay.
*/

const AUTH_TOKEN_KEY = "cofta_admin_token";

export async function initAuthGuard() {
    // 1. Check if token exists
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
        showLockScreen();
    } else {
        // Optional: Verify token validity against DB if we wanted to be stricter,
        // but for "PIN & Remember", simple presence is enough for now.
        console.log("Admin access granted via token.");
    }
}

function showLockScreen() {
    // Remove existing content or just cover it? 
    // Covering is safer to avoid flashing content, but we should ensure scrolling is disabled.
    document.body.style.overflow = "hidden";

    // Create Overlay
    const overlay = document.createElement("div");
    overlay.id = "auth-overlay";
    overlay.innerHTML = `
        <div class="auth-card">
            <h2>Area Riservata</h2>
            <p>Inserisci il PIN per accedere al gestionale.</p>
            <input type="password" id="auth-pin-input" placeholder="PIN" maxlength="10" />
            <button id="auth-btn">Accedi</button>
            <p id="auth-error" style="color: red; display: none; margin-top: 10px;">PIN Errato</p>
        </div>
    `;

    document.body.appendChild(overlay);

    const btn = document.getElementById("auth-btn");
    const input = document.getElementById("auth-pin-input");

    // Event Listeners
    btn.addEventListener("click", () => verifyPin(input.value));

    input.addEventListener("keypress", (e) => {
        if (e.key === "Enter") verifyPin(input.value);
    });

    // Focus input
    input.focus();
}

async function verifyPin(enteredPin) {
    const errorMsg = document.getElementById("auth-error");
    errorMsg.style.display = "none";

    if (!enteredPin) return;

    try {
        const settingsRef = ref(db, "Impostazioni");
        const snapshot = await get(settingsRef);

        if (snapshot.exists()) {
            const data = snapshot.val();
            const correctPin = data.adminPin || "COFTA"; // Fallback default if not set yet

            // Simple string comparison (User requested basic protection)
            if (enteredPin === correctPin) {
                // SUCCESS
                unlock();
            } else {
                // FAILURE
                errorMsg.style.display = "block";
                errorMsg.innerText = "PIN Errato";
            }
        } else {
            // DB Error or no settings
            console.error("No settings found in DB.");
            errorMsg.style.display = "block";
            errorMsg.innerText = "Errore connessione DB";
        }
    } catch (error) {
        console.error("Auth Error:", error);
        errorMsg.style.display = "block";
        errorMsg.innerText = "Errore: " + error.message;
    }
}

function unlock() {
    localStorage.setItem(AUTH_TOKEN_KEY, "true");
    const overlay = document.getElementById("auth-overlay");
    if (overlay) {
        overlay.style.transition = "opacity 0.5s ease";
        overlay.style.opacity = "0";
        setTimeout(() => {
            overlay.remove();
            document.body.style.overflow = ""; // Restore scrolling
        }, 500);
    }
}
