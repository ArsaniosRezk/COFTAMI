/*
===================================
GENERATORE CALENDARIO
===================================

Funzioni pure (niente DOM, niente Firebase) usate dall'editor del calendario
nel gestionale. Una "giornata" è un array di partite [casa, ospite]; un
girone produce un array di giornate.

Tutte le funzioni casuali accettano un generatore `rng` (default Math.random)
così da poterle testare con un seme fisso.
*/

export function mescola(array, rng = Math.random) {
    const copia = [...array];
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
    }
    return copia;
}

// Metodo del cerchio (Berger): con n squadre pari produce n-1 giornate in cui
// ognuno gioca una volta; con n dispari si aggiunge un "riposo" e ogni
// squadra salta una giornata. Restituisce coppie non orientate.
function giroCompleto(squadre) {
    const RIPOSO = null;
    const giro = squadre.length % 2 === 0 ? [...squadre] : [...squadre, RIPOSO];
    const n = giro.length;
    const giornate = [];

    for (let turno = 0; turno < n - 1; turno++) {
        const partite = [];
        for (let i = 0; i < n / 2; i++) {
            const a = giro[i];
            const b = giro[n - 1 - i];
            if (a !== RIPOSO && b !== RIPOSO) partite.push([a, b]);
        }
        giornate.push(partite);
        // Il primo resta fermo, gli altri ruotano di un posto
        giro.splice(1, 0, giro.pop());
    }
    return giornate;
}

// Sceglie chi gioca in casa scorrendo le giornate in ordine: ogni volta in
// casa va la squadra che finora ha giocato meno in casa (a parità, quella
// che è stata in trasferta più di recente). `casa` può arrivare già avviato
// per tenere conto delle partite esistenti.
export function orientaCasaTrasferta(giornate, rng = Math.random, casa = {}) {
    const ultimaInCasa = {};
    const conta = (squadra) => casa[squadra] || 0;

    const orientate = giornate.map((partite, indice) =>
        mescola(partite, rng).map(([a, b]) => {
            let aInCasa;
            if (conta(a) !== conta(b)) aInCasa = conta(a) < conta(b);
            else if ((ultimaInCasa[a] ?? -1) !== (ultimaInCasa[b] ?? -1))
                aInCasa = (ultimaInCasa[a] ?? -1) < (ultimaInCasa[b] ?? -1);
            else aInCasa = rng() < 0.5;

            const [h, o] = aInCasa ? [a, b] : [b, a];
            casa[h] = conta(h) + 1;
            ultimaInCasa[h] = indice;
            return [h, o];
        })
    );

    // Il criterio sopra a volte lascia squadre con 2-3 partite in casa più
    // che in trasferta: si corregge invertendo il minimo indispensabile
    bilanciaCasaTrasferta(orientate.flat());
    return orientate;
}

// Inverte casa/trasferta di alcune partite finché ogni squadra ha al massimo
// una partita in casa in più (o in meno) rispetto alle trasferte.
// `partite` sono array [casa, ospite] modificati sul posto; quelle con
// `bloccata(partita) === true` non vengono mai invertite.
// Per togliere una partita in casa ad A senza sbilanciare nessun altro si
// cerca una catena A→B→…→Z (ognuno ospita il successivo) che finisca in una
// squadra con più trasferte, e la si inverte tutta: le squadre intermedie
// guadagnano e perdono una partita in casa, A ne perde una e Z ne guadagna una.
// Restituisce il numero di partite invertite.
export function bilanciaCasaTrasferta(partite, bloccata = () => false) {
    const saldo = {};
    for (const [h, o] of partite) {
        saldo[h] = (saldo[h] || 0) + 1;
        saldo[o] = (saldo[o] || 0) - 1;
    }

    let invertite = 0;
    // Squadre che non si possono sistemare (es. per partite bloccate)
    const irrisolvibili = new Set();
    for (let giro = 0; giro < partite.length * 4; giro++) {
        const candidate = Object.keys(saldo).filter((s) => !irrisolvibili.has(s));
        const eccesso = candidate.find((s) => saldo[s] >= 2);
        const difetto = candidate.find((s) => saldo[s] <= -2);
        if (eccesso === undefined && difetto === undefined) break;

        // Da una squadra con troppe partite in casa si seguono le partite che
        // ospita; da una con troppe trasferte quelle in cui è ospite
        const partenza = eccesso ?? difetto;
        const versoCasa = eccesso !== undefined;
        const catena = cercaCatena(partite, partenza, versoCasa, saldo, bloccata);
        if (!catena) {
            irrisolvibili.add(partenza);
            continue;
        }

        for (const partita of catena) {
            const [h, o] = partita;
            partita[0] = o;
            partita[1] = h;
        }
        const arrivo = versoCasa ? catena.at(-1)[0] : catena.at(-1)[1];
        saldo[partenza] += versoCasa ? -2 : 2;
        saldo[arrivo] += versoCasa ? 2 : -2;
        invertite += catena.length;
    }
    return invertite;
}

