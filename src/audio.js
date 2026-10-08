// BGM と効果音。大きさは、せっていで変えられる(端末内に保存。個人情報ではない)。
// ブラウザの決まりで、画面を1回さわるまでは、音を出せない。

const BASE = "../assets/audio/";
const SETTINGS_KEY = "floriQuiz.settings";

// 場面ごとのBGM。音楽を変えるときは、ここのファイル名を変える。
// 場面:cover(表紙・せいせき・せってい)、question(ふつうの問題)、oni(オニ問題)、result(結果)
const BGM = {
  cover: "bgm-swan-lake.mp3",
  question: "bgm-ticketless.mp3",
  oni: "bgm-slime-time.mp3",
  result: "bgm-swan-lake.mp3",
};

// 効果音
const SE = {
  button: "se-button.mp3", // ボタンをおしたとき
  correct: "se-chime.mp3", // せいかい
  wrong: "se-wrong.mp3", // ふせいかい
};

const DEFAULTS = { bgm: 0.5, se: 0.7 };
const volumes = { ...DEFAULTS };

function clamp(value) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
}

try {
  const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}");
  for (const kind of Object.keys(DEFAULTS)) {
    const value = clamp(saved[kind]);
    if (value !== null) volumes[kind] = value;
  }
} catch {
  // 読めなければ、はじめの大きさにする。
}

const bgm = new Audio();
bgm.loop = true;
bgm.preload = "none";

let scene = null;
let unlocked = false;
let currentFile = "";

function applyBgm() {
  bgm.volume = volumes.bgm;
  const file = BGM[scene];
  if (!file || volumes.bgm === 0) {
    bgm.pause();
    return;
  }
  if (file !== currentFile) {
    currentFile = file;
    bgm.src = BASE + file; // 同じ曲のままなら、つづきから流す
  }
  if (unlocked) {
    bgm.play().catch((error) => {
      // ブラウザに止められたときは、次に画面をさわったときに、もう一度ためす。
      console.warn("BGMを流せませんでした:", error.name);
    });
  }
}

// 場面が変わったら、その場面のBGMにする。
export function setScene(name) {
  scene = name;
  applyBgm();
}

// 画面をさわるたびに呼ぶ。はじめてさわったときから、音が出せる。
// BGMが止まっているときは、ここで流しなおす(ブラウザに止められていた場合など)。
export function unlock() {
  unlocked = true;
  if (bgm.paused) applyBgm();
}

export function playSe(name) {
  const file = SE[name];
  if (!file || volumes.se === 0) return;
  const sound = new Audio(BASE + file);
  sound.volume = volumes.se;
  sound.play().catch(() => {});
}

export function getVolume(kind) {
  return volumes[kind];
}

export function setVolume(kind, value) {
  const next = clamp(value);
  if (next === null || !(kind in volumes)) return;
  volumes[kind] = next;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(volumes));
  } catch {
    // 保存できなくても、そのページを開いている間は、かわった大きさのまま。
  }
  if (kind === "bgm") applyBgm();
}
