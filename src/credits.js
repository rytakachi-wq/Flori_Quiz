// スタッフクレジット:下から上へ流れるスタッフロール。流れている後ろで、シューティングが遊べる(shooter.js)。
// 載せる内容は CREDITS の表(映画のスタッフロールのように、見出しごとに、役割と名前をならべる)。
import { createShooter } from "./shooter.js";
import { playSe, setScene } from "./audio.js";

// section は大きな見出し。{ br: true } は、そこで行を改める(次の項目は、つぎの行へ)。{ space: N } は、Nピクセルの間をあける。role の行は、names が空なら画面に出さない。「（仮）」は、名前が決まったら入れかえる。
export const CREDITS = [
  { section: "出演" },
  { role: "ナビゲーター", names: ["フロリ"] },
  { br: true },
  { role: "出題", names: ["理系 / 文系 / ひらめき"] },

  { section: "製作" },
  { role: "企画", names: ["（仮）"] },
  { role: "原案", names: ["（仮）"] },
  { role: "製作総指揮", names: ["（仮）"] },
  { role: "プロデューサー", names: ["（仮）"] },

  { section: "問題" },
  { role: "問題の作成", names: ["Claude"] },
  { role: "解説の作成", names: ["Claude"] },
  { br: true },
  { role: "問題の監修", names: ["（仮）"] },

  { section: "デザイン" },
  { role: "キャラクター「フロリ」", names: ["（仮）"] },
  { br: true },
  { role: "背景", names: ["（仮）"] },
  { role: "画面のデザイン", names: ["（仮）"] },
  { br: true },
  { role: "問題のイラスト", names: ["ChatGPT"] },
  { role: "着せ替えのデザイン", names: ["ChatGPT"] },
  { br: true },
  { role: "文字(フォント)", names: ["Zen Maru Gothic", "(Google Fonts)"] },

  { section: "音" },
  { role: "BGM", names: ["オリジナル曲", "(ブラウザの中で 演奏しています)"] },
  { role: "効果音", names: ["効果音ラボ"] },

  { section: "プログラム" },
  { role: "プログラム", names: ["Claude"] },
  { role: "出題・採点の仕組み", names: ["Claude"] },
  { role: "画面の動き", names: ["Claude"] },
  { role: "ふりがなの仕組み", names: ["Claude"] },
  { role: "着せ替えの仕組み", names: ["Claude"] },
  { role: "成績・記録の仕組み", names: ["Claude"] },
  { role: "BGMの演奏", names: ["Claude"] },
  { br: true },
  { role: "技術協力", names: ["（仮）"] },
  { role: "システム設計", names: ["（仮）"] },

  { section: "テスト" },
  { role: "動作確認", names: ["（仮）"] },

  { section: "協力" },
  { role: "協力", names: ["（仮）"] },

  { section: "監督" },
  { role: "", names: ["（仮）"] },

  { space: 90 },
  { section: "Special Thanks" },
  { role: "", names: ["あそんでくれた あなた"] },
];

export const CREDITS_THANKS = "あそんでくれて ありがとう!";
const ROLL_SPEED = 62; // 流れる速さ(1秒に進むピクセル)
const NO_SPAWN_LEFT = 320; // ロールの終わりまで、これより近づいたら、落ちものを出さない(ピクセル)
const PER_LINE = 3; // 同じ行に ならべる数(最大)

const $ = (id) => document.getElementById(id);

function buildRoll() {
  const roll = $("credits-roll");
  const parts = [];
  const title = document.createElement("div");
  title.className = "cr-title";
  title.innerHTML = '<span class="cr-title-sub">ひらめきクイズ</span><span class="cr-title-main">Flori_Quiz</span>';
  parts.push(title);
  let line = null;
  for (const row of CREDITS.filter((item) => item.section || item.br || item.space || item.names.length > 0)) {
    if (row.space) {
      const gap = document.createElement("div");
      gap.style.height = `${row.space}px`;
      parts.push(gap);
      line = null;
      continue;
    }
    if (row.br) {
      line = null;
      continue;
    }
    if (row.section) {
      const head = document.createElement("h3");
      head.className = "cr-section";
      head.textContent = row.section;
      parts.push(head);
      line = null;
      continue;
    }
    if (!line || line.children.length >= PER_LINE) {
      line = document.createElement("div");
      line.className = "cr-line";
      parts.push(line);
    }
    const box = document.createElement("div");
    box.className = "cr-row";
    if (row.role) {
      const role = document.createElement("p");
      role.className = "cr-role";
      role.textContent = row.role;
      box.append(role);
    }
    for (const name of row.names) {
      const note = document.createElement("p");
      note.className = name.startsWith("(") ? "cr-note" : "cr-name";
      note.textContent = name;
      box.append(note);
    }
    line.append(box);
  }
  const end = document.createElement("div");
  end.className = "cr-end";
  end.textContent = CREDITS_THANKS;
  parts.push(end);
  roll.replaceChildren(...parts);
}