// Ricerca in ampiezza della catena più corta (vedi bilanciaCasaTrasferta)
function cercaCatena(partite, partenza, versoCasa, saldo, bloccata) {
    const precedente = new Map([[partenza, null]]);
    const coda = [partenza];

    while (coda.length) {
        const squadra = coda.shift();
        for (const partita of partite) {
            if (bloccata(partita)) continue;
            const [h, o] = partita;
            const [da, a] = versoCasa ? [h, o] : [o, h];
            if (da !== squadra || precedente.has(a)) continue;

            precedente.set(a, partita);
            const arrivoOk = versoCasa ? saldo[a] <= -1 : saldo[a] >= 1;
            if (arrivoOk) {
                const catena = [];
                for (let s = a; precedente.get(s); ) {
                    const p = precedente.get(s);
                    catena.unshift(p);
                    s = versoCasa ? p[0] : p[1];
                }
                return catena;
            }
            coda.push(a);
        }
    }
    return null;
}

// Tutti contro tutti, solo andata o andata e ritorno (il ritorno ripete le
// giornate dell'andata nello stesso ordine con casa e trasferta invertite)
export function generaTuttiControTutti(squadre, { andataRitorno = false } = {}, rng = Math.random) {
    if (squadre.length < 2) return [];

    const andata = orientaCasaTrasferta(
        mescola(giroCompleto(mescola(squadre, rng)), rng),
        rng
    );
    if (!andataRitorno) return andata;

    const ritorno = andata.map((partite) => partite.map(([h, o]) => [o, h]));
    return [...andata, ...ritorno];
}

// Il massimo di partite per squadra in un girone di n squadre
export function massimoPartitePerSquadra(n) {
    return Math.max(n - 1, 0);
}

// Con un numero dispari di squadre e x dispari è impossibile che tutte
// giochino esattamente x partite (servirebbe un numero di "metà partite"
// dispari): una squadra ne giocherà x-1.
export function descriviEstrazione(n, x) {
    if (n < 2) return { valido: false, messaggio: "servono almeno 2 squadre" };
    const massimo = massimoPartitePerSquadra(n);
    if (!Number.isInteger(x) || x < 1) return { valido: false, messaggio: "x deve essere almeno 1" };
    if (x > massimo)
        return { valido: false, messaggio: `con ${n} squadre il massimo è ${massimo}` };

    const giornateMinime = n % 2 === 0 ? x : Math.ceil((n * x) / (n - 1));
    const unaInMeno = n % 2 === 1 && x % 2 === 1;
    return {
        valido: true,
        partite: Math.floor((n * x) / 2),
        giornateMinime,
        unaInMeno,
        messaggio: unaInMeno
            ? `una squadra giocherà ${x - 1} partite (squadre dispari e x dispari)`
            : "",
    };
}

// Estrazione casuale: ogni squadra gioca x partite contro avversari diversi
// del proprio girone, estratti a caso.
export function generaEstrazioneCasuale(squadre, x, rng = Math.random) {
    const n = squadre.length;
    const info = descriviEstrazione(n, x);
    if (!info.valido) throw new Error(info.messaggio);

    const ordine = mescola(squadre, rng);

    // n pari: x giornate scelte a caso da un girone completo. Ogni giornata
    // di un girone completo pari fa giocare tutti, quindi bastano x giornate.
    if (n % 2 === 0) {
        const scelte = mescola(giroCompleto(ordine), rng).slice(0, x);
        return orientaCasaTrasferta(scelte, rng);
    }

    // n dispari e x = n-1 è il girone completo: il metodo del cerchio usa
    // già il minimo di giornate
    if (x === n - 1) {
        return orientaCasaTrasferta(mescola(giroCompleto(ordine), rng), rng);
    }

    // n dispari: si sceglie un insieme di coppie in cui ognuno ha x avversari
    // e poi lo si divide in giornate
    const coppie = coppieRegolari(ordine, x, rng);
    return orientaCasaTrasferta(dividiInGiornate(coppie, rng), rng);
}

