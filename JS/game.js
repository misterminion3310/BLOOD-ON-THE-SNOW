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
const hud = document.getElementById("hud");
const weaponNameEl = document.getElementById("weapon-name");
const healthEl = document.getElementById("health");
const ammoEl = document.getElementById("ammo");
const messageEl = document.getElementById("message");

let width, height;
function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
}
window.addEventListener("resize", resize);
resize();

// ---------- MAP ----------
// 0 = empty, 1 = wall (panel), 2 = brick, 3 = metal, 4 = dirty wall
const map = [
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,2,0,0,0,0,3,3,3,0,0,0,2,2,2,0,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,3,0,0,0,0,0,0,0,2,0,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,3,0,0,0,0,0,0,0,2,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,4,4,4,4,0,0,0,0,4,4,4,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,4,0,0,0,0,0,0,0,0,0,0,4,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,2,2,0,0,0,0,0,0,0,0,0,0,0,0,0,2,2,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,2,0,0,0,1],
  [1,0,0,2,0,0,0,0,0,0,3,3,3,3,0,0,0,0,0,2,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,3,0,0,3,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
];

const MAP_W = map[0].length;
const MAP_H = map.length;
const TILE = 1;

// ---------- PLAYER ----------
const player = {
  x: 2.5,
  y: 2.5,
  dir: 0,          // radians
  fov: Math.PI / 3,
  speed: 0.045,
  rotSpeed: 0.003,
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
    durability: 6,      // rounds
    maxDurability: 6,
    cooldown: 500,
    swingTime: 100,
    color: "#ffaa00",
    isGun: true
  }
};

let currentWeapon = { ...WEAPONS.fists };
let weaponCooldown = 0;
let swinging = false;
let swingProgress = 0;

// ---------- ENEMIES ----------
const enemies = [];
const enemyTypes = [
  { name: "Гопник", hp: 45, speed: 0.018, damage: 8, color: "#6688aa", size: 0.55 },
  { name: "Скин", hp: 70, speed: 0.022, damage: 14, color: "#aa4444", size: 0.6 },
  { name: "Нарк", hp: 35, speed: 0.028, damage: 6, color: "#88aa66", size: 0.5 },
  { name: "Мент", hp: 95, speed: 0.014, damage: 18, color: "#4466aa", size: 0.65 }
];

function spawnEnemies() {
  enemies.length = 0;
  const spots = [
    [8, 4], [15, 5], [6, 12], [18, 10], [12, 16],
    [4, 18], [20, 18], [10, 8], [16, 14], [7, 20],
    [14, 3], [19, 7], [3, 14], [11, 11]
  ];
  for (const [mx, my] of spots) {
    if (map[my][mx] === 0) {
      const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
      enemies.push({
        x: mx + 0.5,
        y: my + 0.5,
        hp: type.hp,
        maxHp: type.hp,
        speed: type.speed,
        damage: type.damage,
        color: type.color,
        size: type.size,
        name: type.name,
        state: "idle",
        attackCd: 0,
        hitFlash: 0,
        dead: false,
        stagger: 0
      });
    }
  }
}

