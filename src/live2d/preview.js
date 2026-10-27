import { loadModel, draw } from './live2d.js';
const model = await loadModel('./');
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const bg = model.meshes.findIndex(m => m.name === 'BG');
const bp = model.meshes[bg].forms[0].pos;
const xs = bp.filter((_, i) => i % 2 === 0), ys = bp.filter((_, i) => i % 2 === 1);
const view = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
cv.width = 560; cv.height = Math.round(560 * view.h / view.w);
const hide = new Set([bg]);
const redraw = () => draw(model, ctx, view, { hide });
const sl = document.getElementById('sl'), inputs = [];
model.params.forEach((p, i) => {
  const l = document.createElement('label');
  l.innerHTML = `<span>${p.name}</span><input type="range" min="${p.min}" max="${p.max}" step="0.01" value="${p.default}"><output></output>`;
  const r = l.querySelector('input'), o = l.querySelector('output');
  const set = v => { model.values[i] = +v; o.textContent = (+v).toFixed(2); r.value = v; };
  r.oninput = () => { set(r.value); redraw(); };
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
  const look = Math.sin(s * 0.9);                                                   // 顔・目の左右
  v['顔'] = v['顔パーツ'] = look * 0.8;
  v['右白目　左右'] = v['左白目　左右'] = Math.sin(s * 0.9 + 0.8) * 0.8;
  v['右眉'] = v['左眉'] = Math.sin(s * 1.7) * 0.6;  // 左右とも同じ値で、左右対称
  v['下唇'] = Math.sin(s * 3) * 0.7;                                                // 口もごもご
  const cyc = s % 9;                                                                // 9秒で1周:右手バンザイ→左手バンザイ→コブシ
  const arm = (a, b) => -Math.sin(clamp01((cyc - a) / (b - a)) * Math.PI);
  v['右手バンザイ'] = arm(0.5, 2.5); v['左手バンザイ'] = arm(3, 5);
  v['右手コブシ'] = arm(5.5, 7.5); v['左手コブシ'] = arm(6, 8);
  v['右足'] = Math.max(0, Math.sin(s * 4)) * 0.4 * (cyc > 5.5 ? 1 : 0); v['左足'] = Math.max(0, -Math.sin(s * 4)) * 0.4 * (cyc > 5.5 ? 1 : 0);
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
window.model = model; window.redraw = redraw; window.hide = hide;
redraw();
