// フロリの色を変える(きせかえ)。体の水色の部分だけ、色あいを変える。目・ほお・口・ふちの線は、そのまま。
// 絵を描き直すのではなく、画面に出すときに、画素の色あいをずらす。もとのファイルは、変えない。

const cache = new Map(); // "もとの絵の場所|色" → 色をかえた絵(データのURL)
const resolved = new Map(); // できあがった絵(すぐに出せる)
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

// 体の色の画素か?(うすい水色)。目の水色・黄色、ほお、口、顔の青いふち、灰色、暗い線は、ふくまない。
function isBody(h, s, l) {
  return h >= 180 && h <= 235 && s >= 0.1 && s <= 0.4 && l >= 0.55;
}

// 色のつよさ(1 で、きまった色いっぱい。小さいほど、うすい)。うすい色合いが、フロリらしいので、おさえめ
const STRENGTH = 0.62;

const hexRgb = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
const clamp01 = (v) => Math.min(1, Math.max(0, v));
const mix3 = (stops, t) => {
  const v = clamp01(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(v));
  return stops[i].map((c, k) => c + (stops[i + 1][k] - c) * (v - i));
};
const SUNSET = ["#ff9fbd", "#ffbf86", "#b9a0f0"].map(hexRgb);
const whiteOf = (l) => hslToRgb(200, 0.04, Math.min(1, 0.9 + (l - 0.55) * 0.26));
const noise = (x, y) => (Math.imul(x, 73856093) ^ Math.imul(y, 19349663)) >>> 0;

// 体の色の画素1つの、新しい色(r,g,b は 0〜1)。h,l:もとの色あい・明るさ  sTarget:色のこさの基準  sKeep:もとのこさ  (x,y):場所
function shade(color, h, sTarget, sKeep, l, x, y, width, height) {
  if (color.gray) return hslToRgb(h, 0, l);
  if (color.tone === "white") return hslToRgb(0, 0, Math.min(1, 0.9 + (l - 0.55) * 0.26));
  if (color.tone === "black") return hslToRgb(0, 0, clamp01(0.34 + (l - 0.55) * 0.3));
  if (color.tone === "navy") return hslToRgb(224, 0.18, clamp01(0.38 + (l - 0.55) * 0.5));
  if (color.sunset) {
    // 夕焼け:上から下へ、ピンク → オレンジ → 紫
    const [h, s] = rgbToHsl(...mix3(SUNSET, y / height));
    return hslToRgb(h, Math.min(1, s * 1.0), clamp01(l * 0.97));
  }
  if (color.starry) {
    // 星空:こい紺色に、小さな星
    if (noise(x >> 2, y >> 2) % 260 < 2) return [1, 0.96, 0.7];
    return hslToRgb(228, 0.3, clamp01(0.3 + (l - 0.55) * 0.5));
  }
  if (color.sakura) {
    // 桜:うすいピンクに、少しはなれた、大きめの花びら
    const cx = (x + (Math.floor(y / 84) % 2 ? 42 : 0)) % 84 - 42;
    const cy = (y % 84) - 42;
    return (cx / 15) ** 2 + (cy / 10) ** 2 < 1 ? hslToRgb(350, 0.52, clamp01(l * 0.92)) : hslToRgb(345, 0.3, l);
  }
  if (color.dots) {
    // 水玉:白に、大きめのピンクの水玉(間をあけて)
    const cx = (x + (Math.floor(y / 62) % 2 ? 31 : 0)) % 62;
    const cy = y % 62;
    return (cx - 31) ** 2 + (cy - 31) ** 2 < 144 ? hslToRgb(340, 0.68, clamp01(l * 0.9)) : whiteOf(l);
  }
  if (color.stripes) {
    // ストライプ:太い、水色と白のよこしま
    return Math.floor(y / 36) % 2 ? hslToRgb(205, 0.6, clamp01(l * 0.92)) : whiteOf(l);
  }
  if (color.snow) {
    // 雪の結晶:水色に、大きな白い結晶(間をあけて)
    const dx = ((x + 42) % 84) - 42;
    const dy = ((y + 42) % 84) - 42;
    const flake = (Math.abs(dx) < 3.5 && Math.abs(dy) < 15) || (Math.abs(dy) < 3.5 && Math.abs(dx) < 15) || (Math.abs(dx - dy) < 4.5 && Math.abs(dx) < 10) || (Math.abs(dx + dy) < 4.5 && Math.abs(dx) < 10);
    return flake ? whiteOf(l) : hslToRgb(208, 0.55, clamp01(l * 0.95));
  }
  if (color.rainbow) return hslToRgb(((x / width) * 320 + (y / height) * 120) % 360, 0.34, Math.min(0.9, l * 0.98 + 0.02));
  if (color.metal) {
    // 金属の光沢:もとの明るさを、暗い色→明るい色の段階に当てはめ、斜めに走る光の帯(つや)を重ねる
    const stops = color.metal.map(hexRgb);
    const base = clamp01((l - 0.55) / 0.42);
    const band = 0.5 + 0.5 * Math.sin(((x / width) * 1.3 + (y / height) * 1.1) * Math.PI * 2.2);
    const v = clamp01(0.12 + base * 0.5 + band * 0.42) * (stops.length - 1);
    const i = Math.min(stops.length - 2, Math.floor(v));
    const f = v - i;
    return stops[i].map((c, k) => c + (stops[i + 1][k] - c) * f);
  }
  const target = Math.min(0.9, Math.max(sTarget * color.gain, color.minSat)) * STRENGTH * (color.boost ?? 1);
  return hslToRgb(color.hue, Math.max(target, sKeep * 0.5), clamp01(l * (color.lmul ?? 1)));
}

