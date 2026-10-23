// どの画面のフロリにも、いまの着せ替え(頭・体・顔)を重ねる。
// 表紙・その他・着せ替えは、index.html に、かざり用の場所(.decor)がある。ほかの画面は、ここで自動で重ねる。
// 絵の前に出るかざり(front)は絵の直前の上、うしろに回るかざり(back)は絵の直前の下に、それぞれ入れものを作る。
const SELECTOR = "img.flori, img.opening-flori, img.announce-flori, img.tut-side-flori";
const POSE = /(?:wave_(?:nikkori|smile|wrong|surprised)\.png|body_wave\.webp)$/; // かざりの位置が合う絵(同じ大きさ・同じ立ち姿)
const overlays = new Map(); // 絵 → { front, back }
let items = [];

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
          el.style.left = `${item.pos.x}%`;
          el.style.top = `${item.pos.y}%`;
          el.style.width = `${item.pos.w}%`;
          el.style.transform = `translate(-50%, -50%) rotate(${item.pos.r ?? 0}deg) scale(${item.pos.sx ?? 1}, ${item.pos.sy ?? 1})`;
          return el;
        }),
    );
  }
}

// 絵の重なり順(z-index)を、かざりの入れものに合わせる:うしろ=絵と同じ(DOM で先なので下)、まえ=絵の1つ上
function layer(img) {
  const { front, back } = overlays.get(img);
  let z = Number.parseInt(getComputedStyle(img).zIndex, 10);
  if (Number.isNaN(z)) {
    z = 1;
    img.style.zIndex = "1";
  }
  back.style.zIndex = String(z);
  front.style.zIndex = String(z + 1);
}

function place(img) {
  const pair = overlays.get(img);
  if (!pair) return;
  const original = img.dataset.orig ?? img.getAttribute("src") ?? "";
  const w = img.offsetWidth;
  const h = img.offsetHeight;
  const visible = POSE.test(original) && w > 0 && h > 0 && !img.hidden;
  pair.front.hidden = !visible;
  pair.back.hidden = !visible;
  if (!visible) return;
  layer(img);
  // object-fit: contain で、絵が枠より小さく入っているときは、絵の見えている部分に、かざりを合わせる
  let cw = w;
  let ch = h;
  if (img.naturalWidth > 0 && getComputedStyle(img).objectFit === "contain") {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    cw = img.naturalWidth * scale;
    ch = img.naturalHeight * scale;
  }
  for (const box of [pair.front, pair.back]) {
    box.style.left = `${img.offsetLeft + (w - cw) / 2}px`;
    box.style.top = `${img.offsetTop + (h - ch) / 2}px`;
    box.style.width = `${cw}px`;
    box.style.height = `${ch}px`;
  }
  sync(img);
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
  img.before(pair.back);
  img.after(pair.front);
  overlays.set(img, pair);
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

// いまの着せ替えを受け取る(main.js の applyDress から)
export function setAutoDecor(list) {
  items = list;
  for (const pair of overlays.values()) build(pair);
  refresh();
}

// 動いているフロリ(ゆれる・はねる・出てくる)に、かざりもついていく:
// 絵の CSS アニメーションを、かざりにも同じ位相でかける(毎コマ読み取らない。動きはブラウザにまかせるので、ずれない)
const synced = new Map(); // かざりの入れもの → いま、かけているアニメーション
function sync(img) {
  const pair = overlays.get(img);
  if (!pair) return;
  const style = getComputedStyle(img);
  for (const box of [pair.front, pair.back]) {
    for (const old of synced.get(box) ?? []) old.cancel();
    const list = [];
    box.style.transformOrigin = style.transformOrigin;
    box.style.opacity = style.opacity === "1" ? "" : style.opacity;
    for (const source of img.getAnimations()) {
      if (!source.effect || !("animationName" in source)) continue; // CSS アニメーションだけ
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
setInterval(syncAll, 500); // 念のため、0.5秒ごとに合わせ直す
