import { getData } from "../firebase.js";
import { edition } from "../divisionAndVariables.js";
import {
    inizializzaPunteggi,
    aggiornaPunteggi,
    ordinaClassifica,
} from "./standings.js";

/*
===================================
GRAFICHE SOCIAL
===================================

Disegna su canvas i post Instagram (1080x1350, formato 4:5) di calendario,
risultati e classifica di una divisione, più una storia (1080x1920) per ogni
partita giocata con i marcatori, e li restituisce come PNG.

I loghi delle squadre stanno su Firebase Storage: per poterli disegnare ed
esportare il bucket deve avere il CORS abilitato. Se un logo non si carica
al suo posto compare un cerchio con le iniziali e la grafica resta esportabile.
*/

const W = 1080;
const H = 1350;
// Storie Instagram: in alto e in basso l'interfaccia dell'app copre ~250px
const H_STORIA = 1920;

const GIALLO = "#F3E600";
const NERO = "#0b0b0c";

const FONT_TITOLI = '"Bebas Neue", sans-serif';
const FONT_TESTO = "Montserrat, sans-serif";

const LOGO_COFTA = "/assets/images/LOGO_COFTA_SITO_2.svg";

// Partite per immagine: oltre si passa a una seconda immagine
const PARTITE_PER_PAGINA = 5;

const GIORNI = ["DOM", "LUN", "MAR", "MER", "GIO", "VEN", "SAB"];

/*
-----------------------------------
DATI
-----------------------------------
*/

// Carica tutto ciò che serve alle grafiche di una divisione
export async function caricaDatiSocial(division) {
    const base = `Calcio/${edition}/${division}`;

    const [calendario, squadre, partite, giornataDivisione, giornataGlobale] =
        await Promise.all([
            getData(`${base}/Calendario`),
            getData(`${base}/Squadre`),
            getData(`${base}/Partite`),
            getData(`${base}/GiornataDaMostrare`),
            getData(`Calcio/${edition}/GiornataDaMostrare`),
        ]);

    const giornate = Object.keys(calendario || {})
        .filter((key) => !isNaN(key))
        .sort((a, b) => a - b);

    return {
        division,
        calendario: calendario || {},
        squadre: squadre || {},
        partite: partite || {},
        giornate,
        giornataDaMostrare: String(giornataDivisione ?? giornataGlobale ?? ""),
    };
}

function nomeSquadra(chiave) {
    return chiave.replace(/_/g, ".");
}

// Minuti dall'inizio dell'anno: serve solo a ordinare le partite
function momentoPartita(data, orario) {
    const [giorno, mese] = (data || "").split("/").map(Number);
    const [ore, minuti] = (orario || "").split(":").map(Number);
    if (!giorno || !mese) return Infinity;
    return ((mese * 31 + giorno) * 24 + (ore || 0)) * 60 + (minuti || 0);
}

function partiteGiornata(dati, giornata) {
    const calendario = dati.calendario[giornata] || {};
    const giocate = dati.partite[giornata] || {};

    return Object.entries(calendario)
        .map(([chiave, info]) => {
            const [casa, ospite] = chiave.split(":");
            const referto = giocate[chiave];

            // Il risultato ufficiale è quello delle Partite; il campo
            // Risultato del calendario è solo una copia per il sito
            let golCasa = referto?.GolSquadraCasa;
            let golOspite = referto?.GolSquadraOspite;
            if (golCasa === undefined || golOspite === undefined) {
                const match = /^\s*(\d+)\s*[:\-]\s*(\d+)\s*$/.exec(info.Risultato || "");
                if (match) {
                    golCasa = Number(match[1]);
                    golOspite = Number(match[2]);
                }
            }

            return {
                casa,
                ospite,
                data: info.Data || "",
                orario: info.Orario || "",
                luogo: info.Luogo || "",
                golCasa,
                golOspite,
                marcatori: referto?.Marcatori || null,
                giocata: golCasa !== undefined && golOspite !== undefined,
            };
        })
        .sort((a, b) => momentoPartita(a.data, a.orario) - momentoPartita(b.data, b.orario));
}

// Stessa logica di classificaGirone() in standings.js
function calcolaClassifiche(dati) {
    const { squadre, partite } = dati;

    const gironi = {};
    for (const chiave in squadre) {
        const girone = squadre[chiave].Girone || "";
        if (girone === "") continue;
        if (!gironi[girone]) gironi[girone] = {};
        gironi[girone][chiave] = squadre[chiave];
    }
    if (Object.keys(gironi).length === 0) gironi[""] = squadre;

    const numeriGiornate = Object.keys(partite).filter((key) => !isNaN(key));
    let ultimaGiornata = 0;

    const classifiche = Object.keys(gironi)
        .sort()
        .map((girone) => {
            const squadreGirone = gironi[girone];
            const punteggi = inizializzaPunteggi(squadreGirone);

            for (const giornata of numeriGiornate) {
                for (const match of Object.values(partite[giornata] || {})) {
                    const casaIn = !!squadreGirone[match.SquadraCasa];
                    const ospiteIn = !!squadreGirone[match.SquadraOspite];
                    if (casaIn || ospiteIn) {
                        ultimaGiornata = Math.max(ultimaGiornata, Number(giornata));
                    }
                    if (casaIn) {
                        aggiornaPunteggi(punteggi, match.SquadraCasa, match.GolSquadraCasa, match.GolSquadraOspite, match.SquadraOspite);
                    }
                    if (ospiteIn) {
                        aggiornaPunteggi(punteggi, match.SquadraOspite, match.GolSquadraOspite, match.GolSquadraCasa, match.SquadraCasa);
                    }
                }
            }

            return { girone, righe: ordinaClassifica(punteggi) };
        });

    return { classifiche, ultimaGiornata };
}

/*
-----------------------------------
IMMAGINI E COLORI
-----------------------------------
*/

const cacheImmagini = new Map();

