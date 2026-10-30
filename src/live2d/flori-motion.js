// 表紙のフロリの動き(おだやかな待ちの動き + クリックで ぴょん)。live2d.js の model.values を毎フレーム書きかえる。
//
// 方針(ちぐはぐにならないように):
//  - 動きは「イベント」を1つずつ、順番に出す。イベントのあいだは、かならず 0 にもどして、少し待つ。
//    イベント = 白目で左右を見る / 表情 / 眉だけ / 口だけ / 腕と足の動き(伸び・手を振る)。同時には、出さない。
//  - 口は、ふだんから小さく、ゆっくり動く(BASE_MOUTH のまわり)。表情は、そこからの動き。
//  - 表情は、眉・口・顔の傾き・寄り目・視線を、1つの強さ(0→1→0)でそろえて動かす。眉が動くときは、かならず目いっぱいの寄り目(デフォルメ)。
//  - 左右の目は、いつも同じ向き。白目の動く量は、右の目と左の目、左向きと右向きで、ちがう(リグの作り)ので、見た目の量をそろえる。
//  - 両腕を真上に上げるとき(伸び)は、左右同じ動き。手を振るのは、片手だけ。
//  - まばたきは、まぶた4つ+白目2つを、いつもいっしょに動かす。
const ss = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };       // なめらかに 0→1
const tri = (x, d) => (x < 0 || x > d ? 0 : Math.sin(x / d * Math.PI));                 // 0→1→0 の山
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp1 = x => Math.max(-1, Math.min(1, x));
const env = (a, up, hold, down) => ss(a / up) * (1 - ss((a - up - hold) / down));       // 上がる → 保つ → 下がる(0→1→0)

export const HOP_SECONDS = 1.2;
export const CROSS_PX = 7;             // いつもの寄り目の量(ひとみが、内側へ動く。キャンバスのピクセル)
export const GAZE_PX = 15;             // 左右を見るときの、ひとみの動く量(これより大きいと、ひとみが目からはみ出る)
export const LIP_MARGIN = 0.2;        // 下唇が −LIP_MARGIN より小さくなる(とげが出る)ときだけ、上唇も動かす
export const BASE_MOUTH = -0.85;      // ふだんの口(下唇。小さい。−1 がいちばん小さい)

// 表情(強さ e: 0→1 のとき、各部分がどこまで動くか)。dir:true のものは、傾く向きを、ときどき かえる
//  brow: 眉(+ = ／＼ の八の字[困り眉]、− = ＼／ [きりっ])。眉があるときは、いつも寄り目。
//  tilt: 顔の傾き(+ = 画面の右へ)。mouth: 口(下唇の値。ふだんは BASE_MOUTH)。look: 傾きと同じ向きへ見る量
export const EXPRESSIONS = [
  { name: 'むむっ', brow: -1, tilt: 0, mouth: -1, hold: [1.0, 1.6] },
  { name: 'うーん', brow: 0.8, tilt: 1, mouth: -0.95, hold: [1.2, 1.8], dir: true },
  { name: 'にこっ', brow: 0.4, tilt: 0, mouth: -0.2, hold: [0.9, 1.4] },
  { name: 'ふむ', brow: 0, tilt: 0.9, mouth: BASE_MOUTH, look: 0.8, hold: [1.0, 1.6], dir: true },
  { name: 'しょんぼり', brow: 1, tilt: 0.5, mouth: -1, hold: [1.2, 1.8], dir: true },
  { name: 'きりっ', brow: -1, tilt: 0, mouth: -0.7, hold: [0.9, 1.4] },
  { name: 'にっこり', brow: 0.5, tilt: 0.6, mouth: -0.1, hold: [1.0, 1.6], dir: true },
  { name: 'ぽかん', brow: 0.9, tilt: 0, mouth: -0.1, hold: [1.0, 1.5] },
  { name: 'こまった', brow: 1, tilt: 0.8, mouth: -0.55, wobble: 0.3, hold: [1.4, 2.0], dir: true },   // 困り眉・首をかしげる・口がふるえる
  { name: 'ぷんぷん', brow: -1, tilt: 0.5, mouth: -0.9, hold: [1.0, 1.5], dir: true },
  { name: 'びっくり', brow: 1, tilt: 0, mouth: 0.8, hold: [0.9, 1.4] },
  { name: 'にやり', brow: -0.7, tilt: 0.6, mouth: 0.2, hold: [1.0, 1.6], dir: true },
  { name: 'あはは', brow: 0.4, tilt: 0.4, mouth: 0.6, wobble: 0.35, hold: [1.2, 1.8], dir: true },   // 口が ぱくぱく ゆれる(わらい)
  { name: 'うっとり', brow: 0.6, tilt: 0.8, mouth: -0.3, hold: [1.2, 1.8], dir: true },
  { name: 'かしげ', brow: 0, tilt: 1, hold: [1.2, 1.8], dir: true },        // 首だけ かしげる(顔は ふだんのまま。口は、ふだんの口)
  { name: 'ちょこん', brow: 0, tilt: 0.6, hold: [0.8, 1.3], dir: true },
  { name: 'ぐぬぬ', brow: -1, tilt: 0.3, mouth: -1, wobble: 0.15, hold: [1.0, 1.5], dir: true },
];

