// ============================================
// ЮЖНО-СЛОВЕНКО — Острый Стрелок 3D
// Браузерный прототип в духе SharpShooter3D
// Рейкастинг + рукопашка + ломающееся оружие
// ============================================

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const crosshair = document.getElementById("crosshair");
const titleScreen = document.getElementById("title-screen");
const deathScreen = document.getElementById("death-screen");
const settingsScreen = document.getElementById("settings-screen");
const hud = document.getElementById("hud");
const weaponNameEl = document.getElementById("weapon-name");
const healthEl = document.getElementById("health");
const healthBarContainer = document.getElementById("health-bar-container");
const healthBarFill = document.getElementById("health-bar-fill");
const healthNum = document.getElementById("health-num");
const ammoEl = document.getElementById("ammo");
const messageEl = document.getElementById("message");
const bloodOverlay = document.getElementById("blood-overlay");

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// ---------- SETTINGS ----------
const settings = {
  musicVol: 0.45,
  mouseSens: 3,       // maps to rotSpeed ~ 0.001 * sens
  healthMode: "blood", // "blood" | "bar"
  fovDeg: 60,
  minimap: true
};

const volMusicInput = document.getElementById("vol-music");
const volMusicVal = document.getElementById("vol-music-val");
const mouseSensInput = document.getElementById("mouse-sens");
const mouseSensVal = document.getElementById("mouse-sens-val");
const healthModeSelect = document.getElementById("health-mode");
const fovRange = document.getElementById("fov-range");
const fovVal = document.getElementById("fov-val");
const minimapMode = document.getElementById("minimap-mode");
const levelNameEl = document.getElementById("level-name");

volMusicInput.addEventListener("input", () => {
  settings.musicVol = volMusicInput.value / 100;
  volMusicVal.textContent = volMusicInput.value + "%";
  if (musicGain) musicGain.gain.value = settings.musicVol;
});
mouseSensInput.addEventListener("input", () => {
  settings.mouseSens = +mouseSensInput.value;
  mouseSensVal.textContent = mouseSensInput.value;
  player.rotSpeed = 0.001 * settings.mouseSens;
});
healthModeSelect.addEventListener("change", () => {
  settings.healthMode = healthModeSelect.value;
  updateHUD();
  updateBloodOverlay();
});
if (fovRange) {
  fovRange.addEventListener("input", () => {
    settings.fovDeg = +fovRange.value;
    fovVal.textContent = fovRange.value + "°";
    player.fov = (settings.fovDeg * Math.PI) / 180;
  });
}
if (minimapMode) {
  minimapMode.addEventListener("change", () => {
    settings.minimap = minimapMode.value === "on";
  });
}

document.getElementById("settings-close").addEventListener("click", closeSettings);

const settingsRestartBtn = document.getElementById("settings-restart");
const settingsMenuBtn = document.getElementById("settings-menu");
if (settingsRestartBtn) {
  settingsRestartBtn.addEventListener("click", () => {
    closeSettings();
    const keep = currentLevel;
    currentWeapon = { ...WEAPONS.fists };
    spareAmmo = 0;
    weaponCooldown = 0;
    swinging = false;
    gameOver = false;
    transitioning = false;
    transitionPhase = "none";
    transitionAlpha = 0;
    loadLevel(keep, false);
    deathScreen.classList.add("hidden");
    hud.classList.remove("hidden");
    crosshair.classList.remove("hidden");
    document.body.classList.add("playing");
    gameRunning = true;
    canvas.requestPointerLock();
  });
}
if (settingsMenuBtn) {
  settingsMenuBtn.addEventListener("click", () => {
    closeSettings();
    goToMenu();
  });
}

const menuSettingsBtn = document.getElementById("menu-settings-btn");
if (menuSettingsBtn) {
  menuSettingsBtn.addEventListener("click", () => {
    resumeAudio();
    openSettings();
  });
}

function openSettings() {
  settingsScreen.classList.remove("hidden");
  document.exitPointerLock();
  document.body.classList.remove("playing");
}
function closeSettings() {
  settingsScreen.classList.add("hidden");
  if (gameRunning) {
    document.body.classList.add("playing");
    canvas.requestPointerLock();
  }
}

function goToMenu() {
  gameRunning = false;
  gameOver = false;
  transitioning = false;
  transitionPhase = "none";
  transitionAlpha = 0;
  currentLevel = 0;
  document.exitPointerLock();
  document.body.classList.remove("playing");
  hud.classList.add("hidden");
  crosshair.classList.add("hidden");
  bloodOverlay.classList.add("hidden");
  deathScreen.classList.add("hidden");
  settingsScreen.classList.add("hidden");
  titleScreen.classList.remove("hidden");
  resumeAudio();
}

// ---------- AUDIO (gopnik / dark courtyard hardbass vibe) ----------
let audioCtx = null;
let musicGain = null;
let musicStarted = false;
let beatTimer = null;
let melTimer = null;

