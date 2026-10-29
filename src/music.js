// BGM。このゲームのために作った、オリジナルの曲を、ブラウザの中で演奏する(WebAudio)。
// 曲のファイルがないので、利用許諾の問題がなく、クレジットも要らない。
//
// 曲の作り方:1曲は、16小節のループ(前の8小節=A、後ろの8小節=B)。小節ごとに、コード(和音)と、メロディ(lead)を書く。
//   時間は「ステップ」で数える(1小節=16ステップ。4ステップ=1拍)。
//   メロディは [ステップ, 音, 長さ(ステップ)]、音は "C5" のように書く。
//   曲ごとに、メロディの音色(voice)、ベースの弾きかた(bass)、ドラムを変えて、聞きわけられるようにしている。
// 新しい曲を足すときは、TRACKS に1つ足して、audio.js の BGM に、場面と曲名を書く。
// 短い効果の曲(オープニングなど)は、JINGLES に書く。

const SEMITONE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

// "C#4" → MIDI番号(C4=60)
export function midi(name) {
  const m = /^([A-G])([#b]?)(-?\d)$/.exec(name);
  if (!m) throw new Error(`音の名前がおかしい: ${name}`);
  return 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + (m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0);
}

const freq = (note) => 440 * 2 ** ((midi(note) - 69) / 12);

// コード名 → 和音の音(低い音から)
const CHORDS = {
  C: ["C3", "E3", "G3"],
  Am: ["A2", "C3", "E3"],
  F: ["F2", "A2", "C3"],
  G: ["G2", "B2", "D3"],
  Em: ["E3", "G3", "B3"],
  Dm: ["D3", "F3", "A3"],
  Gm: ["G2", "Bb2", "D3"],
  Bb: ["Bb2", "D3", "F3"],
  A: ["A2", "C#3", "E3"],
  Gmaj7: ["G3", "B3", "D4", "F#4"],
  Em7: ["E3", "G3", "B3", "D4"],
  Cmaj7: ["C3", "E3", "G3", "B3"],
  D: ["D3", "F#3", "A3"],
  Am7: ["A2", "C3", "E3", "G3"],
  Fmaj7: ["F2", "A2", "C3", "E3"],
  Dm7: ["D3", "F3", "A3", "C4"],
  G7: ["G2", "B2", "D3", "F3"],
  E7: ["E3", "G#3", "B3", "D4"],
  B7: ["B2", "D#3", "F#3", "A3"],
  D7: ["D3", "F#3", "A3", "C4"],
};

const shift = (note, semitones) => {
  const m = midi(note) + semitones;
  const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  return `${names[m % 12]}${Math.floor(m / 12) - 1}`;
};

// 8分音符で、コードの音をのぼりくだりする、きらきらしたメロディ(結果発表用)
function sparkle(chord, high = false) {
  const tones = CHORDS[chord].map((n) => shift(n, 24));
  const order = [0, 1, 2, 1, 2, 1, 2, 1];
  return order.map((i, k) => [k * 2, high && i === 2 ? shift(tones[i], 12) : tones[i], 2]);
}

// voice:メロディの音色  bass:ベースの弾きかた  drums/drumsB:ドラム(A・Bの部分)  tick:時計の音
export const TRACKS = {
  // 表紙・成績・設定:明るくて、軽快な曲(ピコピコした音)
  cover: {
    bpm: 112,
    trim: 1.2,
    voice: "square",
    bass: "root",
    pad: 0.03,
    stab: true,
    drums: "k.h.s.h.k.h.s.h.",
    drumsB: "k.hhs.hkk.hhs.hh",
    chords: ["C", "Am", "F", "G", "C", "F", "G", "C", "F", "G", "Em", "Am", "F", "G", "C", "G"],
    lead: [
      [[0, "E5", 4], [4, "G5", 4], [8, "E5", 2], [10, "D5", 2], [12, "C5", 4]],
      [[0, "C5", 4], [4, "E5", 4], [8, "A4", 4], [12, "C5", 4]],
      [[0, "C5", 4], [4, "F5", 4], [8, "E5", 2], [10, "D5", 2], [12, "C5", 4]],
      [[0, "B4", 4], [4, "D5", 4], [8, "G5", 4], [12, "D5", 4]],
      [[0, "E5", 4], [4, "G5", 4], [8, "C6", 4], [12, "G5", 4]],
      [[0, "A5", 4], [4, "F5", 4], [8, "C5", 4], [12, "F5", 4]],
      [[0, "D5", 4], [4, "G5", 4], [8, "B4", 4], [12, "D5", 4]],
      [[0, "C5", 12]],
      [[0, "A5", 4], [4, "C6", 4], [8, "A5", 2], [10, "G5", 2], [12, "F5", 4]],
      [[0, "B5", 4], [4, "D6", 4], [8, "B5", 2], [10, "A5", 2], [12, "G5", 4]],
      [[0, "G5", 4], [4, "B5", 4], [8, "E6", 4], [12, "B5", 4]],
      [[0, "A5", 2], [2, "C6", 2], [4, "E6", 4], [8, "C6", 4], [12, "A5", 4]],
      [[0, "C6", 4], [4, "A5", 4], [8, "F5", 4], [12, "A5", 4]],
      [[0, "D6", 4], [4, "B5", 4], [8, "G5", 4], [12, "B5", 4]],
      [[0, "E6", 4], [4, "C6", 4], [8, "G5", 4], [12, "E5", 4]],
      [[0, "D5", 2], [2, "F5", 2], [4, "G5", 4], [8, "B5", 8]],
    ],
  },

  // ふつうの問題:時計の音と、マリンバのような音で、じっくり考える曲
  study: {
    bpm: 88,
    trim: 1.4,
    voice: "mallet",
    bass: "walk",
    pad: 0.034,
    tick: "beat",
    chords: ["Am7", "Fmaj7", "Cmaj7", "G7", "Am7", "Fmaj7", "Dm7", "E7", "Dm7", "G7", "Cmaj7", "Am7", "Dm7", "G7", "Em7", "E7"],
    lead: [
      [[0, "E5", 3], [4, "A5", 2], [6, "G5", 2], [8, "E5", 4]],
      [[0, "C5", 3], [4, "F5", 2], [6, "E5", 2], [8, "C5", 4]],
      [[0, "E5", 3], [4, "G5", 2], [6, "E5", 2], [8, "D5", 4]],
      [[0, "D5", 3], [4, "F5", 2], [6, "D5", 2], [8, "B4", 4], [12, "D5", 2]],
      [[0, "A4", 3], [4, "C5", 2], [6, "E5", 2], [8, "G5", 4]],
      [[0, "A5", 3], [4, "G5", 2], [6, "F5", 2], [8, "E5", 4]],
      [[0, "D5", 3], [4, "F5", 2], [6, "A5", 2], [8, "G5", 4]],
      [[0, "G#5", 3], [4, "B5", 2], [6, "G#5", 2], [8, "E5", 6]],
      [[0, "F5", 3], [4, "A5", 2], [6, "C6", 2], [8, "A5", 4]],
      [[0, "B5", 3], [4, "D6", 2], [6, "B5", 2], [8, "G5", 4]],
      [[0, "E5", 3], [4, "G5", 2], [6, "B5", 2], [8, "C6", 4]],
      [[0, "E5", 3], [4, "A5", 2], [6, "C6", 2], [8, "B5", 4]],
      [[0, "D5", 2], [2, "F5", 2], [4, "A5", 4], [8, "D6", 4], [12, "C6", 4]],
      [[0, "B5", 2], [2, "G5", 2], [4, "D5", 4], [8, "F5", 4], [12, "G5", 4]],
      [[0, "G5", 3], [4, "B5", 2], [6, "E6", 2], [8, "D6", 4]],
      [[0, "G#5", 2], [2, "B5", 2], [4, "E6", 4], [8, "D6", 2], [10, "B5", 2], [12, "G#5", 4]],
    ],
  },

  // 難しいモード:速い時計の音と、するどい音で、追いつめられるように考える曲
  deep: {
    bpm: 132,
    trim: 1.75,
    voice: "saw",
    bass: "pulse",
    pad: 0.03,
    tick: "eighth",
    chords: ["Em7", "Cmaj7", "Am7", "B7", "Em7", "Cmaj7", "Am7", "B7", "Am7", "D7", "Gmaj7", "Cmaj7", "Am7", "D7", "B7", "B7"],
    lead: [
      [[0, "B4", 4], [4, "E5", 2], [6, "G5", 2], [8, "F#5", 4], [12, "E5", 2], [14, "D5", 2]],
      [[0, "E5", 4], [4, "G5", 2], [6, "B5", 2], [8, "A5", 4], [12, "G5", 4]],
      [[0, "C5", 4], [4, "E5", 2], [6, "A5", 2], [8, "G5", 4], [12, "E5", 4]],
      [[0, "D#5", 4], [4, "F#5", 2], [6, "A5", 2], [8, "B5", 6]],
      [[0, "G5", 4], [4, "F#5", 2], [6, "E5", 2], [8, "B4", 4], [12, "E5", 4]],
      [[0, "G5", 4], [4, "E5", 2], [6, "C5", 2], [8, "B4", 4], [12, "D5", 4]],
      [[0, "A4", 2], [2, "C5", 2], [4, "E5", 4], [8, "A5", 4], [12, "G5", 4]],
      [[0, "F#5", 4], [4, "D#5", 2], [6, "F#5", 2], [8, "B4", 8]],
      [[0, "E5", 2], [2, "A5", 2], [4, "C6", 4], [8, "B5", 2], [10, "A5", 2], [12, "E5", 4]],
      [[0, "F#5", 2], [2, "A5", 2], [4, "D6", 4], [8, "C6", 2], [10, "A5", 2], [12, "F#5", 4]],
      [[0, "D5", 2], [2, "G5", 2], [4, "B5", 4], [8, "F#5", 2], [10, "D5", 2], [12, "B4", 4]],
      [[0, "E5", 2], [2, "G5", 2], [4, "B5", 4], [8, "C6", 4], [12, "G5", 4]],
      [[0, "A5", 2], [2, "C6", 2], [4, "E6", 4], [8, "D6", 2], [10, "C6", 2], [12, "A5", 4]],
      [[0, "A5", 2], [2, "D6", 2], [4, "F#6", 4], [8, "E6", 2], [10, "D6", 2], [12, "A5", 4]],
      [[0, "F#5", 2], [2, "A5", 2], [4, "B5", 4], [8, "D#6", 4], [12, "F#6", 4]],
      [[0, "D#6", 4], [4, "B5", 4], [8, "F#5", 8]],
    ],
  },

  // オニ問題:速くて、のしかかるような、緊迫感のある曲(ニ短調。低い音が、ずっと8分で、つめよってくる)
  oni: {
    bpm: 152,
    trim: 1.3,
    voice: "buzz",
    bass: "drive",
    pad: 0.02,
    stab: true,
    drums: "k.hkk.hkk.hks.hk",
    drumsB: "kkhkk.hkkkhks.hk",
    chords: ["Dm", "Dm", "Bb", "A", "Dm", "Gm", "Bb", "A", "Gm", "Dm", "A", "Dm", "Bb", "C", "A", "A"],
    lead: [
      [[0, "D5", 1], [1, "D5", 1], [2, "F5", 2], [4, "D5", 1], [5, "D5", 1], [6, "A5", 2], [8, "G#5", 2], [10, "A5", 2], [12, "F5", 4]],
      [[0, "D5", 1], [1, "D5", 1], [2, "F5", 2], [4, "A5", 4], [8, "G5", 2], [10, "F5", 2], [12, "E5", 4]],
      [[0, "D5", 1], [1, "D5", 1], [2, "F5", 2], [4, "Bb5", 4], [8, "A5", 2], [10, "F5", 2], [12, "D5", 4]],
      [[0, "C#5", 1], [1, "C#5", 1], [2, "E5", 2], [4, "A5", 4], [8, "G#5", 4], [12, "E5", 4]],
      [[0, "F5", 1], [1, "F5", 1], [2, "A5", 2], [4, "D6", 4], [8, "C#6", 2], [10, "A5", 2], [12, "F5", 4]],
      [[0, "G5", 1], [1, "G5", 1], [2, "Bb5", 2], [4, "D6", 4], [8, "C6", 2], [10, "Bb5", 2], [12, "G5", 4]],
      [[0, "Bb5", 1], [1, "Bb5", 1], [2, "D6", 2], [4, "F6", 4], [8, "E6", 2], [10, "D6", 2], [12, "Bb5", 4]],
      [[0, "C#6", 2], [2, "C#6", 2], [4, "E6", 2], [6, "C#6", 2], [8, "A5", 2], [10, "C#6", 2], [12, "E6", 4]],
      [[0, "G5", 1], [1, "G5", 1], [2, "Bb5", 2], [4, "D6", 4], [8, "Bb5", 2], [10, "G5", 2], [12, "D5", 4]],
      [[0, "A5", 1], [1, "A5", 1], [2, "F5", 2], [4, "D5", 4], [8, "F5", 2], [10, "A5", 2], [12, "D6", 4]],
      [[0, "E5", 1], [1, "E5", 1], [2, "G5", 2], [4, "C#6", 4], [8, "E6", 2], [10, "C#6", 2], [12, "A5", 4]],
      [[0, "D6", 2], [2, "A5", 2], [4, "F5", 2], [6, "A5", 2], [8, "D6", 2], [10, "F6", 2], [12, "A5", 4]],
      [[0, "D6", 1], [1, "D6", 1], [2, "F6", 2], [4, "D6", 4], [8, "Bb5", 4], [12, "F5", 4]],
      [[0, "E6", 1], [1, "E6", 1], [2, "G6", 2], [4, "E6", 4], [8, "C6", 4], [12, "G5", 4]],
      [[0, "C#6", 2], [2, "E6", 2], [4, "A6", 4], [8, "G6", 2], [10, "E6", 2], [12, "C#6", 4]],
      [[0, "A5", 2], [2, "A5", 2], [4, "A5", 2], [6, "A5", 2], [8, "E6", 8]],
    ],
  },

  // みんなで対戦:はずんだリズムの、わくわくする、競争の曲(ブラスのような音)
  // RPGクエスト:ぼうけんに出かける、勇ましい行進曲(二短調。ファンファーレのような金管の音と、行進のドラム)
  quest: {
    bpm: 116,
    trim: 1.25,
    voice: "brass",
    bass: "drive",
    pad: 0.035,
    stab: true,
    drums: "k.hks.hkk.hks.sk",
    drumsB: "kkhks.hkkkhks.ks",
    chords: ["Dm", "Dm", "Bb", "C", "Dm", "Gm", "A", "A", "Bb", "C", "Dm", "Am", "Bb", "F", "A", "A"],
    lead: [
      [[0, "D5", 6], [6, "D5", 2], [8, "F5", 4], [12, "A5", 4]],
      [[0, "G5", 6], [6, "F5", 2], [8, "E5", 4], [12, "D5", 4]],
      [[0, "Bb4", 6], [6, "Bb4", 2], [8, "D5", 4], [12, "F5", 4]],
      [[0, "E5", 6], [6, "D5", 2], [8, "C5", 8]],
      [[0, "D5", 6], [6, "D5", 2], [8, "F5", 4], [12, "A5", 4]],
      [[0, "Bb5", 6], [6, "A5", 2], [8, "G5", 4], [12, "F5", 4]],
      [[0, "E5", 4], [4, "F5", 4], [8, "G5", 4], [12, "A5", 4]],
      [[0, "A5", 8], [8, "C#6", 4], [12, "A5", 4]],
      [[0, "F5", 6], [6, "F5", 2], [8, "Bb5", 4], [12, "A5", 4]],
      [[0, "G5", 6], [6, "G5", 2], [8, "C6", 4], [12, "G5", 4]],
      [[0, "A5", 6], [6, "F5", 2], [8, "D5", 4], [12, "F5", 4]],
      [[0, "E5", 6], [6, "A5", 2], [8, "C6", 4], [12, "A5", 4]],
      [[0, "D6", 6], [6, "C6", 2], [8, "Bb5", 4], [12, "A5", 4]],
      [[0, "C6", 6], [6, "A5", 2], [8, "F5", 4], [12, "A5", 4]],
      [[0, "C#6", 4], [4, "E6", 4], [8, "D6", 4], [12, "C#6", 4]],
      [[0, "A5", 12], [12, "E5", 2], [14, "A5", 2]],
    ],
  },
  // RPGクエストの、ボス戦:速くて、せまってくる曲(ぶるぶるした音と、おし寄せるベース)
  questboss: {
    bpm: 148,
    trim: 1.3,
    voice: "buzz",
    bass: "drive",
    pad: 0.02,
    stab: true,
    drums: "k.hkk.hkk.hks.hk",
    drumsB: "kkhkk.hkkkhks.hk",
    chords: ["Dm", "Bb", "Gm", "A", "Dm", "Bb", "C", "A", "Gm", "Dm", "Bb", "A", "Gm", "Bb", "A", "A"],
    lead: [
      [[0, "D5", 2], [2, "D5", 2], [4, "F5", 2], [6, "A5", 2], [8, "D6", 4], [12, "C6", 2], [14, "A5", 2]],
      [[0, "Bb4", 2], [2, "Bb4", 2], [4, "D5", 2], [6, "F5", 2], [8, "Bb5", 4], [12, "A5", 2], [14, "F5", 2]],
      [[0, "G4", 2], [2, "G4", 2], [4, "Bb4", 2], [6, "D5", 2], [8, "G5", 4], [12, "F5", 2], [14, "D5", 2]],
      [[0, "A4", 2], [2, "C#5", 2], [4, "E5", 2], [6, "A5", 2], [8, "G5", 4], [12, "E5", 2], [14, "C#5", 2]],
      [[0, "D5", 2], [2, "F5", 2], [4, "A5", 2], [6, "D6", 2], [8, "F6", 4], [12, "E6", 2], [14, "D6", 2]],
      [[0, "Bb5", 2], [2, "D6", 2], [4, "F6", 2], [6, "D6", 2], [8, "Bb5", 4], [12, "A5", 2], [14, "F5", 2]],
      [[0, "C5", 2], [2, "E5", 2], [4, "G5", 2], [6, "C6", 2], [8, "E6", 4], [12, "D6", 2], [14, "C6", 2]],
      [[0, "A5", 2], [2, "A5", 2], [4, "C#6", 2], [6, "E6", 2], [8, "A6", 8]],
      [[0, "G5", 4], [4, "Bb5", 4], [8, "D6", 4], [12, "Bb5", 4]],
      [[0, "F5", 4], [4, "A5", 4], [8, "D6", 4], [12, "A5", 4]],
      [[0, "D6", 4], [4, "F6", 4], [8, "D6", 4], [12, "Bb5", 4]],
      [[0, "E6", 4], [4, "C#6", 4], [8, "A5", 4], [12, "E5", 4]],
      [[0, "G5", 2], [2, "G5", 2], [4, "Bb5", 2], [6, "D6", 2], [8, "G6", 4], [12, "F6", 2], [14, "D6", 2]],
      [[0, "Bb5", 2], [2, "Bb5", 2], [4, "D6", 2], [6, "F6", 2], [8, "Bb6", 4], [12, "A6", 2], [14, "F6", 2]],
      [[0, "A5", 2], [2, "C#6", 2], [4, "E6", 2], [6, "A6", 2], [8, "G6", 2], [10, "E6", 2], [12, "C#6", 2], [14, "E6", 2]],
      [[0, "A5", 8], [8, "E5", 2], [10, "A5", 2], [12, "C#6", 4]],
    ],
  },
  versus: {
    bpm: 134,
    trim: 1.25,
    voice: "brass",
    bass: "bounce",
    pad: 0.025,
    stab: true,
    drums: "k.hks.hkk.hks.hk",
    drumsB: "k.h.s.hhk.h.s.hh",
    chords: ["C", "G", "Am", "F", "C", "G", "F", "G", "Am", "Em", "F", "G", "Am", "Em", "F", "G"],
    lead: [
      [[0, "G5", 2], [2, "E5", 2], [4, "G5", 4], [8, "A5", 2], [10, "G5", 2], [12, "E5", 4]],
      [[0, "D5", 2], [2, "G5", 2], [4, "B5", 4], [8, "A5", 2], [10, "G5", 2], [12, "D5", 4]],
      [[0, "E5", 2], [2, "A5", 2], [4, "C6", 4], [8, "B5", 2], [10, "A5", 2], [12, "E5", 4]],
      [[0, "F5", 2], [2, "A5", 2], [4, "C6", 4], [8, "A5", 2], [10, "G5", 2], [12, "F5", 4]],
      [[0, "G5", 2], [2, "C6", 2], [4, "E6", 4], [8, "D6", 2], [10, "C6", 2], [12, "G5", 4]],
      [[0, "B5", 2], [2, "D6", 2], [4, "G6", 4], [8, "F6", 2], [10, "D6", 2], [12, "B5", 4]],
      [[0, "A5", 2], [2, "C6", 2], [4, "F6", 4], [8, "E6", 2], [10, "C6", 2], [12, "A5", 4]],
      [[0, "G5", 2], [2, "B5", 2], [4, "D6", 4], [8, "G5", 8]],
      [[0, "E5", 2], [2, "A5", 2], [4, "C6", 2], [6, "A5", 2], [8, "E6", 4], [12, "C6", 4]],
      [[0, "G5", 2], [2, "B5", 2], [4, "E6", 2], [6, "B5", 2], [8, "G6", 4], [12, "E6", 4]],
      [[0, "A5", 2], [2, "C6", 2], [4, "F6", 2], [6, "C6", 2], [8, "A5", 4], [12, "F5", 4]],
      [[0, "B5", 2], [2, "D6", 2], [4, "G6", 2], [6, "D6", 2], [8, "B5", 4], [12, "G5", 4]],
      [[0, "C6", 2], [2, "E6", 2], [4, "A6", 4], [8, "G6", 2], [10, "E6", 2], [12, "C6", 4]],
      [[0, "B5", 2], [2, "E6", 2], [4, "G6", 4], [8, "D6", 2], [10, "E6", 2], [12, "B5", 4]],
      [[0, "C6", 2], [2, "F6", 2], [4, "A6", 4], [8, "G6", 2], [10, "F6", 2], [12, "C6", 4]],
      [[0, "D6", 2], [2, "G5", 2], [4, "B5", 2], [6, "D6", 2], [8, "G6", 8]],
    ],
  },

  // リラックス(お花畑):ゆっくりで、やさしい曲(フルートのような音と、ベル)
  relax: {
    bpm: 70,
    trim: 0.85,
    voice: "soft",
    bass: "sustain",
    pad: 0.04,
    bells: true,
    chords: ["Gmaj7", "Em7", "Cmaj7", "D", "Gmaj7", "Em7", "Cmaj7", "D", "Cmaj7", "Am7", "D", "Gmaj7", "Cmaj7", "Em7", "D", "D"],
    lead: [
      [[0, "B4", 8], [8, "A4", 4], [12, "G4", 4]],
      [[0, "G4", 8], [8, "B4", 4], [12, "D5", 4]],
      [[0, "E5", 8], [8, "D5", 4], [12, "B4", 4]],
      [[0, "A4", 8], [8, "F#4", 8]],
      [[0, "D5", 8], [8, "B4", 8]],
      [[0, "E5", 8], [8, "D5", 8]],
      [[0, "G5", 8], [8, "E5", 8]],
      [[0, "F#5", 8], [8, "A4", 8]],
      [[0, "E5", 8], [8, "G5", 4], [12, "B5", 4]],
      [[0, "C6", 8], [8, "A5", 4], [12, "E5", 4]],
      [[0, "F#5", 8], [8, "A5", 4], [12, "D6", 4]],
      [[0, "B5", 8], [8, "G5", 8]],
      [[0, "G5", 8], [8, "E5", 8]],
      [[0, "B5", 8], [8, "G5", 4], [12, "E5", 4]],
      [[0, "A5", 8], [8, "F#5", 4], [12, "D5", 4]],
      [[0, "F#5", 14]],
    ],
  },

  // 遊び方(チュートリアル):ゆったり、やさしく、ていねいに教えてくれる曲(マリンバと、ベル)
  tutorial: {
    bpm: 96,
    trim: 1.1,
    voice: "mallet",
    bass: "sustain",
    pad: 0.036,
    bells: true,
    chords: ["C", "G", "Am", "Em", "F", "C", "Dm", "G", "C", "G", "Am", "Em", "F", "G", "C", "C"],
    lead: [
      [[0, "E5", 4], [4, "G5", 4], [8, "E5", 4], [12, "D5", 4]],
      [[0, "D5", 4], [4, "G5", 4], [8, "B4", 4], [12, "D5", 4]],
      [[0, "C5", 4], [4, "E5", 4], [8, "A5", 4], [12, "G5", 4]],
      [[0, "E5", 8], [8, "G5", 4], [12, "B5", 4]],
      [[0, "A5", 4], [4, "F5", 4], [8, "C5", 4], [12, "F5", 4]],
      [[0, "E5", 4], [4, "G5", 4], [8, "C6", 8]],
      [[0, "A5", 4], [4, "F5", 4], [8, "D5", 4], [12, "F5", 4]],
      [[0, "G5", 8], [8, "D5", 8]],
      [[0, "G5", 4], [4, "E5", 4], [8, "G5", 4], [12, "C6", 4]],
      [[0, "B5", 4], [4, "G5", 4], [8, "D6", 8]],
      [[0, "C6", 4], [4, "A5", 4], [8, "E5", 4], [12, "A5", 4]],
      [[0, "G5", 4], [4, "B5", 4], [8, "E6", 8]],
      [[0, "C6", 4], [4, "A5", 4], [8, "F5", 4], [12, "A5", 4]],
      [[0, "B5", 4], [4, "D6", 4], [8, "G5", 8]],
      [[0, "E5", 4], [4, "G5", 4], [8, "E6", 4], [12, "C6", 4]],
      [[0, "C6", 12]],
    ],
  },

  // 結果発表:にぎやかで、お祝いの曲
  result: {
    bpm: 120,
    trim: 1.1,
    voice: "triangle",
    bass: "root",
    pad: 0.03,
    stab: true,
    drums: "k.h.s.h.k.h.s.h.",
    drumsB: "k.hhs.hkk.hhs.hh",
    chords: ["C", "F", "G", "C", "Am", "F", "G", "C", "Dm", "G", "C", "Am", "F", "G", "Em", "C"],
    lead: [
      sparkle("C"),
      sparkle("F"),
      sparkle("G"),
      sparkle("C", true),
      sparkle("Am"),
      sparkle("F"),
      sparkle("G", true),
      [[0, "C6", 12]],
      sparkle("Dm"),
      sparkle("G"),
      sparkle("C", true),
      sparkle("Am"),
      sparkle("F", true),
      sparkle("G"),
      sparkle("Em", true),
      [[0, "C6", 4], [4, "E6", 4], [8, "G6", 6]],
    ],
  },
};

// ---- 短い曲(オープニングなど)----
// notes:[ステップ, 音, 長さ]  hits:ドラム [ステップ, "k"|"s"]  chord:[ステップ, コード名]  steps:全体の長さ
export const JINGLES = {
  // ゲームを開いたとき:きらきらとのぼって、ファンファーレ
  opening: {
    bpm: 128,
    steps: 28,
    notes: [[0, "C5", 2], [2, "E5", 2], [4, "G5", 2], [6, "C6", 2], [8, "E6", 2], [10, "G5", 2], [12, "C6", 2], [14, "E6", 2], [16, "G6", 12]],
    hits: [[0, "k"], [8, "k"], [12, "s"], [16, "k"], [16, "s"]],
    chord: [16, "C"],
  },
  // 問題をはじめるとき:「それでは、スタート!」
  start: {
    bpm: 144,
    steps: 18,
    notes: [[0, "G5", 2], [4, "G5", 2], [8, "G5", 2], [12, "C6", 6]],
    hits: [[0, "k"], [4, "k"], [8, "k"], [12, "k"], [12, "s"]],
    chord: [12, "C"],
  },
  // 結果発表の前:ドラムロール、そして、ジャン!(はやめに)
  result: {
    bpm: 150,
    steps: 22,
    notes: [[10, "C6", 2], [12, "E6", 2], [14, "G6", 8]],
    hits: [[10, "k"], [14, "k"]],
    roll: [0, 10], // [はじめ, 終わり]のステップ。だんだん細かく、大きく
    chord: [14, "C"],
  },
};

// ---- 音を出す部品 ----
let noiseBuffer = null;
function getNoise(ctx) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ctx.sampleRate) {
    noiseBuffer = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

function tone(ctx, out, { note, time, length, type = "sine", gain = 0.1, attack = 0.01, release = 0.12, lowpass = 0 }) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq(note);
  amp.gain.setValueAtTime(0, time);
  amp.gain.linearRampToValueAtTime(gain, time + attack);
  amp.gain.setValueAtTime(gain, Math.max(time + attack, time + length));
  amp.gain.exponentialRampToValueAtTime(0.0001, time + length + release);
  let node = osc;
  if (lowpass) {
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = lowpass;
    osc.connect(filter);
    node = filter;
  }
  node.connect(amp).connect(out);
  osc.start(time);
  osc.stop(time + length + release + 0.05);
}

function kick(ctx, out, time, gain = 0.2) {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.frequency.setValueAtTime(130, time);
  osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
  amp.gain.setValueAtTime(gain, time);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + 0.2);
  osc.connect(amp).connect(out);
  osc.start(time);
  osc.stop(time + 0.25);
}

