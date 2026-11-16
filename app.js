// Peptide Reconstitution & Dosage Calculator Engine
let medicalData = null;

// Initial state
const state = {
  vialMg: 5,
  bacWaterMl: 2,
  doseVal: 0.25,
  doseUnit: "mg", // "mg" or "mcg"
  syringeType: 100, // 100 units = 1mL, 50 = 0.5mL, 30 = 0.3mL
  activePreset: "semaglutide"
};

// Fetch medical evidence JSON
async function loadMedicalEvidence() {
  try {
    const res = await fetch("medical_citations.json");
    if (res.ok) {
      medicalData = await res.json();
      renderStudies();
    }
  } catch (e) {
    console.log("Using embedded medical data fallback");
  }
}

// Preset configurations
const presets = {
  semaglutide: {
    name: "Semaglutide (Wegovy / Ozempic protocol)",
    vialMg: 5,
    bacWaterMl: 2,
    doseVal: 0.25,
    doseUnit: "mg",
    notes: "STEP 1 starting dose: 0.25 mg once weekly for 4 weeks."
  },
  tirzepatide: {
    name: "Tirzepatide (Mounjaro / Zepbound protocol)",
    vialMg: 10,
    bacWaterMl: 2,
    doseVal: 2.5,
    doseUnit: "mg",
    notes: "SURMOUNT-1 starting dose: 2.5 mg once weekly for 4 weeks."
  },
  retatrutide: {
    name: "Retatrutide (Phase 2 NEJM protocol)",
    vialMg: 10,
    bacWaterMl: 2.5,
    doseVal: 2.0,
    doseUnit: "mg",
    notes: "Phase 2 trial starting dose: 2 mg once weekly."
  },
  "bpc-157": {
    name: "BPC-157 (Gastric Pentadecapeptide)",
    vialMg: 5,
    bacWaterMl: 2.5,
    doseVal: 250,
    doseUnit: "mcg",
    notes: "Standard research protocol: 250 mcg to 500 mcg per administration."
  }
};

function init() {
  loadMedicalEvidence();
  attachEventListeners();
  applyPreset("semaglutide");
  calculate();
}

function attachEventListeners() {
  // Preset buttons
  document.querySelectorAll(".preset-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".preset-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const presetKey = btn.dataset.preset;
      applyPreset(presetKey);
    });
  });

  // Inputs
  const vialInput = document.getElementById("vialMg");
  const bacInput = document.getElementById("bacWaterMl");
  const doseValInput = document.getElementById("doseVal");
  const doseUnitSelect = document.getElementById("doseUnit");
  const syringeSelect = document.getElementById("syringeType");

  vialInput.addEventListener("input", (e) => {
    state.vialMg = parseFloat(e.target.value) || 0;
    calculate();
  });

  bacInput.addEventListener("input", (e) => {
    state.bacWaterMl = parseFloat(e.target.value) || 0;
    calculate();
  });

  doseValInput.addEventListener("input", (e) => {
    state.doseVal = parseFloat(e.target.value) || 0;
    calculate();
  });

  doseUnitSelect.addEventListener("change", (e) => {
    state.doseUnit = e.target.value;
    calculate();
  });

  syringeSelect.addEventListener("change", (e) => {
    state.syringeType = parseInt(e.target.value, 10);
    calculate();
  });

  // Quick pills
  document.querySelectorAll(".pill-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.dataset.target;
      const val = parseFloat(btn.dataset.val);
      if (targetId) {
        document.getElementById(targetId).value = val;
        if (targetId === "vialMg") state.vialMg = val;
        if (targetId === "bacWaterMl") state.bacWaterMl = val;
        if (targetId === "doseVal") state.doseVal = val;
        calculate();
      }
    });
  });
}

function applyPreset(key) {
  const p = presets[key];
  if (!p) return;
  state.activePreset = key;
  state.vialMg = p.vialMg;
  state.bacWaterMl = p.bacWaterMl;
  state.doseVal = p.doseVal;
  state.doseUnit = p.doseUnit;

  document.getElementById("vialMg").value = p.vialMg;
  document.getElementById("bacWaterMl").value = p.bacWaterMl;
  document.getElementById("doseVal").value = p.doseVal;
  document.getElementById("doseUnit").value = p.doseUnit;

  const notesEl = document.getElementById("protocolNotes");
  if (notesEl) {
    notesEl.textContent = p.notes;
  }

  calculate();
  renderStudies();
}

