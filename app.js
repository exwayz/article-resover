const API = window.location.hostname === "localhost"
  ? "http://127.0.0.1:8000"
  : "https://resolver-server.vercel.app";

let currentMode = "smart";

// ── DOM refs ────────────────────────────────────────────────────
const inputText    = document.getElementById("input-text");
const outputText   = document.getElementById("output-text");
const outputDisplay= document.getElementById("output-display");
const btnResolve   = document.getElementById("btn-resolve");
const btnClear     = document.getElementById("btn-clear");
const btnCopy      = document.getElementById("btn-copy");
const btnSmart     = document.getElementById("btn-smart");
const btnNaive     = document.getElementById("btn-naive");
const spinner      = document.getElementById("spinner");
const status       = document.getElementById("status");
const copyStatus   = document.getElementById("copy-status");
const infoLine     = document.getElementById("info-line");

// ── Output helpers ──────────────────────────────────────────────
function setOutput(text) {
  outputText.value = text;
  renderOutput(text);
  updateShine();
}

function renderOutput(text) {
  if (!text) {
    outputDisplay.innerHTML = "";
    return;
  }
  outputDisplay.innerHTML = escapeHtml(text).replace(
    /(\/(?:country|region|alliance|party|mu)\/\S+)/g,
    '<span class="url">$1</span>'
  );
}

function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function getOutputText() {
  return outputText.value;
}

// ── Shine effect ───────────────────────────────────────────────
function updateShine() {
  const hasInput = inputText.value.trim().length > 0;
  const hasOutput = outputText.value.trim().length > 0;
  btnResolve.classList.toggle("shine", hasInput && !hasOutput);
  btnCopy.classList.toggle("shine", hasOutput);
}

inputText.addEventListener("input", () => {
  setOutput("");
  updateShine();
});

// ── Load info ───────────────────────────────────────────────────
fetch(`${API}/api/info`)
  .then(r => r.json())
  .then(data => {
    const cats = Object.entries(data.categories)
      .map(([k, v]) => `${k}: ${v}`)
      .join(" / ");
    infoLine.textContent = `loaded ${data.total_entities.toLocaleString()} entries  (${cats})`;
    if (!data.groq_available) {
      infoLine.textContent += "  — Smart mode unavailable (no API key)";
    }
  })
  .catch(() => {
    infoLine.textContent = "backend not connected — start the server first";
    infoLine.style.color = "#d32f2f";
  });

// ── Mode toggle ─────────────────────────────────────────────────
btnSmart.addEventListener("click", () => {
  currentMode = "smart";
  btnSmart.classList.add("active");
  btnNaive.classList.remove("active");
});

btnNaive.addEventListener("click", () => {
  currentMode = "naive";
  btnNaive.classList.add("active");
  btnSmart.classList.remove("active");
});

// ── Resolve ─────────────────────────────────────────────────────
btnResolve.addEventListener("click", doResolve);

// Ctrl+Enter shortcut
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    doResolve();
  }
});