function noiseHit(ctx, out, time, { gain, filter, frequency, length }) {
  const source = ctx.createBufferSource();
  const amp = ctx.createGain();
  const biquad = ctx.createBiquadFilter();
  source.buffer = getNoise(ctx);
  biquad.type = filter;
  biquad.frequency.value = frequency;
  amp.gain.setValueAtTime(gain, time);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + length);
  source.connect(biquad).connect(amp).connect(out);
  source.start(time);
  source.stop(time + length + 0.02);
}

const snare = (ctx, out, time, gain = 0.05) => noiseHit(ctx, out, time, { gain, filter: "bandpass", frequency: 1800, length: 0.1 });
const hat = (ctx, out, time) => noiseHit(ctx, out, time, { gain: 0.018, filter: "highpass", frequency: 7000, length: 0.04 });

// メロディの音色ごとの、音の出しかた(len は、音の長さ=秒)
const VOICES = {
  triangle: (len) => ({ type: "triangle", gain: 0.1, attack: 0.015, length: len * 0.9, release: 0.18 }),
  mallet: (len) => ({ type: "sine", gain: 0.13, attack: 0.004, length: len * 0.35, release: 0.45 }),
  square: (len) => ({ type: "square", gain: 0.04, attack: 0.008, length: len * 0.7, release: 0.1, lowpass: 3200 }),
  saw: (len) => ({ type: "sawtooth", gain: 0.06, attack: 0.004, length: len * 0.4, release: 0.22, lowpass: 2000 }),
  buzz: (len) => ({ type: "sawtooth", gain: 0.05, attack: 0.004, length: len * 0.85, release: 0.07, lowpass: 3000 }),
  brass: (len) => ({ type: "sawtooth", gain: 0.06, attack: 0.03, length: len * 0.85, release: 0.12, lowpass: 1600 }),
  soft: (len) => ({ type: "sine", gain: 0.11, attack: 0.07, length: len * 0.95, release: 0.5 }),
};

