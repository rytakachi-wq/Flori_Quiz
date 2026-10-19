// BGM と効果音。大きさは、設定で変えられる(端末内に保存。個人情報ではない)。
// ブラウザの決まりで、画面を1回さわるまでは、音を出せない。
//
// BGMは、このゲームのために作ったオリジナルの曲を、ブラウザの中で演奏する(music.js)。曲のファイルはない。

import { MusicPlayer, jingleSeconds } from "./music.js";

const BASE = "../assets/audio/";
const SETTINGS_KEY = "floriQuiz.settings.v2";

// 場面ごとのBGM(曲の名前は、music.js の TRACKS)。
// 場面:cover(表紙・成績・設定)、question(ふつうの問題)、hard(難しいモード)、versus(みんなで対戦)、
//      relax(リラックス)、oni(オニ問題)、result(結果)、tutorial(遊び方)
const BGM = {
  cover: "study",
  question: "cover",
  hard: "deep",
  timed: "deep",
  versus: "versus",
  relax: "relax",
  oni: "oni",
  result: "result",
  tutorial: "tutorial",
};

// 効果音(ファイル)。boost は、小さい音をもち上げる倍率(ピークが 0 dB をこえない範囲)。
const SE = {
  button: { file: "se-button.mp3", boost: 2.4 }, // ボタンをおしたとき
  correct: { file: "se-chime.mp3", boost: 1 }, // せいかい
  wrong: { file: "se-wrong.mp3", boost: 2.4 }, // ふせいかい
  whistle: { file: "se-whistle.mp3", boost: 1 }, // 時間切れ
  tick: { file: "se-tick.mp3", boost: 1 }, // 制限時間のあいだ(くり返す)
  timerFast: { file: "se-timer-fast.mp3", boost: 1 }, // 制限時間の、のこり5秒(くり返す)
  levelup: { file: "se-levelup.mp3", boost: 1 }, // 難しくなった・ご褒美をもらった
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

// 開発中(自分のパソコンで動かしているとき)は、音を出さない。音を聞きたいときは、アドレスの最後に「?sound」をつける。
if (["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) && !location.search.includes("sound")) {
  for (const kind of Object.keys(DEFAULTS)) volumes[kind] = 0;
}

let scene = null;
let unlocked = false;
let context = null;
let music = null;
const buffers = {};

let holding = false; // 短い曲(オープニングなど)を鳴らしている間は、BGMを始めない

function applyBgm() {
  if (!music) return;
  music.setVolume(curve(volumes.bgm)); // 0のときも止めずに、音量だけを0にする
  music.play(holding ? null : (BGM[scene] ?? null));
}

// 短い曲(オープニング、スタート、結果発表の前)を鳴らす。鳴り終わるまで、BGMは止める。長さ(ミリ秒)を返す。
export function playJingle(name) {
  if (!music || !context) return 0;
  const seconds = jingleSeconds(name);
  if (seconds === 0) return 0;
  holding = true;
  applyBgm();
  // 音を出す準備が、まだ終わっていないとき(「止まっている」状態)は、動きだしてから鳴らす(鳴らずにおわるのを、防ぐ)
  if (context.state === "running") music.jingle(name);
  else context.resume().then(() => music.jingle(name)).catch(() => {});
  setTimeout(() => {
    holding = false;
    applyBgm();
  }, seconds * 1000);
  return seconds * 1000;
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
        try {
          const data = await (await fetch(BASE + file)).arrayBuffer();
          buffers[name] = await context.decodeAudioData(data);
        } catch (error) {
          console.warn("音の読みこみに失敗しました:", file); // 1つ失敗しても、ほかの音は鳴らす
        }
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

// ゲームの画面を見ていないとき(ほかのタブや、ほかのアプリを見ているとき)は、音を止める。もどったら、つづきから。
document.addEventListener("visibilitychange", () => {
  if (!context) return;
  if (document.hidden) context.suspend().catch(() => {});
  else if (unlocked) context.resume().catch(() => {});
});

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

// くり返す音(制限時間のカチカチ)。止めるときは、stopLoop()
let loop = null;
export function startLoop(name) {
  stopLoop();
  const se = SE[name];
  if (!se || volumes.se === 0 || !context || !buffers[name] || context.state !== "running") return;
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffers[name];
  source.loop = true;
  gain.gain.value = curve(volumes.se) * se.boost * 0.6;
  source.connect(gain).connect(context.destination);
  source.start();
  loop = { source, name };
}
export function stopLoop() {
  if (!loop) return;
  try {
    loop.source.stop();
  } catch {
    // もう止まっている
  }
  loop = null;
}
export function loopName() {
  return loop?.name ?? null;
}

export function getVolume(kind) {
  return volumes[kind];
}

// 音の大きさを、はじめの大きさにもどす。
export function resetVolumes() {
  for (const kind of Object.keys(DEFAULTS)) setVolume(kind, DEFAULTS[kind]);
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