function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  musicGain = audioCtx.createGain();
  musicGain.gain.value = settings.musicVol;
  musicGain.connect(audioCtx.destination);

  const sr = audioCtx.sampleRate;

  // --- Sub drone (cold courtyard hum) ---
  const drone = audioCtx.createOscillator();
  drone.type = "sine";
  drone.frequency.value = 41.2; // E1
  const droneG = audioCtx.createGain();
  droneG.gain.value = 0.12;
  drone.connect(droneG);
  droneG.connect(musicGain);
  drone.start();

  const drone2 = audioCtx.createOscillator();
  drone2.type = "triangle";
  drone2.frequency.value = 82.4;
  const drone2G = audioCtx.createGain();
  drone2G.gain.value = 0.04;
  drone2.connect(drone2G);
  drone2G.connect(musicGain);
  drone2.start();

  // --- Distorted bass (hardbass-ish) ---
  const bass = audioCtx.createOscillator();
  bass.type = "sawtooth";
  bass.frequency.value = 55;
  const bassFilter = audioCtx.createBiquadFilter();
  bassFilter.type = "lowpass";
  bassFilter.frequency.value = 180;
  bassFilter.Q.value = 6;
  const bassG = audioCtx.createGain();
  bassG.gain.value = 0.09;
  bass.connect(bassFilter);
  bassFilter.connect(bassG);
  bassG.connect(musicGain);
  bass.start();

  // Slow filter sweep on bass
  const bassLfo = audioCtx.createOscillator();
  bassLfo.frequency.value = 0.12;
  const bassLfoG = audioCtx.createGain();
  bassLfoG.gain.value = 80;
  bassLfo.connect(bassLfoG);
  bassLfoG.connect(bassFilter.frequency);
  bassLfo.start();

  // --- Street noise / wind ---
  const nBuf = audioCtx.createBuffer(1, sr * 2, sr);
  const nData = nBuf.getChannelData(0);
  for (let i = 0; i < nData.length; i++) nData[i] = Math.random() * 2 - 1;
  const noise = audioCtx.createBufferSource();
  noise.buffer = nBuf;
  noise.loop = true;
  const nFilt = audioCtx.createBiquadFilter();
  nFilt.type = "bandpass";
  nFilt.frequency.value = 900;
  nFilt.Q.value = 0.6;
  const nG = audioCtx.createGain();
  nG.gain.value = 0.028;
  noise.connect(nFilt);
  nFilt.connect(nG);
  nG.connect(musicGain);
  noise.start();

  // --- Kick synthesizer (4/4 hardbass pulse ~140 BPM) ---
  function playKick(time) {
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.frequency.setValueAtTime(140, time);
    osc.frequency.exponentialRampToValueAtTime(45, time + 0.08);
    g.gain.setValueAtTime(0.35, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.22);
    osc.connect(g);
    g.connect(musicGain);
    osc.start(time);
    osc.stop(time + 0.25);
  }

  // --- Snare-ish clap (noise burst) ---
  function playClap(time) {
    const buf = audioCtx.createBuffer(1, sr * 0.15, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.03));
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const f = audioCtx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 1200;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(0.12, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.12);
    src.connect(f);
    f.connect(g);
    g.connect(musicGain);
    src.start(time);
  }

  // --- Hi-hat tick ---
  function playHat(time, vol) {
    const buf = audioCtx.createBuffer(1, sr * 0.05, sr);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (sr * 0.008));
    const src = audioCtx.createBufferSource();
    src.buffer = buf;
    const f = audioCtx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const g = audioCtx.createGain();
    g.gain.setValueAtTime(vol, time);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.04);
    src.connect(f);
    f.connect(g);
    g.connect(musicGain);
    src.start(time);
  }

  // Beat loop ~140 BPM (beat every ~0.428s)
  const beatInterval = 0.428;
  let beatCount = 0;
  function scheduleBeats() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    // schedule a few beats ahead
    for (let i = 0; i < 4; i++) {
      const t = now + i * beatInterval + 0.05;
      playKick(t);
      playHat(t + beatInterval * 0.5, 0.05);
      if (beatCount % 2 === 1) playClap(t);
      // open hat on off-beats sometimes
      if (beatCount % 4 === 2) playHat(t + beatInterval * 0.25, 0.03);
      beatCount++;
    }
    beatTimer = setTimeout(scheduleBeats, beatInterval * 4 * 1000 - 20);
  }
  scheduleBeats();

  // --- Dark minor lead (siren / street melody) ---
  // A minor-ish hardbass-style stabs
  const leadNotes = [
    110.00, 130.81, 146.83, 164.81, // A2 C3 D3 E3
    146.83, 130.81, 110.00, 98.00,  // D3 C3 A2 G2
    110.00, 164.81, 196.00, 164.81, // A2 E3 G3 E3
    146.83, 130.81, 110.00, 82.41   // D3 C3 A2 E2
  ];
  let leadIdx = 0;
  const lead = audioCtx.createOscillator();
  lead.type = "square";
  lead.frequency.value = leadNotes[0];
  const leadFilt = audioCtx.createBiquadFilter();
  leadFilt.type = "lowpass";
  leadFilt.frequency.value = 900;
  leadFilt.Q.value = 4;
  const leadG = audioCtx.createGain();
  leadG.gain.value = 0;
  lead.connect(leadFilt);
  leadFilt.connect(leadG);
  leadG.connect(musicGain);
  lead.start();

  // Detuned second voice for that cheap synth feel
  const lead2 = audioCtx.createOscillator();
  lead2.type = "sawtooth";
  lead2.frequency.value = leadNotes[0] * 1.01;
  const lead2G = audioCtx.createGain();
  lead2G.gain.value = 0;
  lead2.connect(lead2G);
  lead2G.connect(musicGain);
  lead2.start();

  function playLeadStep() {
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const freq = leadNotes[leadIdx % leadNotes.length];
    lead.frequency.setValueAtTime(freq, now);
    lead2.frequency.setValueAtTime(freq * 1.01, now);
    leadFilt.frequency.setValueAtTime(1400, now);
    leadFilt.frequency.exponentialRampToValueAtTime(500, now + 0.3);

    leadG.gain.cancelScheduledValues(now);
    leadG.gain.setValueAtTime(0, now);
    leadG.gain.linearRampToValueAtTime(0.055, now + 0.03);
    leadG.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    lead2G.gain.cancelScheduledValues(now);
    lead2G.gain.setValueAtTime(0, now);
    lead2G.gain.linearRampToValueAtTime(0.025, now + 0.03);
    lead2G.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    leadIdx++;
    // Sync roughly to beat: every 2 beats
    melTimer = setTimeout(playLeadStep, beatInterval * 2 * 1000);
  }
  melTimer = setTimeout(playLeadStep, 800);

  musicStarted = true;
}

function resumeAudio() {
  if (!audioCtx) initAudio();
  if (audioCtx.state === "suspended") audioCtx.resume();
}

