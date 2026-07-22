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

// ── Ember canvas animation ──────────────────────────────────────
(function() {
  const canvas = document.getElementById("ember-canvas");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  let W, H;
  const embers = [];
  const COUNT = 35;

  function resize() {
    W = canvas.width = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener("resize", resize);

  function rand(a, b) { return a + Math.random() * (b - a); }

  function createEmber() {
    return {
      x: rand(0, W),
      y: rand(0, H),
      r: rand(1.5, 5),
      baseR: rand(1.5, 5),
      vx: rand(-0.15, 0.15),
      vy: rand(-0.1, 0.1),
      phase: rand(0, Math.PI * 2),
      pulseSpeed: rand(0.008, 0.025),
      pulseAmp: rand(0.3, 1),
      drift: rand(0.3, 1.2),
      driftAngle: rand(0, Math.PI * 2),
      driftSpeed: rand(0.002, 0.008),
      life: rand(0, 1),
      lifeSpeed: rand(0.001, 0.004),
      heat: rand(0, 1)
    };
  }

  for (let i = 0; i < COUNT; i++) embers.push(createEmber());

  function draw() {
    ctx.clearRect(0, 0, W, H);

    for (const e of embers) {
      e.phase += e.pulseSpeed;
      e.driftAngle += e.driftSpeed;
      e.life += e.lifeSpeed;

      e.x += e.vx + Math.cos(e.driftAngle) * e.drift * 0.3;
      e.y += e.vy + Math.sin(e.driftAngle) * e.drift * 0.3;

      const lifeFade = Math.sin(e.life * Math.PI);
      const pulse = 1 + Math.sin(e.phase) * e.pulseAmp * lifeFade;
      const r = e.baseR * pulse;
      const alpha = (0.15 + 0.35 * lifeFade) * pulse;

      if (e.x < -40) e.x = W + 40;
      if (e.x > W + 40) e.x = -40;
      if (e.y < -40) e.y = H + 40;
      if (e.y > H + 40) e.y = -40;
      if (e.life > 1) { e.life = 0; e.x = rand(0, W); e.y = rand(0, H); }

      const grad = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 6);
      grad.addColorStop(0, `rgba(255, 80, 30, ${alpha * 1.2})`);
      grad.addColorStop(0.3, `rgba(220, 40, 10, ${alpha * 0.7})`);
      grad.addColorStop(0.6, `rgba(160, 20, 5, ${alpha * 0.3})`);
      grad.addColorStop(1, "rgba(80, 10, 0, 0)");

      ctx.globalCompositeOperation = "screen";
      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 6, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(e.x, e.y, r * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 160, 60, ${alpha * 1.5})`;
      ctx.fill();
    }

    ctx.globalCompositeOperation = "source-over";
    requestAnimationFrame(draw);
  }

  draw();
})();
