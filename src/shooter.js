// スタッフクレジットの画面で遊べる、小さなシューティング。
// ドラッグ(またはキーボード)でフロリを動かすと、星が自動で飛ぶ。落ちてくる風船などに当てて、点をかせぐ。
// 記録は残さない(その場かぎりの遊び)。描画は canvas、文字や数字は画面の上の HTML(ふりがなが付くように)。
import { playSe, playShun } from "./audio.js";

const ENEMY_IMAGES = ["balloon", "bulb", "sakura", "candy", "butterfly", "bird", "bolt"];
const LIVES = 3;
const FIRE_EVERY = 0.32; // 星を撃つ間かく(秒)
const BULLET_SPEED = 460;
const INVULNERABLE = 1.4; // 当たったあと、しばらく当たらない(秒)

function loadImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

export function createShooter({ stage, canvas, onChange }) {
  const ctx = canvas.getContext("2d");
  const player = { x: 0, y: 0, tx: 0, ty: 0, size: 44 };
  const face = loadImage("../assets/flori/src/face_smile_clean.png");
  const bulletImage = loadImage("../assets/illust/star_fill.webp");
  const enemyImages = ENEMY_IMAGES.map((name) => loadImage(`../assets/illust/${name}.webp`));
  const keys = new Set();
  let width = 0;
  let height = 0;
  let bullets = [];
  let enemies = [];
  let sparks = [];
  let state = "idle"; // idle(まだ遊んでいない) playing over ended(スタッフロールが終わった)
  let score = 0;
  let lives = LIVES;
  let fireTimer = 0;
  let spawnTimer = 0;
  let elapsed = 0;
  let invulnerable = 0;
  let best = 0;
  let kills = 0; // たおした数(この画面を開いてからの合計)
  let played = false;
  let pointerId = null;
  let spawning = true; // false のあいだは、新しい落ちものを出さない(スタッフロールの終わり近く)

  function emit() {
    onChange?.({ state, score, lives, best });
  }

  function resize() {
    const rect = stage.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    player.x = player.tx = Math.min(Math.max(player.x || width / 2, player.size / 2), width - player.size / 2);
    player.y = player.ty = Math.min(Math.max(player.y || height * 0.82, player.size / 2), height - player.size / 2);
  }

  function reset() {
    bullets = [];
    enemies = [];
    sparks = [];
    score = 0;
    lives = LIVES;
    fireTimer = 0;
    spawnTimer = 0.5;
    elapsed = 0;
    invulnerable = 0;
  }

  function start() {
    reset();
    state = "playing";
    played = true;
    emit();
  }

  function aim(event) {
    const rect = stage.getBoundingClientRect();
    // 指でフロリがかくれないように、タッチのときは、指の少し上に置く
    const lift = event.pointerType === "touch" ? 46 : 0;
    player.tx = Math.min(Math.max(event.clientX - rect.left, player.size / 2), width - player.size / 2);
    player.ty = Math.min(Math.max(event.clientY - rect.top - lift, player.size / 2), height - player.size / 2);
  }

  stage.addEventListener("pointerdown", (event) => {
    if (state === "ended" || event.target.closest("button")) return; // 結果発表のボタンは、ふつうに押せるように
    pointerId = event.pointerId;
    try {
      stage.setPointerCapture?.(event.pointerId);
    } catch {
      // 指のしるしが見つからなくても、遊びは、始める
    }
    aim(event);
    if (state === "idle" || state === "over") start();
  });
  stage.addEventListener("pointermove", (event) => {
    if (pointerId === event.pointerId || event.pointerType === "mouse") aim(event);
  });
  const release = (event) => {
    if (pointerId === event.pointerId) pointerId = null;
  };
  stage.addEventListener("pointerup", release);
  stage.addEventListener("pointercancel", release);

  const KEY_DIRS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1], a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] };
  let active = false;
  function onKeyDown(event) {
    if (!active || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.key in KEY_DIRS) {
      keys.add(event.key);
      event.preventDefault();
      if (state === "idle" || state === "over") start();
    } else if ((event.key === " " || event.key === "Enter") && (state === "idle" || state === "over")) {
      event.preventDefault();
      start();
    }
  }
  function onKeyUp(event) {
    keys.delete(event.key);
  }
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", () => keys.clear());

  // 難しさは、時間とともに上がる(45秒で、いちばん難しく)
  function level() {
    return Math.min(1, elapsed / 40);
  }

  function spawn() {
    const size = 34 + Math.random() * 20;
    const hard = size > 48; // 大きいものは、2回当てないと消えない
    const index = Math.floor(Math.random() * enemyImages.length);
    enemies.push({
      x: size / 2 + Math.random() * (width - size),
      y: -size,
      size,
      hp: hard ? 2 : 1,
      speed: 95 + Math.random() * 65 + level() * 150,
      wave: Math.random() * Math.PI * 2,
      sway: 10 + Math.random() * 36,
      // 12秒をすぎると、鳥だけは、フロリのほうへ すばやく 寄ってくる
      hunter: ENEMY_IMAGES[index] === "bird" && elapsed > 10,
      image: enemyImages[index],
    });
  }

  function burst(x, y) {
    for (let i = 0; i < 7; i += 1) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 90;
      sparks.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.45 });
    }
  }

  function update(dt) {
    // フロリは、目標の場所へ、なめらかに近づく
    let dx = 0;
    let dy = 0;
    for (const key of keys) {
      dx += KEY_DIRS[key][0];
      dy += KEY_DIRS[key][1];
    }
    if (dx || dy) {
      player.tx = Math.min(Math.max(player.tx + dx * 280 * dt, player.size / 2), width - player.size / 2);
      player.ty = Math.min(Math.max(player.ty + dy * 280 * dt, player.size / 2), height - player.size / 2);
    }
    const follow = 1 - Math.exp(-16 * dt);
    player.x += (player.tx - player.x) * follow;
    player.y += (player.ty - player.y) * follow;

    for (const spark of sparks) {
      spark.x += spark.vx * dt;
      spark.y += spark.vy * dt;
      spark.life -= dt;
    }
    sparks = sparks.filter((spark) => spark.life > 0);
    if (state !== "playing") {
      // 遊んでいないあいだも、敵は ゆっくり落ちて、背景がさびしくならない
      enemies = enemies.filter((enemy) => enemy.y < height + enemy.size);
      for (const enemy of enemies) enemy.y += enemy.speed * 0.5 * dt;
      spawnTimer -= dt;
      if (spawnTimer <= 0 && spawning && enemies.length < 4) {
        spawn();
        spawnTimer = 1.4;
      }
      return;
    }

    elapsed += dt;
    invulnerable = Math.max(0, invulnerable - dt);
    fireTimer -= dt;
    if (fireTimer <= 0) {
      bullets.push({ x: player.x, y: player.y - player.size / 2 });
      fireTimer = FIRE_EVERY;
    }
    for (const bullet of bullets) bullet.y -= BULLET_SPEED * dt;
    bullets = bullets.filter((bullet) => bullet.y > -20);

    spawnTimer -= dt;
    if (spawnTimer <= 0 && spawning) {
      spawn();
      if (elapsed > 20 && Math.random() < 0.4) spawn(); // 後半は、2つ同時に出ることがある
      spawnTimer = Math.max(0.42, 1.15 - elapsed / 80);
    }
    for (const enemy of enemies) {
      enemy.y += enemy.speed * dt;
      enemy.wave += dt * 2.4;
      enemy.drawX = enemy.x + Math.sin(enemy.wave) * enemy.sway;
      if (enemy.hunter) enemy.x += Math.sign(player.x - enemy.drawX) * 65 * dt;
    }

    function damage() {
      lives -= 1;
      invulnerable = INVULNERABLE;
      burst(player.x, player.y);
      playSe("cancel3");
      if (lives <= 0) {
        state = "over";
        best = Math.max(best, score);
        playSe("cancel5");
      }
    }
    for (const enemy of enemies) {
      for (const bullet of bullets) {
        if (bullet.dead || enemy.dead) continue;
        if (Math.hypot(bullet.x - (enemy.drawX ?? enemy.x), bullet.y - enemy.y) < enemy.size / 2 + 6) {
          bullet.dead = true;
          enemy.hp -= 1;
          playShun(); // 当たったら、しゅん
          if (enemy.hp <= 0) {
            enemy.dead = true;
            kills += 1;
            score += enemy.hunter ? 30 : 10 * (enemy.size > 48 ? 2 : 1);
            burst(enemy.drawX ?? enemy.x, enemy.y);
          }
        }
      }
      if (!enemy.dead && invulnerable === 0 && Math.hypot(player.x - (enemy.drawX ?? enemy.x), player.y - enemy.y) < enemy.size / 2 + player.size / 2 - 10) {
        enemy.dead = true;
        damage();
      }
    }
    enemies = enemies.filter((enemy) => !enemy.dead && enemy.y < height + enemy.size);
    bullets = bullets.filter((bullet) => !bullet.dead);
    emit();
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    for (const enemy of enemies) {
      const image = enemy.image;
      if (image.complete && image.naturalWidth) {
        ctx.drawImage(image, (enemy.drawX ?? enemy.x) - enemy.size / 2, enemy.y - enemy.size / 2, enemy.size, enemy.size);
      }
    }
    for (const bullet of bullets) {
      if (bulletImage.complete && bulletImage.naturalWidth) ctx.drawImage(bulletImage, bullet.x - 9, bullet.y - 9, 18, 18);
    }
    for (const spark of sparks) {
      ctx.globalAlpha = Math.max(0, spark.life / 0.45);
      ctx.fillStyle = "#ffd24a";
      ctx.beginPath();
      ctx.arc(spark.x, spark.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    if (state !== "over" && state !== "ended") {
      const blink = invulnerable > 0 && Math.floor(invulnerable * 10) % 2 === 0;
      if (!blink && face.complete && face.naturalWidth) {
        const ratio = face.naturalHeight / face.naturalWidth;
        ctx.drawImage(face, player.x - player.size / 2, player.y - (player.size * ratio) / 2, player.size, player.size * ratio);
      }
    }
  }

  return {
    update,
    draw,
    resize,
    setSpawning(value) {
      spawning = value;
    },
    setActive(value) {
      active = value;
      if (!value) keys.clear();
    },
    // スタッフロールが終わったとき:成績を返して、遊びを止める
    finish() {
      if (state === "playing") best = Math.max(best, score);
      state = "ended";
      emit();
      return { played, best, kills };
    },
    // 画面をひらいたときの、はじめの状態
    open() {
      reset();
      best = 0;
      kills = 0;
      played = false;
      state = "idle";
      resize();
      emit();
    },
    get state() {
      return state;
    },
  };
}
