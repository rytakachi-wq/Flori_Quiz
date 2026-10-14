// ふりがな。画面に出る文字の、漢字の上に、読みをつける。
// 設定(すべての漢字 / 中学以降の漢字だけ / なし)は、端末内に保存する。
//
// しくみ:画面に文字が出るたびに(MutationObserver)、漢字をふくむ文字を <span class="rb"> に包んで、
// 辞書(furigana-data.js)の読みで <ruby> をつける。設定が変わったら、包んだ文字を作りなおす。
// 辞書にない漢字は、ふりがながつかない(開発用の確認で、画面の文字は全部当てはまることを確かめてある)。

import { ENTRIES, KYOIKU } from "./furigana-data.js";

const STORAGE_KEY = "floriQuiz.furigana";
export const MODES = ["all", "chu", "none"]; // all=すべての漢字 / chu=中学以降に習う漢字だけ / none=なし
const HOST_CLASS = "rb";

const KANJI = /[一-鿿々〆]/;
const kyoiku = new Set(KYOIKU);

// ---- 辞書 ----
// 辞書の1行(例「上{あ}がる」)を、[[文字, 読み or null], ...] に分ける。
function parseEntry(entry) {
  const segs = [];
  let plain = "";
  let key = "";
  let i = 0;
  const flush = () => {
    if (plain) segs.push([plain, null]);
    plain = "";
  };
  while (i < entry.length) {
    if (KANJI.test(entry[i])) {
      let j = i;
      while (j < entry.length && KANJI.test(entry[j])) j += 1;
      const run = entry.slice(i, j);
      if (entry[j] === "{") {
        const end = entry.indexOf("}", j);
        flush();
        segs.push([run, entry.slice(j + 1, end)]);
        key += run;
        i = end + 1;
      } else {
        plain += run;
        key += run;
        i = j;
      }
    } else {
      plain += entry[i];
      key += entry[i];
      i += 1;
    }
  }
  flush();
  return { key, segs };
}

const lexicon = new Map();
let maxKeyLength = 1;
for (const entry of ENTRIES) {
  const { key, segs } = parseEntry(entry);
  lexicon.set(key, segs);
  maxKeyLength = Math.max(maxKeyLength, key.length);
}

function longestMatch(text, i) {
  for (let len = Math.min(maxKeyLength, text.length - i); len >= 1; len -= 1) {
    const found = lexicon.get(text.slice(i, i + len));
    if (found) return { length: len, segs: found };
  }
  return null;
}

// ---- 数字といっしょの数え方(3本、24分、7日 など)----
const SPECIAL_DAYS = {
  1: "いちにち", 2: "ふつか", 3: "みっか", 4: "よっか", 5: "いつか", 6: "むいか", 7: "なのか", 8: "ようか",
  9: "ここのか", 10: "とおか", 14: "じゅうよっか", 20: "はつか", 24: "にじゅうよっか",
};
const PLAIN_COUNTERS = { 回: "かい", 個: "こ", 点: "てん", 問: "もん", 枚: "まい", 秒: "びょう", 度: "ど", 円: "えん", 年: "ねん", 月: "がつ", 時: "じ", 番: "ばん", 倍: "ばい", 滴: "てき" };

// 「ほん・ぽん・ぼん」のように、数字で読みが変わる数え方
function soundChange(digits, [normal, p, b]) {
  const last = Number(digits.slice(-1));
  if ([1, 6, 8, 0].includes(last)) return p;
  if (last === 3) return b;
  return normal;
}

function counterSegs(digits, counter, following = "") {
  const n = Number(digits);
  if (counter === "人") {
    if (n === 1) return [[`${digits}人`, "ひとり"]];
    if (n === 2) return [[`${digits}人`, "ふたり"]];
    if (n === 4) return [[`${digits}人`, "よにん"]];
    return [[digits, null], ["人", "にん"]];
  }
  if (counter === "本") return [[digits, null], ["本", soundChange(digits, ["ほん", "ぽん", "ぼん"])]];
  if (counter === "匹") return [[digits, null], ["匹", soundChange(digits, ["ひき", "ぴき", "びき"])]];
  if (counter === "分") {
    // 「3分の2」(分数)は「ぶん」。「3分の人」(時間)は「ふん・ぷん」
    if (/^の[0-9]/.test(following)) return [[digits, null], ["分", "ぶん"]];
    const last = Number(digits.slice(-1));
    return [[digits, null], ["分", [1, 3, 4, 6, 8, 0].includes(last) ? "ぷん" : "ふん"]];
  }
  if (counter === "日") {
    return SPECIAL_DAYS[n] ? [[`${digits}日`, SPECIAL_DAYS[n]]] : [[digits, null], ["日", "にち"]];
  }
  if (PLAIN_COUNTERS[counter]) return [[digits, null], [counter, PLAIN_COUNTERS[counter]]];
  return null;
}

