// 遊び方の、チュートリアルムービー。絵と動きで、6つの場面を見せる(動画ファイルではなく、画面の中で動かす)。
// 場面は、「次へ」ボタンを押したときだけ進む(自動では進まない)。「戻る」「閉じる」も、ボタンで。

import { HEADS } from "./badges.js";

const FLORI = "../assets/flori/m/body_wave.webp";

// 「ご褒美」の場面でかぶせる帽子(キャップ)。場所と大きさは、着せ替えの表(badges.js)と同じものを使う(表を直すと、ここも合う)
const DEMO_HAT = HEADS.find((item) => item.img.endsWith("/head04.png"));
function demoHatStyle() {
  const { x, y, w, r = 0, sx = 1, sy = 1 } = DEMO_HAT.pos;
  return `left:${x}%;top:${y}%;width:${w}%;--hat-r:${r}deg;--hat-sx:${sx};--hat-sy:${sy}`;
}

const PLAY_SCENES = [
  {
    title: "STEP 1 選ぼう",
    caption: "「クイズ」を押して 人数・分類・難しさ・制限時間を 選んで スタート!",
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
    caption: "「普通」か「難しい」を選んで 制限時間を付けるかも選ぼう。付けるとご褒美の星がもらえるよ。",
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
        <div class="tm-score">+1点</div>
      </div>
      <span class="tm-finger tm-finger-3">👆</span>`,
  },
  {
    title: "STEP 4 困ったら",
    caption: "「ヒント」を見ると 点が半分になるよ。「分からない」は答えが見られるけど 不正解だよ。",
    html: `
      <div class="tm-help">
        <span class="tm-btn c9 is-hit"><i>💬</i><small>ヒント</small><em>点が半分</em></span>
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
        <span class="tm-flori-wrap"><img class="tm-flori" src="${FLORI}" alt=""><img class="tm-hat" src="${DEMO_HAT.img}" alt="" style="${demoHatStyle()}"></span>
        <span class="tm-star s1">⭐</span><span class="tm-star s2">⭐</span><span class="tm-star s3">⭐</span>
      </div>`,
  },
  {
    title: "STEP 6 他にも色々",
    caption: "「その他」では 毎日1問・復習・リラックスが遊べるよ。",
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

// リラックス(お花畑)の説明・遊び方・コツ
const seq = (items, cls = "") => `<div class="tg-seq ${cls}">${SEQ(items)}</div>`;
const SEQ = (items) => items.map(([icon, note], n) => `<span class="tg-seq-item" style="--n:${n}"><b>${icon}</b><small>${note}</small></span>`).join("");
const cell = (mod = "", a = "🌱", b = "🌿") => `<span class="tg-c ${mod}"><b class="a">${a}</b><b class="b">${b}</b></span>`;
const RELAX_SCENES = [
  {
    title: "お花畑って?",
    caption: "木を育てて 全部を桜の木にする パズルだよ。点数も時間もないから のんびり遊んでね。",
    html: `<div class="tg">${seq([["🌱", "芽"], ["🌿", "枝"], ["🌳", "木"], ["🌸", "桜の木"]])}</div>`,
  },
  {
    title: "遊び方 1",
    caption: "木を押すと その木と 上下左右の木が 1つずつ育つよ。",
    html: `<div class="tg"><div class="tg-grid">
      ${cell("s")}${cell("up")}${cell("s")}
      ${cell("up")}<span class="tg-c up tap"><b class="a">🌱</b><b class="b">🌿</b><span class="tg-finger">👆</span></span>${cell("up")}
      ${cell("s")}${cell("up")}${cell("s")}
    </div></div>`,
  },
  {
    title: "遊び方 2",
    caption: "桜の木の次は 芽に戻るよ。全部を桜の木にしたらクリア!",
    html: `<div class="tg">${seq([["🌳", "木"], ["🌸", "桜の木"], ["🌱", "芽に戻る"]], "wide")}<span class="tg-clear">✨ クリア! ✨</span></div>`,
  },
  {
    title: "コツ 1",
    caption: "上の段から順に そろえよう。上の木を育てたいときは そのすぐ下の木を押すよ。",
    html: `<div class="tg"><div class="tg-grid">
      ${cell("s", "🌸", "🌸")}${cell("up", "🌿", "🌳")}${cell("s", "🌸", "🌸")}
      ${cell("s", "🌳", "🌳")}<span class="tg-c up tap"><b class="a">🌳</b><b class="b">🌸</b><span class="tg-finger">👆</span></span>${cell("s", "🌳", "🌳")}
      ${cell("s", "🌱", "🌱")}${cell("up", "🌸", "🌱")}${cell("s", "🌱", "🌱")}
    </div></div>`,
  },
  {
    title: "コツ 2",
    caption: "同じ木は3回まで。4回押すと戻るよ。困ったら「ヒント」で 押す木が光るよ。",
    html: `<div class="tg">${seq([["🌱", "0回"], ["🌿", "1回"], ["🌳", "2回"], ["🌸", "3回"], ["🌱", "4回で戻る"]], "tight")}<span class="tg-bulb">💡 ヒント</span></div>`,
  },
];

// 毎日1問の説明
const DAILY_SCENES = [
  {
    title: "毎日1問",
    caption: "1日に1問だけ出る 今日の問題だよ。1日1回 挑戦できるよ。",
    html: `<div class="tg">${seq([["📅", "今日の問題"], ["❓", "1問だけ"]], "wide")}</div>`,
  },
  {
    title: "毎日1問",
    caption: "毎日続けて解くと 連続の日数がのびて ご褒美がもらえるよ。",
    html: `<div class="tg">${seq([["📅", "1日目"], ["📅", "2日目"], ["📅", "3日目"], ["🎁", "ご褒美"]])}</div>`,
  },
];

// 復習の説明
const REVIEW_SCENES = [
  {
    title: "復習",
    caption: "間違えた問題と ヒントを見て解いた問題が 出るよ。",
    html: `<div class="tg">${seq([["❌", "間違えた問題"], ["💡", "ヒントを見た問題"]], "wide")}</div>`,
  },
  {
    title: "復習",
    caption: "ヒントを見ないで 正解すると 復習から消えるよ。",
    html: `<div class="tg">${seq([["📖", "復習"], ["✅", "正解"], ["✨", "消える"]], "wide")}</div>`,
  },
  {
    title: "復習",
    caption: "制限時間は付かないよ(急がず じっくり 思い出す練習にするため)。",
    html: `<div class="tg">${seq([["⏱", "制限時間"], ["🚫", "付かない"]], "wide")}</div>`,
  },
];

PLAY_SCENES.push(
  {
    title: "補足 毎日1問",
    caption: "「その他」の「毎日1問」は 1日に1問だけ出る 今日の問題。毎日続けると ご褒美がもらえるよ。",
    html: `<div class="tg">${seq([["📅", "1日目"], ["📅", "2日目"], ["📅", "3日目"], ["🎁", "ご褒美"]])}</div>`,
  },
  {
    title: "補足 復習",
    caption: "「その他」の「復習」では 間違えた問題を もう1度 解けるよ。制限時間は付かないよ。",
    html: `<div class="tg">${seq([["❌", "間違えた"], ["📖", "復習"], ["✅", "正解"], ["✨", "消える"]])}</div>`,
  },
  {
    title: "補足 リラックス",
    caption: "「その他」の「リラックス」は 全部を桜の木にする お花畑のパズル。点数も時間もないよ。",
    html: RELAX_SCENES[1].html,
  },
);

const SCENE_SETS = { play: PLAY_SCENES, relax: RELAX_SCENES, daily: DAILY_SCENES, review: REVIEW_SCENES };
let SCENES = PLAY_SCENES;

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

export function openTutorial(closed, kind = "play") {
  onClose = closed ?? null;
  SCENES = SCENE_SETS[kind] ?? PLAY_SCENES;
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
