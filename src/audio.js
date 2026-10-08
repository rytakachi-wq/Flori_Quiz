// BGM と効果音。大きさは、せっていで変えられる(端末内に保存。個人情報ではない)。
// ブラウザの決まりで、画面を1回さわるまでは、音を出せない。

const BASE = "../assets/audio/";
const SETTINGS_KEY = "floriQuiz.settings.v2";

// 場面ごとのBGM。音楽を変えるときは、ここのファイル名を変える。
// 場面:cover(表紙・せいせき・せってい)、question(ふつうの問題)、oni(オニ問題)、result(結果)
const BGM = {
  cover: "bgm-swan-lake.mp3",
  question: "bgm-ticketless.mp3",
  oni: "bgm-slime-time.mp3",
  result: "bgm-swan-lake.mp3",
};

// 曲ごとの音の大きさをそろえる。元の曲は、どれも大きく作ってあり、曲によって差もある。
// 平均の大きさ(-10.8〜-13.5 dB)を、つまみ100のとき -16 dB にそろえた値。
// ファイルを入れかえたら、この値も測りなおす。
const BGM_GAIN = {
  "bgm-swan-lake.mp3": 0.75,
  "bgm-ticketless.mp3": 0.55,
  "bgm-slime-time.mp3": 0.71,
};

// 効果音。boost は、小さい音をもち上げる倍率(ピークが 0 dB をこえない範囲)。
const SE = {
  button: { file: "se-button.mp3", boost: 1.7 }, // ボタンをおしたとき
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

const bgm = new Audio();
bgm.loop = true;
bgm.preload = "none";

let scene = null;
let unlocked = false;
let currentFile = "";

function applyBgm() {
  const file = BGM[scene];
  if (!file) {
    bgm.pause();
    return;
  }
  // 0のときも止めずに、音量だけを0にする(止めると、つまみを動かすたびに止めたり流したりして、流れなくなることがある)
  bgm.volume = curve(volumes.bgm) * (BGM_GAIN[file] ?? 1);
  if (file !== currentFile) {
    currentFile = file;
    bgm.src = BASE + file; // 同じ曲のままなら、つづきから流す
  }
  if (unlocked && bgm.paused) {
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

// 効果音は、小さい音をもち上げるため、WebAudio で鳴らす(使えないときは、ふつうの再生)。
let context = null;
const buffers = {};

async function prepareSe() {
  if (context || !window.AudioContext) return;
  try {
    context = new AudioContext();
    await Promise.all(
      Object.entries(SE).map(async ([name, { file }]) => {
        const data = await (await fetch(BASE + file)).arrayBuffer();
        buffers[name] = await context.decodeAudioData(data);
      }),
    );
  } catch (error) {
    console.warn("効果音の準備に失敗しました:", error.name);
  }
}

// 画面をさわるたびに呼ぶ。はじめてさわったときから、音が出せる。
// BGMが止まっているときは、ここで流しなおす(ブラウザに止められていた場合など)。
export function unlock() {
  unlocked = true;
  if (!context) prepareSe();
  else if (context.state === "suspended") context.resume();
  applyBgm();
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
