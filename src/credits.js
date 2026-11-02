// スタッフクレジット:下から上へ流れるスタッフロール。流れている後ろで、シューティングが遊べる(shooter.js)。
// 載せる内容は CREDITS の表(映画のスタッフロールのように、見出しごとに、役割と名前をならべる)。
import { createShooter } from "./shooter.js";

// section は大きな見出し。role の行は、names が空なら画面に出さない。「（仮）」は、名前が決まったら入れかえる。
export const CREDITS = [
  { section: "出演" },
  { role: "ナビゲーター", names: ["フロリ"] },
  { role: "出題", names: ["理系 / 文系 / ひらめき"] },

  { section: "製作" },
  { role: "企画", names: ["（仮）"] },
  { role: "原案", names: ["（仮）"] },
  { role: "製作総指揮", names: ["（仮）"] },
  { role: "プロデューサー", names: ["（仮）"] },
  { role: "監督", names: ["（仮）"] },

  { section: "問題" },
  { role: "問題の作成", names: ["Claude"] },
  { role: "解説の作成", names: ["Claude"] },
  { role: "問題の監修", names: ["（仮）"] },
  { role: "オニ問題 作成", names: ["Claude"] },

  { section: "デザイン" },
  { role: "キャラクター「フロリ」", names: ["（仮）"] },
  { role: "問題のイラスト", names: ["ChatGPT"] },
  { role: "着せ替えのデザイン", names: ["ChatGPT"] },
  { role: "背景", names: ["（仮）"] },
  { role: "画面のデザイン", names: ["（仮）"] },
  { role: "文字(フォント)", names: ["Zen Maru Gothic", "(Google Fonts)"] },

  { section: "音" },
  { role: "BGM", names: ["オリジナル曲", "(ブラウザの中で 演奏しています)"] },
  { role: "効果音", names: ["効果音ラボ"] },

  { section: "プログラム" },
  { role: "プログラム", names: ["Claude"] },
  { role: "RPGクエスト", names: ["Claude"] },
  { role: "シューティング", names: ["Claude"] },
  { role: "技術協力", names: ["（仮）"] },

  { section: "テスト" },
  { role: "動作確認", names: ["（仮）"] },
  { role: "ご意見", names: ["（仮）"] },

  { section: "協力" },
  { role: "制作協力", names: ["（仮）"] },
  { role: "協力", names: ["（仮）"] },

  { section: "Special Thanks" },
  { role: "ご家族・ご友人", names: ["（仮）"] },
  { role: "そして", names: ["あそんでくれた あなた"] },
];

export const CREDITS_THANKS = "あそんでくれて ありがとう!";
const ROLL_SPEED = 62; // 流れる速さ(1秒に進むピクセル)
const ROLL_PAUSE = 1.8; // 最後まで流れたあと、また始まるまでの間(秒)

const $ = (id) => document.getElementById(id);

function buildRoll() {
  const roll = $("credits-roll");
  const parts = [];
  const title = document.createElement("div");
  title.className = "cr-title";
  title.innerHTML = '<span class="cr-title-sub">ひらめきクイズ</span><span class="cr-title-main">Flori_Quiz</span>';
  parts.push(title);
  for (const row of CREDITS.filter((item) => item.section || item.names.length > 0)) {
    if (row.section) {
      const head = document.createElement("h3");
      head.className = "cr-section";
      head.textContent = row.section;
      parts.push(head);
      continue;
    }
    const box = document.createElement("div");
    box.className = "cr-row";
    const role = document.createElement("p");
    role.className = "cr-role";
    role.textContent = row.role;
    box.append(role);
    for (const name of row.names) {
      const line = document.createElement("p");
      line.className = name.startsWith("(") ? "cr-note" : "cr-name";
      line.textContent = name;
      box.append(line);
    }
    parts.push(box);
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
let pause = 0;
let last = 0;

function messageFor({ state, best }) {
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
  $("credits-hud").hidden = info.state !== "playing";
}

function tick(now) {
  frame = requestAnimationFrame(tick);
  const dt = Math.min(0.05, (now - last) / 1000 || 0);
  last = now;
  const roll = $("credits-roll");
  const stageHeight = $("credits-stage").clientHeight;
  if (pause > 0) {
    pause -= dt;
    if (pause <= 0) rollY = stageHeight;
  } else {
    rollY -= ROLL_SPEED * dt;
    if (rollY < -roll.offsetHeight) pause = ROLL_PAUSE;
  }
  roll.style.transform = `translateY(${Math.round(rollY)}px)`;
  shooter.update(dt);
  shooter.draw();
}

export function openCredits() {
  buildRoll();
  if (!shooter) {
    shooter = createShooter({ stage: $("credits-stage"), canvas: $("credits-canvas"), onChange: render });
    window.addEventListener("resize", () => shooter.resize());
  }
  cancelAnimationFrame(frame);
  shooter.open();
  shooter.setActive(true);
  rollY = $("credits-stage").clientHeight;
  pause = 0;
  last = performance.now();
  frame = requestAnimationFrame(tick);
}

export function closeCredits() {
  cancelAnimationFrame(frame);
  frame = 0;
  shooter?.setActive(false);
}
