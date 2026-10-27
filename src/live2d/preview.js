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
  // 20秒で1周。顔を傾けるのは 11.5〜15秒だけ(そのあいだ眉は動かさない)。それ以外は、顔を傾けないまま、目・眉・口を動かす
  const cyc = s % 20, tiltOn = cyc >= 11.5 && cyc < 15;
  const ss = x => { x = clamp01(x); return x * x * (3 - 2 * x); };                      // なめらかに 0→1
  // 「0 で待つ → 動かす → 少し見る → 0 にもどす」の山。t は 0 からの秒、w=待ち、u=動く、h=保つ
  const pulse = (t, w, u, h) => ss((t - w) / u) * (1 - ss((t - w - u - h) / u));
  // 顔(傾き):0 で 0.8秒待ってから、ゆっくり傾けて、少し保って、もどす。向きは、1周ごとにかわる
  const tt = cyc - 11.5, tdir = Math.floor(s / 20) % 2 ? 1 : -1;
  v['顔'] = v['顔パーツ'] = tiltOn ? pulse(tt, 0.8, 0.9, 0.5) * tdir * 0.6 : 0;
  // 白目:3秒ごとに、0 のまま 0.8秒待ってから、左右どちらかへ動かし、しばらく見て、0 にもどす
  const gc = s % 3, gdir = Math.floor(s / 3) % 2 ? 1 : -1;
  v['右白目　左右'] = v['左白目　左右'] = pulse(gc, 0.8, 0.3, 1.1) * gdir * 0.9;
  // 眉:1.8秒ごとに、0 のまま 0.7秒待ってから、はやく動かし(0.15秒)、少し保って、0 にもどす。左右同じ値(ヽ／ ↔ ／ヽ)
  const bc = s % 1.8, bdir = Math.floor(s / 1.8) % 2 ? 1 : -1;
  v['右眉'] = v['左眉'] = tiltOn ? 0 : pulse(bc, 0.7, 0.15, 0.3) * bdir * 0.8;
  // 口:下唇が閉じ気味〜ふつうのあいだで動く(上唇は、同じ値で同じ速さに追尾)
  v['下唇'] = -0.45 + Math.sin(s * 3) * 0.5;
  // 腕:0.4秒で上げて、しばらく上げたまま、0.4秒で下ろす
  const arm = (a, b, r = 0.4) => -ss(Math.min((cyc - a) / r, (b - cyc) / r));
  v['右手バンザイ'] = arm(0.5, 3.5); v['左手バンザイ'] = arm(4, 7);
  v['右手コブシ'] = arm(7.5, 10.5); v['左手コブシ'] = arm(8, 11);
  // 伸び:両腕をいっしょに、ゆっくり(0.9秒)上げて、保って、ゆっくり下ろす。からだも少し上に伸びる
  const stretch = arm(15.5, 19.5, 0.9);
  v['右手バンザイ'] = Math.min(v['右手バンザイ'], stretch); v['左手バンザイ'] = Math.min(v['左手バンザイ'], stretch);
  // 足:ルンルン(7.5〜11秒)。左右がかわりばんこに、リズムよく上がって、からだもはずむ
  const lun = ss(Math.min((cyc - 7.5) / 0.5, (11 - cyc) / 0.5)), ph = s * Math.PI * 2 * 1.5;
  v['右足'] = Math.max(0, Math.sin(ph)) * 0.45 * lun; v['左足'] = Math.max(0, -Math.sin(ph)) * 0.45 * lun;
  bounce = Math.abs(Math.sin(ph)) * 45 * lun - stretch * 35;
  model.params.forEach((p, i) => { if (p.name in v) inputs[i](Math.max(p.min, Math.min(p.max, v[p.name]))); });
  redraw();
  if (demo) demo = requestAnimationFrame(tick);
};
demoBtn.onclick = () => {
  if (demo) { cancelAnimationFrame(demo); demo = 0; demoBtn.textContent = '▶ デモ再生'; return; }
  demo = requestAnimationFrame(tick); demoBtn.textContent = '■ とめる';
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
