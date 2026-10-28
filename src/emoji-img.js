// 絵文字を、ChatGPT で作った絵(assets/illust/*.webp)に置きかえる。
// ・画面の文字の中の絵文字は、ここで自動で絵にかわる(MutationObserver)。新しく文字を入れても、同じ。
// ・問題のイラストの HTML 文字列は、emojiHtml() で、絵のタグにする。
// ・対応表にない絵文字(↕ など)は、そのまま文字で出る。
// ・絵は assets/illust/ にあり、tools/illust/export.py でシートから切り出したもの。

export const IMG_BASE = "../assets/illust/";

// 絵文字(異体字セレクタ U+FE0F をのぞいた形) → 絵の名前
const MAP = {
  // 顔・人
  "😀": "face_laugh", "🙂": "face_smile", "😊": "face_beam", "😌": "face_relief", "🤔": "face_think",
  "😇": "face_angel", "😈": "face_devil", "😎": "face_cool", "🤗": "face_hug", "🗣": "face_talk", "🤷": "shrug",
  "🧑": "kid", "🧍": "stand_base", "👶": "baby", "👴": "grandpa", "🧑‍🏫": "teacher", "🧑‍💼": "businessman",
  "👥": "duo", "👤": "person_icon", "🚶": "walk_a", "🏃": "run_1", "🏃‍♀": "run_2", "🏃‍♂": "run_3",
  // 天気・自然・場所
  "☁": "cloud", "🌤": "sun_cloud", "🌧": "rain_cloud", "☔": "umbrella", "🌈": "rainbow", "💨": "wind",
  "❄": "snowflake", "⛄": "snowman", "🌙": "moon", "☀": "sun", "✨": "sparkle", "🔥": "fire", "🕯": "candle",
  "♨": "steam", "🌱": "sprout", "🌿": "branch", "🌳": "tree", "🍂": "leaves", "⛰": "mountain", "🗻": "fuji",
  "🏞": "river", "🏜": "desert", "🏝": "island", "🌉": "bridge", "🏙": "city", "⛩": "torii", "🏯": "castle",
  "🐚": "shell", "🗾": "japan", "🌐": "earth", "🌏": "globe", "💧": "drop", "🌊": "wave",
  // 動物
  "🐱": "cat", "🐭": "mouse", "🐸": "frog", "🐺": "wolf", "🐐": "goat", "🦂": "scorpion", "🐉": "dragon", "🐾": "paws",
  "🐣": "hatch", "🐥": "chick", "🐦": "bird", "🦊": "fox", "🐬": "dolphin", "🦉": "owl", "🦄": "unicorn", "🥚": "egg",
  // 食べ物・もの
  "🥬": "cabbage", "🍎": "apple", "🍊": "orange", "🍬": "candy", "🍙": "onigiri", "🍵": "tea", "🥞": "pancake",
  "🎂": "cake", "🥛": "glass", "🥤": "drink", "🧊": "ice", "🍲": "pot", "🧂": "salt", "🥢": "chopsticks", "🍽": "plate",
  "🛍": "bag", "🎁": "gift", "📦": "box", "🧵": "yarn", "✂": "scissors", "🪣": "bucket", "🚰": "faucet", "🔋": "battery",
  "💡": "bulb", "🤝": "handshake", "☝": "finger_up", "💪": "muscle", "👀": "eyes2", "👁": "eye1", "💬": "bubble",
  "💦": "sweat", "🎭": "masks", "🎉": "popper", "🏁": "flag", "🥇": "gold", "🥈": "silver", "🛶": "boat",
  // 時計・道具
  "🕓": "clock_450", "🕙": "clock_1020", "🕑": "clock_230", "🕛": "clock_12", "⏰": "alarm", "⏱": "stopwatch",
  "⏳": "hourglass", "📅": "daycal", "🗓": "monthcal", "🔔": "bell", "🪞": "mirror", "🔦": "flashlight",
  "🧲": "magnet", "🔩": "bolt", "📐": "triset", "📏": "ruler", "⚖": "balance", "🌡": "thermo", "🧭": "compass",
  "🗺": "map", "📜": "scroll", "📖": "book", "📓": "notebook", "🖊": "pen", "✏": "pencil", "📄": "paper",
  "🩹": "bandage", "🏷": "pricetag", "💴": "money", "🪙": "coin", "🗳": "ballot", "🚪": "door", "🚦": "signal",
  "🃏": "card", "🧩": "puzzle", "🎲": "dice", "⚂": "dice3", "🔍": "magnifier",
  // 記号
  "🚫": "forbid", "❓": "question", "➡": "arrow_r", "⬆": "arrow_u", "⬇": "arrow_d", "⏩": "ff", "⏪": "rew",
  "↩": "back", "🔁": "repeat", "🔄": "rotate", "〰": "wavy", "🔺": "triangle_red", "🔢": "blocks123",
  "🔤": "blocks_aiu", "6⃣": "six", "➕": "plus", "✖": "times", "➗": "divide", "◻": "matchsq",
  "▶": "tri_r", "◀": "tri_l", "✅": "checkbox", "✔": "check", "⭕": "circle_red", "❌": "cross_red",
  "👆": "hand_push", "👉": "hand_point", "★": "star_fill", "☆": "star_line", "⭐": "star_fill", "🌟": "shine",
  // 画面
  "🎯": "target", "⚙": "gear", "🏠": "house", "📋": "clipboard", "📚": "books", "👑": "crown", "🏆": "trophy",
  "🎬": "clapper", "🎮": "gamepad", "🎨": "palette", "🎩": "tophat", "🎒": "backpack", "🖼": "frame",
  "🔊": "speaker", "🥁": "drum", "🏅": "medal", "🔬": "microscope", "⚗": "flask", "👹": "oni", "💎": "diamond",
  "🔒": "key", "💮": "hanamaru.svg", "💾": "floppy", "🆕": "newtag", "🎈": "balloon", "🎊": "popper2", "💖": "heart",
  "🍀": "clover", "🎀": "ribbon", "🎵": "note", "🦋": "butterfly", "🌸": "sakura",
};

