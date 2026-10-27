import { loadModel, draw } from './live2d.js';
const model = await loadModel('./');
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const bg = model.meshes.findIndex(m => m.name === 'BG');
const bp = model.meshes[bg].forms[0].pos;
const xs = bp.filter((_, i) => i % 2 === 0), ys = bp.filter((_, i) => i % 2 === 1);
const view = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
cv.width = 560; cv.height = Math.round(560 * view.h / view.w);
const hide = new Set([bg]);
const upIdx = model.params.findIndex(p => p.name === '上唇');
let bounce = 0;   // ルンルン・伸びのとき、からだ全体を上に動かす(キャンバス座標)
const redraw = () => { draw(model, ctx, { ...view, y: view.y + bounce }, { hide }); inputs[upIdx]?.(model.values[upIdx]); };  // 上唇は追尾するので、スライダーも合わせる
const sl = document.getElementById('sl'), inputs = [];
model.params.forEach((p, i) => {
  const l = document.createElement('label');
  l.innerHTML = `<span>${p.name}</span><input type="range" min="${p.min}" max="${p.max}" step="0.01" value="${p.default}"><output></output>`;
  const r = l.querySelector('input'), o = l.querySelector('output');
  const set = v => { model.values[i] = +v; o.textContent = (+v).toFixed(2); r.value = v; };
  r.oninput = () => {
    set(r.value);
    // 眉は、左右いっしょに動かす(ヽ／ と ／ヽ だけ。// にならない)
    const pair = { '右眉': '左眉', '左眉': '右眉' }[p.name];
    if (pair) inputs[model.params.findIndex(q => q.name === pair)](r.value);
    redraw();
  };
  inputs.push(set); set(p.default); sl.appendChild(l);
});
const preset = (name, vals) => {
  const b = document.createElement('button'); b.textContent = name;
  b.onclick = () => { model.params.forEach((p, i) => inputs[i](vals[p.name] ?? p.default)); redraw(); };
  document.getElementById('btns').appendChild(b);
};
preset('ふつう', {});
preset('両手バンザイ', { '右手バンザイ': -1, '左手バンザイ': -1 });
preset('右手だけ', { '右手バンザイ': -1 });
preset('コブシ上げ', { '右手コブシ': -1, '左手コブシ': -1 });
preset('顔 左', { '顔': -1, '顔パーツ': -1 });
preset('顔 右', { '顔': 1, '顔パーツ': 1 });
preset('まばたき', { '右上まぶた': -1, '右下まぶた': -1, '左上まぶた': -1, '左下まぶた': -1 });
// デモ再生(仮の動き):まばたき・顔の左右・眉・口・手上げ・足ふみ。スライダーも動く
const demoBtn = document.createElement('button'); demoBtn.textContent = '▶ デモ再生'; demoBtn.style.fontWeight = 'bold';
document.getElementById('btns').prepend(demoBtn);
let demo = 0;
const clamp01 = x => Math.max(0, Math.min(1, x));
const tick = t => {
  const s = t / 1000, v = {};
  const blink = (s % 3.2) < 0.18 ? Math.sin((s % 3.2) / 0.18 * Math.PI) : 0;      // 3.2秒ごと
  v['右上まぶた'] = v['左上まぶた'] = -blink; v['右下まぶた'] = v['左下まぶた'] = -blink;
  v['右白目　まばたき'] = v['左白目　まばたき'] = -blink;
  // 21秒で1周(場面ごとに、動かすところをしぼる):
  //  0.5〜 5 両手バンザイ(左右そろえて)/ 5.5〜 8.5 両手コブシ(同じ)/ 9〜12.5 ぴょんぴょん(腕は下、口・白目は動かさない)
  //  13〜16.5 顔の傾き / 17〜21 両腕の伸び。それ以外の場面は、顔を傾けないまま、目・眉・口を動かす
  const cyc = s % 21, inR = (a, b) => cyc >= a && cyc < b;
  const ss = x => { x = clamp01(x); return x * x * (3 - 2 * x); };                      // なめらかに 0→1
  // 「0 で待つ → 動かす → 少し見る → 0 にもどす」の山。t は 0 からの秒、w=待ち、u=動く、h=保つ
  const pulse = (t, w, u, h) => ss((t - w) / u) * (1 - ss((t - w - u - h) / u));
  const hop = ss(Math.min((cyc - 9) / 0.3, (12.5 - cyc) / 0.3));                           // ぴょんぴょんの強さ(0〜1)
  const tiltOn = inR(13, 16.5);
  // 顔(傾き):0 で 0.8秒待ってから、ゆっくり傾けて、少し保って、もどす。向きは、1周ごとにかわる
  const tdir = Math.floor(s / 21) % 2 ? 1 : -1;
  v['顔'] = v['顔パーツ'] = tiltOn ? pulse(cyc - 13, 0.8, 0.9, 0.5) * tdir * 0.6 : 0;
  // 目・眉:4.8秒で1回。前半(0〜2.4秒)は、白目が左右を見る / 後半(2.4〜4.8秒)は、眉がヽ／・／ヽに動き、そのあいだ目は寄り目。
  // 白目と眉は、同じ時間割(0 のまま 0.6秒待つ → 0.6秒かけてゆっくり動かす → 0.6秒保つ → 0.6秒かけてもどす)。顔の傾き・ぴょんぴょん中は、動かさない
  const tiltEnv = ss(Math.min((cyc - 13) / 0.5, (16.5 - cyc) / 0.5));   // 顔の傾きの場面に入る・出るとき、急にとまらないように
  const ec = s % 4.8, calm = (1 - hop) * (1 - tiltEnv);
  const gdir = Math.floor(s / 4.8) % 2 ? 1 : -1, gz = ec < 2.4 ? pulse(ec, 0.6, 0.6, 0.6) * gdir * 0.9 * calm : 0;
  const bdir = Math.floor(s / 4.8) % 2 ? 1 : -1, br = ec >= 2.4 ? pulse(ec - 2.4, 0.6, 0.6, 0.6) * calm : 0;
  v['右眉'] = v['左眉'] = br * bdir * 0.8;                                                // 左右同じ値(ヽ／ ↔ ／ヽ)
  // 寄り目:右の白目は −、左の白目は + に動かすと、両目とも真ん中へ寄る
  v['右白目　左右'] = gz - br * 0.9; v['左白目　左右'] = gz + br * 0.9;
  // 口:下唇が閉じ気味〜ふつうのあいだで動く(上唇は同じ値で追尾)。ぴょんぴょん中は動かさない
  v['下唇'] = (-0.45 + Math.sin(s * 3) * 0.5) * (1 - hop);
  // 腕:右を先に、左を少しおくらせて、同じ動きで上げ下げする(ひとまとまりの動きに見えるように)
  const arm = (a, b, r = 0.45) => -ss(Math.min((cyc - a) / r, (b - cyc) / r));
  v['右手バンザイ'] = v['左手バンザイ'] = arm(0.5, 4.5);   // 真上に上げる・もどすときは、左右そろえる
  v['右手コブシ'] = arm(5.5, 8.5); v['左手コブシ'] = arm(5.7, 8.7);
  // 伸び:両腕を、いっしょに、ゆっくり(0.9秒)上げて、保って、ゆっくり下ろす。からだも少し上に伸びる
  const stretch = arm(17, 21, 0.9);
  v['右手バンザイ'] = Math.min(v['右手バンザイ'], stretch); v['左手バンザイ'] = Math.min(v['左手バンザイ'], stretch);
  // ぴょんぴょん:空中ではつま先立ち(足 +0.5)→ 着地で通常立ち(0)。からだも はずむ
  const jump = Math.abs(Math.sin(s * Math.PI * 1.5)) ** 0.7, air = Math.abs(Math.sin(s * Math.PI * 1.5));
  v['右足'] = v['左足'] = 0.5 * air * hop;
  bounce = jump * 55 * hop - stretch * 35;
  model.params.forEach((p, i) => { if (p.name in v) inputs[i](Math.max(p.min, Math.min(p.max, v[p.name]))); });
  redraw();
};
let start = 0;
const loop = ts => { tick(ts - start); if (demo) demo = requestAnimationFrame(loop); };
demoBtn.onclick = () => {
  if (demo) { cancelAnimationFrame(demo); demo = 0; demoBtn.textContent = '▶ デモ再生'; return; }
  demo = requestAnimationFrame(ts => { start = ts; loop(ts); }); demoBtn.textContent = '■ とめる';
};
// パーツごとの表示(ファイルで非表示のパーツは、はじめオフ。BG は白地にしたいのでオフ)
const parts = document.createElement('details'); parts.innerHTML = '<summary>パーツの表示</summary>';
model.meshes.forEach((m, i) => {
  const l = document.createElement('label'); l.style.display = 'block';
  l.innerHTML = `<input type="checkbox"> ${m.name}${m.visible ? '' : '(ファイルでは非表示)'}`;
  const c = l.querySelector('input'); c.checked = (m.visible || /手バンザイ/.test(m.name)) && i !== bg;
  c.onchange = () => { c.checked ? (m.visible = true, hide.delete(i)) : (m.visible = false); redraw(); };
  if (/手バンザイ/.test(m.name)) m.visible = true; // 出し分けは、live2d.js の armHidden
  if (!c.checked && i === bg) hide.add(i);
  parts.appendChild(l);
});
document.getElementById('ctl').appendChild(parts);
window.model = model; window.redraw = redraw; window.hide = hide; window.tick = tick;
redraw();