// ---------- MAP / LEVELS ----------
// 0 = empty, 1 = wall (panel), 2 = brick, 3 = metal, 4 = dirty wall, 5 = exit / alley portal
// Street layouts: building blocks on sides, long roads, side alleys, courtyards
const levels = [
  {
    // Main residential street with side courtyards
    name: "УЛИЦА · Ленина",
    start: { x: 7.5, y: 4.5, dir: Math.PI / 2 },
    map: [
      // 24x24 — long street running north-south, buildings left/right, courtyards
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,2,2,2,0,0,0,2,2,2,2,2,2,0,0,0,2,2,2,2,2,1],
      [1,2,2,2,2,2,0,0,0,2,2,2,2,2,2,0,0,0,2,2,2,2,2,1],
      [1,2,2,2,2,2,0,0,0,2,2,0,0,2,2,0,0,0,2,2,2,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,2,2,0,0,2,2,0,0,0,3,3,3,3,0,0,0,2,2,0,0,2,2,1],
      [1,2,2,0,0,2,2,0,0,0,3,0,0,3,0,0,0,2,2,0,0,2,2,1],
      [1,2,2,0,0,2,2,0,0,0,3,0,0,3,0,0,0,2,2,0,0,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,4,4,4,0,0,0,0,4,4,4,0,0,4,4,4,0,0,0,0,4,4,4,1],
      [1,4,0,0,0,0,0,0,4,0,0,0,0,0,0,4,0,0,0,0,0,0,4,1],
      [1,4,0,0,0,0,0,0,4,0,0,0,0,0,0,4,0,0,0,0,0,0,4,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,2,2,2,2,0,0,0,2,2,0,0,0,0,2,2,0,0,0,2,2,2,2,1],
      [1,2,2,2,2,0,0,0,2,2,0,0,0,0,2,2,0,0,0,2,2,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,1],
      [1,3,3,3,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,3,3,3,1],
      [1,3,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,3,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemySpots: [[7,5],[16,5],[10,9],[4,10],[19,10],[12,14],[7,15],[17,15],[5,19],[14,19],[10,7],[20,7],[3,14],[18,18]],
    pickups: [
      { x: 7.5, y: 4.5, type: "bottle" }, { x: 16.5, y: 5.5, type: "knife" },
      { x: 10.5, y: 10.5, type: "pistol" }, { x: 4.5, y: 12.5, type: "hammer" },
      { x: 19.5, y: 12.5, type: "chainsaw" }, { x: 12.5, y: 16.5, type: "knife" },
      { x: 7.5, y: 18.5, type: "bottle" }, { x: 15.5, y: 9.5, type: "hammer" },
      { x: 5.5, y: 6.5, type: "bandage", isMed: true }, { x: 18.5, y: 6.5, type: "medkit", isMed: true },
      { x: 9.5, y: 13.5, type: "bandage", isMed: true }, { x: 14.5, y: 17.5, type: "medkit", isMed: true },
      { x: 6.5, y: 9.5, type: "ammo", isAmmo: true }, { x: 17.5, y: 11.5, type: "ammo", isAmmo: true },
      { x: 11.5, y: 5.5, type: "ammo", isAmmo: true }, { x: 8.5, y: 16.5, type: "ammo", isAmmo: true },
      { x: 13.5, y: 19.5, type: "ammo", isAmmo: true }
    ]
  },
  {
    // Narrower street with garages and archways
    name: "ПЕРЕУЛОК · Гаражи",
    start: { x: 11.5, y: 3.5, dir: Math.PI / 2 },
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,1],
      [1,4,4,4,4,4,4,4,0,0,0,0,0,0,0,0,4,4,4,4,4,4,4,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,2,2,2,0,0,2,2,2,0,0,0,0,0,0,2,2,2,0,0,2,2,2,1],
      [1,2,0,0,0,0,0,0,2,0,0,0,0,0,0,2,0,0,0,0,0,0,2,1],
      [1,2,0,0,0,0,0,0,2,0,0,3,3,0,0,2,0,0,0,0,0,0,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,3,3,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,3,3,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,3,3,1],
      [1,3,3,0,0,0,0,0,4,4,0,0,0,0,4,4,0,0,0,0,0,3,3,1],
      [1,0,0,0,0,0,0,0,4,0,0,0,0,0,0,4,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,4,0,0,0,0,0,0,4,0,0,0,0,0,0,0,1],
      [1,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,1],
      [1,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,2,0,0,2,0,0,0,0,0,0,0,0,0,1],
      [1,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,1],
      [1,4,4,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,4,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemySpots: [[5,4],[12,4],[18,4],[9,8],[15,8],[4,12],[20,12],[11,13],[7,16],[16,16],[3,9],[19,9],[10,20],[14,18]],
    pickups: [
      { x: 5.5, y: 3.5, type: "knife" }, { x: 14.5, y: 4.5, type: "hammer" },
      { x: 9.5, y: 9.5, type: "pistol" }, { x: 18.5, y: 8.5, type: "bottle" },
      { x: 6.5, y: 14.5, type: "chainsaw" }, { x: 12.5, y: 17.5, type: "knife" },
      { x: 4.5, y: 7.5, type: "bandage", isMed: true }, { x: 17.5, y: 12.5, type: "medkit", isMed: true },
      { x: 10.5, y: 5.5, type: "bandage", isMed: true }, { x: 15.5, y: 19.5, type: "medkit", isMed: true },
      { x: 7.5, y: 6.5, type: "ammo", isAmmo: true }, { x: 13.5, y: 11.5, type: "ammo", isAmmo: true },
      { x: 19.5, y: 5.5, type: "ammo", isAmmo: true }, { x: 8.5, y: 15.5, type: "ammo", isAmmo: true },
      { x: 16.5, y: 17.5, type: "ammo", isAmmo: true }, { x: 11.5, y: 20.5, type: "ammo", isAmmo: true }
    ]
  },
  {
    // Wide street + market square open area
    name: "ПЛОЩАДЬ · Рынок",
    start: { x: 11.5, y: 4.5, dir: Math.PI / 2 },
    map: [
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
      [1,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,1],
      [1,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,1],
      [1,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,3,3,0,0,0,0,4,4,4,0,0,0,0,4,4,4,0,0,0,0,3,3,1],
      [1,3,3,0,0,0,0,4,0,0,0,0,0,0,0,0,4,0,0,0,0,3,3,1],
      [1,0,0,0,0,0,0,4,0,0,0,0,0,0,0,0,4,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,2,2,2,0,0,0,0,0,0,2,2,2,2,0,0,0,0,0,0,2,2,2,1],
      [1,2,2,2,0,0,0,0,0,0,2,0,0,2,0,0,0,0,0,0,2,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,4,4,0,0,0,0,0,3,3,0,0,0,0,3,3,0,0,0,0,0,4,4,1],
      [1,4,4,0,0,0,0,0,3,0,0,0,0,0,0,3,0,0,0,0,0,4,4,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,1],
      [1,2,2,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,2,2,1],
      [1,2,2,2,2,0,0,0,0,0,0,0,5,0,0,0,0,0,0,2,2,2,2,1],
      [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
      [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ],
    enemySpots: [[6,5],[12,5],[17,5],[9,9],[15,9],[4,12],[20,12],[11,14],[7,17],[16,17],[5,8],[18,8],[10,20],[14,11],[8,15]],
    pickups: [
      { x: 6.5, y: 4.5, type: "hammer" }, { x: 15.5, y: 5.5, type: "chainsaw" },
      { x: 11.5, y: 10.5, type: "pistol" }, { x: 18.5, y: 13.5, type: "bottle" },
      { x: 5.5, y: 16.5, type: "knife" }, { x: 13.5, y: 7.5, type: "hammer" },
      { x: 8.5, y: 12.5, type: "medkit", isMed: true }, { x: 16.5, y: 9.5, type: "medkit", isMed: true },
      { x: 4.5, y: 8.5, type: "bandage", isMed: true }, { x: 19.5, y: 17.5, type: "bandage", isMed: true },
      { x: 7.5, y: 6.5, type: "ammo", isAmmo: true }, { x: 14.5, y: 14.5, type: "ammo", isAmmo: true },
      { x: 10.5, y: 4.5, type: "ammo", isAmmo: true }, { x: 17.5, y: 18.5, type: "ammo", isAmmo: true },
      { x: 9.5, y: 16.5, type: "ammo", isAmmo: true }, { x: 12.5, y: 19.5, type: "ammo", isAmmo: true },
      { x: 5.5, y: 11.5, type: "ammo", isAmmo: true }
    ]
  }
];

let currentLevel = 0;
let map = levels[0].map;
let MAP_W = map[0].length;
let MAP_H = map.length;
const TILE = 1;

// Transition state
let transitioning = false;
let transitionAlpha = 0;
let transitionPhase = "none"; // "out" | "in" | "none"
let transitionTimer = 0;
let pendingLevel = 0;

// ---------- PLAYER ----------
const player = {
  x: 2.5,
  y: 2.5,
  dir: 0,
  fov: (60 * Math.PI) / 180,
  speed: 0.045,
  rotSpeed: 0.001 * settings.mouseSens,
  hp: 100,
  maxHp: 100,
  invuln: 0
};

// ---------- WEAPONS ----------
const WEAPONS = {
  fists: {
    name: "Кулаки",
    damage: 12,
    range: 1.15,
    durability: Infinity,
    maxDurability: Infinity,
    cooldown: 280,
    swingTime: 180,
    color: "#cccccc"
  },
  bottle: {
    name: "Битая бутылка",
    damage: 28,
    range: 1.3,
    durability: 5,
    maxDurability: 5,
    cooldown: 320,
    swingTime: 200,
    color: "#88ccff"
  },
  knife: {
    name: "Канцелярский нож",
    damage: 22,
    range: 1.25,
    durability: 10,
    maxDurability: 10,
    cooldown: 240,
    swingTime: 160,
    color: "#dddddd"
  },
  hammer: {
    name: "Молоток",
    damage: 38,
    range: 1.4,
    durability: 14,
    maxDurability: 14,
    cooldown: 420,
    swingTime: 260,
    color: "#aa8866"
  },
  chainsaw: {
    name: "Бензопила",
    damage: 18,
    range: 1.5,
    durability: 40,
    maxDurability: 40,
    cooldown: 80,
    swingTime: 60,
    color: "#ff4444",
    continuous: true
  },
  pistol: {
    name: "Травмат",
    damage: 45,
    range: 12,
    durability: 6,
    maxDurability: 18,
    cooldown: 500,
    swingTime: 100,
    color: "#ffaa00",
    isGun: true
  }
};

// Med items (not weapons)
const MEDS = {
  bandage: { name: "Бинт", heal: 25, color: "#eeeeee" },
  medkit:  { name: "Аптечка", heal: 55, color: "#44cc66" }
};

const AMMO_PACK = { name: "Патроны", amount: 5, color: "#ddaa44" };

let currentWeapon = { ...WEAPONS.fists };
let spareAmmo = 0; // патроны в кармане, если травмат не в руках
let weaponCooldown = 0;
let swinging = false;
let swingProgress = 0;

// ---------- SPRITES (gopnik) ----------
const gopnikRun = [];
const gopnikFall = [];
let spritesReady = false;

function loadSprites() {
  let pending = 8 + 7;
  function done() {
    pending--;
    if (pending <= 0) spritesReady = true;
  }
  for (let i = 0; i < 8; i++) {
    const img = new Image();
    img.onload = done;
    img.onerror = done;
    img.src = `Image/gopnik_run_${i}.png`;
    gopnikRun.push(img);
  }
  for (let i = 0; i < 7; i++) {
    const img = new Image();
    img.onload = done;
    img.onerror = done;
    img.src = `Image/gopnik_fall_${i}.png`;
    gopnikFall.push(img);
  }
}
loadSprites();

// ---------- ENEMIES ----------
const enemies = [];
// Reduced speeds (~60% of original)
const enemyTypes = [
  { name: "Гопник", hp: 45, speed: 0.011, damage: 8, color: "#6688aa", size: 0.55 },
  { name: "Скин", hp: 70, speed: 0.013, damage: 14, color: "#aa4444", size: 0.6 },
  { name: "Нарк", hp: 35, speed: 0.017, damage: 6, color: "#88aa66", size: 0.5 },
  { name: "Мент", hp: 95, speed: 0.0085, damage: 18, color: "#4466aa", size: 0.65 }
];

function spawnEnemies() {
  enemies.length = 0;
  const lvl = levels[currentLevel];
  const spots = lvl.enemySpots || [];
  // Slightly more enemies on later levels
  const extra = currentLevel * 2;
  for (let i = 0; i < spots.length; i++) {
    const [mx, my] = spots[i];
    if (map[my] && map[my][mx] === 0) {
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      // Scale difficulty a bit per level
      const hpMul = 1 + currentLevel * 0.18;
      const dmgMul = 1 + currentLevel * 0.12;
      enemies.push({
        x: mx + 0.5,
        y: my + 0.5,
        hp: Math.floor(type.hp * hpMul),
        maxHp: Math.floor(type.hp * hpMul),
        speed: type.speed * (1 + currentLevel * 0.06),
        damage: Math.floor(type.damage * dmgMul),
        color: type.color,
        size: type.size,
        name: type.name,
        state: "idle",
        attackCd: 0,
        hitFlash: 0,
        dead: false,
        dying: false,
        fallFrame: 0,
        fallTimer: 0,
        animFrame: Math.floor(Math.random() * 8),
        animTimer: Math.random() * 100,
        stagger: 0,
        moving: false
      });
    }
  }
}

// ---------- PICKUPS ----------
const pickups = [];
function spawnPickups() {
  pickups.length = 0;
  const lvl = levels[currentLevel];
  const items = lvl.pickups || [];
  for (const it of items) {
    if (map[Math.floor(it.y)] && map[Math.floor(it.y)][Math.floor(it.x)] === 0) {
      pickups.push({ ...it, taken: false });
    }
  }
}

// ---------- INPUT ----------
const keys = {};
let mouseDX = 0;
let pointerLocked = false;

document.addEventListener("keydown", e => {
  keys[e.code] = true;

  if (e.code === "Escape") {
    e.preventDefault();
    if (!settingsScreen.classList.contains("hidden")) {
      closeSettings();
    } else if (gameRunning || !titleScreen.classList.contains("hidden") || !deathScreen.classList.contains("hidden")) {
      openSettings();
    }
    return;
  }

  // Старт/рестарт только по кнопке — любая клавиша больше не запускает игру

  if (e.code === "KeyE" && gameRunning) tryPickupOrDrop();

  // Caps Lock — вкл/выкл захват курсора
  if (e.code === "CapsLock") {
    e.preventDefault();
    if (document.pointerLockElement === canvas) {
      document.exitPointerLock();
      showMessage("Курсор разблокирован (Caps Lock)");
    } else {
      canvas.requestPointerLock();
      showMessage("Курсор заблокирован (Caps Lock)");
    }
  }
});
document.addEventListener("keyup", e => keys[e.code] = false);

canvas.addEventListener("click", () => {
  if (!gameRunning) return;
  if (settingsScreen.classList.contains("hidden")) {
    canvas.requestPointerLock();
  }
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", e => {
  if (pointerLocked) mouseDX += e.movementX;
});

document.addEventListener("mousedown", e => {
  if (!gameRunning || e.button !== 0 || !settingsScreen.classList.contains("hidden")) return;
  attack();
});

// ---------- GAME STATE ----------
let gameRunning = false;
let gameOver = false;
let messageTimer = 0;
let bloodParticles = [];
let snowParticles = [];
let zBuffer = []; // wall distances per ray for sprite occlusion

function showMessage(text, time = 1800) {
  messageEl.textContent = text;
  messageEl.classList.add("show");
  messageTimer = time;
}

function loadLevel(idx, keepHp = false) {
  currentLevel = Math.max(0, Math.min(idx, levels.length - 1));
  const lvl = levels[currentLevel];
  map = lvl.map;
  MAP_W = map[0].length;
  MAP_H = map.length;

  player.x = lvl.start.x;
  player.y = lvl.start.y;
  player.dir = lvl.start.dir;
  if (!keepHp) {
    player.hp = 100;
  }
  player.invuln = 30; // short invuln after load
  player.fov = (settings.fovDeg * Math.PI) / 180;

  spawnEnemies();
  spawnPickups();
  bloodParticles = [];
  initSnow();
  updateHUD();
  updateBloodOverlay();
  if (levelNameEl) levelNameEl.textContent = lvl.name + "  ·  " + (currentLevel + 1) + "/" + levels.length;
  showMessage(lvl.name, 2200);
}

function startGame() {
  resumeAudio();
  currentLevel = 0;
  currentWeapon = { ...WEAPONS.fists };
  spareAmmo = 0;
  weaponCooldown = 0;
  swinging = false;
  gameOver = false;
  transitioning = false;
  transitionPhase = "none";
  transitionAlpha = 0;

  loadLevel(0, false);

  titleScreen.classList.add("hidden");
  deathScreen.classList.add("hidden");
  settingsScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  crosshair.classList.remove("hidden");
  document.body.classList.add("playing");
  gameRunning = true;
  canvas.requestPointerLock();
}

function startTransition(nextIdx) {
  if (transitioning) return;
  transitioning = true;
  transitionPhase = "out";
  transitionAlpha = 0;
  transitionTimer = 0;
  pendingLevel = nextIdx;
  showMessage(nextIdx >= levels.length ? "ВЫХОД..." : "Переулок...", 1200);
}

function die() {
  gameRunning = false;
  gameOver = true;
  document.exitPointerLock();
  document.body.classList.remove("playing");
  hud.classList.add("hidden");
  crosshair.classList.add("hidden");
  bloodOverlay.classList.add("hidden");
  deathScreen.classList.remove("hidden");
}

document.getElementById("start-btn").addEventListener("click", () => {
  resumeAudio();
  startGame();
});
document.getElementById("restart-btn").addEventListener("click", startGame);
const menuBtn = document.getElementById("menu-btn");
if (menuBtn) menuBtn.addEventListener("click", goToMenu);

// ---------- COMBAT ----------
function attack() {
  if (weaponCooldown > 0 || swinging) return;

  if (currentWeapon.isGun) {
    if (currentWeapon.durability <= 0) {
      showMessage("Патроны кончились! Брось пистолет (E)");
      return;
    }
    currentWeapon.durability--;
    weaponCooldown = currentWeapon.cooldown;
    swinging = true;
    swingProgress = 0;

    const ray = castRay(player.dir);
    let hitEnemy = null;
    let hitDist = ray.dist;

    for (const en of enemies) {
      if (en.dead || en.dying) continue;
      const dx = en.x - player.x;
      const dy = en.y - player.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > currentWeapon.range || dist > hitDist) continue;
      const angle = Math.atan2(dy, dx);
      let diff = angle - player.dir;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 0.18) {
        hitEnemy = en;
        hitDist = dist;
      }
    }

    if (hitEnemy) {
      damageEnemy(hitEnemy, currentWeapon.damage);
      spawnBlood(hitEnemy.x, hitEnemy.y, 8);
    }
    updateHUD();
    return;
  }

  // Melee
  weaponCooldown = currentWeapon.cooldown;
  swinging = true;
  swingProgress = 0;

  let best = null;
  let bestDist = currentWeapon.range;

  for (const en of enemies) {
    if (en.dead || en.dying) continue;
    const dx = en.x - player.x;
    const dy = en.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > bestDist) continue;
    const angle = Math.atan2(dy, dx);
    let diff = angle - player.dir;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    if (Math.abs(diff) < 0.55) {
      best = en;
      bestDist = dist;
    }
  }

  if (best) {
    damageEnemy(best, currentWeapon.damage);
    spawnBlood(best.x, best.y, 6);
    if (currentWeapon.durability !== Infinity) {
      currentWeapon.durability--;
      if (currentWeapon.durability <= 0) {
        showMessage(currentWeapon.name + " сломался!");
        currentWeapon = { ...WEAPONS.fists };
      }
    }
  } else {
    if (currentWeapon.durability !== Infinity && !currentWeapon.continuous) {
      currentWeapon.durability = Math.max(0, currentWeapon.durability - 0.3);
    }
  }
  updateHUD();
}