// 絵文字1つ分(異体字・つなぎ・数字+枠)をひろう
const EMOJI_RE = /(?:[0-9]️?⃣)|(?:(?:\p{Extended_Pictographic}|[★☆])️?(?:‍\p{Extended_Pictographic}️?)*)/gu;

function slugOf(seq) {
  const key = seq.replace(/️/g, "");
  if (MAP[key]) return MAP[key];
  const first = [...key][0]; // つなぎ(ZWJ)でつながった形は、先頭の絵で代用
  return MAP[first] ?? null;
}

const SRC_CACHE = new Map();
const srcOf = (slug) => IMG_BASE + (slug.includes(".") ? slug : slug + ".webp"); // 名前に「.」があれば、そのままのファイル名(hanamaru.svg など)

export function imgHtml(slug, cls = "") {
  return `<img class="emi ${cls}" src="${srcOf(slug)}" alt="" draggable="false">`;
}

// HTML(文字列)の、タグの外にある絵文字を、絵のタグにする
export function emojiHtml(html) {
  return html.replace(/(<[^>]*>)|([^<]+)/g, (m, tag, text) => {
    if (tag) return tag;
    return text.replace(EMOJI_RE, (seq) => {
      const slug = slugOf(seq);
      return slug ? imgHtml(slug) : seq;
    });
  });
}

function makeImg(slug, seq) {
  const img = document.createElement("img");
  img.className = "emi";
  img.src = srcOf(slug);
  img.alt = "";
  img.draggable = false;
  img.loading = "lazy"; // 見えない画面の絵は、はじめに読みこまない(起動を軽く)
  img.dataset.e = seq;
  return img;
}

function convertText(node) {
  const text = node.nodeValue;
  if (!text || !EMOJI_RE.test(text)) { EMOJI_RE.lastIndex = 0; return; }
  EMOJI_RE.lastIndex = 0;
  const frag = document.createDocumentFragment();
  let last = 0;
  let changed = false;
  for (const m of text.matchAll(EMOJI_RE)) {
    const slug = slugOf(m[0]);
    if (!slug) continue;
    if (m.index > last) frag.appendChild(document.createTextNode(text.slice(last, m.index)));
    frag.appendChild(makeImg(slug, m[0]));
    last = m.index + m[0].length;
    changed = true;
  }
  if (!changed) return;
  if (last < text.length) frag.appendChild(document.createTextNode(text.slice(last)));
  node.replaceWith(frag);
}

const SKIP = new Set(["SCRIPT", "STYLE", "TEXTAREA", "TITLE", "NOSCRIPT"]);

function convertTree(root) {
  if (root.nodeType === Node.TEXT_NODE) return convertText(root);
  if (root.nodeType !== Node.ELEMENT_NODE || SKIP.has(root.tagName)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (SKIP.has(n.parentNode?.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(convertText);
}

function start() {
  convertTree(document.body);
  new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") convertText(r.target);
      else r.addedNodes.forEach(convertTree);
    }
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}

if (typeof document !== "undefined") {
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start, { once: true });
}
