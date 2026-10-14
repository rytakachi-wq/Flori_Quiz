// BGM と効果音。大きさは、設定で変えられる(端末内に保存。個人情報ではない)。
// ブラウザの決まりで、画面を1回さわるまでは、音を出せない。
//
// BGMは、このゲームのために作ったオリジナルの曲を、ブラウザの中で演奏する(music.js)。曲のファイルはない。

import { MusicPlayer } from "./music.js";

const BASE = "../assets/audio/";
const SETTINGS_KEY = "floriQuiz.settings.v2";

// 場面ごとのBGM(曲の名前は、music.js の TRACKS)。
// 場面:cover(表紙・成績・設定)、question(ふつうの問題)、hard(難しいモード)、versus(みんなで対戦)、
//      relax(リラックス)、oni(オニ問題)、result(結果)
const BGM = {
  cover: "cover",
  question: "study",
  hard: "deep",
  versus: "versus",
  relax: "relax",
  oni: "oni",
  result: "result",
};

// 効果音(ファイル)。boost は、小さい音をもち上げる倍率(ピークが 0 dB をこえない範囲)。
const SE = {
  button: { file: "se-button.mp3", boost: 2.4 }, // ボタンをおしたとき
  correct: { file: "se-chime.mp3", boost: 1 }, // せいかい
  wrong: { file: "se-wrong.mp3", boost: 2.4 }, // ふせいかい
};

const DEFAULTS = { bgm: 0.7, se: 0.8 };
const volumes = { ...DEFAULTS };

function clamp(value) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null;
}

// つまみの位置(0〜1)を、実際の音量にする。耳に聞こえる大きさは、音量の「倍率」ではなく
// 「デシベル」で感じるので、つまみ0〜1を、-30 dB〜0 dB に、均等にわりあてる。
// (そのまま音量にすると、つまみの下のほうは聞こえず、上のほうは急に大きくなる)
export function curve(position) {
  return position <= 0 ? 0 : 10 ** ((-30 * (1 - position)) / 20);
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

let scene = null;
let unlocked = false;
let context = null;
let music = null;
const buffers = {};

function applyBgm() {
  if (!music) return;
  music.setVolume(curve(volumes.bgm)); // 0のときも止めずに、音量だけを0にする
  music.play(BGM[scene] ?? null);
}

// 場面が変わったら、その場面のBGMにする。
export function setScene(name) {
  scene = name;
  applyBgm();
}

// 音を出す準備。画面をさわったときに、1回だけ行う(ブラウザの決まり)。
// 効果音は、小さい音をもち上げるため、WebAudio で鳴らす(使えないときは、ふつうの再生)。
async function prepare() {
  if (context || !window.AudioContext) return;
  try {
    context = new AudioContext();
    music = new MusicPlayer(context);
    applyBgm();
    await Promise.all(
      Object.entries(SE).map(async ([name, { file }]) => {
        const data = await (await fetch(BASE + file)).arrayBuffer();
        buffers[name] = await context.decodeAudioData(data);
      }),
    );
  } catch (error) {
    console.warn("音の準備に失敗しました:", error.name);
  }
}

// 画面をさわるたびに呼ぶ。はじめてさわったときから、音が出せる。
// ブラウザに止められていたときは、ここで動かしなおす。
export function unlock() {
  unlocked = true;
  if (!context) prepare();
  else if (context.state === "suspended") context.resume();
}

export function playSe(name) {
  const se = SE[name];
  if (!se || volumes.se === 0) return;
  const level = curve(volumes.se) * se.boost;
  if (context && buffers[name] && context.state === "running") {
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffers[name];
    gain.gain.value = level;
    source.connect(gain).connect(context.destination);
    source.start();
    return;
  }
  if (!unlocked) return;
  const sound = new Audio(BASE + se.file);
  sound.volume = Math.min(1, level);
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
