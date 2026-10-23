// どの画面のフロリにも、いまの着せ替え(頭・体・顔)を重ねる。
// 表紙・その他・着せ替えは、index.html に、かざり用の場所(.decor)がある。ほかの画面は、ここで自動で重ねる。
// 絵の前に出るかざり(front)と、うしろに回るかざり(back)の入れものを、絵のあとに並べる(重なり順は z-index)。
const SELECTOR = "img.flori, img.opening-flori, img.announce-flori, img.tut-side-flori";
const POSE = /(?:wave_(?:nikkori|smile|wrong|surprised)\.png|body_wave\.webp)$/; // かざりの位置が合う絵(同じ大きさ・同じ立ち姿)
const overlays = new Map(); // 絵 → { front, back }
let items = [];
let fit = 1; // かざりをつけたとき、かざりが絵の外に出ても、まわりのボタン・文字と重ならないよう、フロリ+かざりを縮める倍率

const skip = (img) => img.closest(".hero-fig, .decor") || img.id === "unlock-flori";

function build({ front, back }) {
  for (const [box, isBack] of [[front, false], [back, true]]) {
    box.replaceChildren(
      ...items
        .filter((item) => item?.img && Boolean(item.pos.back) === isBack)
        .map((item) => {
          const el = document.createElement("img");
          el.src = item.img;
          el.alt = "";
          el.draggable = false;
          el.decoding = "async";
          el.decode?.().catch(() => {}); // 先に読みほどいておく(画面が出たとき、かくつかないように)
          el.style.left = `${item.pos.x}%`;
          el.style.top = `${item.pos.y}%`;
          el.style.width = `${item.pos.w}%`;
          el.style.transform = `translate(-50%, -50%) rotate(${item.pos.r ?? 0}deg) scale(${item.pos.sx ?? 1}, ${item.pos.sy ?? 1})`;
          return el;
        }),
    );
  }
}

// 絵の重なり順(z-index)を、かざりの入れものに合わせる:うしろ=絵の1つ下、まえ=絵の1つ上
function layer(img) {
  const { front, back } = overlays.get(img);
  let z = Number.parseInt(getComputedStyle(img).zIndex, 10);
  if (Number.isNaN(z) || z < 1) {
    z = 2;
    img.style.zIndex = "2";
  }
  back.style.zIndex = String(z - 1); // うしろのかざりは、絵の1つ下
  front.style.zIndex = String(z + 1);
}

function place(img) {
  const pair = overlays.get(img);
  if (!pair) return;
  if (img.closest("[hidden]") && !img.hidden) return; // 隠れている画面の中は、何もしない(画面が出たとき、前の場所のまま、すぐ出る)
  const original = img.dataset.orig ?? img.getAttribute("src") ?? "";
  const show = POSE.test(original) && !img.hidden;
  if (pair.front.hidden === show) {
    pair.front.hidden = !show;
    pair.back.hidden = !show;
  }
  const w = img.offsetWidth;
  const h = img.offsetHeight;
  if (!show || w === 0 || h === 0) {
    if (!show) {
      pair.signature = null;
      pair.geometry = null;
    }
    return;
  }
  if (pair.fit !== fit) {
    pair.fit = fit;
    applyFit(img, pair);
  }
  if (pair.z === undefined) {
    layer(img);
    pair.z = true;
  }
  // object-fit: contain で、絵が枠より小さく入っているときは、絵の見えている部分に、かざりを合わせる
  let cw = w;
  let ch = h;
  if (img.naturalWidth > 0 && getComputedStyle(img).objectFit === "contain") {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    cw = img.naturalWidth * scale;
    ch = img.naturalHeight * scale;
  }
  const left = img.offsetLeft + (w - cw) / 2;
  const top = img.offsetTop + (h - ch) / 2;
  const geometry = `${left}|${top}|${cw}|${ch}`;
  if (pair.geometry !== geometry) {
    pair.geometry = geometry;
    for (const box of [pair.front, pair.back]) {
      box.style.left = `${left}px`;
      box.style.top = `${top}px`;
      box.style.width = `${cw}px`;
      box.style.height = `${ch}px`;
    }
  }
  sync(img);
}

function applyFit(img, pair) {
  for (const el of [img, pair.front, pair.back]) {
    el.style.scale = fit < 1 ? String(fit) : "";
    el.style.transformOrigin = fit < 1 ? "50% 100%" : ""; // 足もとの真ん中を止めて縮める
  }
}

function makeBox(className) {
  const box = document.createElement("span");
  box.className = `decor decor-auto ${className}`;
  box.setAttribute("aria-hidden", "true");
  return box;
}

function attach(img) {
  if (overlays.has(img) || skip(img) || !img.parentElement) return;
  const pair = { front: makeBox("decor-front"), back: makeBox("decor-back") };
  if (getComputedStyle(img).position === "static") img.classList.add("decor-host");
  // 入れものは、絵の「あと」に並べる(絵の直前に、別の要素が入ると、`.screen-head + .flori` のような CSS が効かなくなる)
  img.after(pair.back, pair.front);
  overlays.set(img, pair);
  img.decode?.().catch(() => {}); // フロリの大きな絵も、先に読みほどいておく
  build(pair);
  sizer.observe(img);
  img.addEventListener("load", () => place(img));
  place(img);
}

const sizer = new ResizeObserver((entries) => entries.forEach((entry) => place(entry.target)));

