// スタッフクレジット:下から上へ流れるスタッフロール。流れている後ろで、シューティングが遊べる(shooter.js)。
// 載せる内容は CREDITS の表。names が空の行は、画面に出さない(名前が決まったら、ここに足す)。
import { createShooter } from "./shooter.js";

export const CREDITS = [
  { role: "キャラクター", names: ["フロリ"] },
  { role: "企画・制作", names: [] },
  { role: "問題・解説の作成", names: ["Claude"] },
  { role: "プログラム", names: ["Claude"] },
  { role: "問題のイラスト・着せ替えの絵", names: ["ChatGPT"] },
  { role: "BGM", names: ["オリジナル曲", "(ブラウザの中で 演奏しています)"] },
  { role: "文字(フォント)", names: ["Zen Maru Gothic", "(Google Fonts)"] },
  { role: "ご意見・動作確認", names: ["ご協力くださった みなさん"] },
  { role: "Special Thanks", names: ["あそんでくれた あなた"] },
];

export const CREDITS_THANKS = "あそんでくれて ありがとう!";
const ROLL_SPEED = 36; // 流れる速さ(1秒に進むピクセル)
const ROLL_PAUSE = 1.8; // 最後まで流れたあと、また始まるまでの間(秒)

const $ = (id) => document.getElementById(id);

function buildRoll() {
  const roll = $("credits-roll");
  const parts = [];
  const title = document.createElement("div");
  title.className = "cr-title";
  title.innerHTML = '<span class="cr-title-sub">ひらめきクイズ</span><span class="cr-title-main">Flori_Quiz</span>';
  parts.push(title);
  for (const row of CREDITS.filter((item) => item.names.length > 0)) {
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
