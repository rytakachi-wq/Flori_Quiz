// Live2D(Cubism)で作ったフロリを、cmo3 から取り出したデータで動かして描く(自作の描画)。
// 対応: 回転デフォーマー・メッシュ・キーフォーム(複数パラメーター)。ワープ・クリップ・物理は未対応。
export async function loadModel(base) {
  const model = await (await fetch(base + 'model.json')).json();
  const imgs = new Map();
  // 開発用の簡易サーバーは、たまに接続を切るので、少しやり直す
  const load = (f, n = 0) => new Promise((ok, ng) => {
    const im = new Image(); im.onload = () => ok(im);
    im.onerror = () => (n < 4 ? setTimeout(() => load(f, n + 1).then(ok, ng), 300) : ng(new Error(f)));
    im.src = base + 'tex/' + f;
  });
  await Promise.all([...new Set(model.meshes.map(m => m.img))].map(async f => imgs.set(f, await load(f))));
  model.imgs = imgs;
  model.values = model.params.map(p => p.default);
  // 描画順は、ファイルの並びの逆(後ろから前)。顔は、体のすぐ上に重ねる
  const order = model.meshes.map((m, i) => i).reverse();
  const face = model.meshes.findIndex(m => m.name === '顔'), body = model.meshes.findIndex(m => m.name === '体');
  if (face >= 0 && body >= 0) { order.splice(order.indexOf(face), 1); order.splice(order.indexOf(body) + 1, 0, face); }
  // 上唇は、顔の上(下唇と同じ層)に出す
  const lip = model.meshes.findIndex(m => m.name === '上唇'), lower = model.meshes.findIndex(m => m.name === '下唇');
  if (lip >= 0 && lower >= 0) { order.splice(order.indexOf(lip), 1); order.splice(order.indexOf(lower), 0, lip); }
  model.drawOrder = order;
  return model;
}

// キーフォームの重みを、パラメーター値から求める(各軸は線形、軸どうしは掛け算)
function weights(model, binds, idx) {
  const axes = binds.map(b => {
    const v = model.values[b.param], k = b.keys;
    if (v <= k[0]) return [[0, 1]];
    if (v >= k[k.length - 1]) return [[k.length - 1, 1]];
    let i = 0; while (v > k[i + 1]) i++;
    const t = (v - k[i]) / (k[i + 1] - k[i]);
    return t === 0 ? [[i, 1]] : [[i, 1 - t], [i + 1, t]];
  });
  const res = [];
  const rec = (a, w, pick) => {
    if (a === axes.length) {
      const f = idx.findIndex(x => x.every((n, j) => n === pick[j]));
      if (f >= 0) res.push([f, w]);
      return;
    }
    for (const [i, ww] of axes[a]) rec(a + 1, w * ww, [...pick, i]);
  };
  rec(0, 1, []);
  return res;
}

function deformerTransform(model, d, cache) {
  if (cache[d]) return cache[d];
  const D = model.deformers[d];
  const w = weights(model, D.binds, D.idx);
  let angle = 0, ox = 0, oy = 0, sc = 0, tot = 0;
  for (const [f, k] of w) { const F = D.forms[f]; angle += F.angle * k; ox += F.ox * k; oy += F.oy * k; sc += F.scale * k; tot += k; }
  if (!tot) { const F = D.forms[0]; angle = F.angle; ox = F.ox; oy = F.oy; sc = F.scale; }
  const r = angle * Math.PI / 180, c = Math.cos(r) * sc, s = Math.sin(r) * sc;
  // 子の座標 p を、親の座標へ: origin + R(angle) * scale * p  (画面は y が下向き)
  let T = { a: c, b: s, c: -s, d: c, e: ox, f: oy };
  if (D.parent >= 0) {
    const P = deformerTransform(model, D.parent, cache);
    T = { a: P.a * T.a + P.c * T.b, b: P.b * T.a + P.d * T.b, c: P.a * T.c + P.c * T.d, d: P.b * T.c + P.d * T.d,
          e: P.a * T.e + P.c * T.f + P.e, f: P.b * T.e + P.d * T.f + P.f };
  }
  return (cache[d] = T);
}

// 上唇は、下唇に追尾させる(下唇が閉じる〈0 より小さい〉ときは、同じ値で同じ速さ。下唇が 0 以上のときは、上唇はふだんの形)
// 下唇だけが大きく開いて、上唇が小さいままだと、口の両はしが とがって見える(下唇の絵の はし)ので、
// 上唇と下唇が、ちぐはぐな組み合わせにならないようにしている。model.follow = false で、追尾しない
function followParams(model) {
  if (model.follow === false) return;
  const u = model.params.findIndex(p => p.name === '上唇'), l = model.params.findIndex(p => p.name === '下唇');
  if (u >= 0 && l >= 0) model.values[u] = Math.max(model.params[u].min, Math.min(model.params[u].default, model.values[l]));
}

