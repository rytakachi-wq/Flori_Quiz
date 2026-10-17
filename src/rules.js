// クイズのルール:フリップ(めくる板)形式。遊び方のチュートリアルと同じように、「次へ」を押すと次の場面へ進む。
// 共通のルール(青)→ 1人のルール(黄色)→ 皆で対戦のルール(薄紫)の順。場面によって、画面の色が変わる。

const Q = '<div class="rf-q"><span class="rf-qn">Q</span> りんご3こ+みかん2こ=?</div>';
const CH = (cls = "") => `<div class="rf-ch ${cls}"><span>4こ</span><span class="rf-ok">5こ</span><span>6こ</span></div>`;
const PLAYER = (n, face) => `<span class="rf-pl p${n}" style="--n:${n - 1}"><i>${face}</i><b>プレイヤー${n}</b></span>`;
const ROUND = (n) => `<span class="rf-rd r${n}" style="--n:${n - 1}"><b>${n}回戦</b><em>${"★".repeat(n)}${"☆".repeat(3 - n)}</em><strong>${n}点</strong></span>`;

const SCENES = [
  {
    theme: "common",
    tag: "どちらも 同じ",
    title: "① 答えを 選ぶ",
    caption: "問題の答えを 選ぼう。正解すると 点が もらえるよ!",
    html: `${Q}${CH("f1")}<span class="rf-badge rf-good b1">⭕ 正解! +2点</span><span class="rf-finger fg1">👆</span>`,
  },
  {
    theme: "common",
    tag: "どちらも 同じ",
    title: "② ヒント",
    caption: "ヒントを 見ると その問題の 点が 半分に なるよ。",
    html: `${Q}${CH()}<span class="rf-btn rf-hintbtn">💡 ヒント</span><span class="rf-hinttext">たし算を してみよう</span><span class="rf-pts"><s>2点</s> → <b>1点</b><small>半分</small></span><span class="rf-finger fg2">👆</span>`,
  },
  {
    theme: "common",
    tag: "どちらも 同じ",
    title: "③ 分からない",
    caption: "「分からない」を 押すと 答えが 見られるよ。でも 不正解に なるよ。",
    html: `${Q}${CH()}<span class="rf-btn rf-givebtn">🤔 分からない</span><span class="rf-answer">答えは 「5こ」</span><span class="rf-badge rf-bad b3">❌ 不正解 0点</span><span class="rf-finger fg3">👆</span>`,
  },
  {
    theme: "common",
    tag: "どちらも 同じ",
    title: "④ 制限時間",
    caption: "制限時間を つけると 1問 30秒。時間切れは 不正解。",
    html: `<div class="rf-clock"><span class="rf-clock-n">⏱ 30秒</span><span class="rf-bar"><i></i></span><span class="rf-over">⏰ 時間切れ!</span></div>`,
  },
  {
    theme: "solo",
    tag: "🙂 1人で 遊ぶ",
    title: "① 1回は 5問",
    caption: "1回は 5問。正解すると 1問で 2点。5問 全部で 10点満点だよ。",
    html: `<div class="rf-five">${[1, 2, 3, 4, 5].map((n) => `<span style="--n:${n - 1}"><b>${n}</b><em>+2</em></span>`).join("")}</div><span class="rf-total">合計 10点満点</span>`,
  },
  {
    theme: "solo",
    tag: "🙂 1人で 遊ぶ",
    title: "② 続くと 難しく",
    caption: "正解が 続くと 問題が 難しく。全部の問題で 100点満点の 総合得点を 目指そう!",
    html: `<div class="rf-ladder"><span class="l1">難しさ ★☆☆☆</span><span class="l2">難しさ ★★☆☆</span><span class="l3">難しさ ★★★☆</span></div><div class="rf-chain"><span>⭕</span><span>⭕</span><span>⭕</span><em>⬆ 難しく!</em></div><span class="rf-total t100">🏆 総合得点 100点満点</span>`,
  },
  {
    theme: "vs",
    tag: "👥 皆で 対戦",
    title: "① 順番に 1問ずつ",
    caption: "1台の画面を 皆で 使って 順番に 1問ずつ 答えるよ。ヒントも 使えるよ。",
    html: `<div class="rf-players">${PLAYER(1, "🙂")}${PLAYER(2, "😀")}${PLAYER(3, "😎")}${PLAYER(4, "🤗")}</div><span class="rf-turn">👉 順番に 答える</span>`,
  },
  {
    theme: "vs",
    tag: "👥 皆で 対戦",
    title: "② 3回戦で 勝負",
    caption: "あとの回戦ほど 点が 大きいよ。合計点が 1番 高い人の 勝ち!",
    html: `<div class="rf-rounds">${ROUND(1)}${ROUND(2)}${ROUND(3)}</div><span class="rf-crown">👑 合計点が 1番の人が 勝ち!</span>`,
  },
];

let index = 0;
let onDone = null;
const $ = (id) => document.getElementById(id);

function render() {
  const scene = SCENES[index];
  const screen = $("screen-rules");
  screen.classList.remove("rf-common", "rf-solo", "rf-vs");
  screen.classList.add(`rf-${scene.theme}`);
  $("rf-tag").textContent = scene.tag;
  $("rf-title").textContent = scene.title;
  $("rf-caption").textContent = scene.caption;
  const stage = $("rf-stage");
  stage.replaceChildren();
  stage.insertAdjacentHTML("beforeend", scene.html);
  stage.className = `rf-stage rf-s${index + 1}`;
  void stage.offsetWidth; // 動きを、はじめからやりなおす
  $("rf-dots").replaceChildren(
    ...SCENES.map((item, i) => {
      const dot = document.createElement("span");
      dot.className = `tut-dot rf-dot-${item.theme}${i === index ? " is-on" : i < index ? " is-done" : ""}`;
      return dot;
    }),
  );
  $("rf-prev").disabled = index === 0;
  $("btn-rules-next").innerHTML = index === SCENES.length - 1 ? 'クイズのモード選択へ <span aria-hidden="true">▶</span>' : '次へ <span aria-hidden="true">▶</span>';
}

export function openRules() {
  index = 0;
  render();
}

export function initRules(done) {
  onDone = done;
  $("btn-rules-next").addEventListener("click", () => {
    if (index === SCENES.length - 1) onDone?.();
    else {
      index += 1;
      render();
    }
  });
  $("rf-prev").addEventListener("click", () => {
    index = Math.max(0, index - 1);
    render();
  });
  $("rf-skip").addEventListener("click", () => onDone?.());
}
