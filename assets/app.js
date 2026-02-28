const grid = document.getElementById("grid");
const overlay = document.getElementById("overlay");

let openWrap = null;

function randTilt() {
  const n = Math.random() * 7 - 3.5;
  return `${n.toFixed(1)}deg`;
}

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function createThumbMedia(it, { large = false } = {}) {
  const type = (it.type || "image").toLowerCase();

  if (type === "video") {
    const v = document.createElement("video");
    v.className = "thumb-video";
    v.src = it.src;
    v.playsInline = true;
    v.preload = "metadata";
    v.loop = true;
    v.controls = !!large;
    v.muted = !large;

    if (it.poster) v.poster = it.poster;

    if (!large) {
      v.controls = false;
      v.addEventListener("canplay", () => {
        v.play().catch(() => {});
      });
      v.style.pointerEvents = "none";
    }

    return { node: v, isVideo: true };
  }

  const img = document.createElement("img");
  img.className = "thumb-img";
  img.src = it.src;
  img.alt = it.title || "foto";
  img.loading = large ? "eager" : "lazy";
  return { node: img, isVideo: false };
}

function createPolaroidBase({ tilt = "0deg" } = {}) {
  const card = document.createElement("div");
  card.className = "polaroid";
  card.style.setProperty("--tilt", tilt);

  const inner = document.createElement("div");
  inner.className = "inner";

  const media = document.createElement("div");
  media.className = "media";

  const caption = document.createElement("div");
  caption.className = "caption";

  inner.appendChild(media);
  inner.appendChild(caption);
  card.appendChild(inner);

  return { card, inner, media, caption };
}

function closeOpen() {
  if (!openWrap) return;

  openWrap.querySelectorAll("video").forEach((v) => {
    try {
      v.pause();
    } catch {}
  });

  openWrap.remove();
  openWrap = null;

  overlay.classList.remove("show");
  document.body.style.overflow = "";
}

function openTwoCards(it) {
  closeOpen();

  overlay.classList.add("show");
  document.body.style.overflow = "hidden";

  openWrap = document.createElement("div");
  openWrap.className = "open-wrap";

  const closeBtn = document.createElement("button");
  closeBtn.className = "open-close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", "Cerrar");
  closeBtn.innerHTML = "✕";
  closeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    closeOpen();
  });
  openWrap.appendChild(closeBtn);

  const left = createPolaroidBase({ tilt: "0deg" });
  const leftMedia = createThumbMedia(it, { large: true });

  if (leftMedia.isVideo) left.media.classList.add("is-video");
  left.media.appendChild(leftMedia.node);

  left.caption.innerHTML = `
    <b>${escapeHtml(it.title || "")}</b>
    <span>${escapeHtml(it.date || "")}</span>
  `;

  const right = createPolaroidBase({ tilt: "0deg" });

  right.media.style.background = "transparent";
  right.media.style.border = "1px solid rgba(255,255,255,.10)";

  const textBox = document.createElement("div");
  textBox.className = "detail-text";
  textBox.innerHTML = `
    <div class="detail-head">
      <b>${escapeHtml(it.title || "")}</b>
      <span>${escapeHtml(it.date || "")}</span>
    </div>
    <div class="detail-note">
      <p>${escapeHtml(it.note || "")}</p>
      <div class="detail-sign">${escapeHtml(it.sign || "")}</div>
    </div>
  `;

  right.media.appendChild(textBox);

  right.caption.innerHTML = `
    <b>Nota</b>
    <span>✨</span>
  `;

  openWrap.appendChild(left.card);
  openWrap.appendChild(right.card);
  document.body.appendChild(openWrap);

  const v = openWrap.querySelector(".open-wrap video");
  if (v) v.play().catch(() => {});
}

overlay.addEventListener("click", closeOpen);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeOpen();
});

function renderGrid(items) {
  grid.innerHTML = "";

  items.forEach((it) => {
    const { card, media, caption } = createPolaroidBase({ tilt: randTilt() });

    const m = createThumbMedia(it, { large: false });
    if (m.isVideo) media.classList.add("is-video");
    media.appendChild(m.node);

    caption.innerHTML = `
      <b>${escapeHtml(it.title || "")}</b>
      <span>${escapeHtml(it.date || "")}</span>
    `;

    card.addEventListener("click", () => openTwoCards(it));
    grid.appendChild(card);
  });
}

(async () => {
  try {
    const res = await fetch("./assets/notes.json", { cache: "no-store" });
    const data = await res.json();
    renderGrid(data.items || []);
  } catch (e) {
    grid.innerHTML = `<div style="color:rgba(255,255,255,.7)">No pude cargar notes.json 😕</div>`;
    console.error(e);
  }
})();