function damageEnemy(en, dmg) {
  if (en.dead || en.dying) return;
  en.hp -= dmg;
  en.hitFlash = 8;
  en.stagger = 12;
  if (en.hp <= 0) {
    en.hp = 0;
    en.dying = true;
    en.fallFrame = 0;
    en.fallTimer = 0;
    spawnBlood(en.x, en.y, 14);
    showMessage(en.name + " убит");
  }
}

function tryPickupOrDrop() {
  // Med pickups
  for (const p of pickups) {
    if (p.taken || !p.isMed) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (dx * dx + dy * dy < 1.2) {
      p.taken = true;
      const med = MEDS[p.type];
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + med.heal);
      showMessage(med.name + " +" + Math.round(player.hp - before) + " HP");
      updateHUD();
      updateBloodOverlay();
      return;
    }
  }

  // Ammo pickups
  for (const p of pickups) {
    if (p.taken || !p.isAmmo) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (dx * dx + dy * dy < 1.2) {
      p.taken = true;
      const add = AMMO_PACK.amount;
      if (currentWeapon.isGun) {
        const before = currentWeapon.durability;
        currentWeapon.durability = Math.min(currentWeapon.maxDurability || 18, currentWeapon.durability + add);
        const got = Math.round(currentWeapon.durability - before);
        showMessage(got > 0 ? `Патроны +${got}` : "Магазин полный");
      } else {
        spareAmmo += add;
        showMessage(`Патроны +${add} (в кармане)`);
      }
      updateHUD();
      return;
    }
  }

  // Drop current non-fist weapon
  if (currentWeapon.name !== "Кулаки") {
    pickups.push({
      x: player.x + Math.cos(player.dir) * 0.7,
      y: player.y + Math.sin(player.dir) * 0.7,
      type: Object.keys(WEAPONS).find(k => WEAPONS[k].name === currentWeapon.name),
      taken: false,
      durability: currentWeapon.durability
    });
    showMessage("Бросил " + currentWeapon.name);
    currentWeapon = { ...WEAPONS.fists };
    updateHUD();
    return;
  }

  // Pickup weapon
  for (const p of pickups) {
    if (p.taken || p.isMed || p.isAmmo) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (dx * dx + dy * dy < 1.2) {
      p.taken = true;
      currentWeapon = { ...WEAPONS[p.type] };
      if (p.durability !== undefined) currentWeapon.durability = p.durability;
      // Load spare ammo into pistol if any
      if (currentWeapon.isGun && spareAmmo > 0) {
        const before = currentWeapon.durability;
        currentWeapon.durability = Math.min(currentWeapon.maxDurability || 18, currentWeapon.durability + spareAmmo);
        const loaded = Math.round(currentWeapon.durability - before);
        spareAmmo = Math.max(0, spareAmmo - loaded);
        showMessage("Подобрал: " + currentWeapon.name + (loaded > 0 ? ` (+${loaded} патр.)` : ""));
      } else {
        showMessage("Подобрал: " + currentWeapon.name);
      }
      updateHUD();
      return;
    }
  }
}

