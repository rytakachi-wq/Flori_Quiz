// クイズのルール:フリップ(めくる板)形式。遊び方のチュートリアルと同じように、「次へ」を押すと次の場面へ進む。
// 選んだ遊び方に合わせて、場面が変わる:普通(黄色)・難しい(オレンジ)・RPGクエスト(赤)・皆で対戦(薄紫)。画面の色も、遊び方で変わる。

const Q = '<div class="rf-q"><span class="rf-qn">Q</span> りんご3こ+みかん2こ=?</div>';
const CH = (cls = "") => `<div class="rf-ch ${cls}"><span>4こ</span><span class="rf-ok">5こ</span><span>6こ</span></div>`;
const PLAYER = (n, face) => `<span class="rf-pl p${n}" style="--n:${n - 1}"><i>${face}</i><b>プレイヤー${n}</b></span>`;
const ROUND = (n) => `<span class="rf-rd r${n}" style="--n:${n - 1}"><b>${n}回戦</b><em>${"★".repeat(n)}${"☆".repeat(3 - n)}</em><strong>${n}点</strong></span>`;

const COMMON = [
  {
    title: "① 答えを 選ぶ",
    caption: "問題の答えを 選ぼう。正解すると 点が もらえるよ!",
    html: `${Q}${CH("f1")}<span class="rf-badge rf-good b1">⭕ 正解! +1点</span><span class="rf-finger fg1">👆</span>`,
  },
  {
    title: "② ヒント",
    caption: "ヒントを 見ると その問題の 点が 半分に なるよ。",
    html: `${Q}${CH()}<span class="rf-btn rf-hintbtn">💡 ヒント</span><span class="rf-hinttext">たし算を してみよう</span><span class="rf-pts"><s>1点</s> → <b>0.5点</b><small>半分</small></span><span class="rf-finger fg2">👆</span>`,
  },
  {
    title: "③ 分からない",
    caption: "「分からない」を 押すと 答えが 見られるよ。でも 不正解に なるよ。",
    html: `${Q}${CH()}<span class="rf-btn rf-givebtn">🤔 分からない</span><span class="rf-answer">答えは 「5こ」</span><span class="rf-badge rf-bad b3">❌ 不正解 0点</span><span class="rf-finger fg3">👆</span>`,
  },
  {
    title: "④ 制限時間",
    caption: "制限時間を つけると 1問 30秒。時間切れは 不正解。",
    html: `<div class="rf-clock"><span class="rf-clock-n">⏱ 30秒</span><span class="rf-bar"><i></i></span><span class="rf-over">⏰ 時間切れ!</span></div>`,
  },
];

const SOLO = [
  {
    title: "① 1回は 5問",
    caption: "1回は 5問。正解すると 1問で 1点。5問 全部で 5点満点だよ。",
    html: `<div class="rf-five">${[1, 2, 3, 4, 5].map((n) => `<span style="--n:${n - 1}"><b>${n}</b><em>+1</em></span>`).join("")}</div><span class="rf-total">合計 5点満点</span>`,
  },
  {
    title: "② 続くと 難しく",
    caption: "正解が 続くと 問題が 難しく。全部の問題で 100点満点の 総合得点を 目指そう!",
    html: `<div class="rf-ladder"><span class="l1">難しさ ★☆☆☆</span><span class="l2">難しさ ★★☆☆</span><span class="l3">難しさ ★★★☆</span></div><div class="rf-chain"><span>⭕</span><span>⭕</span><span>⭕</span><em>⬆ 難しく!</em></div><span class="rf-total t100">🏆 総合得点 100点満点</span>`,
  },
];

const VS = [
  {
    title: "① 順番に 1問ずつ",
    caption: "1台の画面を 皆で 使って 順番に 1問ずつ 答えるよ。ヒントも 使えるよ。",
    html: `<div class="rf-players">${PLAYER(1, "🙂")}${PLAYER(2, "😀")}${PLAYER(3, "😎")}${PLAYER(4, "🤗")}</div><span class="rf-turn">👉 順番に 答える</span>`,
  },
  {
    title: "② 3回戦で 勝負",
    caption: "あとの回戦ほど 点が 大きいよ。合計点が 1番 高い人の 勝ち!",
    html: `<div class="rf-rounds">${ROUND(1)}${ROUND(2)}${ROUND(3)}</div><span class="rf-crown">👑 合計点が 1番の人が 勝ち!</span>`,
  },
];

const HEART = '<img class="rf-heart" src="../assets/illust/heart.webp" alt="">';
const HEART_HALF = `<span class="rf-hw">${'<img class="rf-heart is-off" src="../assets/illust/heart.webp" alt="">'}<img class="rf-heart is-half" src="../assets/illust/heart.webp" alt=""></span>`;
const HEART_OFF = '<img class="rf-heart is-off" src="../assets/illust/heart.webp" alt="">';
const SEQ = (items, cls = "") =>
  `<div class="rf-seq ${cls}">${items.map(([icon, note], n) => `<span class="rf-seq-item" style="--n:${n}"><b>${icon}</b><small>${note}</small></span>`).join("")}</div>`;
const HEARTS = (list, cls = "") => `<div class="rf-hearts ${cls}">${list.join("")}</div>`;
const STACK = (...parts) => `<div class="rf-stack">${parts.join("")}</div>`;

