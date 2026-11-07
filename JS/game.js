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
  { name: "Гопник", hp: 45, speed: 0.010, damage: 8, color: "#6688aa", size: 0.55, vision: 8, attackRange: 1.15 },
  { name: "Скин", hp: 70, speed: 0.012, damage: 14, color: "#aa4444", size: 0.6, vision: 9, attackRange: 1.2 },
  { name: "Нарк", hp: 35, speed: 0.015, damage: 6, color: "#88aa66", size: 0.5, vision: 7, attackRange: 1.05 },
  { name: "Мент", hp: 95, speed: 0.008, damage: 18, color: "#4466aa", size: 0.65, vision: 11, attackRange: 1.25 }
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
        vision: type.vision,
        attackRange: type.attackRange,
        state: "idle",
        attackCd: 0,
        hitFlash: 0,
        dead: false,
        stagger: 0,
        patrolAngle: Math.random() * Math.PI * 2,
        patrolTimer: 40 + Math.random() * 80,
        alertTimer: 0,
        lastSeenX: mx + 0.5,
        lastSeenY: my + 0.5
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
  document.body.classList.remove("show-cursor");
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
  document.body.classList.add("show-cursor");
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
  for (let i = 0; i < 180; i++) {
    snowParticles.push({
      x: Math.random() * width,
      y: Math.random() * height,
      speed: 0.5 + Math.random() * 1.8,
      size: 1 + Math.random() * 2.8,
      drift: (Math.random() - 0.5) * 0.55,
      alpha: 0.35 + Math.random() * 0.55
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

function getWallColor(type, side, dist, hitX, hitY) {
  let r, g, b;
  switch (type) {
    case 1: r = 95; g = 95; b = 108; break;      // panel
    case 2: r = 125; g = 78; b = 55; break;      // brick
    case 3: r = 68; g = 78; b = 90; break;       // metal
    case 4: r = 78; g = 72; b = 60; break;       // dirty
    default: r = 85; g = 85; b = 85;
  }

  // Procedural texture based on world hit position
  const u = (side ? hitY : hitX);
  const tex = Math.floor(u * 8) % 8;
  let texMul = 1;
  if (type === 2) {
    // Brick mortar lines
    const brickRow = Math.floor(u * 4) % 2;
    const brickCol = Math.floor((side ? hitX : hitY) * 3) % 3;
    if (brickCol === 0) texMul = 0.72;
    else texMul = 0.92 + (brickRow * 0.06);
  } else if (type === 1) {
    // Panel seams
    if (tex === 0 || tex === 4) texMul = 0.78;
    else texMul = 0.95 + (tex % 3) * 0.02;
  } else if (type === 3) {
    // Metal rivets / panels
    if (tex % 3 === 0) texMul = 0.82;
    else texMul = 1.05;
  } else if (type === 4) {
    // Dirty blotches
    texMul = 0.85 + ((Math.sin(u * 12) + 1) * 0.08);
  }

  // Distance fog + side darkening
  const fog = Math.max(0.22, 1 - dist / 13.5);
  const shade = side ? 0.68 : 1;
  r = Math.floor(r * fog * shade * texMul);
  g = Math.floor(g * fog * shade * texMul);
  b = Math.floor(b * fog * shade * texMul);
  return `rgb(${Math.min(255,r)},${Math.min(255,g)},${Math.min(255,b)})`;
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

  // Line of sight: true if no wall between enemy and player
  function hasLineOfSight(ex, ey, px, py) {
    const dx = px - ex;
    const dy = py - ey;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 0.3) return true;
    const steps = Math.ceil(dist / 0.15);
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      const mx = Math.floor(ex + dx * t);
      const my = Math.floor(ey + dy * t);
      if (mx < 0 || my < 0 || mx >= MAP_W || my >= MAP_H) return false;
      if (map[my][mx] > 0) return false;
    }
    return true;
  }

  // Enemies AI — idle / patrol / chase / attack
  for (const en of enemies) {
    if (en.dead) continue;
    if (en.stagger > 0) { en.stagger--; continue; }
    if (en.hitFlash > 0) en.hitFlash--;
    if (en.attackCd > 0) en.attackCd -= dt;

    const dx = player.x - en.x;
    const dy = player.y - en.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const canSee = dist < en.vision && hasLineOfSight(en.x, en.y, player.x, player.y);

    if (canSee) {
      en.state = dist < en.attackRange ? "attack" : "chase";
      en.lastSeenX = player.x;
      en.lastSeenY = player.y;
      en.alertTimer = 180;
    } else if (en.alertTimer > 0) {
      en.alertTimer--;
      en.state = "search";
    } else {
      en.state = "patrol";
    }

    if (en.state === "chase" || en.state === "attack") {
      const nx = dx / Math.max(0.01, dist);
      const ny = dy / Math.max(0.01, dist);
      if (dist > en.attackRange * 0.85) {
        const newX = en.x + nx * en.speed;
        const newY = en.y + ny * en.speed;
        if (map[Math.floor(en.y)][Math.floor(newX)] === 0) en.x = newX;
        if (map[Math.floor(newY)][Math.floor(en.x)] === 0) en.y = newY;
      }
      if (dist < en.attackRange && en.attackCd <= 0 && player.invuln <= 0) {
        player.hp -= en.damage;
        player.invuln = 500;
        spawnBlood(player.x, player.y, 4);
        showMessage(en.name + " ударил тебя!");
        updateHUD();
        if (player.hp <= 0) die();
        en.attackCd = 850;
      }
    } else if (en.state === "search") {
      const sx = en.lastSeenX - en.x;
      const sy = en.lastSeenY - en.y;
      const sd = Math.sqrt(sx * sx + sy * sy);
      if (sd > 0.4) {
        const newX = en.x + (sx / sd) * en.speed * 0.7;
        const newY = en.y + (sy / sd) * en.speed * 0.7;
        if (map[Math.floor(en.y)][Math.floor(newX)] === 0) en.x = newX;
        if (map[Math.floor(newY)][Math.floor(en.x)] === 0) en.y = newY;
      }
    } else {
      // patrol
      en.patrolTimer--;
      if (en.patrolTimer <= 0) {
        en.patrolAngle += (Math.random() - 0.5) * 1.8;
        en.patrolTimer = 50 + Math.random() * 90;
      }
      const newX = en.x + Math.cos(en.patrolAngle) * en.speed * 0.45;
      const newY = en.y + Math.sin(en.patrolAngle) * en.speed * 0.45;
      if (map[Math.floor(en.y)][Math.floor(newX)] === 0) en.x = newX;
      else en.patrolAngle += Math.PI * 0.6;
      if (map[Math.floor(newY)][Math.floor(en.x)] === 0) en.y = newY;
      else en.patrolAngle += Math.PI * 0.6;
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
  // Sky — cold winter night with subtle gradient
  const skyGrad = ctx.createLinearGradient(0, 0, 0, height * 0.52);
  skyGrad.addColorStop(0, "#0c1018");
  skyGrad.addColorStop(0.4, "#1a2230");
  skyGrad.addColorStop(1, "#2a3344");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, width, height * 0.52);

  // Distant snow haze band
  ctx.fillStyle = "rgba(180,195,210,0.08)";
  ctx.fillRect(0, height * 0.38, width, height * 0.14);

  // Ground — dirty snow
  const groundGrad = ctx.createLinearGradient(0, height * 0.5, 0, height);
  groundGrad.addColorStop(0, "#3a3835");
  groundGrad.addColorStop(0.35, "#4a4640");
  groundGrad.addColorStop(1, "#2e2a26");
  ctx.fillStyle = groundGrad;
  ctx.fillRect(0, height * 0.5, width, height * 0.5);

  // Ground snow patches (subtle horizontal noise)
  ctx.fillStyle = "rgba(210,220,230,0.12)";
  for (let g = 0; g < 8; g++) {
    const gy = height * 0.52 + (g / 8) * height * 0.48;
    ctx.fillRect(0, gy, width, 3 + (g % 3));
  }

  // Raycast walls + z-buffer (so sprites hide behind walls)
  const numRays = Math.min(width, 360);
  const rayWidth = width / numRays;
  const zBuffer = new Float32Array(numRays);

  for (let i = 0; i < numRays; i++) {
    const rayAngle = player.dir - player.fov / 2 + (i / numRays) * player.fov;
    const ray = castRay(rayAngle);

    // Fix fisheye
    const corrected = ray.dist * Math.cos(rayAngle - player.dir);
    zBuffer[i] = corrected;

    const wallH = (height * 0.88) / Math.max(0.15, corrected);
    const top = (height - wallH) / 2;
    const color = getWallColor(ray.hit, ray.side, corrected, ray.hitX, ray.hitY);

    ctx.fillStyle = color;
    ctx.fillRect(i * rayWidth, top, rayWidth + 1.2, wallH);

    if (ray.hit > 0) {
      const strip = (Math.floor((ray.side ? ray.hitY : ray.hitX) * 10) % 5);
      if (strip === 0) {
        ctx.fillStyle = "rgba(0,0,0,0.22)";
        ctx.fillRect(i * rayWidth, top, Math.max(1, rayWidth * 0.35), wallH);
      }
      ctx.fillStyle = "rgba(0,0,0,0.18)";
      ctx.fillRect(i * rayWidth, top, rayWidth + 1, wallH * 0.08);
      ctx.fillStyle = "rgba(0,0,0,0.12)";
      ctx.fillRect(i * rayWidth, top + wallH * 0.9, rayWidth + 1, wallH * 0.1);
    }
  }

  // Sprites: pickups + enemies (sorted far → near)
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

    if (Math.abs(a) > player.fov * 0.75) continue;

    const screenX = (0.5 + a / player.fov) * width;
    const size = (height * 0.6) / s.dist;

    // Sprite width in ray columns for occlusion
    const spriteHalfW = size * (s.type === "pickup" ? 0.28 : 0.32);
    const startCol = Math.max(0, Math.floor((screenX - spriteHalfW) / rayWidth));
    const endCol = Math.min(numRays - 1, Math.ceil((screenX + spriteHalfW) / rayWidth));

    // If entire sprite is behind wall — skip
    let anyVisible = false;
    for (let c = startCol; c <= endCol; c++) {
      if (s.dist < zBuffer[c]) { anyVisible = true; break; }
    }
    if (!anyVisible) continue;

    // Draw only the columns that are in front of the wall
    ctx.save();
    ctx.beginPath();
    for (let c = startCol; c <= endCol; c++) {
      if (s.dist < zBuffer[c]) {
        ctx.rect(c * rayWidth, 0, rayWidth + 0.5, height);
      }
    }
    ctx.clip();

    if (s.type === "enemy") {
      const en = s.obj;
      const flash = en.hitFlash > 0;
      const bodyY = height / 2 - size * 0.32;
      // Legs
      ctx.fillStyle = flash ? "#ddd" : "#2a2a2a";
      ctx.fillRect(screenX - size * 0.18, bodyY + size * 0.45, size * 0.12, size * 0.28);
      ctx.fillRect(screenX + size * 0.06, bodyY + size * 0.45, size * 0.12, size * 0.28);
      // Body
      ctx.fillStyle = flash ? "#ffffff" : en.color;
      ctx.fillRect(screenX - size * 0.22, bodyY, size * 0.44, size * 0.5);
      // Arms
      ctx.fillStyle = flash ? "#eee" : "#3a3a3a";
      ctx.fillRect(screenX - size * 0.32, bodyY + size * 0.08, size * 0.12, size * 0.32);
      ctx.fillRect(screenX + size * 0.2, bodyY + size * 0.08, size * 0.12, size * 0.32);
      // Head
      ctx.fillStyle = flash ? "#ffdddd" : "#d4b896";
      ctx.beginPath();
      ctx.arc(screenX, bodyY - size * 0.08, size * 0.16, 0, Math.PI * 2);
      ctx.fill();
      // Hood
      ctx.fillStyle = flash ? "#ccc" : "#1a1a1a";
      ctx.beginPath();
      ctx.arc(screenX, bodyY - size * 0.12, size * 0.17, Math.PI * 1.1, Math.PI * 1.9);
      ctx.fill();
      // HP bar
      if (en.hp < en.maxHp) {
        ctx.fillStyle = "#222";
        ctx.fillRect(screenX - size * 0.28, bodyY - size * 0.38, size * 0.56, 5);
        ctx.fillStyle = "#c41e3a";
        ctx.fillRect(screenX - size * 0.28, bodyY - size * 0.38, size * 0.56 * (en.hp / en.maxHp), 5);
      }
    } else {
      // Floor weapon model (lying flat-ish on the ground)
      const w = WEAPONS[s.obj.type];
      const col = w ? w.color : "#ffff00";
      const baseY = height / 2 + size * 0.18;
      const scale = size * 0.55;

      ctx.save();
      ctx.translate(screenX, baseY);
      // slight perspective tilt
      ctx.scale(1, 0.55);
      ctx.rotate(-0.35);

      if (s.obj.type === "pistol") {
        ctx.fillStyle = "#2a2a2a";
        ctx.fillRect(-scale * 0.55, -scale * 0.12, scale * 0.9, scale * 0.22);
        ctx.fillStyle = "#444";
        ctx.fillRect(scale * 0.25, -scale * 0.08, scale * 0.4, scale * 0.12);
        ctx.fillStyle = "#1a1a1a";
        ctx.fillRect(-scale * 0.35, scale * 0.02, scale * 0.22, scale * 0.28);
      } else if (s.obj.type === "chainsaw") {
        ctx.fillStyle = "#333";
        ctx.fillRect(-scale * 0.5, -scale * 0.15, scale * 1.0, scale * 0.28);
        ctx.fillStyle = "#666";
        ctx.fillRect(scale * 0.2, -scale * 0.28, scale * 0.45, scale * 0.5);
        ctx.fillStyle = "#222";
        for (let t = 0; t < 4; t++) ctx.fillRect(scale * 0.28 + t * scale * 0.1, -scale * 0.22, scale * 0.05, scale * 0.38);
      } else if (s.obj.type === "hammer") {
        ctx.fillStyle = "#5a4030";
        ctx.fillRect(-scale * 0.12, -scale * 0.55, scale * 0.2, scale * 1.0);
        ctx.fillStyle = "#888";
        ctx.fillRect(-scale * 0.35, -scale * 0.6, scale * 0.7, scale * 0.28);
      } else if (s.obj.type === "knife") {
        ctx.fillStyle = "#ccc";
        ctx.fillRect(-scale * 0.08, -scale * 0.5, scale * 0.14, scale * 0.7);
        ctx.fillStyle = "#4a3020";
        ctx.fillRect(-scale * 0.1, scale * 0.15, scale * 0.18, scale * 0.35);
      } else if (s.obj.type === "bottle") {
        ctx.fillStyle = "#6aafd4";
        ctx.beginPath();
        ctx.ellipse(0, 0, scale * 0.16, scale * 0.4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#8cc8e0";
        ctx.fillRect(-scale * 0.08, -scale * 0.55, scale * 0.16, scale * 0.25);
        // broken edge
        ctx.fillStyle = "#a0d4ee";
        ctx.beginPath();
        ctx.moveTo(-scale * 0.1, -scale * 0.55);
        ctx.lineTo(0, -scale * 0.7);
        ctx.lineTo(scale * 0.1, -scale * 0.55);
        ctx.fill();
      } else {
        ctx.fillStyle = col;
        ctx.fillRect(-scale * 0.2, -scale * 0.15, scale * 0.4, scale * 0.3);
      }

      // soft shadow under weapon
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.beginPath();
      ctx.ellipse(screenX, height / 2 + size * 0.28, size * 0.28, size * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
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

  // Snow overlay — layered flakes
  for (const s of snowParticles) {
    ctx.fillStyle = `rgba(220,230,245,${s.alpha || 0.6})`;
    if (s.size > 2.2) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * 0.55, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(s.x, s.y, s.size, s.size);
    }
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
document.body.classList.add("show-cursor");
