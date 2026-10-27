// 表紙のフロリの動き(おだやかな待ちの動き + クリックで ぴょん)。live2d.js の model.values を毎フレーム書きかえる。
//
// 方針(ちぐはぐにならないように):
//  - 動きは「イベント」を1つずつ、順番に出す。イベントのあいだは、かならず 0 にもどして、少し待つ。
//    イベント = 白目で左右を見る / 表情 / 腕と足の動き(伸び・手を振る・わくわく)。同時には、出さない。
//  - 口は、ふだんから小さい(BASE_MOUTH)。表情は、そこからの動き。
//  - 表情は、眉・口・顔の傾き・寄り目・視線を、1つの強さ(0→1→0)でそろえて動かす。眉が動くときは、かならず寄り目(眉と同じ強さ)。
//  - 左右の目は、いつも同じ向き。白目の動く量は、右の目と左の目、左向きと右向きで、ちがう(リグの作り)ので、見た目の量をそろえる。
//  - 両腕を真上に上げるとき(伸び)は、左右同じ動き。手を振るのは、片手だけ。
//  - まばたきは、まぶた4つ+白目2つを、いつもいっしょに動かす。
const ss = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };       // なめらかに 0→1
const tri = (x, d) => (x < 0 || x > d ? 0 : Math.sin(x / d * Math.PI));                 // 0→1→0 の山
const rnd = (a, b) => a + Math.random() * (b - a);
const clamp1 = x => Math.max(-1, Math.min(1, x));
const env = (a, up, hold, down) => ss(a / up) * (1 - ss((a - up - hold) / down));       // 上がる → 保つ → 下がる(0→1→0)

export const HOP_SECONDS = 1.2;
export const BASE_MOUTH = -0.55;      // ふだんの口(下唇。小さい)

// 表情(強さ e: 0→1 のとき、各部分がどこまで動くか)。dir:true のものは、傾く向きを、ときどき かえる
//  brow: 眉(+ = ／＼ の八の字[困り眉]、− = ＼／ [きりっ])。眉があるときは、いつも寄り目。
//  tilt: 顔の傾き(+ = 画面の右へ)。mouth: 口(下唇の値。ふだんは BASE_MOUTH)。look: 傾きと同じ向きへ見る量
export const EXPRESSIONS = [
  { name: 'むむっ', brow: -0.8, tilt: 0, mouth: -0.95, hold: [1.0, 1.6] },
  { name: 'うーん', brow: 0.7, tilt: 0.8, mouth: -0.8, hold: [1.2, 1.8], dir: true },
  { name: 'にこっ', brow: 0, tilt: 0, mouth: 0.3, hold: [0.9, 1.4] },
  { name: 'ふむ', brow: 0, tilt: 0.7, mouth: BASE_MOUTH, look: 0.8, hold: [1.0, 1.6], dir: true },
  { name: 'しょんぼり', brow: 0.9, tilt: 0.3, mouth: -0.95, hold: [1.2, 1.8], dir: true },
  { name: 'きりっ', brow: -0.9, tilt: 0, mouth: -0.3, hold: [0.9, 1.4] },
];