// 難しいモード
const HARD = [
  {
    title: "② 難しい問題",
    caption: "難しい問題だけが 出るよ。正解すると 1問で 1点。全部の問題で 100点満点の 総合得点を 目指そう!",
    html: `${SEQ([["🔥", "難しい問題"], ["⭕", "正解"], ["🏆", "総合得点"]])}`,
  },
];

// RPGクエスト
const RPG = [
  {
    title: "① 5つの マス",
    caption: "5つのマスを 進んで ボスの ドラゴンを たおそう!",
    html: SEQ([["🐭", "ザコ"], ["🎁", "たからばこ"], ["🦂", "つよい敵"], ["🐉", "ボス"]]),
  },
  {
    title: "② ハートは 4つ",
    caption: "ハートは 4つ。まちがえると 1つ へって、0に なると ゲームオーバーだよ。",
    html: STACK(HEARTS([HEART, HEART, HEART, HEART], "rf-lose"), '<span class="rf-note">まちがえると… ハート -1</span>'),
  },
  {
    title: "③ たたかい",
    caption: "正解すると 敵に こうげき! まちがえると 敵に やられて ハートが 1つ へるよ。",
    html: SEQ([["✅", "正解"], ["⚔️", "こうげき"], ["❌", "まちがい"], ["💔", "ハート -1"]]),
  },
  {
    title: "④ ヒント",
    caption: "ヒントを 見ると ハートが 半分 へるよ。ハートが 半分しか ないときは 見られないよ。",
    html: STACK(SEQ([["💡", "ヒントを 見る"]]), HEARTS([HEART, HEART, HEART, HEART_HALF]), '<span class="rf-note">ハート 半分</span>'),
  },
  {
    title: "⑤ たからばこ・ボス",
    caption: "たからばこは 正解で ハートが 1つ 回復! ボスは 2回 正解すると たおせるよ。",
    html: SEQ([["🎁", "回復"], ["🐉", "ボス"], ["⚔️", "2回 こうげき"]]),
  },
  {
    title: "⑥ まちがい・クリア",
    caption: "まちがえた問題は まちがいノートに 入るよ。ハートが 0に なる前に ドラゴンを たおそう!",
    html: SEQ([["❌", "まちがい"], ["📓", "ノート"], ["🏆", "クリア"]]),
  },
];

// 遊び方ごとの、場面・色・名札
const KINDS = {
  normal: { theme: "solo", tag: "🌱 1人で 普通", scenes: () => [...COMMON, ...SOLO] },
  hard: { theme: "hard", tag: "🔥 1人で 難しい", scenes: () => [...COMMON, SOLO[0], ...HARD] },
  rpg: { theme: "rpg", tag: "🗡️ RPGクエスト", scenes: () => RPG },
  versus: { theme: "vs", tag: "👥 皆で 対戦", scenes: () => [...COMMON, ...VS] },
};
let kind = "normal";
let SCENES = [];

let index = 0;
let onDone = null;
const $ = (id) => document.getElementById(id);

const CIRCLED = "①②③④⑤⑥⑦⑧⑨⑩";
function render() {
  const scene = SCENES[index];
  const screen = $("screen-rules");
  const info = KINDS[kind];
  screen.classList.remove("rf-solo", "rf-hard", "rf-rpg", "rf-vs");
  screen.classList.add(`rf-${info.theme}`);
  $("rf-tag").textContent = info.tag;
  $("rf-title").textContent = `${CIRCLED[index] ?? ""} ${scene.title.replace(/^[①-⑩]\s*/, "")}`; // 番号は、場面の順につける
  $("rf-caption").textContent = scene.caption;
  $("rf-skip").textContent = `ルールを とばして ${lastEndLabel === "クイズのモード選択へ" ? "モード選択へ" : lastEndLabel}`;
  const stage = $("rf-stage");
  stage.replaceChildren();
  stage.insertAdjacentHTML("beforeend", scene.html);
  stage.className = `rf-stage rf-s${index + 1}`;
  void stage.offsetWidth; // 動きを、はじめからやりなおす
  $("rf-dots").replaceChildren(
    ...SCENES.map((item, i) => {
      const dot = document.createElement("span");
      dot.className = `tut-dot rf-dot-${info.theme}${i === index ? " is-on" : i < index ? " is-done" : ""}`;
      return dot;
    }),
  );
  $("rf-prev").disabled = index === 0;
  $("btn-rules-next").innerHTML = index === SCENES.length - 1 ? `${lastEndLabel} <span aria-hidden="true">▶</span>` : '次へ <span aria-hidden="true">▶</span>';
}

// 遊び方(normal・hard・rpg・versus)に合わせた、ルールを開く。done:最後まで見たとき・とばしたとき(なければ、はじめに渡したもの)
export function openRules(nextKind = "normal", done = null, endLabel = "クイズのモード選択へ") {
  lastEndLabel = endLabel;
  kind = KINDS[nextKind] ? nextKind : "normal";
  SCENES = KINDS[kind].scenes();
  onDone = done ?? defaultDone;
  index = 0;
  render();
}

let defaultDone = null;
let lastEndLabel = "クイズのモード選択へ";
export function initRules(done) {
  defaultDone = done;
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
