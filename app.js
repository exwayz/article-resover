const API = window.location.hostname === "localhost"
  ? "http://127.0.0.1:8000"
  : "https://your-backend-url.onrender.com";  // change when deployed

let currentMode = "smart";

// ── DOM refs ────────────────────────────────────────────────────
const inputText    = document.getElementById("input-text");
const outputText   = document.getElementById("output-text");
const btnResolve   = document.getElementById("btn-resolve");
const btnClear     = document.getElementById("btn-clear");
const btnCopy      = document.getElementById("btn-copy");
const btnSmart     = document.getElementById("btn-smart");
const btnNaive     = document.getElementById("btn-naive");
const status       = document.getElementById("status");
const copyStatus   = document.getElementById("copy-status");
const infoLine     = document.getElementById("info-line");

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

    outputText.value = data.result;

    const method = data.method === "smart" ? "AI" : data.method === "naive-fallback" ? "naive (no key)" : "local";
    status.textContent = `${data.matches_confirmed.toLocaleString()} names resolved via ${method}  (${elapsed}ms)`;
    status.className = "status resolved";

  } catch (err) {
    status.textContent = `error: ${err.message}`;
    status.className = "status";
    status.style.color = "#d32f2f";
  } finally {
    btnResolve.classList.remove("loading");
  }
}

// ── Clear ───────────────────────────────────────────────────────
btnClear.addEventListener("click", () => {
  inputText.value = "";
  outputText.value = "";
  status.textContent = "";
  status.className = "status";
  copyStatus.textContent = "";
});

// ── Copy ────────────────────────────────────────────────────────
btnCopy.addEventListener("click", () => {
  const text = outputText.value;
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