// text の i 番目から、辞書か数え方に当てはまる部分を探す。
function matchAt(text, i) {
  const digits = /^[0-9]+/.exec(text.slice(i));
  if (digits) {
    const after = i + digits[0].length;
    const counter = text[after];
    const next = counter ? longestMatch(text, after) : null;
    // 数字のあとに、辞書の長い語(例:「円玉」「番目」「分の」)があれば、そちらを使う
    if (counter && !(next && next.length > 1)) {
      const segs = counterSegs(digits[0], counter, text.slice(after + 1, after + 3));
      if (segs) return { length: digits[0].length + 1, segs };
    }
    return null;
  }
  return longestMatch(text, i);
}

const hasUpperKanji = (text) => [...text].some((c) => KANJI.test(c) && !kyoiku.has(c));

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 文字を、[{ text, reading }] に分ける(読みは、ルビをつける部分だけ)。確認用にも使う。
export function segments(text) {
  const out = [];
  const push = (t, reading) => {
    const last = out[out.length - 1];
    if (!reading && last && !last.reading) last.text += t;
    else out.push({ text: t, reading: reading || null });
  };
  let i = 0;
  while (i < text.length) {
    const found = matchAt(text, i);
    if (found) {
      for (const [t, reading] of found.segs) push(t, reading);
      i += found.length;
    } else {
      push(text[i], null);
      i += 1;
    }
  }
  return out;
}

// 設定(mode)に合わせた、ルビつきの HTML
// 読み上げ用:漢字を、辞書の読み(ふりがな)に置きかえた文。辞書にない漢字は、そのまま。
export function readingOf(text) {
  return segments(text)
    .map(({ text: t, reading }) => reading || t)
    .join("");
}

export function rubyHtml(text, mode) {
  if (mode === "none") return escapeHtml(text);
  return segments(text)
    .map(({ text: t, reading }) => {
      const show = reading && (mode === "all" || hasUpperKanji(t));
      return show ? `<ruby>${escapeHtml(t)}<rp>(</rp><rt>${reading}</rt><rp>)</rp></ruby>` : escapeHtml(t);
    })
    .join("");
}

// ---- 設定 ----
let mode = "all";
try {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (MODES.includes(saved)) mode = saved;
} catch {
  // 読めなければ、はじめの設定(すべての漢字)にする。
}

export function getFuriganaMode() {
  return mode;
}

export function setFuriganaMode(next) {
  if (!MODES.includes(next)) return;
  mode = next;
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // 保存できなくても、そのページを開いている間は、かわった設定のまま。
  }
  for (const host of document.querySelectorAll(`.${HOST_CLASS}`)) render(host);
}

// ---- 画面の文字に、ふりがなをつける ----
const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEXTAREA", "INPUT", "TITLE", "RT", "RP"]);

function render(host) {
  host.innerHTML = rubyHtml(host.dataset.plain, mode);
}

function hostify(node) {
  const parent = node.parentElement;
  if (!parent || SKIP_TAGS.has(parent.tagName) || parent.closest(`.${HOST_CLASS}, [data-no-ruby]`)) return;
  if (!KANJI.test(node.nodeValue)) return;
  const host = document.createElement("span");
  host.className = HOST_CLASS;
  host.dataset.plain = node.nodeValue;
  render(host);
  node.replaceWith(host);
}

function scan(root) {
  if (root.nodeType === Node.TEXT_NODE) {
    hostify(root);
  } else if (root.nodeType === Node.ELEMENT_NODE && !root.classList.contains(HOST_CLASS)) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(hostify);
  }
}

export function startFurigana(root = document.body) {
  scan(root);
  new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") hostify(mutation.target);
      else mutation.addedNodes.forEach(scan);
    }
  }).observe(root, { childList: true, subtree: true, characterData: true });
}

// 画面に出ている、もとの文字(ルビの読みをのぞいた文字)を取り出す。テストや確認用。
export function plainText(element) {
  const copy = element.cloneNode(true);
  copy.querySelectorAll(".rb").forEach((host) => host.replaceWith(host.dataset.plain));
  return copy.textContent;
}