// n dispari. Squadre disposte in cerchio: per ogni "distanza" d scelta ogni
// squadra affronta quella a d posti a destra e quella a d posti a sinistra
// (2 avversari). Con x dispari serve un avversario in più per quasi tutti.
function coppieRegolari(ordine, x, rng) {
    const n = ordine.length;
    let distanze = mescola(
        Array.from({ length: (n - 1) / 2 }, (_, i) => i + 1),
        rng
    );

    // Con x dispari si tiene da parte una distanza senza divisori comuni con
    // n: le sue coppie formano un unico giro che passa da tutte le squadre,
    // e prendendone una sì e una no resta fuori una sola squadra
    let distanzaExtra = null;
    if (x % 2 === 1) {
        distanzaExtra = distanze.find((d) => mcd(d, n) === 1);
        distanze = distanze.filter((d) => d !== distanzaExtra);
    }

    const coppie = [];
    for (const d of distanze.slice(0, Math.floor(x / 2))) {
        for (let i = 0; i < n; i++) coppie.push([ordine[i], ordine[(i + d) % n]]);
    }

    if (distanzaExtra !== null) {
        const partenza = Math.floor(rng() * n);
        for (let k = 0; k + 1 < n; k += 2) {
            const a = (partenza + k * distanzaExtra) % n;
            const b = (partenza + (k + 1) * distanzaExtra) % n;
            coppie.push([ordine[a], ordine[b]]);
        }
    }
    return coppie;
}

function mcd(a, b) {
    return b === 0 ? a : mcd(b, a % b);
}

// Divide un elenco di coppie in giornate (in una giornata ogni squadra gioca
// al massimo una volta), cercando di usare meno giornate possibile.
// Riprova con ordini diversi e tiene il risultato migliore.
export function dividiInGiornate(coppie, rng = Math.random, tentativi = 300) {
    let migliore = null;

    for (let t = 0; t < tentativi; t++) {
        const giornate = assegnaGiornate(coppie, rng);
        if (!migliore || giornate.length < migliore.length) migliore = giornate;
    }
    return migliore || [];
}

function assegnaGiornate(coppie, rng) {
    // Prima le squadre con più partite: sono le più difficili da incastrare
    const grado = {};
    for (const [a, b] of coppie) {
        grado[a] = (grado[a] || 0) + 1;
        grado[b] = (grado[b] || 0) + 1;
    }
    const ordinate = mescola(coppie, rng).sort(
        ([a1, b1], [a2, b2]) => grado[a2] + grado[b2] - (grado[a1] + grado[b1])
    );

    const giornate = [];
    const occupate = [];
    for (const coppia of ordinate) {
        const [a, b] = coppia;
        // Tra le giornate libere per entrambe, la meno piena
        let scelta = -1;
        for (let g = 0; g < giornate.length; g++) {
            if (occupate[g].has(a) || occupate[g].has(b)) continue;
            if (scelta === -1 || giornate[g].length < giornate[scelta].length) scelta = g;
        }
        if (scelta === -1) {
            giornate.push([]);
            occupate.push(new Set());
            scelta = giornate.length - 1;
        }
        giornate[scelta].push(coppia);
        occupate[scelta].add(a).add(b);
    }
    return mescola(giornate, rng);
}

// Unisce le giornate di più gironi: "insieme" mette la giornata k di ogni
// girone nella giornata k; "sequenza" mette i gironi uno dopo l'altro.
export function unisciGironi(giornatePerGirone, disposizione = "insieme") {
    if (disposizione === "sequenza") return giornatePerGirone.flat();

    const totale = Math.max(0, ...giornatePerGirone.map((g) => g.length));
    return Array.from({ length: totale }, (_, k) =>
        giornatePerGirone.flatMap((giornate) => giornate[k] || [])
    );
}

// Ridistribuisce partite già esistenti in un numero di giornate dato
// (`giornateDisponibili`, ognuna con le squadre già impegnate). Le partite
// che non trovano posto finiscono in giornate nuove in coda.
// Restituisce { assegnazioni: [indiceGiornata per partita], nuove }.
export function ridistribuisci(partite, giornateDisponibili, rng = Math.random, tentativi = 300) {
    let migliore = null;

    for (let t = 0; t < tentativi; t++) {
        const occupate = giornateDisponibili.map((g) => new Set(g.occupate));
        const conteggio = giornateDisponibili.map((g) => g.partite || 0);
        const assegnazioni = new Array(partite.length);

        const ordine = mescola(partite.map((_, i) => i), rng);
        for (const i of ordine) {
            const [a, b] = partite[i];
            let scelta = -1;
            for (let g = 0; g < occupate.length; g++) {
                if (occupate[g].has(a) || occupate[g].has(b)) continue;
                if (scelta === -1 || conteggio[g] < conteggio[scelta]) scelta = g;
            }
            if (scelta === -1) {
                occupate.push(new Set());
                conteggio.push(0);
                scelta = occupate.length - 1;
            }
            occupate[scelta].add(a).add(b);
            conteggio[scelta]++;
            assegnazioni[i] = scelta;
        }

        const nuove = occupate.length - giornateDisponibili.length;
        // A parità di giornate nuove, preferisce giornate più equilibrate
        const squilibrio = Math.max(...conteggio) - Math.min(...conteggio);
        const punteggio = nuove * 1000 + squilibrio;
        if (!migliore || punteggio < migliore.punteggio) {
            migliore = { assegnazioni, nuove, punteggio };
        }
    }
    return migliore || { assegnazioni: [], nuove: 0 };
}