// 画面が変わったとき・絵が入れかわったとき、全部の場所を直す
function refresh() {
  for (const img of document.querySelectorAll(SELECTOR)) attach(img);
  for (const [img, pair] of overlays) {
    if (!img.isConnected) {
      sizer.unobserve(img);
      pair.front.remove();
      pair.back.remove();
      overlays.delete(img);
    } else place(img);
  }
}

new MutationObserver((records) => {
  let touched = false;
  for (const record of records) {
    if (record.target.closest?.(".decor-auto")) continue;
    touched = true;
  }
  if (touched) setTimeout(refresh, 0);
}).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src", "hidden", "class"] });
window.addEventListener("resize", refresh);

// かざりが、フロリの絵の外(上・横)にどれだけはみ出すかを、かざりの絵の大きさから出して、縮める倍率を決める
const sizeCache = new Map();
function naturalSize(src) {
  if (!sizeCache.has(src)) {
    sizeCache.set(
      src,
      new Promise((resolve) => {
        const el = new Image();
        el.onload = () => resolve([el.naturalWidth, el.naturalHeight]);
        el.onerror = () => resolve([0, 0]);
        el.src = src;
      }),
    );
  }
  return sizeCache.get(src);
}
const FLORI_ASPECT = 1595 / 2000; // フロリの絵の 幅/高さ
async function computeFit(list) {
  let top = 0;
  let side = 0;
  for (const item of list) {
    if (!item?.img) continue;
    const [w, h] = await naturalSize(item.img);
    if (!w) continue;
    const { x, y, w: wp, r = 0 } = item.pos;
    const hp = wp * (h / w) * FLORI_ASPECT; // 高さ(絵の高さに対する%)
    const rad = (r * Math.PI) / 180;
    const bw = Math.abs(wp * Math.cos(rad)) + Math.abs(hp * Math.sin(rad));
    const bh = Math.abs(wp * Math.sin(rad)) + Math.abs(hp * Math.cos(rad));
    top = Math.max(top, -(y - bh / 2));
    side = Math.max(side, -(x - bw / 2), x + bw / 2 - 100);
  }
  // まわりには、すきまがあるので、少しのはみ出し(上 12%・横 10%)は、そのまま。縮めすぎないよう、最小は 0.85 倍
  const need = Math.min(1, 1 / (1 + Math.max(0, top - 12) / 100), 1 / (1 + Math.max(0, side - 10) / 100));
  return Math.max(0.85, need);
}

// 表紙・その他のフロリ(index.html に、かざり用の場所があるもの)も、同じ倍率で縮める
function fitStatic() {
  for (const el of document.querySelectorAll(".hero-fig > img.flori, .hero-fig > .decor")) {
    if (el.closest("#screen-dress, .unlock-dialog, dialog")) continue;
    el.style.scale = fit < 1 ? String(fit) : "";
    el.style.transformOrigin = fit < 1 ? "50% 100%" : "";
    // scale をかけると、かざりの入れものが、1つの層になり、フロリ(z-index 1)の下に入って、見えなくなる。上に出す
    if (el.classList.contains("decor")) el.style.zIndex = fit < 1 ? "2" : "";
  }
}

// いまの着せ替えを受け取る(main.js の applyDress から)
let fitJob = 0;
export function setAutoDecor(list) {
  items = list;
  for (const pair of overlays.values()) build(pair);
  const job = ++fitJob;
  computeFit(list).then((value) => {
    if (job !== fitJob) return;
    fit = value;
    fitStatic();
    refresh();
  });
  refresh();
}

// 動いているフロリ(ゆれる・はねる・出てくる)に、かざりもついていく:
// 絵の CSS アニメーションを、かざりにも同じ位相でかける(毎コマ読み取らない。動きはブラウザにまかせるので、ずれない)
const synced = new Map(); // かざりの入れもの → いま、かけているアニメーション
function sync(img) {
  const pair = overlays.get(img);
  if (!pair) return;
  const sources = img.getAnimations().filter((a) => a.effect && "animationName" in a);
  const signature = sources.map((a) => `${a.animationName}|${a.startTime}|${a.effect.getTiming().duration}`).join(",");
  if (pair.signature === signature) return; // 動きが変わっていなければ、かけなおさない(かくつきの原因)
  pair.signature = signature;
  const style = getComputedStyle(img);
  for (const box of [pair.front, pair.back]) {
    for (const old of synced.get(box) ?? []) old.cancel();
    const list = [];
    box.style.transformOrigin = style.transformOrigin;
    box.style.opacity = style.opacity === "1" ? "" : style.opacity;
    for (const source of sources) {
      const copy = box.animate(source.effect.getKeyframes(), source.effect.getTiming());
      if (source.startTime !== null) copy.startTime = source.startTime;
      else copy.currentTime = source.currentTime ?? 0;
      list.push(copy);
    }
    synced.set(box, list);
  }
}
const syncAll = () => {
  for (const img of overlays.keys()) place(img); // 場所・出る/かくれる・アニメーションを、まとめて合わせ直す
};
document.addEventListener("animationstart", (event) => {
  if (overlays.has(event.target)) sync(event.target);
}, true);
document.addEventListener("animationend", (event) => {
  if (overlays.has(event.target)) sync(event.target);
}, true);
setInterval(syncAll, 1000); // 念のため、1秒ごとに合わせ直す(変わっていなければ、何もしない)

// 画面の大きさが変わらなくても、絵の位置だけが変わったとき(解説の大きさに合わせて、絵が小さくなる など)に、かざりを、合わせ直す
export const refreshDecor = refresh;
