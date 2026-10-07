import { edition } from "../../divisione.js";
import {
  W,
  GIALLO,
  NERO,
  FONT_TITOLI,
  FONT_TESTO,
  GIORNI,
  hsl,
  squadraDi,
  parallelogramma,
  font,
  adattaTesto,
  disegnaRighe,
  disegnaLogo,
  disegnaSfondo,
  disegnaGiornata,
  disegnaIntestazione,
  disegnaPiePagina,
} from "./disegno.js";

/*
===================================
GRAFICHE SOCIAL: PAGINE
===================================
Le singole grafiche: partite (calendario e risultati), classifica e storie.
*/

/*
-----------------------------------
PARTITE (CALENDARIO E RISULTATI)
-----------------------------------
*/

export function formattaData(data) {
  const [giorno, mese] = (data || "").split("/").map(Number);
  if (!giorno || !mese) return "";
  const giornoSettimana = GIORNI[new Date(Number(edition), mese - 1, giorno).getDay()];
  return `${giornoSettimana} ${String(giorno).padStart(2, "0")}/${String(mese).padStart(2, "0")}`;
}

export function disegnaPartita(ctx, partita, squadre, yCentro, altezza, modalita) {
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
  disegnaRighe(
    ctx,
    nomeOspite.righe,
    nomeOspite.dim,
    logoOspiteX - diametro / 2 - margine,
    yCentro + 2,
    "right"
  );
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

export function disegnaPaginaPartite(ctx, risorse, opzioni) {
  const { partite, squadre, modalita, giornata, division, pagina } = opzioni;

  disegnaSfondo(ctx, Number(giornata) * 13 + pagina + (modalita === "risultati" ? 5 : 0));
  disegnaIntestazione(
    ctx,
    risorse.logoCofta,
    modalita === "risultati" ? "RISULTATI" : "CALENDARIO",
    (c, x, y) => disegnaGiornata(c, giornata, "", x, y, 84, GIALLO)
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

export function disegnaPaginaClassifica(ctx, risorse, opzioni) {
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
    {
      etichetta: "DR",
      x: 918,
      valore: (d) => (d.goalsDifference > 0 ? `+${d.goalsDifference}` : d.goalsDifference),
    },
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
export function elencoMarcatori(marcatori) {
  return Object.entries(marcatori || {})
    .map(([nome, gol]) => {
      const autogol = nome.startsWith("Autogol");
      return { nome: autogol ? "Autogol" : nome, gol: Number(gol) || 0, autogol };
    })
    .filter((m) => m.gol > 0)
    .sort((a, b) => a.autogol - b.autogol || b.gol - a.gol || a.nome.localeCompare(b.nome));
}

export function disegnaPallone(ctx, cx, cy, r, colore) {
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
export function disegnaMarcatore(ctx, marcatore, x, y, larghezza, dimMax, allineamento) {
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

  disegnaPallone(
    ctx,
    cursore + raggio,
    y,
    raggio,
    marcatore.autogol ? "rgba(255, 255, 255, 0.6)" : "#ffffff"
  );
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

export function disegnaStoria(ctx, risorse, opzioni) {
  const { partita, squadre, giornata, division } = opzioni;
  const casa = squadraDi(squadre, partita.casa);
  const ospite = squadraDi(squadre, partita.ospite);

  disegnaSfondo(ctx, Number(giornata) * 31 + partita.casa.length * 7 + partita.ospite.length);

  // Logo COFTA centrato, sotto la zona coperta dall'interfaccia di Instagram
  if (risorse.logoCofta) {
    const altezza = 118;
    const larghezza =
      (risorse.logoCofta.naturalWidth / risorse.logoCofta.naturalHeight) * altezza || altezza * 2.575;
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
    Math.max(
      ctx.measureText(String(partita.golCasa)).width,
      ctx.measureText(String(partita.golOspite)).width
    );
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