function caricaImmagine(url) {
    if (!url) return Promise.resolve(null);
    if (!cacheImmagini.has(url)) {
        cacheImmagini.set(
            url,
            new Promise((resolve) => {
                const img = new Image();
                // Senza CORS il canvas diventerebbe "sporco" e non esportabile:
                // meglio che il caricamento fallisca e si usi il segnaposto
                img.crossOrigin = "anonymous";
                img.onload = () => resolve(img);
                img.onerror = () => resolve(null);
                img.src = url;
            })
        );
    }
    return cacheImmagini.get(url);
}

function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;
    if (max === min) return [0, 0, l];
    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    let h;
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    return [h * 60, s, l];
}

function hsl(h, s, l, a = 1) {
    return `hsla(${Math.round(h)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%, ${a})`;
}

// Colore dominante del logo, usato per le fasce della squadra.
// Loghi in bianco e nero (o non caricati) restano su un grigio neutro.
function coloreDominante(img) {
    const neutro = { h: 220, s: 0.06, l: 0.36 };
    if (!img) return neutro;

    const lato = 64;
    const canvas = document.createElement("canvas");
    canvas.width = lato;
    canvas.height = lato;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, lato, lato);

    let pixel;
    try {
        pixel = ctx.getImageData(0, 0, lato, lato).data;
    } catch {
        return neutro;
    }

    const bins = Array.from({ length: 24 }, () => ({ peso: 0, h: 0, s: 0, l: 0 }));
    let opachi = 0;
    let colorati = 0;

    for (let i = 0; i < pixel.length; i += 4) {
        if (pixel[i + 3] < 200) continue;
        opachi++;
        const [h, s, l] = rgbToHsl(pixel[i], pixel[i + 1], pixel[i + 2]);
        if (s < 0.28 || l < 0.12 || l > 0.88) continue;
        colorati++;
        const bin = bins[Math.floor(h / 15) % 24];
        const peso = s * (1 - Math.abs(l - 0.5));
        bin.peso += peso;
        bin.h += h * peso;
        bin.s += s * peso;
        bin.l += l * peso;
    }

    if (opachi === 0 || colorati / opachi < 0.06) return neutro;

    const migliore = bins.reduce((a, b) => (b.peso > a.peso ? b : a));
    return {
        h: migliore.h / migliore.peso,
        // Tinte sature ma non accecanti, sempre leggibili con testo bianco
        s: Math.min(0.75, Math.max(0.45, migliore.s / migliore.peso)),
        l: Math.min(0.46, Math.max(0.3, migliore.l / migliore.peso)),
    };
}

async function preparaSquadre(dati, avvisi) {
    const risultato = {};
    await Promise.all(
        Object.entries(dati.squadre).map(async ([chiave, squadra]) => {
            const logo = await caricaImmagine(squadra.Logo || squadra.LogoLR);
            if (!logo) avvisi.add(nomeSquadra(chiave));
            risultato[chiave] = {
                nome: nomeSquadra(chiave),
                logo,
                colore: coloreDominante(logo),
            };
        })
    );
    return risultato;
}

function squadraDi(squadre, chiave) {
    return (
        squadre[chiave] || {
            nome: nomeSquadra(chiave),
            logo: null,
            colore: { h: 220, s: 0.06, l: 0.36 },
        }
    );
}

/*
-----------------------------------
PRIMITIVE DI DISEGNO
-----------------------------------
*/

