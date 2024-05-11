function openMenu() {
  document.getElementById("overlay-menu-container").style.left = "0%";
  document.getElementById("overlay-menu").style.opacity = "1";
}

function closeMenu() {
  document.getElementById("overlay-menu-container").style.left = "100%";
  document.getElementById("overlay-menu").style.opacity = "0";
}

// Funzione per chiudere l'overlay
function closeOverlaySquadre() {
  document.getElementById("team-overlay").style.top = "100%";
  document.getElementById("team-info").style.opacity = "0";
}