// ---- 1小節ぶんを、予約する ----
export function trackBarSeconds(name) {
  return (60 / TRACKS[name].bpm) * 4;
}

export function scheduleBar(ctx, out, name, bar, time) {
  const track = TRACKS[name];
  const index = bar % track.chords.length;
  const second = index >= track.chords.length / 2; // Bの部分
  const step = 60 / track.bpm / 4;
  const chord = CHORDS[track.chords[index]];
  const barLength = step * 16;
  const root = chord[0];
  const fifth = shift(root, 7);
  const put = (note, s, len, gain, extra = {}) =>
    tone(ctx, out, { note, time: time + s * step, length: step * len, gain, ...extra });

  // パッド:やさしい和音を、小節の間、のばす
  if (track.pad) {
    for (const note of chord) {
      tone(ctx, out, { note: shift(note, 12), time, length: barLength * 0.92, type: "sine", gain: track.pad, attack: 0.25, release: 0.35 });
    }
  }
  // ベース:曲ごとに、弾きかたを変える
  const bass = track.bass ?? "root";
  if (bass === "root") {
    for (const [s, note, len] of [[0, root, 6], [8, root, 3], [12, fifth, 3]]) put(note, s, len, 0.12, { type: "triangle", release: 0.1 });
  } else if (bass === "walk") {
    // 歩くように:根音→5度→1オクターブ上→5度
    for (const [s, note] of [[0, root], [4, fifth], [8, shift(root, 12)], [12, fifth]]) put(note, s, 3, 0.11, { type: "triangle", release: 0.12 });
  } else if (bass === "pulse") {
    // 8分で、ぶるぶると
    for (let s = 0; s < 16; s += 2) put(root, s, 1.4, s % 8 === 0 ? 0.11 : 0.07, { type: "sawtooth", lowpass: 420, release: 0.06, attack: 0.004 });
  } else if (bass === "drive") {
    // 8分で、おし寄せる。小節の頭と、うらを強く
    for (let s = 0; s < 16; s += 2) put(s % 4 === 2 ? shift(root, 12) : root, s, 1.5, s % 8 === 0 ? 0.15 : 0.1, { type: "sawtooth", lowpass: 520, release: 0.06, attack: 0.004 });
  } else if (bass === "bounce") {
    // はずむように:うら拍に、根音と5度
    for (const [s, note] of [[0, root], [3, root], [6, fifth], [8, root], [11, root], [14, fifth]]) put(note, s, 2, 0.12, { type: "triangle", release: 0.08 });
  } else if (bass === "sustain") {
    put(root, 0, 15, 0.1, { type: "sine", attack: 0.15, release: 0.4 });
  }
  // コードのリズム(うら拍の、みじい和音)
  if (track.stab) {
    for (const s of [4, 12]) {
      for (const note of chord) put(shift(note, 12), s, 1.2, 0.012, { type: "square", attack: 0.005, release: 0.06, lowpass: 1400 });
    }
  }
  // 時計の音:コツ、コツ、と、考える時間をきざむ
  if (track.tick) {
    const every = track.tick === "eighth" ? 2 : 4;
    for (let s = 0; s < 16; s += every) {
      noiseHit(ctx, out, time + s * step, { gain: s % 8 === 0 ? 0.05 : 0.03, filter: "bandpass", frequency: s % 8 === 0 ? 2200 : 3300, length: 0.03 });
    }
  }
  // ベル:やわらかい音を、ときどき(リラックス用)。Bの部分は、1つ高い音から
  if (track.bells) {
    const tones = chord.map((n) => shift(n, 24));
    for (let s = 0; s < 16; s += 4) put(tones[(s / 4 + (second ? 1 : 0)) % tones.length], s, 2, 0.045, { attack: 0.01, release: 0.9 });
  }
  // メロディ
  const voice = VOICES[track.voice ?? "triangle"];
  for (const [s, note, len] of track.lead[index]) {
    tone(ctx, out, { note, time: time + s * step, ...voice(step * len) });
  }
  // ドラム(Bの部分は、パターンを変える。8小節めは、ドラムのフィル)
  const drums = second && track.drumsB ? track.drumsB : track.drums;
  if (drums) {
    [...drums].forEach((mark, s) => {
      const t = time + s * step;
      if (mark === "k") kick(ctx, out, t, 0.2);
      else if (mark === "s") snare(ctx, out, t);
      else if (mark === "h") hat(ctx, out, t);
    });
    if (index % 8 === 7) for (let s = 12; s < 16; s += 1) snare(ctx, out, time + s * step, 0.03 + (s - 12) * 0.01);
  }
}