function updateHUD() {
  weaponNameEl.textContent = currentWeapon.name +
    (currentWeapon.durability !== Infinity
      ? ` [${Math.ceil(currentWeapon.durability)}]`
      : "");

  const hp = Math.max(0, Math.ceil(player.hp));

  if (settings.healthMode === "bar") {
    healthBarContainer.classList.remove("hidden");
    healthEl.classList.add("hidden");
    healthBarFill.style.width = (player.hp / player.maxHp * 100) + "%";
    healthBarFill.style.background = player.hp > 40
      ? "linear-gradient(90deg, #c41e3a, #4caf50)"
      : "linear-gradient(90deg, #8b0000, #ff3333)";
    healthNum.textContent = hp;
  } else {
    healthBarContainer.classList.add("hidden");
    // In blood mode we hide the numeric HP text too for immersion,
    // but keep a tiny fallback if wanted — user asked for blood OR bar
    healthEl.classList.add("hidden");
  }

  if (currentWeapon.isGun) {
    ammoEl.textContent = `Патроны: ${Math.ceil(currentWeapon.durability)}` +
      (spareAmmo > 0 ? ` (+${spareAmmo})` : "");
  } else if (spareAmmo > 0) {
    ammoEl.textContent = `Патроны в кармане: ${spareAmmo}`;
  } else {
    ammoEl.textContent = "";
  }
}

function updateBloodOverlay() {
  if (!gameRunning || settings.healthMode !== "blood") {
    bloodOverlay.classList.add("hidden");
    bloodOverlay.style.opacity = 0;
    bloodOverlay.classList.remove("critical");
    return;
  }
  bloodOverlay.classList.remove("hidden");
  const missing = 1 - player.hp / player.maxHp;
  // Ещё заметнее кровь по бокам
  const op = Math.min(1, 0.12 + missing * 1.2);
  bloodOverlay.style.opacity = op;
  if (player.hp <= 5) bloodOverlay.classList.add("critical");
  else bloodOverlay.classList.remove("critical");
}

// ---------- PARTICLES ----------
function spawnBlood(x, y, count) {
  for (let i = 0; i < count; i++) {
    bloodParticles.push({
      x, y,
      vx: (Math.random() - 0.5) * 0.08,
      vy: (Math.random() - 0.5) * 0.08,
      life: 30 + Math.random() * 25,
      size: 2 + Math.random() * 3
    });
  }
}

function initSnow() {
  snowParticles = [];
  for (let i = 0; i < 120; i++) {
    snowParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.6 + Math.random() * 1.4,
      size: 1 + Math.random() * 2,
      drift: (Math.random() - 0.5) * 0.4
    });
  }
}

// ---------- RAYCASTING ----------
function castRay(angle) {
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);

  let dist = 0;
  const step = 0.02;
  let hit = 0;
  let hitX = player.x;
  let hitY = player.y;
  let side = 0;

  while (dist < 20) {
    dist += step;
    hitX = player.x + cos * dist;
    hitY = player.y + sin * dist;
    const mx = Math.floor(hitX);
    const my = Math.floor(hitY);
    if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) {
      hit = 1;
      break;
    }
    if (map[my][mx] > 0) {
      hit = map[my][mx];
      const prevX = player.x + cos * (dist - step);
      if (Math.floor(prevX) !== mx) side = 1;
      break;
    }
  }
  return { dist, hit, side, hitX, hitY };
}

function getWallColor(type, side, dist, hitX, hitY) {
  let r, g, b;
  switch (type) {
    case 1: r = 95; g = 98; b = 110; break;
    case 2: r = 130; g = 75; b = 48; break;
    case 3: r = 55; g = 65; b = 78; break;
    case 4: r = 78; g = 70; b = 55; break;
    case 5: // dark alley / portal — almost black with cold blue tint
      r = 18; g = 22; b = 38;
      break;
    default: r = 85; g = 85; b = 90;
  }
  const stripe = Math.floor((side ? hitY : hitX) * 8) % 2;
  if (stripe) {
    r = Math.floor(r * 0.82);
    g = Math.floor(g * 0.82);
    b = Math.floor(b * 0.82);
  }
  if (type === 2) {
    const row = Math.floor((hitY % 1) * 6);
    if (row === 0 || row === 3) {
      r = Math.floor(r * 0.55);
      g = Math.floor(g * 0.55);
      b = Math.floor(b * 0.55);
    }
  }
  const fog = Math.max(0.22, 1 - dist / 13);
  const shade = side ? 0.65 : 1;
  r = Math.floor(r * fog * shade);
  g = Math.floor(g * fog * shade);
  b = Math.floor(b * fog * shade);
  return `rgb(${r},${g},${b})`;
}

