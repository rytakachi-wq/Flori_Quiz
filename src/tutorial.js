// 遊び方の、チュートリアルムービー。絵と動きで、6つの場面を見せる(動画ファイルではなく、画面の中で動かす)。
// 場面は、「次へ」ボタンを押したときだけ進む(自動では進まない)。「戻る」「閉じる」も、ボタンで。

const FLORI = "../assets/flori/src/body_wave.webp";

const SCENES = [
  {
    title: "STEP 1 選ぼう",
    caption: "「クイズ」を押して ルールを見たら、1人か皆で・分類・難しさ・時間を 1つの画面で 選んで スタート!",
    html: `
      <div class="tm-set">
        <div class="tm-srow"><span class="tm-btn mini c3 is-hit"><i>🙂</i><small>1人</small></span><span class="tm-btn mini c2"><i>👥</i><small>皆で</small></span></div>
        <div class="tm-srow"><span class="tm-btn mini c1"><i>🔬</i><small>理系</small></span><span class="tm-btn mini c4"><i>📖</i><small>文系</small></span><span class="tm-btn mini c3"><i>💡</i><small>ひらめき</small></span><span class="tm-btn mini c6"><i>🎲</i><small>ランダム</small></span></div>
        <div class="tm-srow"><span class="tm-btn mini c5"><i>🌱</i><small>普通</small></span><span class="tm-btn mini c6"><i>🔥</i><small>難しい</small></span></div>
        <span class="tm-go">▶ スタート!</span>
      </div>
      <span class="tm-finger tm-finger-1">👆</span>`,
  },
  {
    title: "STEP 2 難しさと時間",
    caption: "「普通」か「難しい」を選んで 制限時間を付けるかも選ぶよ。",
    html: `
      <div class="tm-rows">
        <div class="tm-row"><span class="tm-btn c5"><i>🌱</i><small>普通</small></span><span class="tm-btn c6 is-hit"><i>🔥</i><small>難しい</small></span></div>
        <div class="tm-row"><span class="tm-btn c7 is-hit2"><i>⏱</i><small>時間あり</small></span><span class="tm-btn c8"><i>🙂</i><small>時間なし</small></span></div>
      </div>
      <span class="tm-finger tm-finger-2">👆</span>`,
  },
  {
    title: "STEP 3 答えよう",
    caption: "4つの答えから1つ選ぼう。正解すると点がもらえるよ!",
    html: `
      <div class="tm-q">
        <div class="tm-qbar"><i>❓</i></div>
        <div class="tm-choices">
          <span class="tm-choice">1</span><span class="tm-choice">2</span>
          <span class="tm-choice is-right">3<b>✔</b></span><span class="tm-choice">4</span>
        </div>
        <div class="tm-score">+2点</div>
      </div>
      <span class="tm-finger tm-finger-3">👆</span>`,
  },
  {
    title: "STEP 4 困ったら",
    caption: "「ヒント」を見ると1点減るけど ヒントが出るよ。「分からない」を押すと答えが見られるけど 不正解になるよ。",
    html: `
      <div class="tm-help">
        <span class="tm-btn c9 is-hit"><i>💬</i><small>ヒント</small><em>-1点</em></span>
        <span class="tm-btn c10"><i>🤷</i><small>分からない</small><em>不正解</em></span>
      </div>
      <div class="tm-hint">💡 ヒント:…</div>
      <span class="tm-finger tm-finger-4">👆</span>`,
  },
  {
    title: "STEP 5 ご褒美",
    caption: "正解を増やして 色々遊ぶと フロリの着せ替えがもらえるよ!",
    html: `
      <div class="tm-reward">
        <span class="tm-gift">🎁</span>
        <span class="tm-flori-wrap"><img class="tm-flori" src="${FLORI}" alt=""><img class="tm-hat" src="../assets/dress/head04.png" alt=""></span>
        <span class="tm-star s1">⭐</span><span class="tm-star s2">⭐</span><span class="tm-star s3">⭐</span>
      </div>`,
  },
  {
    title: "STEP 6 他にも色々",
    caption: "「その他」では 毎日1問・復習・リラックス・問題図鑑・着せ替え・成績が楽しめるよ!",
    html: `
      <div class="tm-menu">
        <span class="tm-btn c1" style="--n:0"><i>📅</i><small>毎日1問</small></span>
        <span class="tm-btn c2" style="--n:1"><i>📖</i><small>復習</small></span>
        <span class="tm-btn c3" style="--n:2"><i>🌸</i><small>リラックス</small></span>
        <span class="tm-btn c4" style="--n:3"><i>📚</i><small>問題図鑑</small></span>
        <span class="tm-btn c5" style="--n:4"><i>👑</i><small>着せ替え</small></span>
        <span class="tm-btn c6" style="--n:5"><i>🏆</i><small>成績</small></span>
      </div>`,
  },
];

let index = 0;
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
  $("tut-next").textContent = index === SCENES.length - 1 ? "もう1度 見る" : "次へ ▶";
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
  $("tut-next").focus({ preventScroll: true });
}

export function closeTutorial() {
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
  });
}