// color = { hue, gain, minSat, gray }
export function recolor(src, color) {
  const key = `${src}|${color.id}`;
  if (cache.has(key)) return cache.get(key);
  const job = new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, MAX_WIDTH / image.naturalWidth);
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      ctx.drawImage(image, 0, 0, width, height);
      const data = ctx.getImageData(0, 0, width, height);
      const px = data.data;
      const total = width * height;
      // 体の色の画素を、つながり(線で区切られた1かたまり)ごとに分ける
      const mask = new Uint8Array(total);
      for (let i = 0; i < total; i += 1) {
        if (px[i * 4 + 3] < 128) continue;
        const [h, s, l] = rgbToHsl(px[i * 4] / 255, px[i * 4 + 1] / 255, px[i * 4 + 2] / 255);
        if (isBody(h, s, l)) mask[i] = 1;
      }
      const label = new Int32Array(total);
      const parts = []; // { count, sumL }
      const stack = new Int32Array(total);
      for (let start = 0; start < total; start += 1) {
        if (!mask[start] || label[start]) continue;
        const id = parts.length + 1;
        const part = { count: 0, sumL: 0 };
        let top = 0;
        stack[top++] = start;
        label[start] = id;
        while (top > 0) {
          const i = stack[--top];
          part.count += 1;
          part.sumL += (Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) + Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) / 510;
          const x = i % width;
          for (const j of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
            if (j >= 0 && j < total && mask[j] && !label[j]) {
              label[j] = id;
              stack[top++] = j;
            }
          }
        }
        parts.push(part);
      }
      // 足もとの影は、体より、少しこい水色のかたまり。体の色にはふくめない
      const skip = parts.map((part) => part.count > 150 && part.sumL / part.count < 0.84);
      for (let i = 0; i < total; i += 1) {
        const id = label[i];
        if (!id) continue;
        const [h, s, l] = rgbToHsl(px[i * 4] / 255, px[i * 4 + 1] / 255, px[i * 4 + 2] / 255);
        // 足もとの影(こい水色)は、そのまま。足のうすい水色は、影とつながっていても、色をつける
        if (skip[id - 1] && l < 0.86) continue;
        const [r, g, b] = shade(color, h, s, s, l, i % width, Math.floor(i / width), width, height);
        px[i * 4] = Math.round(r * 255);
        px[i * 4 + 1] = Math.round(g * 255);
        px[i * 4 + 2] = Math.round(b * 255);
      }
      // 足(くつ)の、灰色がかった部分も、同じ色あいにする(足もとの影・線・目は、そのまま)
      for (let i = 0; i < total; i += 1) {
        if (mask[i] || px[i * 4 + 3] < 128 || Math.floor(i / width) < height * 0.8) continue;
        const [h, s, l] = rgbToHsl(px[i * 4] / 255, px[i * 4 + 1] / 255, px[i * 4 + 2] / 255);
        if (s < 0.02 || s > 0.22 || l < 0.45 || l > 0.8) continue;
        const [r, g, b] = shade(color, h, 0.3, s, l, i % width, Math.floor(i / width), width, height);
        px[i * 4] = Math.round(r * 255);
        px[i * 4 + 1] = Math.round(g * 255);
        px[i * 4 + 2] = Math.round(b * 255);
      }
      ctx.putImageData(data, 0, 0);
      const url = canvas.toDataURL("image/png");
      resolved.set(key, url);
      resolve(url);
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
  warm();
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

// いまの色で、すぐ出せる絵があれば、その場所を返す(なければ、もとの場所)。色をつける準備を、先にしておくために使う。
export function colorizedSrc(src) {
  return current ? (resolved.get(`${src}|${current.id}`) ?? src) : src;
}

// 絵を入れかえる。色がついていれば、はじめから、色のついた絵を出す(一瞬、もとの色が見えないように)。
export function applyFloriSrc(img, src) {
  img.dataset.orig = src;
  img.src = colorizedSrc(src);
}

// よく使う絵を、先に、色づけしておく(答えたあとの、フロリの表示を、すぐにするため)
let warmList = [];
export function setWarmList(list) {
  warmList = list;
  warm();
}
function warm() {
  if (!current) return;
  for (const src of warmList) recolor(src, current).catch(() => {});
}
