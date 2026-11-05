// 動くフロリ(Live2D)。画面に出ている「ポーズつきのフロリの絵」(img.flori)の上に、同じ場所・同じ大きさで、canvas を重ねて、絵のかわりに動かす。
//  - 絵(img)は、そのまま残す(大きさ・ゆれる動き・着せ替えのかざりの位置は、絵のものを使う)。動くフロリが出せるまでは、絵が見える。
//  - かざり(頭・体・顔)は、いままでどおり。絵の見えている場所にそろえて、重ねる(decor-overlay.js)。
//  - 色(着せ替えの色)は、体・頭・手足の絵を、flori-color.js で色づけしてから、貼る。
//  - 出さない画面:クイズ(問題・RPG)。表紙は、クリックで ぴょん。着せ替え画面でも、腕を動かす。
import { draw, loadModel } from "./live2d/live2d.js";
import { createMotion } from "./live2d/flori-motion.js";
import { getFloriColor, recolorCanvas } from "./flori-color.js";

// ポーズつきの絵のうち、動くフロリにかえるもの(かざりの位置が合う絵。decor-overlay.js の POSE と同じ)
const POSE = /(?:wave_(?:nikkori|smile|wrong|surprised)\.png|body_wave\.webp)$/;
const MOOD = { wave_wrong: "こまった", wave_surprised: "びっくり" }; // 絵のポーズに合わせた、ずっと同じ表情
const EXCLUDE = "#screen-question, #screen-rpg"; // クイズ画面は、動くフロリを出さない
const TINT_PARTS = /^(体|顔|右足|左足|右手(コブシ|バンザイ)|左手(コブシ|バンザイ))$/; // 色をつけるパーツ
const TINT_SCALE = 0.3; // 色をつけるときの、絵の縮め具合(もようの大きさを、静止画に近づける。大きいと、重い)

// 静止画(800×1003)の場所 → Live2D のキャンバスの座標: X = X0 + x / S、Y = Y0 + y / S(頭の大きさと位置を、静止画に合わせた。測り方は decisions その50 その31)
const FRAME = { w: 800, h: 1003 };
const S = 0.362; // 頭の幅を、静止画に合わせた(3%せまい)。いっしょに体も少し ふえる(+4%)
const X0 = 304;
const Y0 = 861;
const MARGIN = { x: 0.06, y: 0.03 }; // 腕などが はみ出してもよいように、canvas を、絵より少し大きくする(絵に対する割合)
// 首のかしげ:顔の部品(回転)の角度を、パラメーターの値から求める(かざりを、いっしょに かたむけるため)
const PIVOT = { x: 1459.5, y: 1696.5 }; // 顔の回転の中心(キャンバス座標)
function faceAngle() {
  const d = model.deformers.find((deformer) => deformer.binds.length === 1 && model.params[deformer.binds[0].param].name === "顔");
  if (!d) return 0;
  const v = model.values[d.binds[0].param];
  const k = d.binds[0].keys;
  if (v <= k[0]) return d.forms[0].angle;
  if (v >= k[k.length - 1]) return d.forms[k.length - 1].angle;
  let i = 0;
  while (v > k[i + 1]) i += 1;
  const t = (v - k[i]) / (k[i + 1] - k[i]);
  return d.forms[i].angle + (d.forms[i + 1].angle - d.forms[i].angle) * t;
}
function tiltDecor(img, angle, m) {
  const foot = `${(((FOOT.px - X0) * S) / FRAME.w) * 100}% ${(((FOOT.py - Y0) * S) / FRAME.h) * 100}%`;
  const origin = `${(((PIVOT.x - X0) * S) / FRAME.w) * 100}% ${(((PIVOT.y - Y0) * S) / FRAME.h) * 100}%`;
  for (const box of img.parentElement.querySelectorAll(":scope > .decor")) {
    box.style.setProperty("--tilt", `${angle.toFixed(2)}deg`);
    box.style.setProperty("--tilt-origin", origin);
    box.style.setProperty("--hop-y", `${((-m.bounce * S) / FRAME.h) * 100}%`); // ジャンプで体が上がった分・つぶれた分を、かざりにも
    box.style.setProperty("--sx", String(m.sx));
    box.style.setProperty("--sy", String(m.sy));
    box.style.setProperty("--foot-origin", foot);
  }
}

const FOOT = { px: 1455, py: 3470 }; // つぶれ・のびの支点(足もと)

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const mounts = new Map(); // img → { canvas, motion, key, ready, size }
let model = null;
let loading = null;
let tint = null; // 色をつけた絵 { id, imgs: Map(ファイル → canvas) }
let tintJob = 0;

const originalSrc = (img) => img.dataset.orig ?? img.getAttribute("src") ?? "";
const eligible = (img) => POSE.test(originalSrc(img)) && !img.closest(EXCLUDE);

function ensureModel() {
  loading ??= loadModel(new URL("./live2d/", import.meta.url).href).then((m) => {
    model = m;
    retint();
    return m;
  });
  return loading;
}

