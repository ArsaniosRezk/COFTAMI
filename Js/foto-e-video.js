// Lista delle immagini (puoi espandere questa lista con tutti i tuoi file immagine)
const images = [
  { src: "Foto/Foto (1).jpg" },
  { src: "Foto/Foto (2).jpg" },
  { src: "Foto/Foto (3).jpg" },
  { src: "Foto/Foto (4).jpg" },
  { src: "Foto/Foto (5).jpg" },
  { src: "Foto/Foto (6).jpg" },
  { src: "Foto/Foto (7).jpg" },
  { src: "Foto/Foto (8).jpg" },
  { src: "Foto/Foto (9).jpg" },
  { src: "Foto/Foto (10).jpg" },
  { src: "Foto/Foto (11).jpg" },
  { src: "Foto/Foto (12).jpg" },
  { src: "Foto/Foto (13).jpg" },
  { src: "Foto/Foto (14).jpg" },
  { src: "Foto/Foto (15).jpg" },
  { src: "Foto/Foto (16).jpg" },
  { src: "Foto/Foto (17).jpg" },
  { src: "Foto/Foto (18).jpg" },
  { src: "Foto/Foto (19).jpg" },
  { src: "Foto/Foto (20).jpg" },
  { src: "Foto/Foto (21).jpg" },
  { src: "Foto/Foto (22).jpg" },
  { src: "Foto/Foto (23).jpg" },
  { src: "Foto/Foto (24).jpg" },
  { src: "Foto/Foto (25).jpg" },
  { src: "Foto/Foto (26).jpg" },
  { src: "Foto/Foto (27).jpg" },
  { src: "Foto/Foto (28).jpg" },
  { src: "Foto/Foto (29).jpg" },
  { src: "Foto/Foto (30).jpg" },
  { src: "Foto/Foto (31).jpg" },
  { src: "Foto/Foto (32).jpg" },
  { src: "Foto/Foto (33).jpg" },
  { src: "Foto/Foto (34).jpg" },
  { src: "Foto/Foto (35).jpg" },
  { src: "Foto/Foto (36).jpg" },
  { src: "Foto/Foto (37).jpg" },
  { src: "Foto/Foto (38).jpg" },
  { src: "Foto/Foto (39).jpg" },
  { src: "Foto/Foto (40).jpg" },
  { src: "Foto/Foto (41).jpg" },
  { src: "Foto/Foto (42).jpg" },
  { src: "Foto/Foto (43).jpg" },
  { src: "Foto/Foto (44).jpg" },
  { src: "Foto/Foto (45).jpg" },
  { src: "Foto/Foto (46).jpg" },
  { src: "Foto/Foto (47).jpg" },
  { src: "Foto/Foto (48).jpg" },
  { src: "Foto/Foto (49).jpg" },
  { src: "Foto/Foto (50).jpg" },
  { src: "Foto/Foto (51).jpg" },
  { src: "Foto/Foto (52).jpg" },
  { src: "Foto/Foto (53).jpg" },
  { src: "Foto/Foto (54).jpg" },
  { src: "Foto/Foto (55).jpg" },
  { src: "Foto/Foto (56).jpg" },
  { src: "Foto/Foto (57).jpg" },
  { src: "Foto/Foto (58).jpg" },
  { src: "Foto/Foto (59).jpg" },
  { src: "Foto/Foto (60).jpg" },
  { src: "Foto/Foto (61).jpg" },
  { src: "Foto/Foto (62).jpg" },
  { src: "Foto/Foto (63).jpg" },
  { src: "Foto/Foto (64).jpg" },

  // Aggiungi altre immagini
];

// Lista dei video (puoi espandere questa lista con tutti i tuoi file video)
const videos = [
  { src: "Video/giornata 1.mp4", poster: "asset/Copertina-Video.jpg" },
  { src: "Video/giornata 2.mp4", poster: "asset/Copertina-Video.jpg" },
  { src: "Video/giornata 3.mp4", poster: "asset/Copertina-Video.jpg" },
  { src: "Video/giornata 4.mp4", poster: "asset/Copertina-Video.jpg" },
  { src: "Video/giornata 5.mp4", poster: "asset/Copertina-Video.jpg" },
  { src: "Video/semifinali.mp4", poster: "asset/Copertina-Video.jpg" },
  { src: "Video/finale superiori.mp4", poster: "asset/Copertina-Video.jpg" },
  { src: "Video/finale giovani.mp4", poster: "asset/Copertina-Video.jpg" },

  // Aggiungi altri video
];

// Seleziona gli elementi della galleria foto e video
const fotoDiv = document.getElementById("foto-div");
const videoDiv = document.getElementById("video-div");

// Funzione per creare elementi immagine
function createImageElement(image) {
  const div = document.createElement("div");
  div.className = "gallery-item";

  const img = document.createElement("img");
  img.src = image.src;
  img.alt = image.alt;
  img.loading = "lazy"; // Lazy loading per immagini

  div.appendChild(img);
  return div;
}

// Funzione per creare elementi video
function createVideoElement(video) {
  const div = document.createElement("div");
  div.className = "gallery-item";

  const videoElement = document.createElement("video");
  videoElement.preload = "none"; // Lazy loading per video
  videoElement.poster = video.poster; // Aggiunta del poster

  const source = document.createElement("source");
  source.src = video.src;
  source.type = "video/mp4";

  videoElement.appendChild(source);
  div.appendChild(videoElement);
  return div;
}

// Seleziona gli elementi dell'overlay
const overlay = document.getElementById("overlay");
const overlayImg = document.getElementById("overlay-img");
const overlayVideo = document.getElementById("overlay-video");
const closeOverlay = document.getElementById("close-overlay");

// Funzione per mostrare l'overlay con l'immagine
function showOverlayWithImage(src) {
  overlay.style.display = "flex";
  overlayImg.style.display = "block";
  overlayVideo.style.display = "none";
  overlayImg.src = src;
}

// Funzione per mostrare l'overlay con il video
function showOverlayWithVideo(src) {
  overlay.style.display = "flex";
  overlayImg.style.display = "none";
  overlayVideo.style.display = "block";
  overlayVideo.src = src;
}

// Funzione per chiudere l'overlay
closeOverlay.onclick = function () {
  overlay.style.display = "none";
  overlayImg.src = "";
  overlayVideo.src = "";
};

// Aggiungi immagini alla galleria
images.forEach((image) => {
  const imageElement = createImageElement(image);
  fotoDiv.appendChild(imageElement);

  // Aggiungi event listener per il click
  imageElement.addEventListener("click", () => {
    showOverlayWithImage(image.src);
  });
});

// Aggiungi video alla galleria
videos.forEach((video) => {
  const videoElement = createVideoElement(video);
  videoDiv.appendChild(videoElement);

  // Aggiungi event listener per il click
  videoElement.addEventListener("click", () => {
    showOverlayWithVideo(video.src);
  });
});