function calculate() {
  const vialMg = state.vialMg;
  const bacMl = state.bacWaterMl;
  let doseMg = state.doseUnit === "mcg" ? state.doseVal / 1000 : state.doseVal;

  if (vialMg <= 0 || bacMl <= 0 || doseMg <= 0) {
    document.getElementById("unitsResult").textContent = "—";
    return;
  }

  // Concentration: mg per mL
  const concMgPerMl = vialMg / bacMl;
  const concMcgPerMl = concMgPerMl * 1000;

  // Syringe scale: standard U-100 syringe has 100 units = 1.0 mL (0.01 mL per unit).
  // Therefore, mL needed for dose = doseMg / concMgPerMl.
  // Units to draw = mL needed * 100 units/mL.
  const mlToDraw = doseMg / concMgPerMl;
  const unitsToDraw = mlToDraw * 100;

  // Total doses in vial
  const totalDoses = vialMg / doseMg;

  // Update UI
  const unitsFormatted = unitsToDraw >= 10 ? unitsToDraw.toFixed(1) : unitsToDraw.toFixed(2);
  document.getElementById("unitsResult").textContent = unitsFormatted;
  document.getElementById("concResult").textContent = concMgPerMl.toFixed(2) + " mg/mL (" + Math.round(concMcgPerMl) + " mcg/mL)";
  document.getElementById("volumeResult").textContent = mlToDraw.toFixed(3) + " mL";
  document.getElementById("dosesResult").textContent = totalDoses.toFixed(1) + " doses";

  // Syringe warning
  const warningEl = document.getElementById("syringeWarning");
  if (unitsToDraw > state.syringeType) {
    warningEl.style.display = "block";
    warningEl.textContent = `⚠️ Dose (${unitsFormatted} units) exceeds syringe capacity (${state.syringeType} units). Add more BAC water or use a larger syringe.`;
  } else {
    warningEl.style.display = "none";
  }

  // Update SVG Syringe
  drawSyringe(unitsToDraw, state.syringeType);
}