// 短い曲の長さ(秒)。鳴らさずに、長さだけ知りたいとき
export function jingleSeconds(name) {
  const jingle = JINGLES[name];
  return jingle ? (60 / jingle.bpm / 4) * jingle.steps : 0;
}

// 短い曲を、予約する。長さ(秒)を返す。
export function scheduleJingle(ctx, out, name, time) {
  const jingle = JINGLES[name];
  const step = 60 / jingle.bpm / 4;
  for (const [s, note, len] of jingle.notes) {
    tone(ctx, out, { note, time: time + s * step, length: step * len * 0.9, type: "triangle", gain: 0.2, attack: 0.01, release: 0.2 });
    tone(ctx, out, { note: shift(note, 12), time: time + s * step, length: step * len * 0.6, type: "sine", gain: 0.08, attack: 0.01, release: 0.3 });
  }
  for (const [s, mark] of jingle.hits) {
    if (mark === "k") kick(ctx, out, time + s * step, 0.22);
    else if (mark === "s") snare(ctx, out, time + s * step, 0.07);
  }
  if (jingle.roll) {
    // ドラムロール:だんだん、細かく、大きく
    const [from, to] = jingle.roll;
    let s = from;
    while (s < to) {
      const progress = (s - from) / (to - from);
      snare(ctx, out, time + s * step, 0.025 + progress * 0.06);
      s += progress < 0.5 ? 1 : 0.5;
    }
  }
  if (jingle.chord) {
    const [s, chordName] = jingle.chord;
    for (const note of CHORDS[chordName]) {
      tone(ctx, out, { note: shift(note, 12), time: time + s * step, length: step * (jingle.steps - s) * 0.8, type: "triangle", gain: 0.1, attack: 0.01, release: 0.4 });
    }
    noiseHit(ctx, out, time + s * step, { gain: 0.05, filter: "highpass", frequency: 5000, length: 0.5 }); // シンバル
  }
  return step * jingle.steps;
}

