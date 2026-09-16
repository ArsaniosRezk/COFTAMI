/*
===================================
PERCORSO PAGINA
===================================

Il sito è raggiungibile sia con l'estensione sia senza: /campionato.html e
/campionato servono la stessa pagina. Confrontare direttamente
window.location.pathname significa quindi riconoscere solo metà degli
indirizzi possibili.

nomePagina() riduce un indirizzo al solo nome della pagina, così i confronti
funzionano con entrambe le forme:

  /campionato.html  -> "campionato"
  /campionato       -> "campionato"
  /                 -> ""
  /index.html       -> ""   (la home ha due indirizzi, un nome solo)
*/

export function nomePagina(percorso) {
    // L'apostrofo di albo-d'oro può arrivare codificato come %27
    try {
        percorso = decodeURIComponent(percorso);
    } catch (errore) {
        // Percorso malformato: si prosegue con la versione grezza
    }

    const nome = percorso
        .toLowerCase()
        .replace(/\.html$/, "")
        .replace(/\/+$/, "")
        .split("/")
        .pop();

    return nome === "index" ? "" : nome;
}

// Nome della pagina attualmente aperta
export function paginaCorrente() {
    return nomePagina(window.location.pathname);
}