// Generatore pseudo-casuale con seme: stessa grafica a ogni generazione
function casuale(seme) {
    return () => {
        seme |= 0;
        seme = (seme + 0x6d2b79f5) | 0;
        let t = Math.imul(seme ^ (seme >>> 15), 1 | seme);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function parallelogramma(ctx, x, y, w, h, inclinazione) {
    ctx.beginPath();
    ctx.moveTo(x + inclinazione, y);
    ctx.lineTo(x + w, y);
    ctx.lineTo(x + w - inclinazione, y + h);
    ctx.lineTo(x, y + h);
    ctx.closePath();
}

function font(peso, dimensione, famiglia) {
    return `${peso} ${Math.round(dimensione)}px ${famiglia}`;
}

// Divide il testo in righe cercando la dimensione più grande che ci sta
function adattaTesto(ctx, testo, larghezza, maxRighe, dimMax, dimMin, peso = 800) {
    const parole = testo.split(/\s+/).filter(Boolean);

    for (let dim = dimMax; dim >= dimMin; dim -= 1) {
        ctx.font = font(peso, dim, FONT_TESTO);
        const righe = [];
        let riga = "";
        for (const parola of parole) {
            const prova = riga ? `${riga} ${parola}` : parola;
            if (ctx.measureText(prova).width <= larghezza || !riga) {
                riga = prova;
            } else {
                righe.push(riga);
                riga = parola;
            }
        }
        if (riga) righe.push(riga);

        const entra = righe.every((r) => ctx.measureText(r).width <= larghezza);
        if (righe.length <= maxRighe && entra) return { righe, dim };
    }

    ctx.font = font(peso, dimMin, FONT_TESTO);
    return { righe: [testo], dim: dimMin };
}

function disegnaRighe(ctx, righe, dim, x, yCentro, allineamento) {
    const interlinea = dim * 1.08;
    ctx.textAlign = allineamento;
    ctx.textBaseline = "middle";
    const yInizio = yCentro - ((righe.length - 1) * interlinea) / 2;
    righe.forEach((riga, i) => ctx.fillText(riga, x, yInizio + i * interlinea));
}

function disegnaLogo(ctx, squadra, cx, cy, diametro) {
    ctx.save();
    if (squadra.logo) {
        const { naturalWidth: lw, naturalHeight: lh } = squadra.logo;
        const scala = diametro / Math.max(lw, lh);
        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = diametro * 0.18;
        ctx.shadowOffsetY = diametro * 0.04;
        ctx.drawImage(squadra.logo, cx - (lw * scala) / 2, cy - (lh * scala) / 2, lw * scala, lh * scala);
    } else {
        // Segnaposto: cerchio con le iniziali della squadra
        const r = diametro / 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = hsl(squadra.colore.h, squadra.colore.s, 0.16);
        ctx.shadowColor = "rgba(0, 0, 0, 0.55)";
        ctx.shadowBlur = diametro * 0.18;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.lineWidth = Math.max(3, diametro * 0.04);
        ctx.strokeStyle = GIALLO;
        ctx.stroke();

        const iniziali = squadra.nome
            .replace(/\b(S\.?\s?t[ia]|S\.|e|ed)\b/gi, " ")
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((p) => p[0])
            .join("")
            .toUpperCase() || "?";
        ctx.fillStyle = "#ffffff";
        ctx.font = font(400, diametro * 0.46, FONT_TITOLI);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(iniziali, cx, cy + diametro * 0.03);
    }
    ctx.restore();
}

/*
-----------------------------------
SFONDO, INTESTAZIONE, PIÈ DI PAGINA
-----------------------------------
*/

let trama = null;

function tramaGrana() {
    if (trama) return trama;
    const lato = 256;
    trama = document.createElement("canvas");
    trama.width = lato;
    trama.height = lato;
    const ctx = trama.getContext("2d");
    const dati = ctx.createImageData(lato, lato);
    const rnd = casuale(7);
    for (let i = 0; i < dati.data.length; i += 4) {
        const v = rnd() * 255;
        dati.data[i] = v;
        dati.data[i + 1] = v;
        dati.data[i + 2] = v;
        dati.data[i + 3] = 255;
    }
    ctx.putImageData(dati, 0, 0);
    return trama;
}

function disegnaSfondo(ctx, seme) {
    const H = ctx.canvas.height;

    ctx.fillStyle = NERO;
    ctx.fillRect(0, 0, W, H);

    // Luce gialla negli angoli
    const bagliore = (x, y, r, alpha) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, `rgba(243, 230, 0, ${alpha})`);
        g.addColorStop(0.45, `rgba(243, 200, 0, ${alpha * 0.35})`);
        g.addColorStop(1, "rgba(243, 200, 0, 0)");
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, W, H);
    };
    bagliore(-60, H + 40, 760, 0.5);
    bagliore(W + 60, -80, 620, 0.42);

    // Linee ondulate in trasparenza
    const rnd = casuale(seme);
    const fase = rnd() * Math.PI * 2;
    ctx.save();
    ctx.lineWidth = 2;
    for (let i = -6; i < Math.ceil(H / 46) + 4; i++) {
        const base = i * 46;
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + (i % 3 === 0 ? 0.025 : 0)})`;
        ctx.beginPath();
        for (let x = -20; x <= W + 20; x += 12) {
            const y =
                base +
                x * 0.32 +
                Math.sin(x * 0.006 + fase + i * 0.18) * 60 +
                Math.sin(x * 0.017 + fase * 2 + i * 0.07) * 14;
            if (x === -20) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        }
        ctx.stroke();
    }
    ctx.restore();

    // Vignettatura
    const vignetta = ctx.createRadialGradient(W / 2, H / 2, H * 0.35, W / 2, H / 2, H * 0.8);
    vignetta.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignetta.addColorStop(1, "rgba(0, 0, 0, 0.55)");
    ctx.fillStyle = vignetta;
    ctx.fillRect(0, 0, W, H);

    // Grana
    ctx.save();
    ctx.globalAlpha = 0.05;
    ctx.globalCompositeOperation = "overlay";
    ctx.fillStyle = ctx.createPattern(tramaGrana(), "repeat");
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
}

// "6ª GIORNATA" con la "a" in apice
function disegnaGiornata(ctx, numero, prefisso, x, y, dimensione, colore) {
    const numeroTesto = String(numero);
    ctx.save();
    ctx.fillStyle = colore;
    ctx.textBaseline = "alphabetic";

    ctx.font = font(400, dimensione, FONT_TITOLI);
    const lPrefisso = prefisso ? ctx.measureText(prefisso + " ").width : 0;
    const lNumero = ctx.measureText(numeroTesto).width;
    const lResto = ctx.measureText(" GIORNATA").width;
    ctx.font = font(800, dimensione * 0.36, FONT_TESTO);
    const lApice = ctx.measureText("a").width + dimensione * 0.03;

    let cursore = x - (lPrefisso + lNumero + lApice + lResto) / 2;

    ctx.textAlign = "left";
    ctx.font = font(400, dimensione, FONT_TITOLI);
    if (prefisso) {
        ctx.fillText(prefisso + " ", cursore, y);
        cursore += lPrefisso;
    }
    ctx.fillText(numeroTesto, cursore, y);
    cursore += lNumero + dimensione * 0.015;

    ctx.font = font(800, dimensione * 0.36, FONT_TESTO);
    ctx.fillText("a", cursore, y - dimensione * 0.42);
    ctx.fillRect(cursore, y - dimensione * 0.36, lApice - dimensione * 0.04, dimensione * 0.035);
    cursore += lApice;

    ctx.font = font(400, dimensione, FONT_TITOLI);
    ctx.fillText(" GIORNATA", cursore, y);
    ctx.restore();
}

function disegnaIntestazione(ctx, logoCofta, titolo, sottotitolo) {
    // Logo COFTA Milano
    if (logoCofta) {
        const altezza = 104;
        const larghezza = (logoCofta.naturalWidth / logoCofta.naturalHeight) * altezza || altezza * 2.575;
        ctx.drawImage(logoCofta, 56, 54, larghezza, altezza);
    }

    // Titolo
    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 30;
    ctx.font = font(400, 196, FONT_TITOLI);
    ctx.fillText(titolo, W / 2, 372);
    ctx.restore();

    if (sottotitolo) sottotitolo(ctx, W / 2, 448);
}

function disegnaPiePagina(ctx, division, y = ctx.canvas.height - 108) {
    const testo = division.toUpperCase();
    ctx.save();
    ctx.font = font(400, 50, FONT_TITOLI);
    const larghezza = ctx.measureText(testo).width + 90;
    const altezza = 66;

    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 24;
    parallelogramma(ctx, W / 2 - larghezza / 2, y, larghezza, altezza, 18);
    ctx.fillStyle = GIALLO;
    ctx.fill();
    ctx.shadowColor = "transparent";

    ctx.fillStyle = NERO;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(testo, W / 2, y + altezza / 2 + 3);
    ctx.restore();
}

/*
-----------------------------------
PARTITE (CALENDARIO E RISULTATI)
-----------------------------------
*/

function formattaData(data) {
    const [giorno, mese] = (data || "").split("/").map(Number);
    if (!giorno || !mese) return "";
    const giornoSettimana = GIORNI[new Date(Number(edition), mese - 1, giorno).getDay()];
    return `${giornoSettimana} ${String(giorno).padStart(2, "0")}/${String(mese).padStart(2, "0")}`;
}

function disegnaPartita(ctx, partita, squadre, yCentro, altezza, modalita) {
    const casa = squadraDi(squadre, partita.casa);
    const ospite = squadraDi(squadre, partita.ospite);

    const x0 = 50;
    const x1 = W - 50;
    const inclinazione = altezza * 0.22;
    const y = yCentro - altezza / 2;
    const centroL = 205;
    const cx0 = W / 2 - centroL / 2;
    const cx1 = W / 2 + centroL / 2;

    ctx.save();

    // Fascia con i colori delle due squadre
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 30;
    ctx.shadowOffsetY = 10;
    parallelogramma(ctx, x0, y, x1 - x0, altezza, inclinazione);
    const fascia = ctx.createLinearGradient(x0, 0, x1, 0);
    const { h: hc, s: sc, l: lc } = casa.colore;
    const { h: ho, s: so, l: lo } = ospite.colore;
    fascia.addColorStop(0, hsl(hc, sc, lc));
    fascia.addColorStop(0.2, hsl(hc, sc, lc * 0.92));
    fascia.addColorStop((cx0 - x0) / (x1 - x0), hsl(hc, sc * 0.9, lc * 0.42));
    fascia.addColorStop((cx1 - x0) / (x1 - x0), hsl(ho, so * 0.9, lo * 0.42));
    fascia.addColorStop(0.8, hsl(ho, so, lo * 0.92));
    fascia.addColorStop(1, hsl(ho, so, lo));
    ctx.fillStyle = fascia;
    ctx.fill();
    ctx.shadowColor = "transparent";

    // Lucido in alto, ombra in basso
    const lucido = ctx.createLinearGradient(0, y, 0, y + altezza);
    lucido.addColorStop(0, "rgba(255, 255, 255, 0.16)");
    lucido.addColorStop(0.45, "rgba(255, 255, 255, 0.02)");
    lucido.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = lucido;
    ctx.fill();

    // Riquadro centrale scuro con orario o risultato
    parallelogramma(ctx, cx0, y, centroL, altezza, inclinazione);
    ctx.fillStyle = "rgba(8, 8, 9, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    const dimCentro = altezza * 0.86;

    if (modalita === "risultati") {
        const vinceCasa = partita.golCasa > partita.golOspite;
        const vinceOspite = partita.golOspite > partita.golCasa;
        ctx.font = font(400, dimCentro, FONT_TITOLI);

        ctx.textAlign = "right";
        ctx.globalAlpha = vinceOspite ? 0.55 : 1;
        ctx.fillText(String(partita.golCasa), W / 2 - 16, yCentro + dimCentro * 0.04);
        ctx.textAlign = "left";
        ctx.globalAlpha = vinceCasa ? 0.55 : 1;
        ctx.fillText(String(partita.golOspite), W / 2 + 16, yCentro + dimCentro * 0.04);
        ctx.globalAlpha = 1;

        // Separatore inclinato come la fascia
        ctx.strokeStyle = GIALLO;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(W / 2 + altezza * 0.08, y + altezza * 0.22);
        ctx.lineTo(W / 2 - altezza * 0.08, y + altezza * 0.78);
        ctx.stroke();
    } else {
        const orario = partita.orario || "TBD";
        ctx.textAlign = "center";
        let dim = dimCentro * 0.92;
        ctx.font = font(400, dim, FONT_TITOLI);
        while (ctx.measureText(orario).width > centroL - 50 && dim > 30) {
            dim -= 2;
            ctx.font = font(400, dim, FONT_TITOLI);
        }
        ctx.fillText(orario, W / 2, yCentro + dim * 0.04);
    }

    // Loghi che escono dalla fascia
    const diametro = altezza * 1.18;
    const logoCasaX = x0 + 78;
    const logoOspiteX = x1 - 78;
    disegnaLogo(ctx, casa, logoCasaX, yCentro, diametro);
    disegnaLogo(ctx, ospite, logoOspiteX, yCentro, diametro);

    // Nomi
    const margine = 18;
    const larghezzaNome = cx0 - (logoCasaX + diametro / 2 + margine) - margine;
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    const dimMax = Math.min(30, altezza * 0.27);

    const nomeCasa = adattaTesto(ctx, casa.nome.toUpperCase(), larghezzaNome, 3, dimMax, 16);
    ctx.font = font(800, nomeCasa.dim, FONT_TESTO);
    disegnaRighe(ctx, nomeCasa.righe, nomeCasa.dim, logoCasaX + diametro / 2 + margine, yCentro + 2, "left");

    const nomeOspite = adattaTesto(ctx, ospite.nome.toUpperCase(), larghezzaNome, 3, dimMax, 16);
    ctx.font = font(800, nomeOspite.dim, FONT_TESTO);
    disegnaRighe(ctx, nomeOspite.righe, nomeOspite.dim, logoOspiteX - diametro / 2 - margine, yCentro + 2, "right");
    ctx.shadowColor = "transparent";

    // Etichetta con data e campo sotto l'orario
    if (modalita === "calendario") {
        const parti = [formattaData(partita.data), partita.luogo.toUpperCase()].filter(Boolean);
        const testo = parti.length ? parti.join("  ·  ") : "DATA DA DEFINIRE";
        const dimEtichetta = Math.min(32, altezza * 0.27);
        ctx.font = font(400, dimEtichetta, FONT_TITOLI);
        const le = ctx.measureText(testo).width + 44;
        const ae = dimEtichetta * 1.25;
        const ye = y + altezza - ae * 0.35;
        parallelogramma(ctx, W / 2 - le / 2, ye, le, ae, ae * 0.3);
        ctx.fillStyle = GIALLO;
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = 12;
        ctx.fill();
        ctx.shadowColor = "transparent";
        ctx.fillStyle = NERO;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(testo, W / 2, ye + ae / 2 + 2);
    }

    ctx.restore();
}

function disegnaPaginaPartite(ctx, risorse, opzioni) {
    const { partite, squadre, modalita, giornata, division, pagina } = opzioni;

    disegnaSfondo(ctx, Number(giornata) * 13 + pagina + (modalita === "risultati" ? 5 : 0));
    disegnaIntestazione(ctx, risorse.logoCofta, modalita === "risultati" ? "RISULTATI" : "CALENDARIO", (c, x, y) =>
        disegnaGiornata(c, giornata, "", x, y, 84, GIALLO)
    );

    // Le partite si distribuiscono nello spazio tra titolo e piè di pagina
    const alto = 520;
    const basso = 1195;
    const slot = Math.min(190, (basso - alto) / partite.length);
    const altezza = Math.min(122, slot * (modalita === "calendario" ? 0.6 : 0.68));
    const inizio = alto + (basso - alto - slot * partite.length) / 2;

    partite.forEach((partita, i) => {
        const yCentro = inizio + slot * i + slot / 2 - (modalita === "calendario" ? altezza * 0.12 : 0);
        disegnaPartita(ctx, partita, squadre, yCentro, altezza, modalita);
    });

    disegnaPiePagina(ctx, division);
}

/*
-----------------------------------
CLASSIFICA
-----------------------------------
*/

function disegnaPaginaClassifica(ctx, risorse, opzioni) {
    const { righe, squadre, girone, ultimaGiornata, division } = opzioni;

    disegnaSfondo(ctx, 99 + (girone.charCodeAt(0) || 0));
    disegnaIntestazione(ctx, risorse.logoCofta, "CLASSIFICA", (c, x, y) => {
        const prefisso = girone ? `GIRONE ${girone.toUpperCase()} ·` : "";
        if (ultimaGiornata > 0) {
            disegnaGiornata(c, ultimaGiornata, prefisso, x, y, 84, GIALLO);
        } else if (girone) {
            c.save();
            c.fillStyle = GIALLO;
            c.textAlign = "center";
            c.font = font(400, 84, FONT_TITOLI);
            c.fillText(`GIRONE ${girone.toUpperCase()}`, x, y);
            c.restore();
        }
    });

    const penalizzate = righe.filter(([, dati]) => Number(dati.penaltyPoints) > 0);

    const x0 = 56;
    const x1 = W - 56;
    const alto = 540;
    const basso = penalizzate.length ? 1150 : 1185;
    const passo = Math.min(98, (basso - alto) / Math.max(righe.length, 1));
    const altezza = passo - Math.max(6, passo * 0.12);
    const inclinazione = altezza * 0.16;

    // Colonne: centro x di ogni statistica
    const colonne = [
        { etichetta: "PG", x: 662, valore: (d) => d.playedMatches },
        { etichetta: "V", x: 728, valore: (d) => d.wonMatches },
        { etichetta: "N", x: 788, valore: (d) => d.drawnMatches },
        { etichetta: "P", x: 848, valore: (d) => d.lostMatches },
        { etichetta: "DR", x: 918, valore: (d) => (d.goalsDifference > 0 ? `+${d.goalsDifference}` : d.goalsDifference) },
    ];
    const ptX = 988;

    ctx.save();

    // Intestazione colonne
    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = font(800, 20, FONT_TESTO);
    ctx.textBaseline = "alphabetic";
    ctx.textAlign = "left";
    ctx.fillText("SQUADRA", 214, alto - 16);
    ctx.textAlign = "center";
    colonne.forEach((c) => ctx.fillText(c.etichetta, c.x, alto - 16));
    ctx.fillStyle = GIALLO;
    ctx.fillText("PT", ptX, alto - 16);

    righe.forEach(([chiave, dati], i) => {
        const squadra = squadraDi(squadre, chiave);
        const primo = i === 0;
        const y = alto + i * passo;
        const yc = y + altezza / 2;
        const punti = dati.points - (Number(dati.penaltyPoints) || 0);

        // Barra della riga
        parallelogramma(ctx, x0, y, x1 - x0, altezza, inclinazione);
        if (primo) {
            const g = ctx.createLinearGradient(x0, 0, x1, 0);
            g.addColorStop(0, GIALLO);
            g.addColorStop(1, "#ffd400");
            ctx.fillStyle = g;
            ctx.shadowColor = "rgba(243, 230, 0, 0.35)";
            ctx.shadowBlur = 30;
        } else {
            ctx.fillStyle = i % 2 ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.11)";
        }
        ctx.fill();
        ctx.shadowColor = "transparent";

        // Striscia col colore della squadra
        ctx.save();
        ctx.clip();
        const { h, s, l } = squadra.colore;
        ctx.fillStyle = primo ? NERO : hsl(h, s, Math.max(l, 0.42));
        parallelogramma(ctx, x0 + inclinazione * 0.5 - 4, y, 104, altezza, inclinazione);
        ctx.fill();
        ctx.restore();

        const coloreTesto = primo ? NERO : "#ffffff";

        // Posizione
        ctx.fillStyle = primo ? GIALLO : "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = font(400, altezza * 0.72, FONT_TITOLI);
        ctx.fillText(String(i + 1), x0 + 50, yc + altezza * 0.04);

        // Logo
        disegnaLogo(ctx, squadra, 160, yc, altezza * 0.92);

        // Nome
        ctx.fillStyle = coloreTesto;
        const nome = squadra.nome.toUpperCase() + (Number(dati.penaltyPoints) > 0 ? " *" : "");
        const testoNome = adattaTesto(ctx, nome, 612 - 214, 2, Math.min(30, altezza * 0.36), 15);
        ctx.font = font(800, testoNome.dim, FONT_TESTO);
        disegnaRighe(ctx, testoNome.righe, testoNome.dim, 214, yc + 1, "left");

        // Statistiche
        ctx.font = font(700, Math.min(30, altezza * 0.36), FONT_TESTO);
        ctx.textAlign = "center";
        colonne.forEach((c) => {
            ctx.fillStyle = primo ? "rgba(11, 11, 12, 0.85)" : "rgba(255, 255, 255, 0.88)";
            ctx.fillText(String(c.valore(dati)), c.x, yc + 1);
        });

        // Punti
        const lp = 76;
        parallelogramma(ctx, ptX - lp / 2, y + altezza * 0.14, lp, altezza * 0.72, inclinazione * 0.6);
        ctx.fillStyle = primo ? NERO : GIALLO;
        ctx.fill();
        ctx.fillStyle = primo ? GIALLO : NERO;
        ctx.font = font(400, altezza * 0.62, FONT_TITOLI);
        ctx.fillText(String(punti), ptX, yc + altezza * 0.04);
    });

    // Nota penalizzazioni
    if (penalizzate.length) {
        const nota = penalizzate
            .map(([chiave, dati]) => `${squadraDi(squadre, chiave).nome} -${Number(dati.penaltyPoints)} pt`)
            .join("  ·  ");
        ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
        ctx.font = font(600, 20, FONT_TESTO);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
        ctx.fillText(`* Penalizzazione: ${nota}`, x0 + 10, alto + righe.length * passo + 22);
    }

    ctx.restore();

    disegnaPiePagina(ctx, division);
}

/*
-----------------------------------
STORIA DELLA SINGOLA PARTITA
-----------------------------------
*/

// Le chiavi "AutogolCasa"/"AutogolOspite" sono gol regalati dagli avversari
function elencoMarcatori(marcatori) {
    return Object.entries(marcatori || {})
        .map(([nome, gol]) => {
            const autogol = nome.startsWith("Autogol");
            return { nome: autogol ? "Autogol" : nome, gol: Number(gol) || 0, autogol };
        })
        .filter((m) => m.gol > 0)
        .sort((a, b) => a.autogol - b.autogol || b.gol - a.gol || a.nome.localeCompare(b.nome));
}

function disegnaPallone(ctx, cx, cy, r, colore) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fillStyle = colore;
    ctx.fill();

    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const angolo = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        ctx.lineTo(cx + Math.cos(angolo) * r * 0.55, cy + Math.sin(angolo) * r * 0.55);
    }
    ctx.closePath();
    ctx.fillStyle = NERO;
    ctx.fill();
    ctx.restore();
}

// Una riga di marcatore: pallone, nome ed eventuale "x2" in giallo
function disegnaMarcatore(ctx, marcatore, x, y, larghezza, dimMax, allineamento) {
    const multiplo = marcatore.gol > 1 ? ` x${marcatore.gol}` : "";
    const raggio = dimMax * 0.36;
    const spazioIcona = raggio * 2 + 14;

    let dim = dimMax;
    const misura = () => {
        ctx.font = font(700, dim, FONT_TESTO);
        const lNome = ctx.measureText(marcatore.nome).width;
        ctx.font = font(400, dim * 1.25, FONT_TITOLI);
        return { lNome, lMultiplo: ctx.measureText(multiplo).width };
    };
    let { lNome, lMultiplo } = misura();
    while (spazioIcona + lNome + lMultiplo > larghezza && dim > 16) {
        dim -= 1;
        ({ lNome, lMultiplo } = misura());
    }

    const totale = spazioIcona + lNome + lMultiplo;
    let cursore = allineamento === "left" ? x : x - totale;

    ctx.save();
    ctx.textBaseline = "middle";
    ctx.textAlign = "left";
    ctx.globalAlpha = marcatore.autogol ? 0.65 : 1;

    disegnaPallone(ctx, cursore + raggio, y, raggio, marcatore.autogol ? "rgba(255, 255, 255, 0.6)" : "#ffffff");
    cursore += spazioIcona;

    ctx.fillStyle = "#ffffff";
    ctx.font = font(marcatore.autogol ? 600 : 700, dim, FONT_TESTO);
    ctx.fillText(marcatore.nome, cursore, y + 1);
    cursore += lNome;

    if (multiplo) {
        ctx.fillStyle = GIALLO;
        ctx.font = font(400, dim * 1.25, FONT_TITOLI);
        ctx.fillText(multiplo, cursore, y + dim * 0.08);
    }
    ctx.restore();
}

function disegnaStoria(ctx, risorse, opzioni) {
    const { partita, squadre, giornata, division } = opzioni;
    const casa = squadraDi(squadre, partita.casa);
    const ospite = squadraDi(squadre, partita.ospite);

    disegnaSfondo(ctx, Number(giornata) * 31 + partita.casa.length * 7 + partita.ospite.length);

    // Logo COFTA centrato, sotto la zona coperta dall'interfaccia di Instagram
    if (risorse.logoCofta) {
        const altezza = 118;
        const larghezza = (risorse.logoCofta.naturalWidth / risorse.logoCofta.naturalHeight) * altezza || altezza * 2.575;
        ctx.drawImage(risorse.logoCofta, W / 2 - larghezza / 2, 250, larghezza, altezza);
    }

    ctx.save();
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 30;
    ctx.font = font(400, 176, FONT_TITOLI);
    ctx.fillText("RISULTATO", W / 2, 560);
    ctx.restore();
    disegnaGiornata(ctx, giornata, "", W / 2, 640, 80, GIALLO);

    // Fascia con i colori delle squadre e punteggio al centro
    const yCentro = 850;
    const altezza = 210;
    const x0 = 36;
    const x1 = W - 36;
    const inclinazione = 46;
    const centroL = 330;
    const cx0 = W / 2 - centroL / 2;
    const cx1 = W / 2 + centroL / 2;
    const y = yCentro - altezza / 2;

    ctx.save();
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    parallelogramma(ctx, x0, y, x1 - x0, altezza, inclinazione);
    const fascia = ctx.createLinearGradient(x0, 0, x1, 0);
    const { h: hc, s: sc, l: lc } = casa.colore;
    const { h: ho, s: so, l: lo } = ospite.colore;
    fascia.addColorStop(0, hsl(hc, sc, lc));
    fascia.addColorStop((cx0 - x0) / (x1 - x0), hsl(hc, sc * 0.9, lc * 0.45));
    fascia.addColorStop((cx1 - x0) / (x1 - x0), hsl(ho, so * 0.9, lo * 0.45));
    fascia.addColorStop(1, hsl(ho, so, lo));
    ctx.fillStyle = fascia;
    ctx.fill();
    ctx.shadowColor = "transparent";

    const lucido = ctx.createLinearGradient(0, y, 0, y + altezza);
    lucido.addColorStop(0, "rgba(255, 255, 255, 0.16)");
    lucido.addColorStop(0.45, "rgba(255, 255, 255, 0.02)");
    lucido.addColorStop(1, "rgba(0, 0, 0, 0.28)");
    ctx.fillStyle = lucido;
    ctx.fill();

    parallelogramma(ctx, cx0, y, centroL, altezza, inclinazione);
    ctx.fillStyle = "rgba(8, 8, 9, 0.94)";
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
    ctx.lineWidth = 2;
    ctx.stroke();

    const vinceCasa = partita.golCasa > partita.golOspite;
    const vinceOspite = partita.golOspite > partita.golCasa;
    let dimGol = 200;
    ctx.font = font(400, dimGol, FONT_TITOLI);
    const lunghezzaGol = () =>
        Math.max(ctx.measureText(String(partita.golCasa)).width, ctx.measureText(String(partita.golOspite)).width);
    while (lunghezzaGol() > centroL / 2 - 36 && dimGol > 80) {
        dimGol -= 4;
        ctx.font = font(400, dimGol, FONT_TITOLI);
    }
    ctx.fillStyle = "#ffffff";
    ctx.textBaseline = "middle";
    ctx.textAlign = "right";
    ctx.globalAlpha = vinceOspite ? 0.55 : 1;
    ctx.fillText(String(partita.golCasa), W / 2 - 22, yCentro + dimGol * 0.04);
    ctx.textAlign = "left";
    ctx.globalAlpha = vinceCasa ? 0.55 : 1;
    ctx.fillText(String(partita.golOspite), W / 2 + 22, yCentro + dimGol * 0.04);
    ctx.globalAlpha = 1;

    ctx.strokeStyle = GIALLO;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(W / 2 + 18, y + altezza * 0.2);
    ctx.lineTo(W / 2 - 18, y + altezza * 0.8);
    ctx.stroke();

    // Loghi grandi ai lati
    const diametro = 250;
    const logoCasaX = x0 + 150;
    const logoOspiteX = x1 - 150;
    disegnaLogo(ctx, casa, logoCasaX, yCentro, diametro);
    disegnaLogo(ctx, ospite, logoOspiteX, yCentro, diametro);

    // Nomi sotto i loghi
    ctx.fillStyle = "#ffffff";
    ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
    ctx.shadowBlur = 8;
    const larghezzaNome = 340;
    const nomeCasa = adattaTesto(ctx, casa.nome.toUpperCase(), larghezzaNome, 2, 38, 22);
    ctx.font = font(800, nomeCasa.dim, FONT_TESTO);
    disegnaRighe(ctx, nomeCasa.righe, nomeCasa.dim, logoCasaX, 1052, "center");
    const nomeOspite = adattaTesto(ctx, ospite.nome.toUpperCase(), larghezzaNome, 2, 38, 22);
    ctx.font = font(800, nomeOspite.dim, FONT_TESTO);
    disegnaRighe(ctx, nomeOspite.righe, nomeOspite.dim, logoOspiteX, 1052, "center");
    ctx.shadowColor = "transparent";

    // Data e campo
    const parti = [formattaData(partita.data), partita.luogo.toUpperCase()].filter(Boolean);
    if (parti.length) {
        const testo = parti.join("  ·  ");
        ctx.font = font(400, 36, FONT_TITOLI);
        const le = ctx.measureText(testo).width + 50;
        const ae = 50;
        const ye = 1135;
        parallelogramma(ctx, W / 2 - le / 2, ye, le, ae, 15);
        ctx.fillStyle = GIALLO;
        ctx.fill();
        ctx.fillStyle = NERO;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(testo, W / 2, ye + ae / 2 + 2);
    }

    // Marcatori
    const yTitolo = 1270;
    ctx.fillStyle = "#ffffff";
    ctx.font = font(400, 64, FONT_TITOLI);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("MARCATORI", W / 2, yTitolo);
    const lTitolo = ctx.measureText("MARCATORI").width;
    ctx.strokeStyle = GIALLO;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(70, yTitolo);
    ctx.lineTo(W / 2 - lTitolo / 2 - 30, yTitolo);
    ctx.moveTo(W / 2 + lTitolo / 2 + 30, yTitolo);
    ctx.lineTo(W - 70, yTitolo);
    ctx.stroke();

    const marcatoriCasa = elencoMarcatori(partita.marcatori?.MarcatoriCasa);
    const marcatoriOspite = elencoMarcatori(partita.marcatori?.MarcatoriOspite);
    const alto = 1335;
    const basso = 1600;

    if (!partita.marcatori) {
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.font = font(600, 30, FONT_TESTO);
        ctx.fillText("Marcatori non disponibili", W / 2, alto + 60);
    } else {
        const righe = Math.max(marcatoriCasa.length, marcatoriOspite.length, 1);
        const passo = Math.min(64, (basso - alto) / righe);
        const dim = Math.min(34, passo * 0.58);
        const larghezza = W / 2 - 70 - 30;

        const colonna = (elenco, x, allineamento) => {
            if (elenco.length === 0) {
                ctx.fillStyle = "rgba(255, 255, 255, 0.45)";
                ctx.font = font(700, dim, FONT_TESTO);
                ctx.textAlign = allineamento;
                ctx.fillText("—", x, alto + passo / 2);
                return;
            }
            elenco.forEach((marcatore, i) =>
                disegnaMarcatore(ctx, marcatore, x, alto + passo * i + passo / 2, larghezza, dim, allineamento)
            );
        };
        colonna(marcatoriCasa, 70, "left");
        colonna(marcatoriOspite, W - 70, "right");

        ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(W / 2, alto);
        ctx.lineTo(W / 2, alto + passo * righe);
        ctx.stroke();
    }
    ctx.restore();

    disegnaPiePagina(ctx, division, 1630);
}

/*
-----------------------------------
GENERAZIONE
-----------------------------------
*/

async function preparaRisorse() {
    await Promise.all([
        document.fonts.load(font(400, 100, FONT_TITOLI)),
        document.fonts.load(font(800, 30, FONT_TESTO)),
        document.fonts.load(font(700, 30, FONT_TESTO)),
        document.fonts.load(font(600, 30, FONT_TESTO)),
    ]);
    return { logoCofta: await caricaImmagine(LOGO_COFTA) };
}

function nuovaTela(altezza = H) {
    const canvas = document.createElement("canvas");
    canvas.width = W;
    canvas.height = altezza;
    return canvas;
}

function esporta(canvas, nome) {
    return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
            if (blob) resolve({ nome, blob });
            else reject(new Error(`Impossibile esportare ${nome}`));
        }, "image/png");
    });
}

function nomeFile(division, tipo, suffisso = "") {
    return `COFTA-${edition}-${division}-${tipo}${suffisso}.png`;
}

/**
 * Genera le grafiche richieste per una divisione.
 * @param {object} dati - risultato di caricaDatiSocial()
 * @param {string[]} tipi - "calendario", "risultati", "classifica", "storie"
 * @param {string} giornata - giornata per calendario, risultati e storie
 * @returns {Promise<{immagini: {nome, blob}[], messaggi: string[], loghiMancanti: string[]}>}
 */
export async function generaGrafiche(dati, tipi, giornata) {
    const risorse = await preparaRisorse();
    const loghiMancanti = new Set();
    const squadre = await preparaSquadre(dati, loghiMancanti);

    const immagini = [];
    const messaggi = [];

    for (const tipo of tipi) {
        if (tipo !== "classifica") {
            if (!giornata) {
                messaggi.push("Il calendario non è ancora stato creato.");
                continue;
            }

            let partite = partiteGiornata(dati, giornata);
            if (tipo !== "calendario") partite = partite.filter((p) => p.giocata);

            if (partite.length === 0) {
                messaggi.push(
                    tipo === "calendario"
                        ? `Nessuna partita in calendario per la giornata ${giornata}.`
                        : `Nessun risultato inserito per la giornata ${giornata}.`
                );
                continue;
            }

            if (tipo === "storie") {
                for (const partita of partite) {
                    const canvas = nuovaTela(H_STORIA);
                    disegnaStoria(canvas.getContext("2d"), risorse, {
                        partita,
                        squadre,
                        giornata,
                        division: dati.division,
                    });
                    const sigla = (chiave) => chiave.replace(/[^A-Za-z0-9]+/g, "");
                    const suffisso = `-G${giornata}-${sigla(partita.casa)}-${sigla(partita.ospite)}`;
                    immagini.push(await esporta(canvas, nomeFile(dati.division, "Storia", suffisso)));
                }
                continue;
            }

            const pagine = Math.ceil(partite.length / PARTITE_PER_PAGINA);
            // Pagine bilanciate: 6 partite diventano 3+3, non 5+1
            const perPagina = Math.ceil(partite.length / pagine);
            for (let pagina = 0; pagina < pagine; pagina++) {
                const canvas = nuovaTela();
                disegnaPaginaPartite(canvas.getContext("2d"), risorse, {
                    partite: partite.slice(pagina * perPagina, (pagina + 1) * perPagina),
                    squadre,
                    modalita: tipo,
                    giornata,
                    division: dati.division,
                    pagina,
                });
                const titolo = tipo === "risultati" ? "Risultati" : "Calendario";
                const suffisso = `-G${giornata}` + (pagine > 1 ? `-${pagina + 1}` : "");
                immagini.push(await esporta(canvas, nomeFile(dati.division, titolo, suffisso)));
            }
        }

        if (tipo === "classifica") {
            if (Object.keys(dati.squadre).length === 0) {
                messaggi.push("Nessuna squadra: impossibile generare la classifica.");
                continue;
            }
            const { classifiche, ultimaGiornata } = calcolaClassifiche(dati);
            for (const { girone, righe } of classifiche) {
                const canvas = nuovaTela();
                disegnaPaginaClassifica(canvas.getContext("2d"), risorse, {
                    righe,
                    squadre,
                    girone,
                    ultimaGiornata,
                    division: dati.division,
                });
                const suffisso = girone ? `-Girone${girone}` : "";
                immagini.push(await esporta(canvas, nomeFile(dati.division, "Classifica", suffisso)));
            }
        }
    }

    return { immagini, messaggi, loghiMancanti: [...loghiMancanti] };
}