const openBtn = document.getElementById("openAlbum");
const intro = document.getElementById("valentineIntro");
const album = document.getElementById("albumContent");

const music = document.getElementById("bgMusic");
const musicUI = document.getElementById("musicUI");
const musicMute = document.getElementById("musicMute");
const musicVol = document.getElementById("musicVol");

let audioCtx = null;
let gainNode = null;
let sourceNode = null;
let lastVol = Number(musicVol?.value ?? 0.6);

function ensureAudioGraph() {
  if (!music) return;

  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (!gainNode) {
    gainNode = audioCtx.createGain();
    gainNode.gain.value = lastVol;
  }

  if (!sourceNode) {
    sourceNode = audioCtx.createMediaElementSource(music);
    sourceNode.connect(gainNode);
    gainNode.connect(audioCtx.destination);
  }
}

function setMuteUI() {
  const isMuted = gainNode ? gainNode.gain.value === 0 : music?.muted;
  if (musicMute) musicMute.textContent = isMuted ? "🔇" : "🔊";
}

async function tryPlayMusic() {
  if (!music) return;

  music.loop = true;
  music.volume = 1;

  try {
    ensureAudioGraph();
    if (audioCtx?.state === "suspended") await audioCtx.resume();
    await music.play();
  } catch {
    console.log("ocurrio un error")
  }
}

function enableMusicOnFirstGesture() {
  const resume = async () => {
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("touchstart", resume);
    await tryPlayMusic();
  };
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("touchstart", resume, { once: true });
}

function setGain(v) {
  lastVol = v;

  if (gainNode) gainNode.gain.value = v;
  if (musicVol) musicVol.value = String(v);

  setMuteUI();
}

if (openBtn) {
  openBtn.addEventListener("click", async () => {
    intro.style.opacity = "0";

    setTimeout(() => {
      intro.style.display = "none";
      album.style.display = "block";
      album.style.opacity = "0";

      setTimeout(() => {
        album.style.transition = "opacity 2s ease";
        album.style.opacity = "1";
        if (musicUI) musicUI.style.display = "flex";
      }, 50);
    }, 1500);

    await tryPlayMusic();
    enableMusicOnFirstGesture();

    ensureAudioGraph();
    if (audioCtx?.state === "suspended") {
        console.log('error)
    } else {
      setGain(Number(musicVol?.value ?? 0.6));
    }
    setMuteUI();
  });
}

if (musicMute) {
  musicMute.addEventListener("click", async () => {
    ensureAudioGraph();
    if (audioCtx?.state === "suspended") await audioCtx.resume();

    if (!gainNode) return;

    if (gainNode.gain.value === 0) {

      const back = lastVol > 0 ? lastVol : 0.6;
      gainNode.gain.value = back;
      if (musicVol) musicVol.value = String(back);
    } else {
      lastVol = Number(musicVol?.value ?? gainNode.gain.value ?? 0.6);
      gainNode.gain.value = 0;
    }

    setMuteUI();
    tryPlayMusic();
  });
}

if (musicVol) {
  musicVol.addEventListener("input", async () => {
    ensureAudioGraph();
    if (audioCtx?.state === "suspended") await audioCtx.resume();

    const v = Number(musicVol.value);
    if (gainNode) gainNode.gain.value = v;

    if (v > 0) lastVol = v;

    setMuteUI();
    tryPlayMusic();
  });
}

function showAlbumWithTransition() {
  if (!intro || !album) return;

  intro.style.opacity = "0";
  
  intro.style.pointerEvents = "none";
  setTimeout(() => {
    intro.style.display = "none";
    album.style.display = "block";
    album.style.opacity = "0";
    album.style.transition = "opacity 2s ease";
    requestAnimationFrame(() => {
      album.style.opacity = "1";
    });
    if (musicUI) musicUI.style.display = "flex";
  }, 1200);
}

function enableMusicOnFirstGesture() {
  const resume = async () => {
    window.removeEventListener("pointerdown", resume);
    window.removeEventListener("touchstart", resume);
    await tryPlayMusic();
  };
  window.addEventListener("pointerdown", resume, { once: true });
  window.addEventListener("touchstart", resume, { once: true });
}

if (openBtn) {
  openBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    showAlbumWithTransition();
    await tryPlayMusic();
    enableMusicOnFirstGesture();
    setMuteUI();
  });
} else {
  console.warn("No existe #openAlbum (corazón). Revisa index.html");
}
