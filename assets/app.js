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

// --------- media creators ----------
function createThumbMedia(it, { large = false } = {}) {
  const type = (it.type || "image").toLowerCase();

  if (type === "video") {
    const v = document.createElement("video");
    v.className = "thumb-video";
    v.src = it.src;
    v.playsInline = true;
    v.preload = "metadata";
    v.loop = true;

    // En grid: sin controles y sin interacción
    // En open: con controles para verlo bien
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

// --------- open / close ----------
function closeOpen() {
  if (!openWrap) return;

  // pausa videos abiertos
  openWrap.querySelectorAll("video").forEach((v) => {
    try { v.pause(); } catch {}
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

  // --- Left: media polaroid ---
  const left = createPolaroidBase({ tilt: "0deg" });
  const leftMedia = createThumbMedia(it, { large: true });

  if (leftMedia.isVideo) left.media.classList.add("is-video");
  left.media.appendChild(leftMedia.node);

  left.caption.innerHTML = `
    <b>${escapeHtml(it.title || "")}</b>
    <span>${escapeHtml(it.date || "")}</span>
  `;

  // --- Right: text polaroid ---
  const right = createPolaroidBase({ tilt: "0deg" });

  // En la “media” de la card derecha ponemos un bloque de texto estilo paper/glass
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

  // Caption abajo (lo dejamos minimal para no repetir tanto)
  right.caption.innerHTML = `
    <b>Nota</b>
    <span>✨</span>
  `;

  openWrap.appendChild(left.card);
  openWrap.appendChild(right.card);
  document.body.appendChild(openWrap);

  // auto-play del video al abrir (si el navegador lo permite)
  const v = openWrap.querySelector(".open-wrap video");
  if (v) v.play().catch(() => {});
}

overlay.addEventListener("click", closeOpen);
window.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeOpen();
});

// --------- render grid ----------
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