export function createMotion(model) {
  const ix = n => model.params.findIndex(p => p.name === n);
  const I = {
    lids: ['右上まぶた', '右下まぶた', '左上まぶた', '左下まぶた', '右白目　まばたき', '左白目　まばたき'].map(ix),
    gazeR: ix('右白目　左右'), gazeL: ix('左白目　左右'), browR: ix('右眉'), browL: ix('左眉'),
    face: ix('顔'), facePart: ix('顔パーツ'), mouth: ix('下唇'),
    banR: ix('右手バンザイ'), banL: ix('左手バンザイ'), fistR: ix('右手コブシ'), fistL: ix('左手コブシ'),
    footR: ix('右足'), footL: ix('左足'),
  };
  let blinkAt = 1.5, blinkT0 = -9, blinkTwice = false;
  let ev = null, waitUntil = 1.5, lastExpr = -1, lastLook = 1, lastKind = '';   // ev = いま出しているイベント(なければ待つ)
  let hopT0 = -99, wasHop = false, hold = null;      // hold: ぴょんの前の表情・視線(なめらかに 0 にもどすため)
  const out = { bounce: 0, sx: 1, sy: 1 };

  function nextEvent(t) {
    let r = Math.random(), kind;
    // 表情 45%、白目 20%、腕と足 35%(おなじ種類を、続けて出さない)
    do { r = Math.random(); kind = r < 0.45 ? 'expr' : r < 0.65 ? 'gaze' : r < 0.77 ? 'stretch' : r < 0.89 ? 'wave' : 'fist'; } while (kind === lastKind);
    lastKind = kind;
    if (kind === 'gaze') {      // 白目で左右を見る(look > 0 = 画面の左を見る)。左右、かわりばんこに
      lastLook = Math.random() < 0.75 ? -lastLook : lastLook;
      return { kind, t0: t, look: lastLook * rnd(0.6, 1), up: 0.4, hold: rnd(1.2, 2.2), down: 0.4 };
    }
    if (kind === 'expr') {
      let k; do k = Math.floor(Math.random() * EXPRESSIONS.length); while (k === lastExpr);
      lastExpr = k; const x = EXPRESSIONS[k];
      return { kind, t0: t, x, dir: Math.random() < 0.5 ? -1 : 1, up: 0.5, hold: rnd(...x.hold), down: 0.5 };
    }
    if (kind === 'stretch') return { kind, t0: t, up: 0.9, hold: 1.5, down: 0.9 };                          // つま先立ちで、両腕を上げて伸び
    if (kind === 'wave') return { kind, t0: t, side: Math.random() < 0.5 ? 'R' : 'L', up: 0.5, hold: 1.9, down: 0.5 };   // 片手を上げて、振る
    return { kind, t0: t, up: 0.5, hold: 1.5, down: 0.5 };                                                   // わくわく:両手を顔の前へ、小さく ふるえる
  }

  // 見た目の動く量(ピクセル)をそろえる。画面の右を見る量は、右の目 25px・左の目 22px、左を見る量は、右の目 16px・左の目 25px
  function gazeValues(look) {
    const S = Math.abs(look) * 16;       // 見た目で、最大 16px
    return look > 0 ? [S / 16, S / 25] : [-S / 25, -S / 22];
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
      if (a >= ev.up + ev.hold + ev.down) { ev = null; waitUntil = t + rnd(0.6, 1.8); }
      else {
        k = env(a, ev.up, ev.hold, ev.down);
        if (ev.kind === 'gaze') gaze = k * ev.look;
        else if (ev.kind === 'expr') { e = k; x = ev.x; dir = ev.dir; }
      }
    }
    const kind = ev ? ev.kind : '';
    // 表情:眉・口・傾き・視線を同じ強さで。眉が動くときは、かならず寄り目(眉と同じ強さ)
    let brow = 0, tilt = 0, mouth = BASE_MOUTH, cross = 0;
    if (x) {
      brow = x.brow * e; tilt = x.tilt * (x.dir ? dir : 1) * e; mouth = BASE_MOUTH + (x.mouth - BASE_MOUTH) * e;
      cross = Math.abs(brow) * 1.4;
      if (x.look) gaze = -Math.sign(tilt) * x.look * e;     // 傾けた側を見る
    }
    let [vr, vl] = gazeValues(gaze);
    if (cross) { vr -= cross; vl += cross; }   // 寄り目:右の目は 画面の右(−)へ、左の目は 画面の左(+)へ = 両目とも真ん中へ
    vr = clamp1(vr); vl = clamp1(vl);

    // 腕と足
    let banR = 0, banL = 0, fist = 0, foot = 0;
    // ふだんの腕:ほんの少し、ゆれる(コブシの腕を、ごく小さく動かす)
    const sway = 0.035 + 0.03 * Math.sin(t * 1.3);
    if (kind === 'stretch') {   // つま先立ちで、両腕を真上へ(左右同じ)。からだも伸びる
      banR = banL = k; foot = 0.5 * k; bounce += k * 40;
    } else if (kind === 'wave') {   // 片手を上げて、振る(−0.65〜−1 を行き来)
      const w = k * (0.82 + 0.18 * Math.sin(Math.max(0, a - 0.4) * Math.PI * 2 * 2.2));
      if (ev.side === 'R') banR = w; else banL = w;
    } else if (kind === 'fist') {   // わくわく:両手を顔の前へ(コブシ −1)。小さくふるえる
      fist = k * (0.9 + 0.1 * Math.sin(Math.max(0, a - 0.3) * Math.PI * 2 * 3));
    }
    let fistR = fist || sway, fistL = fist || sway;

    if (hopping) {   // ぴょんのあいだは、表情・視線を、はじめの値から すっと ふだんにもどす
      if (!wasHop) { hold = { vr: V[I.gazeR], vl: V[I.gazeL], brow: V[I.browR], face: V[I.face], mouth: V[I.mouth] }; ev = null; waitUntil = t + HOP_SECONDS + 1; }
      const kk = 1 - ss(hs / 0.25);
      vr = hold.vr * kk; vl = hold.vl * kk; brow = hold.brow * kk; tilt = hold.face * kk; mouth = BASE_MOUTH + (hold.mouth - BASE_MOUTH) * kk;
      banR = banL = 0; fistR = fistL = 0; foot = 0;
      if (hs < 0.14) { const u = ss(hs / 0.14); sy = 1 - 0.06 * u; sx = 1 + 0.03 * u; bounce = 0; }                    // かがむ
      else if (hs < 0.54) { const u = (hs - 0.14) / 0.4, h = Math.sin(u * Math.PI / 2); bounce = 85 * h; sy = 1 + 0.04 * h; sx = 1 - 0.02 * h;   // のぼる
        banR = banL = ss(u * 2.5); foot = 0.5 * ss(u * 2); }
      else if (hs < 0.94) { const u = (hs - 0.54) / 0.4, h = Math.cos(u * Math.PI / 2); bounce = 85 * h; sy = 1 + 0.04 * h; sx = 1 - 0.02 * h;    // おりる
        banR = banL = 1 - ss((u - 0.35) / 0.65); foot = 0.5 * (1 - ss((u - 0.55) / 0.45)); }
      else { const u = (hs - 0.94) / 0.26; sy = 1 - 0.07 * Math.sin(u * Math.PI); sx = 1 + 0.035 * Math.sin(u * Math.PI); bounce = 0; }  // 着地
    }
    wasHop = hopping;
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