// ---------- UPDATE ----------
function update(dt) {
  if (!gameRunning || !settingsScreen.classList.contains("hidden")) return;

  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) messageEl.classList.remove("show");
  }

  // Level transition (smooth fade)
  if (transitioning) {
    transitionTimer += dt;
    if (transitionPhase === "out") {
      transitionAlpha = Math.min(1, transitionTimer / 700);
      if (transitionAlpha >= 1) {
        // Swap level at full black
        if (pendingLevel >= levels.length) {
          // Win
          showMessage("ТЫ ВЫШЕЛ ИЗ ЮЖНО-СЛОВЕНКО", 3000);
          setTimeout(() => { goToMenu(); }, 2800);
          transitioning = false;
          transitionPhase = "none";
          transitionAlpha = 0;
          return;
        }
        loadLevel(pendingLevel, true); // keep HP between levels
        transitionPhase = "in";
        transitionTimer = 0;
        transitionAlpha = 1;
      }
    } else if (transitionPhase === "in") {
      transitionAlpha = Math.max(0, 1 - transitionTimer / 800);
      if (transitionAlpha <= 0) {
        transitioning = false;
        transitionPhase = "none";
        transitionAlpha = 0;
      }
    }
    // Still allow looking around a bit during fade, but freeze movement/combat mostly
    player.dir += mouseDX * player.rotSpeed * 0.3;
    mouseDX = 0;
    return; // skip normal gameplay during transition
  }

  // Rotation
  player.dir += mouseDX * player.rotSpeed;
  mouseDX = 0;

  // Movement
  let mx = 0, my = 0;
  if (keys["KeyW"]) { mx += Math.cos(player.dir); my += Math.sin(player.dir); }
  if (keys["KeyS"]) { mx -= Math.cos(player.dir); my -= Math.sin(player.dir); }
  if (keys["KeyA"]) { mx += Math.cos(player.dir - Math.PI / 2); my += Math.sin(player.dir - Math.PI / 2); }
  if (keys["KeyD"]) { mx += Math.cos(player.dir + Math.PI / 2); my += Math.sin(player.dir + Math.PI / 2); }

  if (mx || my) {
    const len = Math.sqrt(mx * mx + my * my);
    mx = (mx / len) * player.speed;
    my = (my / len) * player.speed;

    const newX = player.x + mx;
    const newY = player.y + my;

    const canWalk = (tx, ty) => {
      if (ty < 0 || tx < 0 || ty >= MAP_H || tx >= MAP_W) return false;
      const t = map[ty][tx];
      return t === 0 || t === 5; // empty or exit portal
    };

    if (canWalk(Math.floor(newX), Math.floor(player.y))) player.x = newX;
    if (canWalk(Math.floor(player.x), Math.floor(newY))) player.y = newY;

    // Check exit tile
    const px = Math.floor(player.x);
    const py = Math.floor(player.y);
    if (!transitioning && map[py] && map[py][px] === 5) {
      const next = currentLevel + 1;
      if (next < levels.length) {
        startTransition(next);
      } else {
        // Finished all levels — simple win message + restart to menu after a bit
        startTransition(levels.length); // special
      }
    }
  }

  if (weaponCooldown > 0) weaponCooldown -= dt;
  if (swinging) {
    swingProgress += dt;
    if (swingProgress >= currentWeapon.swingTime) swinging = false;
  }

  if (currentWeapon.continuous && keys["MouseLeft"] && weaponCooldown <= 0) {
    attack();
  }

  // Enemies AI
  for (const en of enemies) {
    if (en.dead) continue;

    // Death fall animation
    if (en.dying) {
      en.fallTimer += dt;
      if (en.fallTimer >= 70) {
        en.fallTimer = 0;
        en.fallFrame++;
        if (en.fallFrame >= 7) {
          en.dead = true;
          en.dying = false;
        }
      }
      continue;
    }

    if (en.stagger > 0) { en.stagger--; continue; }
    if (en.hitFlash > 0) en.hitFlash--;

    const dx = player.x - en.x;
    const dy = player.y - en.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    en.moving = false;
    if (dist < 9) {
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = en.speed;
      const newX = en.x + nx * speed;
      const newY = en.y + ny * speed;
      if (map[Math.floor(en.y)][Math.floor(newX)] === 0) { en.x = newX; en.moving = true; }
      if (map[Math.floor(newY)][Math.floor(en.x)] === 0) { en.y = newY; en.moving = true; }

      // Run animation
      if (en.moving) {
        en.animTimer += dt;
        if (en.animTimer >= 90) {
          en.animTimer = 0;
          en.animFrame = (en.animFrame + 1) % 8;
        }
      }

      if (dist < 1.1) {
        en.attackCd -= dt;
        if (en.attackCd <= 0 && player.invuln <= 0) {
          player.hp -= en.damage;
          player.invuln = 450;
          spawnBlood(player.x, player.y, 4);
          showMessage(en.name + " ударил тебя!");
          updateHUD();
          updateBloodOverlay();
          if (player.hp <= 0) die();
          en.attackCd = 700;
        }
      }
    }
  }

  if (player.invuln > 0) player.invuln -= dt;

  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    const p = bloodParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) bloodParticles.splice(i, 1);
  }

  for (const s of snowParticles) {
    s.y += s.speed;
    s.x += s.drift;
    if (s.y > height) {
      s.y = -5;
      s.x = Math.random() * width;
    }
  }
}

// ---------- RENDER ----------