async function doResolve() {
  const text = inputText.value.trim();
  if (!text) {
    status.textContent = "nothing to resolve";
    status.className = "status";
    return;
  }

  btnResolve.classList.add("loading");
  spinner.style.display = "inline-flex";
  status.textContent = currentMode === "smart" ? "resolving with AI..." : "resolving...";
  status.className = "status";

  try {
    const t0 = performance.now();
    const res = await fetch(`${API}/api/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, mode: currentMode }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || "resolve failed");
    }

    const data = await res.json();
    const elapsed = Math.round(performance.now() - t0);

    setOutput(data.result);

    const method = data.method === "smart" ? "AI" : data.method === "naive-fallback" ? "naive (no key)" : "local";
    status.textContent = `${data.matches_confirmed.toLocaleString()} names resolved via ${method}  (${elapsed}ms)`;
    status.className = "status resolved";

  } catch (err) {
    status.textContent = `error: ${err.message}`;
    status.className = "status";
    status.style.color = "#d32f2f";
  } finally {
    btnResolve.classList.remove("loading");
    spinner.style.display = "none";
  }
}

// ── Clear ───────────────────────────────────────────────────────
btnClear.addEventListener("click", () => {
  inputText.value = "";
  setOutput("");
  status.textContent = "";
  status.className = "status";
  copyStatus.textContent = "";
  spinner.style.display = "none";
  btnResolve.classList.remove("loading");
  updateShine();
});

// ── Copy ────────────────────────────────────────────────────────
btnCopy.addEventListener("click", () => {
  const text = getOutputText();
  if (!text) {
    copyStatus.textContent = "nothing to copy";
    setTimeout(() => copyStatus.textContent = "", 2000);
    return;
  }
  navigator.clipboard.writeText(text).then(() => {
    copyStatus.textContent = "copied!";
    setTimeout(() => copyStatus.textContent = "", 2000);
  });
});

// ── Topography line glow animation ─────────────────────────────
(function() {
  const canvas = document.getElementById("ember-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  const svgImg = new Image();
  svgImg.src = "topography.svg";

  let pathPixels = [];
  let spots = [];
  const SPOT_COUNT = 22;
  const TILE = 600;

  svgImg.onload = function() {
    const oc = document.createElement("canvas");
    const octx = oc.getContext("2d");
    oc.width = TILE;
    oc.height = TILE;
    octx.drawImage(svgImg, 0, 0);
    const imgData = octx.getImageData(0, 0, TILE, TILE).data;

    for (let y = 0; y < TILE; y += 3) {
      for (let x = 0; x < TILE; x += 3) {
        const i = (y * TILE + x) * 4;
        if (imgData[i + 3] > 128 && imgData[i] < 100) {
          pathPixels.push({ x, y });
        }
      }
    }

    if (pathPixels.length === 0) return;

    function getLocalDir(px, py, range) {
      let dx = 0, dy = 0;
      for (const p of pathPixels) {
        const ddx = p.x - px;
        const ddy = p.y - py;
        if (Math.abs(ddx) < range && Math.abs(ddy) < range) {
          dx += ddx;
          dy += ddy;
        }
      }
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      return { x: dx / len, y: dy / len };
    }

    function createSpot() {
      const base = pathPixels[Math.floor(Math.random() * pathPixels.length)];
      const dir = getLocalDir(base.x, base.y, 12);
      const len = 8 + Math.random() * 25;
      return {
        tileX: Math.floor(Math.random() * (W / TILE + 1)),
        tileY: Math.floor(Math.random() * (H / TILE + 1)),
        lx: base.x,
        ly: base.y,
        dx: dir.x * len,
        dy: dir.y * len,
        phase: Math.random() * Math.PI * 2,
        pulseSpeed: 0.015 + Math.random() * 0.035,
        life: 0,
        lifeSpeed: 0.003 + Math.random() * 0.006,
        maxLife: 0.5 + Math.random() * 0.5,
        width: 1 + Math.random() * 2
      };
    }

    for (let i = 0; i < SPOT_COUNT; i++) {
      spots.push(createSpot());
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);

      for (const s of spots) {
        s.phase += s.pulseSpeed;
        s.life += s.lifeSpeed;

        const lifeP = s.life / s.maxLife;
        const fadeIn = Math.min(lifeP * 5, 1);
        const fadeOut = lifeP > 0.7 ? Math.max(1 - (lifeP - 0.7) / 0.3, 0) : 1;
        const fade = fadeIn * fadeOut;
        const pulse = 0.3 + 0.7 * Math.sin(s.phase) * 0.5 + 0.5;
        const alpha = fade * pulse * 0.7;

        const gx = s.tileX * TILE + s.lx;
        const gy = s.tileY * TILE + s.ly;

        ctx.save();
        ctx.globalCompositeOperation = "screen";

        ctx.shadowColor = `rgba(185, 28, 28, ${alpha * 0.9})`;
        ctx.shadowBlur = 18 * pulse;
        ctx.strokeStyle = `rgba(185, 28, 28, ${alpha})`;
        ctx.lineWidth = s.width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(gx - s.dx, gy - s.dy);
        ctx.lineTo(gx + s.dx, gy + s.dy);
        ctx.stroke();

        ctx.shadowBlur = 8 * pulse;
        ctx.strokeStyle = `rgba(220, 60, 30, ${alpha * 0.6})`;
        ctx.lineWidth = s.width * 0.5;
        ctx.beginPath();
        ctx.moveTo(gx - s.dx * 0.7, gy - s.dy * 0.7);
        ctx.lineTo(gx + s.dx * 0.7, gy + s.dy * 0.7);
        ctx.stroke();

        ctx.restore();

        if (s.life > s.maxLife) {
          Object.assign(s, createSpot());
        }
      }

      requestAnimationFrame(draw);
    }

    draw();
  };
})();
