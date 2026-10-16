// あそびかたの、チュートリアルムービー。絵と動きで、6つの場面を、じゅんばんに見せる(動画ファイルではなく、画面の中で動かす)。
// 自動で、つぎの場面へ進む。「つぎへ」「もどる」で、じぶんで進めてもよい。

const FLORI = "../assets/flori/src/body_wave.webp";
const SCENE_MS = 5600;

const SCENES = [
  {
    title: "① えらぼう",
    caption: "理系・文系・ひらめき・ランダムの、どれかを えらぶよ!",
    html: `
      <div class="tm-grid">
        <span class="tm-btn c1 is-hit"><i>🔬</i><small>理系</small></span>
        <span class="tm-btn c2"><i>📖</i><small>文系</small></span>
        <span class="tm-btn c3"><i>💡</i><small>ひらめき</small></span>
        <span class="tm-btn c4"><i>🎲</i><small>ランダム</small></span>
      </div>
      <span class="tm-finger tm-finger-1">👆</span>`,
  },
  {
    title: "② むずかしさと 時間",
    caption: "「ふつう」か「難しい」を えらんで、制限時間を つけるかも えらぶよ。",
    html: `
      <div class="tm-rows">
        <div class="tm-row"><span class="tm-btn c5"><i>🌱</i><small>ふつう</small></span><span class="tm-btn c6 is-hit"><i>🔥</i><small>難しい</small></span></div>
        <div class="tm-row"><span class="tm-btn c7 is-hit2"><i>⏱</i><small>時間あり</small></span><span class="tm-btn c8"><i>🙂</i><small>時間なし</small></span></div>
      </div>
      <span class="tm-finger tm-finger-2">👆</span>`,
  },
  {
    title: "③ こたえよう",
    caption: "4つの こたえから、1つ えらぼう。せいかいすると 点が もらえるよ!",
    html: `
      <div class="tm-q">
        <div class="tm-qbar"><i>❓</i></div>
        <div class="tm-choices">
          <span class="tm-choice">1</span><span class="tm-choice">2</span>
          <span class="tm-choice is-right">3<b>✔</b></span><span class="tm-choice">4</span>
        </div>
        <div class="tm-score">＋2点</div>
      </div>
      <span class="tm-finger tm-finger-3">👆</span>`,
  },
  {
    title: "④ こまったら",
    caption: "「ヒント」を見ると 1点へるけど、ヒントが 出るよ。「わからない」を おすと 答えが 見られるけど、不正解に なるよ。",
    html: `
      <div class="tm-help">
        <span class="tm-btn c9 is-hit"><i>💬</i><small>ヒント</small><em>−1点</em></span>
        <span class="tm-btn c10"><i>🤷</i><small>わからない</small><em>不正解</em></span>
      </div>
      <div class="tm-hint">💡 ヒント:…</div>
      <span class="tm-finger tm-finger-4">👆</span>`,
  },
  {
    title: "⑤ ごほうび",
    caption: "せいかいを ふやして、いろいろ やると、フロリの きせかえが もらえるよ!",
    html: `
      <div class="tm-reward">
        <span class="tm-gift">🎁</span>
        <span class="tm-flori-wrap"><img class="tm-flori" src="${FLORI}" alt=""><img class="tm-hat" src="../assets/dress/ribbon.png" alt=""></span>
        <span class="tm-star s1">⭐</span><span class="tm-star s2">⭐</span><span class="tm-star s3">⭐</span>
      </div>`,
  },
  {
    title: "⑥ みんなで 対戦",
    caption: "2〜4人で 1台の画面を つかって、じゅんばんに こたえて、点を きそえるよ!",
    html: `
      <div class="tm-versus">
        <span class="tm-face p1">😀</span><span class="tm-face p2">😎</span><span class="tm-face p3">🤗</span><span class="tm-face p4">🥳</span>
        <span class="tm-vs">⚔️</span>
        <span class="tm-trophy">🏆</span>
      </div>`,
  },
];

let index = 0;
let timer = 0;
let onClose = null;

const $ = (id) => document.getElementById(id);

function render() {
  const scene = SCENES[index];
  $("tut-title").textContent = scene.title;
  $("tut-caption").textContent = scene.caption;
  const stage = $("tut-stage");
  stage.replaceChildren();
  stage.insertAdjacentHTML("beforeend", scene.html);
  stage.className = `tut-stage tut-scene-${index + 1}`;
  void stage.offsetWidth; // 動きを、はじめからやりなおす
  $("tut-dots").replaceChildren(
    ...SCENES.map((_, i) => {
      const dot = document.createElement("span");
      dot.className = `tut-dot${i === index ? " is-on" : i < index ? " is-done" : ""}`;
      return dot;
    }),
  );
  $("tut-prev").disabled = index === 0;
  const last = index === SCENES.length - 1;
  $("tut-next").textContent = last ? "もういちど みる" : "つぎへ ▶";
  restartTimer();
}

function restartTimer() {
  clearTimeout(timer);
  if (index < SCENES.length - 1) timer = setTimeout(() => go(index + 1), SCENE_MS);
}

function go(next) {
  index = Math.min(SCENES.length - 1, Math.max(0, next));
  render();
}

export function openTutorial(closed) {
  onClose = closed ?? null;
  index = 0;
  $("tutorial").hidden = false;
  render();
  $("tut-skip").focus({ preventScroll: true });
}

export function closeTutorial() {
  clearTimeout(timer);
  $("tutorial").hidden = true;
  const callback = onClose;
  onClose = null;
  callback?.();
}

export function initTutorial() {
  $("tut-next").addEventListener("click", () => go(index === SCENES.length - 1 ? 0 : index + 1));
  $("tut-prev").addEventListener("click", () => go(index - 1));
  $("tut-skip").addEventListener("click", closeTutorial);
  $("tutorial").addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTutorial();
    if (event.key === "ArrowRight") go(index + 1);
    if (event.key === "ArrowLeft") go(index - 1);
  });
  // 画面を、横になぞっても、場面が、うごく
  let startX = null;
  $("tutorial").addEventListener("touchstart", (event) => (startX = event.touches[0].clientX), { passive: true });
  $("tutorial").addEventListener(
    "touchend",
    (event) => {
      if (startX === null) return;
      const dx = event.changedTouches[0].clientX - startX;
      startX = null;
      if (dx < -60) go(index + 1);
      else if (dx > 60) go(index - 1);
    },
    { passive: true },
  );
}