// 色づけ(着せ替えの色が変わるたび。重いので、パーツごとに間をあける)
async function retint() {
  if (!model) return;
  const color = getFloriColor();
  const job = ++tintJob;
  if (!color) {
    tint = null;
    return;
  }
  const imgs = new Map();
  for (const mesh of model.meshes) {
    if (!TINT_PARTS.test(mesh.name) || imgs.has(mesh.img)) continue;
    await new Promise((resolve) => setTimeout(resolve, 0));
    if (job !== tintJob) return;
    imgs.set(mesh.img, recolorCanvas(model.imgs.get(mesh.img), color, TINT_SCALE, mesh.name === "顔" ? 0.87 : 0)); // 頭は、バイザーの下の影・ふちの混ざった色(明るさ 0.87 より暗い部分)に、色をつけない
  }
  if (job === tintJob) tint = { id: color.id, imgs };
}
document.addEventListener("flori-color", () => {
  tint = null;
  retint();
});

function view(bounce) {
  const mx = MARGIN.x * FRAME.w;
  const my = MARGIN.y * FRAME.h;
  return { x: X0 - mx / S, y: Y0 - my / S + bounce, w: (FRAME.w + 2 * mx) / S, h: (FRAME.h + 2 * my) / S };
}

// 足もとの影(静止画にある、水色の楕円)
function shadow(ctx) {
  ctx.save();
  ctx.fillStyle = "rgba(160, 190, 205, 0.55)";
  ctx.beginPath();
  ctx.ellipse(1455, 3485, 520, 105, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// 絵(img)の上に、canvas を載せる場所:かざりの入れもの(絵の見えている場所にそろえてある)があれば、その中。表紙などの hero-fig なら、その中
function host(img) {
  const front = img.nextElementSibling?.nextElementSibling;
  if (front?.classList.contains("decor-front")) return front;
  return img.closest(".hero-fig");
}

function mount(img) {
  const box = host(img);
  if (!box) return null;
  const canvas = document.createElement("canvas");
  canvas.className = "live-flori";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.cssText = `position:absolute;left:${-MARGIN.x * 100}%;top:${-MARGIN.y * 100}%;width:${(1 + 2 * MARGIN.x) * 100}%;height:${(1 + 2 * MARGIN.y) * 100}%;pointer-events:none;`;
  canvas.style.zIndex = box.classList.contains("decor-front") ? "0" : "1";
  box.prepend(canvas);
  if (box.classList.contains("hero-fig")) box.classList.add("has-live"); // CSS の はねる動きを小さくする
  const item = { canvas, motion: null, key: "", ready: false, size: "", box };
  if (img.closest("#screen-cover")) {
    canvas.style.pointerEvents = "auto";
    canvas.addEventListener("pointerdown", () => item.motion?.hop(performance.now())); // 表紙は、クリックで ぴょん
  }
  mounts.set(img, item);
  return item;
}

function configure(img, item) {
  const src = originalSrc(img);
  const mood = MOOD[(/(wave_\w+)\.png$/.exec(src) ?? [])[1]] ?? null;
  const noArms = false; // 着せ替え画面でも、腕を動かす(利用者の指示)
  const key = `${mood}|${noArms}`;
  if (item.key === key) return;
  item.key = key;
  item.motion = createMotion(model, { mood, noArms });
}

let last = 0;
function frame(now) {
  if (now - last < 30) return requestAnimationFrame(frame); // 約30コマ/秒(スマホで重くならないように)
  last = now;
  for (const [img, item] of mounts) {
    if (!img.isConnected) {
      item.canvas.remove();
      mounts.delete(img);
      continue;
    }
    if (!eligible(img) || img.offsetParent === null || !model) continue;
    if (item.box !== host(img)) {
      // かざりの入れものが、つくりなおされた(絵が入れかわった)。canvas を、つけなおす
      const box = host(img);
      if (!box) continue;
      item.box = box;
      box.prepend(item.canvas);
    }
    configure(img, item);
    const { canvas } = item;
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(Math.min(canvas.clientWidth * dpr, 640));
    const h = Math.round((w * (1 + 2 * MARGIN.y) * FRAME.h) / ((1 + 2 * MARGIN.x) * FRAME.w));
    if (w === 0) continue;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    const m = reduced ? { bounce: 0, sx: 1, sy: 1 } : item.motion.update(now);
    const bg = model.meshes.findIndex((mesh) => mesh.name === "BG");
    draw(model, canvas.getContext("2d"), view(m.bounce), { hide: new Set([bg]), squash: { sx: m.sx, sy: m.sy, ...FOOT }, imgs: tint?.imgs, before: shadow });
    tiltDecor(img, reduced ? 0 : faceAngle(), m);
    if (!item.ready) {
      item.ready = true;
      img.style.visibility = "hidden"; // 動くフロリが出たら、静止画はかくす(場所・大きさは、そのまま)
    }
  }
  requestAnimationFrame(frame);
}

function scan() {
  for (const img of document.querySelectorAll("img.flori")) {
    if (!eligible(img)) {
      const item = mounts.get(img);
      if (item && img.style.visibility === "hidden") img.style.visibility = ""; // 静止画にもどす
      continue;
    }
    ensureModel();
    if (!mounts.has(img)) mount(img);
    else if (img.style.visibility === "hidden" && !mounts.get(img).ready) img.style.visibility = "";
  }
}

export function startLiveFlori() {
  let queued = false;
  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      scan();
    });
  };
  new MutationObserver(queue).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src", "hidden", "class"] });
  setInterval(scan, 1000);
  scan();
  requestAnimationFrame(frame);
}