function drawMinimap() {
  if (!settings.minimap || !gameRunning) return;
  const size = Math.min(160, Math.floor(width * 0.18));
  const pad = 14;
  const x0 = width - size - pad;
  const y0 = pad;
  const cell = size / Math.max(MAP_W, MAP_H);

  ctx.save();
  ctx.globalAlpha = 0.82;
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillRect(x0 - 4, y0 - 4, size + 8, size + 8);
  ctx.strokeStyle = "rgba(200,60,60,0.7)";
  ctx.lineWidth = 2;
  ctx.strokeRect(x0 - 4, y0 - 4, size + 8, size + 8);

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const t = map[y][x];
      if (t === 0) continue;
      if (t === 5) ctx.fillStyle = "#6644aa";
      else if (t === 2) ctx.fillStyle = "#8a5530";
      else if (t === 3) ctx.fillStyle = "#445566";
      else if (t === 4) ctx.fillStyle = "#665544";
      else ctx.fillStyle = "#667088";
      ctx.fillRect(x0 + x * cell, y0 + y * cell, cell + 0.5, cell + 0.5);
    }
  }

  // pickups
  for (const p of pickups) {
    if (p.taken) continue;
    ctx.fillStyle = p.isMed ? "#44cc66" : (p.isAmmo ? "#ddaa44" : "#ffcc44");
    ctx.fillRect(x0 + p.x * cell - 1.5, y0 + p.y * cell - 1.5, 3, 3);
  }
  // enemies
  for (const en of enemies) {
    if (en.dead) continue;
    ctx.fillStyle = en.dying ? "#882222" : "#cc3333";
    ctx.beginPath();
    ctx.arc(x0 + en.x * cell, y0 + en.y * cell, 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  // player
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(x0 + player.x * cell, y0 + player.y * cell, 2.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "#ff4444";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x0 + player.x * cell, y0 + player.y * cell);
  ctx.lineTo(
    x0 + player.x * cell + Math.cos(player.dir) * 8,
    y0 + player.y * cell + Math.sin(player.dir) * 8
  );
  ctx.stroke();
  ctx.restore();
}

function render() {
  // Sky
  const grad = ctx.createLinearGradient(0, 0, 0, height * 0.52);
  grad.addColorStop(0, "#0d1525");
  grad.addColorStop(0.4, "#1a2838");
  grad.addColorStop(1, "#2a3848");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height * 0.52);

  ctx.fillStyle = "rgba(80,40,20,0.12)";
  ctx.fillRect(0, height * 0.35, width, height * 0.17);

  // Ground
  const ggrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
  ggrad.addColorStop(0, "#4a4e52");
  ggrad.addColorStop(0.3, "#3a3c3e");
  ggrad.addColorStop(1, "#2a2826");
  ctx.fillStyle = ggrad;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  ctx.fillStyle = "rgba(210,220,230,0.12)";
  for (let gx = 0; gx < width; gx += 40) {
    const gy = height * 0.55 + (gx * 17 % 30);
    ctx.fillRect(gx, gy, 28, 8);
  }

  // Raycast walls + build z-buffer
  const numRays = Math.min(width, 320);
  const rayWidth = width / numRays;
  zBuffer = new Array(numRays);

  for (let i = 0; i < numRays; i++) {
    const rayAngle = player.dir - player.fov / 2 + (i / numRays) * player.fov;
    const ray = castRay(rayAngle);

    const corrected = ray.dist * Math.cos(rayAngle - player.dir);
    zBuffer[i] = corrected;

    const wallH = (height * 0.85) / corrected;
    const top = (height - wallH) / 2;
    const color = getWallColor(ray.hit, ray.side, corrected, ray.hitX, ray.hitY);

    ctx.fillStyle = color;
    ctx.fillRect(i * rayWidth, top, rayWidth + 1, wallH);

    if (ray.hit === 1 && wallH > 40) {
      const mid = top + wallH * 0.35;
      ctx.fillStyle = `rgba(30,40,55,${Math.max(0.15, 0.5 - corrected * 0.04)})`;
      ctx.fillRect(i * rayWidth, mid, rayWidth + 1, wallH * 0.18);
    }
    if (ray.hit === 4 && (i % 7 === 0)) {
      ctx.fillStyle = "rgba(40,30,20,0.25)";
      ctx.fillRect(i * rayWidth, top + wallH * 0.4, rayWidth + 1, wallH * 0.3);
    }
  }

  // Sprites: pickups + enemies (sorted by distance) with occlusion
  const sprites = [];

  for (const p of pickups) {
    if (p.taken) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 16) {
      let st = "pickup";
      if (p.isMed) st = "med";
      else if (p.isAmmo) st = "ammo";
      sprites.push({ type: st, obj: p, dist, dx, dy });
    }
  }
  for (const en of enemies) {
    if (en.dead) continue; // after fall anim finished
    const dx = en.x - player.x;
    const dy = en.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 16) sprites.push({ type: "enemy", obj: en, dist, dx, dy });
  }

  sprites.sort((a, b) => b.dist - a.dist);

  for (const s of sprites) {
    const angle = Math.atan2(s.dy, s.dx) - player.dir;
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;

    if (Math.abs(a) > player.fov * 0.72) continue;

    const screenX = (0.5 + a / player.fov) * width;
    const size = (height * 0.72) / s.dist;

    // Occlusion check
    const col = Math.floor((screenX / width) * numRays);
    if (col >= 0 && col < numRays && s.dist > zBuffer[col] + 0.15) {
      continue;
    }

    if (s.type === "enemy") {
      const en = s.obj;
      const flash = en.hitFlash > 0;
      const bob = en.dying ? 0 : Math.sin(Date.now() / 200 + en.x * 3) * (size * 0.02);

      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.beginPath();
      ctx.ellipse(screenX, height / 2 + size * 0.42 + bob, size * 0.28, size * 0.06, 0, 0, Math.PI * 2);
      ctx.fill();

      // Sprite (gopnik run / fall) — all enemy types use same art
      let img = null;
      if (en.dying && gopnikFall.length) {
        img = gopnikFall[Math.min(en.fallFrame, gopnikFall.length - 1)];
      } else if (gopnikRun.length) {
        img = gopnikRun[en.animFrame % gopnikRun.length];
      }

      if (img && img.complete && img.naturalWidth > 0) {
        const aspect = img.naturalWidth / img.naturalHeight;
        let drawH = size * 0.95;
        let drawW = drawH * aspect;
        // Fall frames are wider/lower
        if (en.dying) {
          drawH = size * 0.55;
          drawW = drawH * aspect * 1.1;
        }
        const dx = screenX - drawW / 2;
        const dy = height / 2 - drawH * 0.55 + bob + (en.dying ? size * 0.25 : 0);

        ctx.save();
        if (flash) {
          ctx.globalCompositeOperation = "source-over";
          ctx.filter = "brightness(2.2)";
        }
        ctx.drawImage(img, dx, dy, drawW, drawH);
        ctx.filter = "none";
        ctx.restore();
      } else {
        // Fallback procedural figure if sprites not loaded
        ctx.fillStyle = flash ? "#ffffff" : en.color;
        ctx.fillRect(screenX - size * 0.22, height / 2 - size * 0.28 + bob, size * 0.44, size * 0.42);
        ctx.fillStyle = flash ? "#ffdddd" : "#d4b896";
        ctx.beginPath();
        ctx.arc(screenX, height / 2 - size * 0.38 + bob, size * 0.16, 0, Math.PI * 2);
        ctx.fill();
      }

      // HP bar (only while alive)
      if (!en.dying && en.hp < en.maxHp) {
        const bw = size * 0.5;
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(screenX - bw / 2, height / 2 - size * 0.62 + bob, bw, 5);
        ctx.fillStyle = en.hp > en.maxHp * 0.4 ? "#c41e3a" : "#ff2200";
        ctx.fillRect(screenX - bw / 2, height / 2 - size * 0.62 + bob, bw * (en.hp / en.maxHp), 5);
      }
    } else if (s.type === "med") {
      // Medkit / bandage
      const med = MEDS[s.obj.type];
      const pulse = 0.7 + Math.sin(Date.now() / 180) * 0.3;
      ctx.fillStyle = `rgba(100,255,120,${0.12 * pulse})`;
      ctx.beginPath();
      ctx.arc(screenX, height / 2 + size * 0.05, size * 0.26, 0, Math.PI * 2);
      ctx.fill();

      if (s.obj.type === "medkit") {
        // Box
        ctx.fillStyle = "#2a5a2a";
        ctx.fillRect(screenX - size * 0.18, height / 2 - size * 0.12, size * 0.36, size * 0.28);
        ctx.fillStyle = "#44cc66";
        ctx.fillRect(screenX - size * 0.05, height / 2 - size * 0.18, size * 0.1, size * 0.4);
        ctx.fillRect(screenX - size * 0.16, height / 2 - size * 0.02, size * 0.32, size * 0.1);
      } else {
        // Bandage roll
        ctx.fillStyle = "#e8e8e8";
        ctx.beginPath();
        ctx.ellipse(screenX, height / 2 + size * 0.02, size * 0.16, size * 0.12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c41e3a";
        ctx.fillRect(screenX - size * 0.04, height / 2 - size * 0.08, size * 0.08, size * 0.2);
      }
    } else if (s.type === "ammo") {
      // Ammo box / cartridges on the ground
      const pulse = 0.7 + Math.sin(Date.now() / 160) * 0.3;
      ctx.fillStyle = `rgba(220,170,40,${0.14 * pulse})`;
      ctx.beginPath();
      ctx.arc(screenX, height / 2 + size * 0.05, size * 0.24, 0, Math.PI * 2);
      ctx.fill();
      // Small box
      ctx.fillStyle = "#5a4020";
      ctx.fillRect(screenX - size * 0.14, height / 2 - size * 0.06, size * 0.28, size * 0.18);
      ctx.fillStyle = "#ddaa44";
      ctx.fillRect(screenX - size * 0.12, height / 2 - size * 0.04, size * 0.24, size * 0.06);
      // Cartridges
      ctx.fillStyle = "#c4a030";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(screenX - size * 0.1 + i * size * 0.08, height / 2 + size * 0.04, size * 0.05, size * 0.1);
      }
    } else {
      // Weapon pickup
      const w = WEAPONS[s.obj.type];
      const pulse = 0.7 + Math.sin(Date.now() / 180) * 0.3;
      ctx.fillStyle = `rgba(255,200,50,${0.15 * pulse})`;
      ctx.beginPath();
      ctx.arc(screenX, height / 2 + size * 0.05, size * 0.28, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = w ? w.color : "#ffff00";
      if (s.obj.type === "bottle") {
        ctx.fillRect(screenX - size * 0.06, height / 2 - size * 0.15, size * 0.12, size * 0.35);
        ctx.fillRect(screenX - size * 0.04, height / 2 - size * 0.22, size * 0.08, size * 0.08);
      } else if (s.obj.type === "chainsaw") {
        ctx.fillRect(screenX - size * 0.18, height / 2 - size * 0.05, size * 0.36, size * 0.12);
        ctx.fillStyle = "#888";
        ctx.fillRect(screenX + size * 0.05, height / 2 - size * 0.12, size * 0.2, size * 0.22);
      } else if (s.obj.type === "pistol") {
        ctx.fillRect(screenX - size * 0.05, height / 2 - size * 0.08, size * 0.22, size * 0.1);
        ctx.fillRect(screenX - size * 0.08, height / 2, size * 0.1, size * 0.16);
      } else {
        ctx.fillRect(screenX - size * 0.08, height / 2 - size * 0.2, size * 0.1, size * 0.4);
        ctx.fillStyle = "#555";
        ctx.fillRect(screenX - size * 0.1, height / 2 + size * 0.12, size * 0.14, size * 0.1);
      }
    }
  }

  // Blood particles
  for (const p of bloodParticles) {
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 10) continue;
    const angle = Math.atan2(dy, dx) - player.dir;
    let a = angle;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    if (Math.abs(a) > player.fov) continue;
    const sx = (0.5 + a / player.fov) * width;
    const sy = height / 2 + (Math.random() - 0.5) * 40;
    ctx.fillStyle = `rgba(160,0,0,${p.life / 50})`;
    ctx.beginPath();
    ctx.arc(sx, sy, p.size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Snow
  ctx.fillStyle = "rgba(220,230,240,0.7)";
  for (const s of snowParticles) {
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }

  // Weapon viewmodel
  drawWeapon();

  // Extra damage flash
  if (player.invuln > 400) {
    ctx.fillStyle = "rgba(200,0,0,0.12)";
    ctx.fillRect(0, 0, width, height);
  }

  // Critical HP ≤ 5: tunnel vision — oval of vision, rest is blood
  if (gameRunning && player.hp <= 5 && player.hp > 0) {
    ctx.save();
    // Full blood cover
    ctx.fillStyle = "rgba(90, 0, 0, 0.72)";
    ctx.fillRect(0, 0, width, height);

    // Punch oval hole in the center
    ctx.globalCompositeOperation = "destination-out";
    const ox = width / 2;
    const oy = height / 2;
    const rx = width * 0.28;
    const ry = height * 0.32;
    ctx.beginPath();
    ctx.ellipse(ox, oy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();

    // Soft blood edge around oval
    ctx.globalCompositeOperation = "source-over";
    const edge = ctx.createRadialGradient(ox, oy, Math.min(rx, ry) * 0.75, ox, oy, Math.max(rx, ry) * 1.15);
    edge.addColorStop(0, "rgba(120,0,0,0)");
    edge.addColorStop(0.55, "rgba(100,0,0,0.15)");
    edge.addColorStop(1, "rgba(80,0,0,0.55)");
    ctx.fillStyle = edge;
    ctx.fillRect(0, 0, width, height);

    // Pulsing intensity
    const pulse = 0.15 + Math.sin(Date.now() / 200) * 0.08;
    ctx.fillStyle = `rgba(140,0,0,${pulse})`;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }

  drawMinimap();

  // Level transition fade (black overlay)
  if (transitioning && transitionAlpha > 0) {
    ctx.save();
    ctx.fillStyle = `rgba(0,0,0,${transitionAlpha})`;
    ctx.fillRect(0, 0, width, height);
    if (transitionAlpha > 0.6) {
      ctx.fillStyle = `rgba(200,30,30,${(transitionAlpha - 0.6) * 0.9})`;
      ctx.font = "bold 28px Courier New";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const txt = pendingLevel >= levels.length ? "ВЫХОД" : (levels[pendingLevel] ? levels[pendingLevel].name : "");
      ctx.fillText(txt, width / 2, height / 2);
    }
    ctx.restore();
  }
}

function drawWeapon() {
  const bob = Math.sin(Date.now() / 160) * 5;
  const walkBob = (keys["KeyW"] || keys["KeyS"] || keys["KeyA"] || keys["KeyD"])
    ? Math.sin(Date.now() / 90) * 6 : 0;
  const swingOff = swinging
    ? Math.sin((swingProgress / currentWeapon.swingTime) * Math.PI) * 90
    : 0;

  ctx.save();
  ctx.translate(width * 0.58 + swingOff * 0.25, height * 0.68 + bob + walkBob - swingOff * 0.45);

  const name = currentWeapon.name;

  if (name === "Кулаки") {
    ctx.fillStyle = "#b8956a";
    ctx.beginPath();
    ctx.ellipse(-55, 40, 32, 40, -0.25, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#9a7a55";
    ctx.beginPath();
    ctx.ellipse(-48, 35, 18, 22, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c4a882";
    ctx.beginPath();
    ctx.ellipse(45 + swingOff * 0.1, 50 - swingOff * 0.15, 36, 44, 0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#a88860";
    ctx.beginPath();
    ctx.ellipse(52, 42, 20, 24, 0.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8a7050";
    for (let k = 0; k < 4; k++) {
      ctx.beginPath();
      ctx.arc(38 + k * 10, 28 - swingOff * 0.1, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (currentWeapon.isGun) {
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(-5, -15, 75, 26);
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(55, -10, 40, 14);
    ctx.fillStyle = "#3a3a3a";
    ctx.fillRect(0, -18, 60, 8);
    ctx.fillStyle = "#4a3020";
    ctx.fillRect(-8, 8, 28, 32);
    ctx.fillStyle = "#3a2818";
    ctx.fillRect(-5, 12, 22, 6);
    ctx.fillRect(-5, 22, 22, 6);
    ctx.fillStyle = "#111";
    ctx.fillRect(92, -6, 8, 8);
  } else if (name === "Бензопила") {
    ctx.fillStyle = "#333";
    ctx.fillRect(-25, -18, 100, 30);
    ctx.fillStyle = "#222";
    ctx.fillRect(-35, -5, 20, 35);
    ctx.fillStyle = "#c41e3a";
    ctx.fillRect(10, -28, 35, 18);
    ctx.fillStyle = "#666";
    ctx.fillRect(55, -30, 55, 45);
    ctx.fillStyle = "#444";
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(60 + i * 8, -25, 4, 35);
    }
    const teeth = Math.floor(Date.now() / 40) % 4;
    ctx.fillStyle = "#aaa";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(62 + i * 9 + teeth, -28, 3, 6);
      ctx.fillRect(62 + i * 9 + (3 - teeth), 10, 3, 6);
    }
  } else if (name === "Битая бутылка") {
    ctx.fillStyle = "#5a9aaa";
    ctx.fillRect(-5, -50, 22, 70);
    ctx.fillStyle = "#4a8a9a";
    ctx.fillRect(-2, -60, 16, 15);
    ctx.fillStyle = "#7abacc";
    ctx.beginPath();
    ctx.moveTo(-5, -50);
    ctx.lineTo(5, -65);
    ctx.lineTo(10, -52);
    ctx.lineTo(17, -62);
    ctx.lineTo(17, -50);
    ctx.fill();
    ctx.fillStyle = "#c41e3a";
    ctx.fillRect(-3, -10, 18, 20);
  } else if (name === "Канцелярский нож") {
    ctx.fillStyle = "#ddd";
    ctx.fillRect(10, -45, 12, 55);
    ctx.fillStyle = "#888";
    ctx.fillRect(-15, -5, 40, 22);
    ctx.fillStyle = "#555";
    ctx.fillRect(-10, 0, 30, 12);
    ctx.fillStyle = "#fff";
    ctx.fillRect(20, -45, 3, 50);
  } else if (name === "Молоток") {
    ctx.fillStyle = "#6a4420";
    ctx.fillRect(5, -20, 14, 75);
    ctx.fillStyle = "#555";
    ctx.fillRect(-25, -40, 70, 28);
    ctx.fillStyle = "#444";
    ctx.fillRect(-20, -35, 60, 18);
    ctx.fillStyle = "#777";
    ctx.fillRect(-15, -38, 15, 6);
  } else {
    ctx.fillStyle = currentWeapon.color;
    ctx.fillRect(-5, -40, 18, 70);
    ctx.fillStyle = "#555";
    ctx.fillRect(-8, 25, 24, 20);
  }

  ctx.restore();
}

// ---------- LOOP ----------
let lastTime = performance.now();
function loop(now) {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  update(dt);
  render();

  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Init snow even on title
initSnow();
