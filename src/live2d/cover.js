// 表紙のフロリの試作ページ:ふだんは、おだやかに動き、画面をクリック(タップ・Enter・Space)すると、ぴょんと跳ねる。
import { loadModel, draw } from './live2d.js';
import { createMotion } from './flori-motion.js';

const model = await loadModel('./');
const motion = createMotion(model);
const cv = document.getElementById('cv'), ctx = cv.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;   // 動きをへらす設定の人には、動かさない

// フロリが見える範囲(キャンバス座標)。上に、ジャンプの分のあきをつける
const view = { x: 250, y: 450, w: 2400, h: 3250 };
const foot = { px: 1450, py: 3470 };
const bg = model.meshes.findIndex(m => m.name === 'BG');
const hide = new Set([bg]);

function resize() {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr);
}
addEventListener('resize', resize); resize();

function frame(now) {
  const m = reduced ? { bounce: 0, sx: 1, sy: 1 } : motion.update(now);
  draw(model, ctx, { ...view, y: view.y + m.bounce }, { hide, squash: { sx: m.sx, sy: m.sy, ...foot } });
  if (!reduced) requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

if (!reduced) {
  addEventListener('pointerdown', () => motion.hop(performance.now()));
  addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') motion.hop(performance.now()); });
}
window.model = model; window.motion = motion;