let shooter = null;
let frame = 0;
let rollY = 0;
let finished = false;
let resultTimer = 0;
let last = 0;

function messageFor({ state, best }) {
  if (state === "ended") return "";
  if (state === "idle") return "画面を タッチして シューティング!\n(ドラッグで フロリを 動かそう)";
  if (state === "over") return `ゲームオーバー!  最高 ${best}点\nタッチで もう1回`;
  return "";
}

function render(info) {
  $("credits-score").textContent = `${info.score}点`;
  $("credits-hearts").textContent = info.state === "idle" ? "" : "💖".repeat(Math.max(0, info.lives));
  const message = messageFor(info);
  const box = $("credits-msg");
  if (box.dataset.text !== message) {
    box.dataset.text = message;
    box.textContent = message;
  }
  box.hidden = message === "";
  box.classList.toggle("is-center", info.state === "ended"); // 終了・結果発表の文字は、画面の真ん中に
  $("credits-hud").hidden = info.state !== "playing";
}

function tick(now) {
  frame = requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  const roll = $("credits-roll");
  if (!finished) {
    rollY -= ROLL_SPEED * dt;
    // 終わりが近づいたら(のこり約5秒)、新しい落ちものは出さない
    shooter.setSpawning(rollY + roll.offsetHeight > NO_SPAWN_LEFT);
    roll.style.transform = `translateY(${Math.round(rollY)}px)`;
    if (rollY < -roll.offsetHeight) beginResult();
  }
  shooter.update(dt);
  shooter.draw();
}

// スタッフロールが流れ終わったら、シューティングの結果発表(点とたおした数だけ。ランクのような ひとことは つけない)
// 流れ終わったら、「スタッフロール 終了!」のホイッスル → ドラムロール → 結果発表
function beginResult() {
  finished = true;
  shooter.finish(); // ここで、シューティングは止まる
  $("credits-hud").hidden = true;
  $("credits-msg").dataset.text = "スタッフロール 終了!";
  $("credits-msg").textContent = "スタッフロール 終了!";
  $("credits-msg").hidden = false;
  playSe("whistle");
  setScene("credits-end"); // 終了からドラムロールの間は、BGMを止める
  // ホイッスルのあと、ドラムロール(約2.2秒)→ 結果発表
  resultTimer = setTimeout(() => {
    $("credits-msg").dataset.text = "結果発表!";
    $("credits-msg").textContent = "結果発表!";
    playSe("drumroll", 2200);
    resultTimer = setTimeout(showResult, 2200);
  }, 1600);
}

function showResult() {
  const { played, best, kills } = shooter.finish();
  $("credits-hud").hidden = true;
  $("credits-msg").hidden = true;
  $("cres-title").textContent = played ? "シューティング 結果発表!" : "スタッフロール 終わり";
  $("cres-score").textContent = played ? `${best}点` : "";
  $("cres-kills").textContent = played ? `たおした数 ${kills}こ` : "";
  $("cres-comment").textContent = played ? "" : "次は シューティングにも ちょうせんしてね!";
  $("cres-comment").hidden = played;
  $("credits-result").hidden = false;
  playSe("rollend");
  setScene("credits"); // 結果発表のあとは、BGMが、また始まる
}

export function openCredits() {
  buildRoll();
  if (!shooter) {
    shooter = createShooter({ stage: $("credits-stage"), canvas: $("credits-canvas"), onChange: render });
    window.addEventListener("resize", () => shooter.resize());
    $("cres-again").addEventListener("click", openCredits);
  }
  cancelAnimationFrame(frame);
  clearTimeout(resultTimer);
  shooter.open();
  shooter.setSpawning(true);
  shooter.setActive(true);
  rollY = $("credits-stage").clientHeight;
  finished = false;
  $("credits-result").hidden = true;
  last = performance.now();
  frame = requestAnimationFrame(tick);
}

export function closeCredits() {
  cancelAnimationFrame(frame);
  clearTimeout(resultTimer);
  frame = 0;
  shooter?.setActive(false);
}
