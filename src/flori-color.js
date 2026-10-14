// フロリの色を変える(きせかえ)。体の水色の部分だけ、色あいを変える。目・ほお・口・ふちの線は、そのまま。
// 絵を描き直すのではなく、画面に出すときに、画素の色あいをずらす。もとのファイルは、変えない。

const cache = new Map(); // "もとの絵の場所|色" → 色をかえた絵(データのURL)
const MAX_WIDTH = 640; // 大きすぎる絵は、画面に出る大きさに小さくする

function rgbToHsl(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) * 60;
  else if (max === g) h = ((b - r) / d + 2) * 60;
  else h = ((r - g) / d + 4) * 60;
  return [h, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l, l, l];
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const channel = (t) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const hh = h / 360;
  return [channel(hh + 1 / 3), channel(hh), channel(hh - 1 / 3)];
}

// 体の部分か?(水色〜青ずんだ、明るめの、あまり濃くない色)。目の青緑や、ほお・口の色、暗い顔や線は、ふくまない。
function isBody(h, s, l) {
  return h >= 170 && h <= 255 && s >= 0.03 && s <= 0.55 && l >= 0.4;
}

// color = { hue, gain, minSat, gray }
export function recolor(src, color) {
  const key = `${src}|${color.id}`;
  if (cache.has(key)) return cache.get(key);
  const job = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / image.naturalWidth);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      for (let i = 0; i < px.length; i += 4) {
        if (px[i + 3] === 0) continue;
        const [h, s, l] = rgbToHsl(px[i] / 255, px[i + 1] / 255, px[i + 2] / 255);
        if (!isBody(h, s, l)) continue;
        const nextS = color.gray ? 0 : Math.min(0.95, Math.max(s * color.gain, color.minSat));
        const nextL = color.gray ? l : Math.max(0.45, l * 0.9); // 色をつけるぶん、少しだけ暗くして、色がはっきり見えるように
        const [r, g, b] = hslToRgb(color.gray ? h : color.hue, nextS, nextL);
        px[i] = Math.round(r * 255);
        px[i + 1] = Math.round(g * 255);
        px[i + 2] = Math.round(b * 255);
      }
      ctx.putImageData(data, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    image.onerror = reject;
    image.src = src;
  });
  cache.set(key, job);
  job.catch(() => cache.delete(key)); // 読みこめなかったら、また試せるように
  return job;
}

// ---- 画面のフロリの絵に、色をつける ----
const SELECTOR = "img.flori, img.opening-flori, img.announce-flori, .corner-flori img";
let current = null; // いまの色(null なら、もとの色)

function isData(src) {
  return src.startsWith("data:");
}

// 絵の場所が、あたらしく入れかわったとき
function handle(img) {
  const src = img.getAttribute("src");
  if (!src || isData(src)) return; // 自分で入れかえた絵は、とばす
  delete img.dataset.orig;
  paint(img, src);
}

function paint(img, original) {
  if (!current) return;
  const color = current;
  recolor(original, color)
    .then((url) => {
      if (current !== color || (img.dataset.orig ?? img.getAttribute("src")) !== original) return;
      img.dataset.orig = original;
      img.src = url;
    })
    .catch(() => {});
}

// 色をかえる(null でもとの色)
export function setFloriColor(color) {
  current = color && !color.original ? color : null;
  for (const img of document.querySelectorAll(SELECTOR)) {
    const original = img.dataset.orig ?? img.getAttribute("src");
    if (!original || isData(original)) continue;
    if (!current) {
      if (img.dataset.orig) {
        img.src = img.dataset.orig;
        delete img.dataset.orig;
      }
    } else paint(img, original);
  }
}

new MutationObserver((records) => {
  for (const record of records) {
    if (record.type === "attributes") {
      if (record.target.matches?.(SELECTOR)) handle(record.target);
    } else {
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches?.(SELECTOR)) handle(node);
        for (const img of node.querySelectorAll?.(SELECTOR) ?? []) handle(img);
      }
    }
  }
}).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ["src"] });
