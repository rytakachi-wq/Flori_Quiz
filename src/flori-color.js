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
    // 桜:うすいピンクに、大きさも位置もばらばらの花びら
    const m = mottle(x, y, 92, 12, 19, 1);
    return m && (m.u / m.r) ** 2 + (m.v / (m.r * 0.65)) ** 2 < 1 ? hslToRgb(350, 0.52, clamp01(l * 0.92)) : hslToRgb(345, 0.3, l);
  }
  if (color.dots) {
    // 水玉:白に、大きさも位置もばらばらの、緑の水玉
    const m = mottle(x, y, 78, 11, 17, 2);
    return m && m.u * m.u + m.v * m.v < m.r * m.r ? hslToRgb(150, 0.55, clamp01(l * 0.9)) : whiteOf(l);
  }
  if (color.stripes) {
    // ストライプ:太い、水色と白のよこしま
    return Math.floor(y / 36) % 2 ? hslToRgb(358, 0.62, clamp01(l * 0.94)) : whiteOf(l);
  }
  if (color.snow) {
    // 雪の結晶:水色に、大きな白い結晶(間をあけて)
    const dx = ((x + 58) % 116) - 58;
    const dy = ((y + 58) % 116) - 58;
    const flake = (Math.abs(dx) < 6 && Math.abs(dy) < 22) || (Math.abs(dy) < 6 && Math.abs(dx) < 22) || (Math.abs(dx - dy) < 7 && Math.abs(dx) < 15) || (Math.abs(dx + dy) < 7 && Math.abs(dx) < 15);
    return flake ? whiteOf(l) : hslToRgb(208, 0.55, clamp01(l * 0.95));
  }
  if (color.grad) {
    // グラデーション:上から下へ、色が変わる
    const [h, s] = rgbToHsl(...mix3(color.grad.map(hexRgb), y / height));
    return hslToRgb(h, Math.min(1, s * (color.gsat ?? 1)), clamp01(l * (color.glm ?? 0.97)));
  }
  if (color.pat) return pattern(color.pat, x, y, l);
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

// まだら:マス目の中で、位置・大きさを、ばらばらにして、ときどき空ける。(x,y)の、もようの中の位置(中心からの差と大きさ)を返す。無ければ null
const hash = (a, b, seed) => Math.imul(a * 73856093 ^ b * 19349663 ^ seed * 83492791, 2654435761) >>> 0;
function mottle(x, y, cell, rMin, rMax, seed) {
  const ix = Math.floor(x / cell);
  const iy = Math.floor(y / cell);
  const h = hash(ix, iy, seed);
  if (h % 100 < 12) return null; // 空きマス
  const r = rMin + (((h >>> 8) % 100) / 100) * (rMax - rMin);
  const room = cell - 2 * r;
  const cx = ix * cell + r + (((h >>> 16) % 100) / 100) * room;
  const cy = iy * cell + r + (((h >>> 24) % 100) / 100) * room;
  return { u: x - cx, v: y - cy, r, k: (h >>> 4) % 360 };
}

// 柄(お試しの色):白っぽい地に、もようを付ける
function pattern(name, x, y, l) {
  const c = (h, s, m = 1) => hslToRgb(h, s, clamp01(l * m));
  const cell = (n) => [((x % n) + n) % n - n / 2, ((y % n) + n) % n - n / 2];
  switch (name) {
    case "gingham": {
      const a = Math.floor(x / 34) % 2;
      const b = Math.floor(y / 34) % 2;
      return a && b ? c(350, 0.6, 0.88) : a || b ? c(350, 0.5, 0.96) : whiteOf(l);
    }
    case "hearts": {
      const m = mottle(x, y, 76, 13, 20, 3);
      if (!m) return whiteOf(l);
      const u = m.u / m.r;
      const v = -m.v / m.r + 0.15;
      return (u * u + v * v - 1) ** 3 - u * u * v ** 3 < 0 ? c(345, 0.7, 0.9) : whiteOf(l);
    }
    case "stars": {
      const [u, v] = cell(80);
      const r = Math.hypot(u, v);
      const a = Math.atan2(v, u) + Math.PI / 2;
      return r < 20 * (0.42 + 0.58 * Math.abs(Math.cos(2.5 * a)) ** 2) ? c(46, 0.85, 0.92) : c(48, 0.5, 1.02);
    }
    case "border":
      return (x + y) % 108 < 44 ? c(160, 0.5, 0.92) : whiteOf(l);
    case "checker": {
      const on = (Math.floor(x / 72) + Math.floor(y / 72)) % 2 === 0;
      return on ? c(225, 0.4, 0.86) : whiteOf(l);
    }
    case "wave":
      return (y + 12 * Math.sin(x / 16) + 400) % 76 < 30 ? c(200, 0.62, 0.93) : whiteOf(l);
    case "diamond": {
      const [u, v] = cell(100);
      return Math.abs(u) + Math.abs(v) < 50 ? c(280, 0.45, 0.92) : whiteOf(l);
    }
    case "leaves": {
      const [u, v] = cell(110);
      const p = (u + v) / 1.414;
      const q = (u - v) / 1.414;
      return (p / 20) ** 2 + (q / 8) ** 2 < 1 ? c(125, 0.45, 0.88) : c(60, 0.45, 1.02);
    }
    case "rainbowdots": {
      const m = mottle(x, y, 76, 9, 15, 4);
      return m && m.u * m.u + m.v * m.v < m.r * m.r ? c((m.k * 7) % 360, 0.65, 0.92) : whiteOf(l);
    }
    case "watercolor": {
      const a = Math.sin(x * 0.045 + Math.sin(y * 0.03) * 2);
      const b = Math.sin(y * 0.05 + Math.sin(x * 0.025) * 2);
      return c(100 + 35 * a + 28 * b, 0.5, 0.97);
    }
    default:
      return whiteOf(l);
  }
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
        const part = { count: 0, sumL: 0, minX: width, minY: height };
        let top = 0;
        stack[top++] = start;
        label[start] = id;
        while (top > 0) {
          const i = stack[--top];
          part.count += 1;
          part.sumL += (Math.max(px[i * 4], px[i * 4 + 1], px[i * 4 + 2]) + Math.min(px[i * 4], px[i * 4 + 1], px[i * 4 + 2])) / 510;
          const x = i % width;
          part.minX = Math.min(part.minX, x);
          part.minY = Math.min(part.minY, Math.floor(i / width));
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
        // もよう系は、線で区切られた部分ごとに、はじめから並べる(黒線をまたいで、もようがつながらない)
        const own = color.pat || color.dots || color.sakura ? parts[id - 1] : null;
        const [r, g, b] = shade(color, h, s, s, l, i % width - (own?.minX ?? 0), Math.floor(i / width) - (own?.minY ?? 0), width, height);
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