// ---- 演奏する係 ----
export class MusicPlayer {
  constructor(ctx) {
    this.ctx = ctx;
    this.volume = ctx.createGain(); // つまみの音量
    this.volume.gain.value = 0;
    const compressor = ctx.createDynamicsCompressor(); // 音が重なっても、われないように
    compressor.threshold.value = -18;
    compressor.ratio.value = 6;
    this.volume.connect(compressor).connect(ctx.destination);
    this.current = null; // { name, gain, timer, nextTime, bar }
  }

  setVolume(value) {
    this.volume.gain.setTargetAtTime(value, this.ctx.currentTime, 0.05);
  }

  get name() {
    return this.current?.name ?? null;
  }

  // 短い曲(オープニングなど)を鳴らす。長さ(秒)を返す。
  jingle(name) {
    if (!JINGLES[name]) return 0;
    return scheduleJingle(this.ctx, this.volume, name, this.ctx.currentTime + 0.05);
  }

  // 曲を切りかえる(同じ曲なら、そのまま続ける)。name が null なら、止める。
  play(name) {
    if (this.current?.name === name) return;
    this.stop();
    if (!name || !TRACKS[name]) return;
    const { ctx } = this;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(TRACKS[name].trim, ctx.currentTime + 0.6);
    gain.connect(this.volume);
    const state = { name, gain, nextTime: ctx.currentTime + 0.1, bar: 0, timer: 0 };
    const tick = () => {
      while (state.nextTime < ctx.currentTime + 1.2) {
        scheduleBar(ctx, gain, name, state.bar, state.nextTime);
        state.nextTime += trackBarSeconds(name);
        state.bar += 1;
      }
    };
    tick();
    state.timer = setInterval(tick, 200);
    this.current = state;
  }

  stop() {
    const state = this.current;
    if (!state) return;
    clearInterval(state.timer);
    const now = this.ctx.currentTime;
    state.gain.gain.cancelScheduledValues(now);
    state.gain.gain.setValueAtTime(state.gain.gain.value, now);
    state.gain.gain.linearRampToValueAtTime(0, now + 0.4);
    setTimeout(() => state.gain.disconnect(), 700);
    this.current = null;
  }
}