function drawSyringe(units, maxUnits) {
  const svg = document.getElementById("syringeSvg");
  if (!svg) return;

  const width = svg.clientWidth || 500;
  const height = 90;
  const clampedUnits = Math.min(Math.max(units, 0), maxUnits);
  const fillRatio = clampedUnits / maxUnits;

  // Dimensions inside SVG coordinate space (0 to 500)
  const barrelX = 50;
  const barrelY = 22;
  const barrelWidth = 380;
  const barrelHeight = 44;

  const needleEndX = 15;
  const needleStartX = 50;
  const needleY = barrelY + barrelHeight / 2;

  const fillWidth = barrelWidth * fillRatio;
  const plungerX = barrelX + fillWidth;

  // Build tick marks
  const tickStep = maxUnits === 100 ? 10 : maxUnits === 50 ? 5 : 5;
  let ticksSvg = "";
  for (let u = 0; u <= maxUnits; u += tickStep) {
    const tx = barrelX + (u / maxUnits) * barrelWidth;
    const isMajor = u % (tickStep * 2) === 0 || u === maxUnits;
    const tHeight = isMajor ? 14 : 8;
    ticksSvg += `<line x1="${tx}" y1="${barrelY}" x2="${tx}" y2="${barrelY + tHeight}" stroke="#94a3b8" stroke-width="${isMajor ? 1.5 : 1}"/>`;
    if (isMajor && tx < 410) {
      ticksSvg += `<text x="${tx}" y="${barrelY + 26}" fill="#64748b" font-size="9" font-family="monospace" text-anchor="middle">${u}</text>`;
    }
  }

  svg.innerHTML = `
    <!-- Needle -->
    <line x1="${needleStartX}" y1="${needleY}" x2="${needleEndX}" y2="${needleY}" stroke="#e2e8f0" stroke-width="2" stroke-linecap="round"/>
    <polygon points="${needleStartX},${needleY-4} ${needleStartX+6},${needleY} ${needleStartX},${needleY+4}" fill="#94a3b8"/>
    
    <!-- Syringe Barrel Background -->
    <rect x="${barrelX}" y="${barrelY}" width="${barrelWidth}" height="${barrelHeight}" rx="4" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    
    <!-- Fluid Fill -->
    <rect x="${barrelX}" y="${barrelY+2}" width="${fillWidth}" height="${barrelHeight-4}" fill="rgba(6, 182, 212, 0.45)" rx="2"/>

    <!-- Tick Marks -->
    ${ticksSvg}

    <!-- Plunger Stopper (Black Rubber) -->
    <rect x="${plungerX - 6}" y="${barrelY + 1}" width="8" height="${barrelHeight - 2}" rx="2" fill="#020617" stroke="#06b6d4" stroke-width="1.5"/>
    
    <!-- Plunger Rod -->
    <rect x="${plungerX + 2}" y="${needleY - 4}" width="${480 - plungerX}" height="8" fill="#334155" rx="1"/>
    <!-- Plunger Thumb Rest -->
    <rect x="475" y="${barrelY - 6}" width="8" height="${barrelHeight + 12}" rx="3" fill="#64748b"/>

    <!-- Exact Unit Indicator Line -->
    <line x1="${plungerX}" y1="${barrelY - 8}" x2="${plungerX}" y2="${barrelY + barrelHeight + 8}" stroke="#06b6d4" stroke-width="2" stroke-dasharray="2,2"/>
    <text x="${Math.max(barrelX + 30, Math.min(plungerX, 420))}" y="${barrelY + barrelHeight + 20}" fill="#06b6d4" font-weight="700" font-size="12" font-family="monospace" text-anchor="middle">
      Target: ${units.toFixed(1)} Units
    </text>
  `;
}

function renderStudies() {
  const container = document.getElementById("studiesContainer");
  if (!container || !medicalData) return;

  const currentCompound = medicalData[state.activePreset];
  if (!currentCompound) return;

  let html = `
    <div style="margin-bottom: 16px;">
      <h3 style="color:#ffffff; font-size:1.15rem; margin-bottom: 4px;">🔬 Clinical Evidence & FDA Approval Data: ${currentCompound.name}</h3>
      <p style="color:#94a3b8; font-size: 0.85rem;"><strong>Class:</strong> ${currentCompound.class} | <strong>FDA Brand:</strong> ${currentCompound.fda_approved_brand}</p>
      <p style="color:#94a3b8; font-size: 0.82rem; margin-top: 4px;"><strong>Recommended Diluent:</strong> ${currentCompound.standard_diluent}</p>
      <p style="color:#94a3b8; font-size: 0.82rem;"><strong>Storage:</strong> ${currentCompound.storage_stability}</p>
    </div>
  `;

  currentCompound.key_studies.forEach(study => {
    html += `
      <div class="study-card">
        <div class="study-meta">
          <span class="study-badge">PubMed PMID: ${study.pmid}</span>
          <span class="study-badge" style="background:#0f766e; color:#ccfbf1;">${study.evidence_level}</span>
          <span class="study-badge" style="background:#1e1b4b; color:#c7d2fe;">${study.journal} (${study.year})</span>
        </div>
        <div class="study-title">${study.title}</div>
        <div class="study-authors">${study.authors}</div>
        <a href="https://pubmed.ncbi.nlm.nih.gov/${study.pmid}/" target="_blank" rel="noopener noreferrer" class="study-link">
          Read full clinical study on PubMed (NIH/NLM) →
        </a>
      </div>
    `;
  });

  container.innerHTML = html;
}

window.addEventListener("DOMContentLoaded", init);
window.addEventListener("resize", () => {
  const doseMg = state.doseUnit === "mcg" ? state.doseVal / 1000 : state.doseVal;
  const conc = state.vialMg / state.bacWaterMl;
  if (conc > 0) {
    drawSyringe((doseMg / conc) * 100, state.syringeType);
  }
});