// 現在の値で、各メッシュの頂点(キャンバス座標)・不透明度・描画順を計算
export function evaluate(model) {
  followParams(model);
  const cache = {};
  return model.meshes.map(m => {
    const w = weights(model, m.binds, m.idx);
    const n = m.pts.length;
    const pos = new Array(n).fill(0); let op = 0, order = 0, tot = 0;
    for (const [f, k] of w) { const F = m.forms[f]; for (let i = 0; i < n; i++) pos[i] += F.pos[i] * k; op += F.opacity * k; order += F.order * k; tot += k; }
    if (!tot) { const F = m.forms[0]; for (let i = 0; i < n; i++) pos[i] = F.pos[i]; op = F.opacity; order = F.order; }
    if (m.parent >= 0) {
      const T = deformerTransform(model, m.parent, cache);
      for (let i = 0; i < n; i += 2) { const x = pos[i], y = pos[i + 1]; pos[i] = T.a * x + T.c * y + T.e; pos[i + 1] = T.b * x + T.d * y + T.f; }
    }
    return { pos, op, order: Math.round(order) }; // 小数の誤差で、描く順番が入れかわる(ちらつく)のを防ぐ
  });
}

// 三角形ごとに、画像を貼る(アフィン変換)
function drawTri(ctx, im, u, p, grow) {
  const [u0, v0, u1, v1, u2, v2] = u, [x0, y0, x1, y1, x2, y2] = p;
  const det = (u1 - u0) * (v2 - v0) - (u2 - u0) * (v1 - v0);
  if (!det) return;
  const a = ((x1 - x0) * (v2 - v0) - (x2 - x0) * (v1 - v0)) / det;
  const c = ((x2 - x0) * (u1 - u0) - (x1 - x0) * (u2 - u0)) / det;
  const b = ((y1 - y0) * (v2 - v0) - (y2 - y0) * (v1 - v0)) / det;
  const d = ((y2 - y0) * (u1 - u0) - (y1 - y0) * (u2 - u0)) / det;
  const e = x0 - a * u0 - c * v0, f = y0 - b * u0 - d * v0;
  const cx = (x0 + x1 + x2) / 3, cy = (y0 + y1 + y2) / 3;
  const g = pt => { const dx = pt[0] - cx, dy = pt[1] - cy, l = Math.hypot(dx, dy) || 1; return [pt[0] + dx / l * grow, pt[1] + dy / l * grow]; };
  const q = [g([x0, y0]), g([x1, y1]), g([x2, y2])];
  ctx.save();
  ctx.beginPath(); ctx.moveTo(...q[0]); ctx.lineTo(...q[1]); ctx.lineTo(...q[2]); ctx.closePath(); ctx.clip();
  ctx.transform(a, b, c, d, e, f);
  ctx.drawImage(im, 0, 0);
  ctx.restore();
}

// 腕は、バンザイとコブシのどちらか一方だけ出す(バンザイの値が 0 でなければバンザイ、0 ならコブシ)。
// model.armAuto = false で、ファイルの表示のままにする
function armHidden(model, m) {
  if (model.armAuto === false) return false;
  const mm = /^(右|左)手(バンザイ|コブシ)$/.exec(m.name);
  if (!mm) return false;
  const p = model.params.findIndex(q => q.name === mm[1] + '手バンザイ');
  const up = Math.abs(model.values[p] - model.params[p].default) > 0.01; // 0 のまま動かさない(小数の誤差は無視)
  return up !== (mm[2] === 'バンザイ');
}

// ctx に描く。view = { x, y, w, h }(キャンバス座標の見える範囲)を、ctx 全体に合わせる
export function draw(model, ctx, view, opts = {}) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  const ev = evaluate(model);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, W, H);
  const k = Math.min(W / view.w, H / view.h);
  ctx.setTransform(k, 0, 0, k, (W - view.w * k) / 2 - view.x * k, (H - view.h * k) / 2 - view.y * k);
  const order = model.meshes.map((m, i) => i).sort((i, j) => (ev[i].order - ev[j].order) || (model.drawOrder.indexOf(i) - model.drawOrder.indexOf(j)));
  for (const i of order) {
    const m = model.meshes[i], e = ev[i];
    if (!m.visible || (opts.hide && opts.hide.has(i)) || armHidden(model, m)) continue;
    ctx.globalAlpha = e.op;
    const im = model.imgs.get(m.img);
    for (let t = 0; t < m.tri.length; t += 3) {
      const ix = [m.tri[t], m.tri[t + 1], m.tri[t + 2]];
      const u = ix.flatMap(v => [m.pts[v * 2] - m.ox, m.pts[v * 2 + 1] - m.oy]);
      const p = ix.flatMap(v => [e.pos[v * 2], e.pos[v * 2 + 1]]);
      drawTri(ctx, im, u, p, 0.4);
    }
  }
  ctx.globalAlpha = 1;
}