// ---------- PICKUPS ----------
const pickups = [];
function spawnPickups() {
  pickups.length = 0;
  const items = [
    { x: 5.5, y: 5.5, type: "bottle" },
    { x: 12.5, y: 9.5, type: "knife" },
    { x: 17.5, y: 4.5, type: "hammer" },
    { x: 9.5, y: 15.5, type: "bottle" },
    { x: 20.5, y: 12.5, type: "chainsaw" },
    { x: 4.5, y: 10.5, type: "pistol" },
    { x: 14.5, y: 18.5, type: "knife" },
    { x: 7.5, y: 7.5, type: "hammer" }
  ];
  for (const it of items) {
    if (map[Math.floor(it.y)][Math.floor(it.x)] === 0) {
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

  // Любая клавиша — старт / рестарт (когда не в игре)
  if (!gameRunning) {
    e.preventDefault();
    startGame();
    return;
  }

  if (e.code === "KeyE") tryPickupOrDrop();

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
  canvas.requestPointerLock();
});

document.addEventListener("pointerlockchange", () => {
  pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener("mousemove", e => {
  if (pointerLocked) mouseDX += e.movementX;
});

document.addEventListener("mousedown", e => {
  if (!gameRunning || e.button !== 0) return;
  attack();
});

// ---------- GAME STATE ----------
let gameRunning = false;
let gameOver = false;
let messageTimer = 0;
let bloodParticles = [];
let snowParticles = [];

function showMessage(text, time = 1800) {
  messageEl.textContent = text;
  messageEl.classList.add("show");
  messageTimer = time;
}

function startGame() {
  player.x = 2.5;
  player.y = 2.5;
  player.dir = 0;
  player.hp = 100;
  player.invuln = 0;
  currentWeapon = { ...WEAPONS.fists };
  weaponCooldown = 0;
  swinging = false;
  gameOver = false;
  spawnEnemies();
  spawnPickups();
  bloodParticles = [];
  initSnow();
  titleScreen.classList.add("hidden");
  deathScreen.classList.add("hidden");
  hud.classList.remove("hidden");
  crosshair.classList.remove("hidden");
  gameRunning = true;
  updateHUD();
  canvas.requestPointerLock();
}

function die() {
  gameRunning = false;
  gameOver = true;
  document.exitPointerLock();
  hud.classList.add("hidden");
  crosshair.classList.add("hidden");
  deathScreen.classList.remove("hidden");
}

document.getElementById("start-btn").addEventListener("click", startGame);
document.getElementById("restart-btn").addEventListener("click", startGame);

// ---------- COMBAT ----------
function attack() {
  if (weaponCooldown > 0 || swinging) return;

  if (currentWeapon.isGun) {
    if (currentWeapon.durability <= 0) {
      showMessage("Патроны кончились! Брось пистолет (E)");
      return;
    }
    // Shoot
    currentWeapon.durability--;
    weaponCooldown = currentWeapon.cooldown;
    swinging = true;
    swingProgress = 0;

    // Hitscan
    const ray = castRay(player.dir);
    let hitEnemy = null;
    let hitDist = ray.dist;

    for (const en of enemies) {
      if (en.dead) continue;
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

  // Find closest enemy in front
  let best = null;
  let bestDist = currentWeapon.range;

  for (const en of enemies) {
    if (en.dead) continue;
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
    // Durability
    if (currentWeapon.durability !== Infinity) {
      currentWeapon.durability--;
      if (currentWeapon.durability <= 0) {
        showMessage(currentWeapon.name + " сломался!");
        currentWeapon = { ...WEAPONS.fists };
      }
    }
  } else {
    // Still spend durability on air swing for non-fists
    if (currentWeapon.durability !== Infinity && !currentWeapon.continuous) {
      currentWeapon.durability = Math.max(0, currentWeapon.durability - 0.3);
    }
  }
  updateHUD();
}

function damageEnemy(en, dmg) {
  en.hp -= dmg;
  en.hitFlash = 8;
  en.stagger = 12;
  if (en.hp <= 0) {
    en.dead = true;
    en.hp = 0;
    spawnBlood(en.x, en.y, 14);
    showMessage(en.name + " убит");
  }
}

function tryPickupOrDrop() {
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

  // Pickup
  for (const p of pickups) {
    if (p.taken) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    if (dx * dx + dy * dy < 1.2) {
      p.taken = true;
      currentWeapon = { ...WEAPONS[p.type] };
      if (p.durability !== undefined) currentWeapon.durability = p.durability;
      showMessage("Подобрал: " + currentWeapon.name);
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
  healthEl.textContent = "HP: " + Math.max(0, Math.ceil(player.hp));
  healthEl.style.color = player.hp > 40 ? "#4caf50" : "#ff3333";
  ammoEl.textContent = currentWeapon.isGun
    ? `Патроны: ${currentWeapon.durability}`
    : "";
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
      // Side determination
      const prevX = player.x + cos * (dist - step);
      if (Math.floor(prevX) !== mx) side = 1;
      break;
    }
  }
  return { dist, hit, side, hitX, hitY };
}

function getWallColor(type, side, dist) {
  let r, g, b;
  switch (type) {
    case 1: r = 90; g = 90; b = 100; break;      // panel
    case 2: r = 110; g = 70; b = 50; break;      // brick
    case 3: r = 60; g = 70; b = 80; break;       // metal
    case 4: r = 70; g = 65; b = 55; break;       // dirty
    default: r = 80; g = 80; b = 80;
  }
  // Distance fog + side darkening
  const fog = Math.max(0.25, 1 - dist / 14);
  const shade = side ? 0.7 : 1;
  r = Math.floor(r * fog * shade);
  g = Math.floor(g * fog * shade);
  b = Math.floor(b * fog * shade);
  return `rgb(${r},${g},${b})`;
}

// ---------- UPDATE ----------
function update(dt) {
  if (!gameRunning) return;

  // Message timer
  if (messageTimer > 0) {
    messageTimer -= dt;
    if (messageTimer <= 0) messageEl.classList.remove("show");
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

    // Collision
    const newX = player.x + mx;
    const newY = player.y + my;
    if (map[Math.floor(player.y)][Math.floor(newX)] === 0) player.x = newX;
    if (map[Math.floor(newY)][Math.floor(player.x)] === 0) player.y = newY;
  }

  // Weapon cooldown / swing
  if (weaponCooldown > 0) weaponCooldown -= dt;
  if (swinging) {
    swingProgress += dt;
    if (swingProgress >= currentWeapon.swingTime) swinging = false;
  }

  // Continuous chainsaw
  if (currentWeapon.continuous && keys["MouseLeft"] && weaponCooldown <= 0) {
    attack();
  }

  // Enemies AI
  for (const en of enemies) {
    if (en.dead) continue;
    if (en.stagger > 0) { en.stagger--; continue; }
    if (en.hitFlash > 0) en.hitFlash--;

    const dx = player.x - en.x;
    const dy = player.y - en.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 9) {
      // Chase
      const nx = dx / dist;
      const ny = dy / dist;
      const speed = en.speed;
      const newX = en.x + nx * speed;
      const newY = en.y + ny * speed;
      if (map[Math.floor(en.y)][Math.floor(newX)] === 0) en.x = newX;
      if (map[Math.floor(newY)][Math.floor(en.x)] === 0) en.y = newY;

      // Attack
      if (dist < 1.1) {
        en.attackCd -= dt;
        if (en.attackCd <= 0 && player.invuln <= 0) {
          player.hp -= en.damage;
          player.invuln = 450;
          spawnBlood(player.x, player.y, 4);
          showMessage(en.name + " ударил тебя!");
          updateHUD();
          if (player.hp <= 0) die();
          en.attackCd = 700;
        }
      }
    }
  }

  if (player.invuln > 0) player.invuln -= dt;

  // Particles
  for (let i = bloodParticles.length - 1; i >= 0; i--) {
    const p = bloodParticles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.life--;
    if (p.life <= 0) bloodParticles.splice(i, 1);
  }

  // Snow
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
function render() {
  // Sky / ground
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, "#1a2030");
  grad.addColorStop(0.5, "#2a3040");
  grad.addColorStop(0.5, "#3a3530");
  grad.addColorStop(1, "#2a2520");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Snow on ground (simple)
  ctx.fillStyle = "rgba(200,210,220,0.15)";
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  // Raycast walls
  const numRays = Math.min(width, 320); // performance
  const rayWidth = width / numRays;

  for (let i = 0; i < numRays; i++) {
    const rayAngle = player.dir - player.fov / 2 + (i / numRays) * player.fov;
    const ray = castRay(rayAngle);

    // Fix fisheye
    const corrected = ray.dist * Math.cos(rayAngle - player.dir);
    const wallH = (height * 0.85) / corrected;

    const top = (height - wallH) / 2;
    const color = getWallColor(ray.hit, ray.side, corrected);

    ctx.fillStyle = color;
    ctx.fillRect(i * rayWidth, top, rayWidth + 1, wallH);

    // Simple texture noise
    if (ray.hit > 0) {
      ctx.fillStyle = `rgba(0,0,0,${0.08 + (i % 3) * 0.02})`;
      ctx.fillRect(i * rayWidth, top, rayWidth + 1, wallH * 0.15);
    }
  }

  // Sprites: pickups + enemies (sorted by distance)
  const sprites = [];

  for (const p of pickups) {
    if (p.taken) continue;
    const dx = p.x - player.x;
    const dy = p.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 16) sprites.push({ type: "pickup", obj: p, dist, dx, dy });
  }
  for (const en of enemies) {
    if (en.dead) continue;
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

    if (Math.abs(a) > player.fov * 0.7) continue;

    const screenX = (0.5 + a / player.fov) * width;
    const size = (height * 0.6) / s.dist;

    if (s.type === "enemy") {
      const en = s.obj;
      const flash = en.hitFlash > 0;
      ctx.fillStyle = flash ? "#ffffff" : en.color;
      // Body
      ctx.fillRect(screenX - size * 0.25, height / 2 - size * 0.35, size * 0.5, size * 0.7);
      // Head
      ctx.fillStyle = flash ? "#ffcccc" : "#ddbb99";
      ctx.beginPath();
      ctx.arc(screenX, height / 2 - size * 0.4, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      // HP bar
      if (en.hp < en.maxHp) {
        ctx.fillStyle = "#333";
        ctx.fillRect(screenX - size * 0.3, height / 2 - size * 0.55, size * 0.6, 5);
        ctx.fillStyle = "#c41e3a";
        ctx.fillRect(screenX - size * 0.3, height / 2 - size * 0.55, size * 0.6 * (en.hp / en.maxHp), 5);
      }
    } else {
      // Pickup
      const w = WEAPONS[s.obj.type];
      ctx.fillStyle = w ? w.color : "#ffff00";
      ctx.fillRect(screenX - size * 0.12, height / 2 - size * 0.1, size * 0.24, size * 0.35);
      ctx.fillStyle = "#fff";
      ctx.font = `${Math.max(10, size * 0.15)}px monospace`;
      ctx.textAlign = "center";
      ctx.fillText("!", screenX, height / 2 - size * 0.15);
    }
  }

  // Blood particles (screen space approximation)
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

  // Snow overlay
  ctx.fillStyle = "rgba(220,230,240,0.7)";
  for (const s of snowParticles) {
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }

  // Weapon viewmodel
  drawWeapon();

  // Vignette / damage
  if (player.hp < 40) {
    ctx.fillStyle = `rgba(80,0,0,${0.15 + (40 - player.hp) / 200})`;
    ctx.fillRect(0, 0, width, height);
  }
  if (player.invuln > 400) {
    ctx.fillStyle = "rgba(200,0,0,0.12)";
    ctx.fillRect(0, 0, width, height);
  }
}

function drawWeapon() {
  const bob = Math.sin(Date.now() / 180) * 4;
  const swingOff = swinging
    ? Math.sin((swingProgress / currentWeapon.swingTime) * Math.PI) * 80
    : 0;

  ctx.save();
  ctx.translate(width * 0.62 + swingOff * 0.3, height * 0.72 + bob - swingOff * 0.4);

  if (currentWeapon.name === "Кулаки") {
    // Left fist
    ctx.fillStyle = "#c4a882";
    ctx.beginPath();
    ctx.ellipse(-40, 30, 28, 36, -0.2, 0, Math.PI * 2);
    ctx.fill();
    // Right fist
    ctx.beginPath();
    ctx.ellipse(50, 40, 32, 40, 0.15, 0, Math.PI * 2);
    ctx.fill();
  } else if (currentWeapon.isGun) {
    ctx.fillStyle = "#333";
    ctx.fillRect(-10, -20, 70, 28);
    ctx.fillStyle = "#222";
    ctx.fillRect(50, -12, 35, 14);
    ctx.fillStyle = "#555";
    ctx.fillRect(-5, 5, 25, 18);
  } else if (currentWeapon.name === "Бензопила") {
    ctx.fillStyle = "#444";
    ctx.fillRect(-20, -15, 90, 25);
    ctx.fillStyle = "#888";
    ctx.fillRect(50, -25, 40, 40);
    ctx.fillStyle = "#222";
    for (let i = 0; i < 5; i++) {
      ctx.fillRect(55 + i * 7, -20, 3, 30);
    }
  } else {
    // Generic melee (bottle / knife / hammer)
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
