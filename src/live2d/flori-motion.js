// 表紙のフロリの動き(おだやかな待ちの動き + クリックで ぴょん)。live2d.js の model.values を毎フレーム書きかえる。
//
// 方針(怖く見えないように):
//  - 動かすのは、「まばたき」「ゆっくり左右を見る」「息」「ときどき両腕を上げて伸び」だけ。眉・口・顔の傾き・寄り目は使わない。
//  - 白目は、0 から動かして、保って、0 にもどし、そのあと少し待つ(左右の目は、いつも同じ値で同じ向き)。
//  - 腕は、0(下)か −1(上)のどちらかに置く。途中(真横に伸びた形)は、すばやく通りすぎるだけ。両腕は、いつも左右同じ動き。
//  - 顔のアニメーションは、まばたき(まぶた4つ+白目2つ)をいつもいっしょに動かして、ばらばらにならないようにする。
const ss = x => { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };       // なめらかに 0→1
const tri = (x, d) => (x < 0 || x > d ? 0 : Math.sin(x / d * Math.PI));                 // 0→1→0 の山
const rnd = (a, b) => a + Math.random() * (b - a);

export const HOP_SECONDS = 1.2;

export function createMotion(model) {
  const ix = n => model.params.findIndex(p => p.name === n);
  const I = {
    lids: ['右上まぶた', '右下まぶた', '左上まぶた', '左下まぶた', '右白目　まばたき', '左白目　まばたき'].map(ix),
    gazeR: ix('右白目　左右'), gazeL: ix('左白目　左右'),
    armR: ix('右手バンザイ'), armL: ix('左手バンザイ'), footR: ix('右足'), footL: ix('左足'),
  };
  let blinkAt = 1.5, blinkT0 = -9, blinkTwice = false;
  let g = { phase: 'wait', t0: 0, until: 2.5, dir: 1, mag: 0.5, hold: 1.4 };
  let stretchAt = rnd(9, 14), stretchT0 = -99;
  let hopT0 = -99, wasHop = false, gHop = 0, lastGz = 0;
  const out = { bounce: 0, sx: 1, sy: 1 };

  function gazeValue(t) {
    const move = 0.4;
    if (g.phase === 'wait') { if (t >= g.until) { g.phase = 'go'; g.t0 = t; g.dir = Math.random() < 0.5 ? -1 : 1; g.mag = rnd(0.4, 0.75); g.hold = rnd(1.2, 2.2); } return 0; }
    const a = t - g.t0;
    if (g.phase === 'go') { if (a >= move + g.hold + move) { g.phase = 'wait'; g.until = t + rnd(1.2, 3.5); return 0; } return ss(a / move) * (1 - ss((a - move - g.hold) / move)) * g.dir * g.mag; }
    return 0;
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
    // 白目:ぴょんのあいだは、0 にもどす
    let gz;
    if (hopping) { if (!wasHop) { gHop = lastGz; g.phase = 'wait'; g.until = t + HOP_SECONDS + 1.2; } gz = gHop * (1 - ss(hs / 0.2)); }   // 見ていた向きから、すっと 0 にもどす
    else gz = gazeValue(t);
    wasHop = hopping; lastGz = gz;
    V[I.gazeR] = V[I.gazeL] = gz;
    // 伸び:ときどき、両腕をゆっくり上げて、保って、下ろす(左右同じ)
    if (!hopping && t >= stretchAt) { stretchT0 = t; stretchAt = t + rnd(14, 22); }
    const st = t - stretchT0;
    let arm = st >= 0 && st < 0.9 + 1.4 + 0.9 ? ss(st / 0.9) * (1 - ss((st - 2.3) / 0.9)) : 0;
    let foot = 0;
    if (st >= 0 && st < 3.2 && !hopping) bounce += ss(st / 0.9) * (1 - ss((st - 2.3) / 0.9)) * 22;
    if (hopping) {
      stretchT0 = -99; arm = 0;
      if (hs < 0.14) { const u = ss(hs / 0.14); sy = 1 - 0.06 * u; sx = 1 + 0.03 * u; bounce = 0; }                    // かがむ
      else if (hs < 0.54) { const u = (hs - 0.14) / 0.4, h = Math.sin(u * Math.PI / 2); bounce = 85 * h; sy = 1 + 0.04 * h; sx = 1 - 0.02 * h;   // のぼる
        arm = ss(u * 2.5); foot = 0.5 * ss(u * 2); }
      else if (hs < 0.94) { const u = (hs - 0.54) / 0.4, h = Math.cos(u * Math.PI / 2); bounce = 85 * h; sy = 1 + 0.04 * h; sx = 1 - 0.02 * h;    // おりる
        arm = 1 - ss((u - 0.35) / 0.65); foot = 0.5 * (1 - ss((u - 0.55) / 0.45)); }
      else { const u = (hs - 0.94) / 0.26; sy = 1 - 0.07 * Math.sin(u * Math.PI); sx = 1 + 0.035 * Math.sin(u * Math.PI); bounce = 0; }  // 着地
    }
    V[I.armR] = V[I.armL] = arm === 0 ? 0 : -arm;
    V[I.footR] = V[I.footL] = foot;
    out.bounce = bounce; out.sx = sx; out.sy = sy;
    return out;
  }

  return { update, hop(now) { const t = now / 1000; if (t - hopT0 >= HOP_SECONDS) hopT0 = t; } };
}