// 見た目の位置(px。+ は画面の右)→ 白目のパラメーター値(右の目は、右へ25px・左へ16px、左の目は、右へ22px・左へ26px が、±1)
const pxToR = px => (px >= 0 ? -px / 25 : -px / 16), pxToL = px => (px >= 0 ? -px / 22 : -px / 26);
// 視線 g(−1〜1。+ は画面の左)のときの、片目の位置:g = 0 で base(寄り目)、g = ±1 で ∓GAZE_PX
const eyePx = (g, base) => (g >= 0 ? base + (-GAZE_PX - base) * g : base + (GAZE_PX - base) * -g);

export function createMotion(model) {
  const ix = n => model.params.findIndex(p => p.name === n);
  const I = {
    lids: ['右上まぶた', '右下まぶた', '左上まぶた', '左下まぶた', '右白目　まばたき', '左白目　まばたき'].map(ix),
    gazeR: ix('右白目　左右'), gazeL: ix('左白目　左右'), browR: ix('右眉'), browL: ix('左眉'),
    face: ix('顔'), facePart: ix('顔パーツ'), mouth: ix('下唇'),
    banR: ix('右手バンザイ'), banL: ix('左手バンザイ'), fistR: ix('右手コブシ'), fistL: ix('左手コブシ'),
    lip: ix('上唇'), footR: ix('右足'), footL: ix('左足'),
  };
  let blinkAt = 1.5, blinkT0 = -9, blinkTwice = false;
  let ev = null, waitUntil = 1.5, lastExpr = -1, lastLook = 1, lastKind = '', lastDir = 1, lastSide = 1, lastBrow = 1;   // ev = いま出しているイベント(なければ待つ)
  let hopT0 = -99, wasHop = false, hold = null;      // hold: ぴょんの前の表情・視線(なめらかに 0 にもどすため)
  const out = { bounce: 0, sx: 1, sy: 1 };
  model.follow = false;     // 上唇は、live2d.js の追尾ではなく、ここで決める(LIP_MARGIN)

  function nextEvent(t) {
    let r, kind;
    // 表情 55%、眉だけ 8%、白目 8%、口 5%(へらした)、腕と足 24%(伸び 4・手を振る 7・ぱたぱた 5・ばんざい 6)。おなじ種類を、続けて出さない。
    // ※両手を顔の前に上げる「わくわく」は、やめた(利用者の指示)
    do { r = Math.random(); kind = r < 0.62 ? 'expr' : r < 0.67 ? 'brow' : r < 0.72 ? 'gaze' : r < 0.80 ? 'dart' : r < 0.83 ? 'mouth' : r < 0.86 ? 'stretch' : r < 0.92 ? 'wave' : r < 0.96 ? 'flap' : 'cheer'; } while (kind === lastKind || (kind === 'dart' && lastKind === 'gaze'));
    lastKind = kind;
    if (kind === 'dart') {      // 目きょろきょろ:寄り目をといて、左右へ 2〜3回(3回まで)見る(かならず かわりばんこ)
      const n = 2 + Math.floor(Math.random() * 2), seq = []; let d = lastLook;
      for (let i = 0; i < n; i++) { d = -d; seq.push(d * rnd(0.85, 1)); }
      lastLook = d;
      const step = rnd(0.85, 1.15);
      return { kind, t0: t, seq, step, up: 0.4, hold: n * step + 0.2, down: 0.4 };
    }
    if (kind === 'gaze') {      // 白目で左右を見る(look > 0 = 画面の左を見る)。左右、かならず かわりばんこに
      lastLook = -lastLook;
      return { kind, t0: t, look: lastLook * rnd(0.8, 1), up: 0.4, hold: rnd(1.4, 2.4), down: 0.4 };
    }
    if (kind === 'brow') {      // 眉だけ(ヽ／ ↔ ／ヽ、かわりばんこに)。眉が動くときは、かならず寄り目
      lastBrow = -lastBrow;
      return { kind, t0: t, x: { brow: 0.7 * lastBrow, tilt: 0, mouth: BASE_MOUTH }, dir: 1, up: 0.4, hold: rnd(1.0, 1.6), down: 0.4 };
    }
    if (kind === 'expr') {
      let k; do k = Math.floor(Math.random() * EXPRESSIONS.length); while (k === lastExpr);
      lastExpr = k; const x = EXPRESSIONS[k];
      lastDir = -lastDir;       // 傾ける向きは、かならず かわりばんこ(左も右も)
      return { kind, t0: t, x, dir: lastDir, up: 0.3, hold: rnd(...x.hold) * 0.55, down: 0.3 };   // 表情は、コロコロかわる(はやく動いて、みじかく保つ)
    }
    if (kind === 'flap') return { kind, t0: t, up: 0.4, hold: rnd(1.4, 2.0), down: 0.4 };       // ぱたぱた:両腕を、からだの横で、小さく ぱたぱた(左右同じ)
    if (kind === 'cheer') return { kind, t0: t, up: 0.4, hold: rnd(1.4, 2.0), down: 0.5 };      // ばんざい:両腕を上げて、ぴょこぴょこ(左右同じ)
    if (kind === 'mouth') return { kind, t0: t, up: 0.3, hold: rnd(1.4, 2.2), down: 0.3 };    // 口だけ、小さく ぱくぱく
    if (kind === 'stretch') return { kind, t0: t, up: 0.9, hold: 1.5, down: 0.9 };                          // つま先立ちで、両腕を上げて伸び
    if (kind === 'wave') { lastSide = -lastSide; return { kind, t0: t, side: lastSide > 0 ? 'R' : 'L', up: 0.5, hold: 1.9, down: 0.5 }; }   // 片手を上げて、振る(右手・左手、かわりばんこ)
  }

  // now: ミリ秒(performance.now() など)。返す: { bounce, sx, sy }(からだ全体の上への動き[キャンバス座標]・縦横のつぶれ)
  function update(now) {
    const t = now / 1000, V = model.values;
    const hs = t - hopT0, hopping = hs >= 0 && hs < HOP_SECONDS;
    // 息:4秒で1回、ゆっくり上下
    let bounce = Math.sin(t * Math.PI * 2 / 4) * 5, sx = 1, sy = 1;
    // まばたき:2.5〜5.5秒ごと。ときどき2回
    if (t >= blinkAt) { blinkT0 = t; blinkTwice = Math.random() < 0.2; blinkAt = t + rnd(2.5, 5.5); }
    const b = Math.max(tri(t - blinkT0, 0.16), blinkTwice ? tri(t - blinkT0 - 0.28, 0.16) : 0);
    for (const i of I.lids) V[i] = -b;

    // イベントの進行
    if (!hopping && !ev && t >= waitUntil) ev = nextEvent(t);
    let gaze = 0, x = null, e = 0, dir = 1, k = 0, a = 0;
    if (ev) {
      a = t - ev.t0;
      if (a >= ev.up + ev.hold + ev.down) { ev = null; waitUntil = t + rnd(0.1, 0.4); }
      else {
        k = env(a, ev.up, ev.hold, ev.down);
        if (ev.kind === 'gaze') gaze = k * ev.look;
        else if (ev.kind === 'dart') {
          const u = Math.max(0, a - ev.up) / ev.step, i = Math.min(ev.seq.length - 1, Math.floor(u)), q = ss((u - i) / 0.4);   // 0.4 = 動く速さ(ゆっくり)
          gaze = k * (i ? ev.seq[i - 1] + (ev.seq[i] - ev.seq[i - 1]) * q : ev.seq[0]);
        }
        else if (ev.kind === 'expr' || ev.kind === 'brow') { e = k; x = ev.x; dir = ev.dir; }
      }
    }
    const kind = ev ? ev.kind : '';
    // 表情:眉・口・傾き・視線を同じ強さで。眉が動くときは、かならず寄り目(眉と同じ強さ)
    // 口:ふだんから、小さく うごかす(ゆっくり ぱくぱく)。表情のときは、表情の口へ
    // ふだんの口:ゆっくり、小さい(−1)〜ふつう(0 のあたり)を行き来する。大小の差を大きく
    const idleAbs = -0.6 + 0.35 * Math.sin(t * Math.PI * 2 * 0.1);   // 口の動く回数をへらした:10秒で1往復だけ、ゆっくり
    // いつもの顔 = 寄り目(両目とも真ん中へ ±1)。白目で左右を見るときだけ、いったん 0 にもどしてから動かす
    let brow = 0, tilt = 0, mouth = idleAbs;
    if (kind === 'mouth') mouth = idleAbs * (1 - k) + k * (-1 + 1.8 * (0.5 + 0.5 * Math.sin(a * Math.PI * 2 * 0.8 - Math.PI / 2)));   // 口だけ ゆっくり ぱくぱく(ちいさい −1 〜 おおきい +0.8)
    if (x) {
      // 顔の傾き:左右で見た目の角度をそろえる(顔 +1 = 右へ 9.6°、−1 = 左へ 12.4°)。傾き 1 = 9°(右の限界 9.6° 以内)
      const ang = x.tilt * (x.dir ? dir : 1) * e * 9;
      brow = x.brow * e; tilt = ang > 0 ? ang / 9.6 : ang / 12.4; mouth = idleAbs * (1 - e) + (x.mouth ?? idleAbs) * e + (x.wobble ? x.wobble * e * Math.sin(a * Math.PI * 2 * 2.2) : 0);
      if (x.look) gaze = -Math.sign(tilt) * x.look * e;     // 傾けた側を見る(+ は画面の右)
    }
    // 見た目の位置(キャンバスのピクセル。+ は画面の右)で決めて、パラメーター値に直す。いつもの顔は寄り目(右の目 +CROSS_PX・左の目 −CROSS_PX)。
    // 左右を見るときは、両目とも、同じ位置(±GAZE_PX)へ動かす(ひとみが目からはみ出さない・片方だけ動かない、をなくす)
    const g = Math.max(-1, Math.min(1, gaze)), pr = eyePx(g, CROSS_PX), pl = eyePx(g, -CROSS_PX);
    let vr = pxToR(pr), vl = pxToL(pl);
    vr = clamp1(vr); vl = clamp1(vl);

    // 腕と足
    let banR = 0, banL = 0, foot = 0, swing = 0;
    // ふだんの腕:ほんの少し、ゆれる(コブシの腕を、ごく小さく動かす。呼吸のときは、ごく小さく)
    const swayR = 0.02 + 0.012 * Math.sin(t * 1.3), swayL = 0.02 + 0.012 * Math.sin(t * 1.1 + 1.7);   // 左右の手は、べつべつに ゆれる
    if (kind === 'stretch') {   // つま先立ちで、両腕を真上へ(左右同じ)。からだも伸びる
      banR = banL = k; foot = 0.5 * k; bounce += k * 40;
    } else if (kind === 'flap') {   // 両腕を、からだの横へ、小さく開いたり閉じたり(コブシ 0〜−0.2。左右同じ)
      swing = k * (0.1 + 0.1 * Math.sin(Math.max(0, a - 0.2) * Math.PI * 2 * 2.4));
    } else if (kind === 'cheer') {   // 両腕を上げて、ぴょこぴょこ(−0.7〜−1。左右同じ)
      banR = banL = k * (0.85 + 0.15 * Math.sin(Math.max(0, a - 0.3) * Math.PI * 2 * 2.6)); foot = 0.5 * k * 0.6; bounce += k * 14;
    } else if (kind === 'wave') {   // 片手を上げて、振る(−0.64〜−1 を行き来)。もう片方の手は、ふつうにゆれる
      const w = k * (0.82 + 0.18 * Math.sin(Math.max(0, a - 0.4) * Math.PI * 2 * 2.2));
      if (ev.side === 'R') banR = w; else banL = w;
    }
    let fistR = swing || swayR, fistL = swing || swayL;

    if (hopping) {   // ぴょんのあいだは、表情・視線を、はじめの値から すっと ふだんにもどす
      if (!wasHop) { hold = { vr: V[I.gazeR], vl: V[I.gazeL], brow: V[I.browR], face: V[I.face], mouth: V[I.mouth] }; ev = null; waitUntil = t + HOP_SECONDS + 1; }
      const kk = 1 - ss(hs / 0.25);
      vr = pxToR(CROSS_PX) + (hold.vr - pxToR(CROSS_PX)) * kk; vl = pxToL(-CROSS_PX) + (hold.vl - pxToL(-CROSS_PX)) * kk; brow = hold.brow * kk; tilt = hold.face * kk; mouth = idleAbs + (hold.mouth - idleAbs) * kk;
      banR = banL = 0; fistR = fistL = 0; foot = 0;
      if (hs < 0.14) { const u = ss(hs / 0.14); sy = 1 - 0.06 * u; sx = 1 + 0.03 * u; bounce = 0; }                    // かがむ
      else if (hs < 0.54) { const u = (hs - 0.14) / 0.4, h = Math.sin(u * Math.PI / 2); bounce = 85 * h; sy = 1 + 0.04 * h; sx = 1 - 0.02 * h;   // のぼる
        banR = banL = ss(u * 2.5); foot = 0.5 * ss(u * 2); }
      else if (hs < 0.94) { const u = (hs - 0.54) / 0.4, h = Math.cos(u * Math.PI / 2); bounce = 85 * h; sy = 1 + 0.04 * h; sx = 1 - 0.02 * h;    // おりる
        banR = banL = 1 - ss((u - 0.35) / 0.65); foot = 0.5 * (1 - ss((u - 0.55) / 0.45)); }
      else { const u = (hs - 0.94) / 0.26; sy = 1 - 0.07 * Math.sin(u * Math.PI); sx = 1 + 0.035 * Math.sin(u * Math.PI); bounce = 0; }  // 着地
    }
    wasHop = hopping;
    { const up = Math.max(banR, banL); if (up) mouth += (0.7 - mouth) * up; }   // 手を挙げるときは、口を大きく
    mouth = Math.max(-1, Math.min(1, mouth));
    if (I.lip >= 0) V[I.lip] = Math.min(0, mouth + LIP_MARGIN);   // 上唇:ふだんは動かさない(0)。下唇が小さすぎて とげが出るときだけ、足りない分だけ動かす
    V[I.gazeR] = vr; V[I.gazeL] = vl;
    V[I.browR] = V[I.browL] = brow;                         // 左右同じ値(ヽ／ ↔ ／ヽ)
    V[I.face] = V[I.facePart] = tilt; V[I.mouth] = mouth;   // 上唇は、live2d.js の followParams が追尾する
    V[I.banR] = banR ? -banR : 0; V[I.banL] = banL ? -banL : 0;
    V[I.fistR] = -fistR; V[I.fistL] = -fistL;
    V[I.footR] = V[I.footL] = foot;
    out.bounce = bounce; out.sx = sx; out.sy = sy;
    return out;
  }

  return { update, hop(now) { const t = now / 1000; if (t - hopT0 >= HOP_SECONDS) hopT0 = t; } };
}
