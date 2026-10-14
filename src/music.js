// BGM。このゲームのために作った、オリジナルの曲を、ブラウザの中で演奏する(WebAudio)。
// 曲のファイルがないので、利用許諾の問題がなく、クレジットも要らない。
//
// 曲の作り方:1曲は、8小節のループ。小節ごとに、コード(和音)と、メロディ(lead)を書く。
//   時間は「ステップ」で数える(1小節=16ステップ。4ステップ=1拍)。
//   メロディは [ステップ, 音, 長さ(ステップ)]、音は "C5" のように書く。
// 新しい曲を足すときは、TRACKS に1つ足して、audio.js の BGM に、場面と曲名を書く。

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
  Bb: ["Bb2", "D3", "F3"],
  A: ["A2", "C#3", "E3"],
  Gmaj7: ["G3", "B3", "D4", "F#4"],
  Em7: ["E3", "G3", "B3", "D4"],
  Cmaj7: ["C3", "E3", "G3", "B3"],
  D: ["D3", "F#3", "A3"],
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

export const TRACKS = {
  // 表紙・成績・設定・みんなで対戦:明るくて、軽快な曲
  cover: {
    bpm: 112,
    trim: 1.05,
    chords: ["C", "Am", "F", "G", "C", "F", "G", "C"],
    pad: 0.03,
    stab: true,
    drums: "k.h.s.h.k.h.s.h.",
    lead: [
      [[0, "E5", 4], [4, "G5", 4], [8, "E5", 2], [10, "D5", 2], [12, "C5", 4]],
      [[0, "C5", 4], [4, "E5", 4], [8, "A4", 4], [12, "C5", 4]],
      [[0, "C5", 4], [4, "F5", 4], [8, "E5", 2], [10, "D5", 2], [12, "C5", 4]],
      [[0, "B4", 4], [4, "D5", 4], [8, "G5", 4], [12, "D5", 4]],
      [[0, "E5", 4], [4, "G5", 4], [8, "C6", 4], [12, "G5", 4]],
      [[0, "A5", 4], [4, "F5", 4], [8, "C5", 4], [12, "F5", 4]],
      [[0, "D5", 4], [4, "G5", 4], [8, "B4", 4], [12, "D5", 4]],
      [[0, "C5", 12]],
    ],
  },

  // ふつうの問題・難しいモード:落ち着いて、考えられる曲
  question: {
    bpm: 90,
    trim: 1,
    chords: ["Am", "F", "C", "G", "Am", "F", "G", "Am"],
    pad: 0.034,
    arp: true,
    drums: "h...h...h...h...",
    lead: [
      [[0, "E5", 6], [8, "C5", 4], [12, "B4", 4]],
      [[0, "A4", 6], [8, "C5", 4], [12, "A4", 4]],
      [[0, "G4", 6], [8, "E5", 4], [12, "D5", 4]],
      [[0, "B4", 6], [8, "D5", 4], [12, "G4", 4]],
      [[0, "C5", 6], [8, "E5", 4], [12, "A4", 4]],
      [[0, "F5", 6], [8, "E5", 4], [12, "C5", 4]],
      [[0, "D5", 6], [8, "B4", 4], [12, "G4", 4]],
      [[0, "A4", 12]],
    ],
  },

  // オニ問題:緊張感のある曲
  oni: {
    bpm: 124,
    trim: 1.11,
    chords: ["Dm", "Bb", "C", "A", "Dm", "Bb", "C", "A"],
    pad: 0.022,
    stab: true,
    ostinato: true,
    drums: "k.h.k.h.k.h.s.h.",
    lead: [
      [[0, "A4", 2], [2, "D5", 2], [4, "F5", 4], [8, "E5", 2], [10, "D5", 2], [12, "A4", 4]],
      [[0, "Bb4", 2], [2, "D5", 2], [4, "F5", 4], [8, "D5", 4], [12, "Bb4", 4]],
      [[0, "C5", 2], [2, "E5", 2], [4, "G5", 4], [8, "E5", 4], [12, "C5", 4]],
      [[0, "A4", 2], [2, "C#5", 2], [4, "E5", 4], [8, "G5", 2], [10, "F5", 2], [12, "E5", 4]],
      [[0, "A4", 2], [2, "D5", 2], [4, "F5", 4], [8, "A5", 2], [10, "G5", 2], [12, "F5", 4]],
      [[0, "Bb4", 2], [2, "D5", 2], [4, "F5", 4], [8, "Bb5", 4], [12, "A5", 4]],
      [[0, "C5", 2], [2, "E5", 2], [4, "G5", 4], [8, "C6", 4], [12, "G5", 4]],
      [[0, "A4", 2], [2, "C#5", 2], [4, "E5", 4], [8, "A5", 8]],
    ],
  },

  // リラックス(パズル):ゆっくりで、やさしい曲
  relax: {
    bpm: 70,
    trim: 1.06,
    chords: ["Gmaj7", "Em7", "Cmaj7", "D", "Gmaj7", "Em7", "Cmaj7", "D"],
    pad: 0.04,
    bells: true,
    lead: [
      [[0, "B4", 8], [8, "A4", 4], [12, "G4", 4]],
      [[0, "G4", 8], [8, "B4", 4], [12, "D5", 4]],
      [[0, "E5", 8], [8, "D5", 4], [12, "B4", 4]],
      [[0, "A4", 8], [8, "F#4", 8]],
      [[0, "D5", 8], [8, "B4", 8]],
      [[0, "E5", 8], [8, "D5", 8]],
      [[0, "G5", 8], [8, "E5", 8]],
      [[0, "F#5", 8], [8, "A4", 8]],
    ],
  },

  // 結果発表:にぎやかで、お祝いの曲
  result: {
    bpm: 120,
    trim: 1.03,
    chords: ["C", "F", "G", "C", "Am", "F", "G", "C"],
    pad: 0.03,
    stab: true,
    drums: "k.h.s.h.k.h.s.h.",
    lead: [
      sparkle("C"),
      sparkle("F"),
      sparkle("G"),
      sparkle("C", true),
      sparkle("Am"),
      sparkle("F"),
      sparkle("G", true),
      [[0, "C6", 12]],
    ],
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

// ---- 1小節ぶんを、予約する ----
export function trackBarSeconds(name) {
  return (60 / TRACKS[name].bpm) * 4;
}

export function scheduleBar(ctx, out, name, bar, time) {
  const track = TRACKS[name];
  const index = bar % track.chords.length;
  const step = 60 / track.bpm / 4;
  const chord = CHORDS[track.chords[index]];
  const barLength = step * 16;
  const root = chord[0];

  // パッド:やさしい和音を、小節の間、のばす
  if (track.pad) {
    for (const note of chord) {
      tone(ctx, out, { note: shift(note, 12), time, length: barLength * 0.92, type: "sine", gain: track.pad, attack: 0.25, release: 0.35 });
    }
  }
  // ベース:根音を、リズムにのせて弾く
  if (track.ostinato) {
    for (let s = 0; s < 16; s += 2) {
      tone(ctx, out, { note: root, time: time + s * step, length: step * 1.6, type: "triangle", gain: s % 8 === 0 ? 0.14 : 0.09, attack: 0.005, release: 0.08 });
    }
  } else if (!track.bells) {
    for (const [s, note, len] of [[0, root, 6], [8, root, 3], [12, shift(root, 7), 3]]) {
      tone(ctx, out, { note, time: time + s * step, length: step * len, type: "triangle", gain: 0.12, attack: 0.01, release: 0.1 });
    }
  }
  // コードのリズム(うら拍の、みじい和音)
  if (track.stab) {
    for (const s of [4, 12]) {
      for (const note of chord) {
        tone(ctx, out, { note: shift(note, 12), time: time + s * step, length: step * 1.2, type: "square", gain: 0.012, attack: 0.005, release: 0.06, lowpass: 1400 });
      }
    }
  }
  // アルペジオ:コードの音を、やさしく、くり返す(考える曲用)
  if (track.arp) {
    const tones = chord.map((n) => shift(n, 24));
    const order = [0, 1, 2, 1];
    for (let s = 0; s < 16; s += 2) {
      tone(ctx, out, { note: tones[order[(s / 2) % 4]], time: time + s * step, length: step * 1.4, type: "sine", gain: 0.05, attack: 0.01, release: 0.25 });
    }
  }
  // ベル:やわらかい音を、ときどき(リラックス用)
  if (track.bells) {
    const tones = chord.map((n) => shift(n, 24));
    for (let s = 0; s < 16; s += 4) {
      tone(ctx, out, { note: tones[(s / 4) % tones.length], time: time + s * step, length: step * 2, type: "sine", gain: 0.045, attack: 0.01, release: 0.9 });
    }
  }
  // メロディ
  for (const [s, note, len] of track.lead[index]) {
    tone(ctx, out, { note, time: time + s * step, length: step * len * 0.9, type: "triangle", gain: 0.1, attack: 0.015, release: 0.18 });
  }
  // ドラム
  if (track.drums) {
    [...track.drums].forEach((mark, s) => {
      const t = time + s * step;
      if (mark === "k") kick(ctx, out, t, 0.2);
      else if (mark === "s") noiseHit(ctx, out, t, { gain: 0.05, filter: "bandpass", frequency: 1800, length: 0.1 });
      else if (mark === "h") noiseHit(ctx, out, t, { gain: 0.018, filter: "highpass", frequency: 7000, length: 0.04 });
    });
  }
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
