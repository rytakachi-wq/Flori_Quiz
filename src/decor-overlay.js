// どの画面のフロリにも、いまの着せ替え(頭・体・顔)を重ねる。
// 表紙・その他・着せ替えは、index.html に、かざり用の場所(.decor)がある。ほかの画面は、ここで自動で重ねる。
const SELECTOR = "img.flori, img.opening-flori, img.announce-flori, img.tut-side-flori";
const POSE = /(?:wave_(?:nikkori|smile|wrong|surprised)\.png|body_wave\.webp)$/; // かざりの位置が合う絵(同じ大きさ・同じ立ち姿)
const overlays = new Map(); // 絵 → かざりの入れもの
let items = [];

const skip = (img) => img.closest(".hero-fig, .decor") || img.id === "unlock-flori";

function build(img, box) {
  box.replaceChildren(
    ...items
      .filter((item) => item?.img)
      .map((item) => {
        const el = document.createElement("img");
        el.src = item.img;
        el.alt = "";
        el.draggable = false;
        if (item.pos.back) el.className = "is-back";
        el.style.left = `${item.pos.x}%`;
        el.style.top = `${item.pos.y}%`;
        el.style.width = `${item.pos.w}%`;
        el.style.transform = `translate(-50%, -50%) rotate(${item.pos.r ?? 0}deg)`;
        return el;
      }),
  );
}

function place(img) {
  const box = overlays.get(img);
  if (!box) return;
  const original = img.dataset.orig ?? img.getAttribute("src") ?? "";
  const w = img.offsetWidth;
  const h = img.offsetHeight;
  const visible = POSE.test(original) && w > 0 && h > 0 && !img.hidden;
  box.hidden = !visible;
  if (!visible) return;
  // object-fit: contain で、絵が枠より小さく入っているときは、絵の見えている部分に、かざりを合わせる
  let cw = w;
  let ch = h;
  if (img.naturalWidth > 0 && getComputedStyle(img).objectFit === "contain") {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    cw = img.naturalWidth * scale;
    ch = img.naturalHeight * scale;
  }
  box.style.left = `${img.offsetLeft + (w - cw) / 2}px`;
  box.style.top = `${img.offsetTop + (h - ch) / 2}px`;
  box.style.width = `${cw}px`;
  box.style.height = `${ch}px`;
  sync(img);
  // かざりの位置は、絵の幅に対する割合なので、絵の大きさに合わせて見えるよう、高さも合わせる
}

function attach(img) {
  if (overlays.has(img) || skip(img) || !img.parentElement) return;
  const box = document.createElement("span");
  box.className = "decor decor-auto";
  box.setAttribute("aria-hidden", "true");
  if (getComputedStyle(img).position === "static") img.classList.add("decor-host");
  img.after(box);
  overlays.set(img, box);
  build(img, box);
  sizer.observe(img);
  img.addEventListener("load", () => place(img));
  place(img);
}

const sizer = new ResizeObserver((entries) => entries.forEach((entry) => place(entry.target)));

// 画面が変わったとき・絵が入れかわったとき、全部の場所を直す
function refresh() {
  for (const img of document.querySelectorAll(SELECTOR)) attach(img);
  for (const img of overlays.keys()) {
    if (!img.isConnected) {
      sizer.unobserve(img);
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
  for (const [img, box] of overlays) {
    build(img, box);
    place(img);
  }
  refresh();
}

// 動いているフロリ(ゆれる・はねる・出てくる)に、かざりもついていく:
// 絵の CSS アニメーションを、かざりにも同じ位相でかける(毎コマ読み取らない。動きはブラウザにまかせるので、ずれない)
const synced = new Map(); // かざりの入れもの → いま、かけているアニメーション
function sync(img) {
  const box = overlays.get(img);
  if (!box) return;
  for (const old of synced.get(box) ?? []) old.cancel();
  const list = [];
  const style = getComputedStyle(img);
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
