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
// パーツごとの表示(ファイルで非表示のパーツは、はじめオフ。BG は白地にしたいのでオフ)
const parts = document.createElement('details'); parts.innerHTML = '<summary>パーツの表示</summary>';
model.meshes.forEach((m, i) => {
  const l = document.createElement('label'); l.style.display = 'block';
  l.innerHTML = `<input type="checkbox"> ${m.name}${m.visible ? '' : '(ファイルでは非表示)'}`;
  const c = l.querySelector('input'); c.checked = m.visible && i !== bg;
  c.onchange = () => { c.checked ? (m.visible = true, hide.delete(i)) : (m.visible = false); redraw(); };
  if (!c.checked && i === bg) hide.add(i);
  parts.appendChild(l);
});
document.getElementById('ctl').appendChild(parts);
window.model = model; window.redraw = redraw; window.hide = hide;
redraw();
