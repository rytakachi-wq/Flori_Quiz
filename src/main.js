import { Session, MAX_LEVEL, MAX_SCORE, QUESTIONS_PER_ROUND, ROUNDS_PER_SET } from "./game.js";
import { loadBestScore, saveBestScore } from "./storage.js";

const QUESTIONS_URL = "../data/questions/questions.json";
const IMG = {
  think: "../assets/flori/src/book_pen.png",
  correct: "../assets/flori/wave_smile.png",
  wrong: "../assets/flori/wave_wrong.png",
  surprised: "../assets/flori/wave_surprised.png",
};

const $ = (id) => document.getElementById(id);
const screens = ["cover", "question", "result", "error"].map((name) => [name, $(`screen-${name}`)]);

function show(name) {
  for (const [key, el] of screens) el.hidden = key !== name;
  window.scrollTo(0, 0);
}

// 回答の形式ごとの画面部品。入力式を足すときは、ここに追加する。
const renderers = {
  choice(question, onAnswer) {
    const list = $("q-choices");
    list.replaceChildren();
    question.choices.forEach((text, index) => {
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = "choice";
      button.innerHTML = `<span class="choice-no">${index + 1}</span><span class="choice-text"></span>`;
      button.querySelector(".choice-text").textContent = text;
      button.addEventListener("click", () => onAnswer(index));
      item.append(button);
      list.append(item);
    });
  },
  markChoice(question, response) {
    [...$("q-choices").querySelectorAll(".choice")].forEach((button, index) => {
      button.disabled = true;
      if (index === question.answer) button.classList.add("is-right");
      else if (index === response) button.classList.add("is-wrong");
    });
  },
};

let session;
let current = null; // 今出している問題
let answered = false;

function setFlori(src, alt) {
  const img = $("q-flori");
  img.src = src;
  img.alt = alt;
}

function showQuestion() {
  const { question, leveledUp } = session.nextQuestion();
  current = question;
  answered = false;

  $("q-progress").textContent = `だい ${session.asked + 1} もん / ${QUESTIONS_PER_ROUND}もん`;
  $("q-level").textContent = `むずかしさ ${"★".repeat(question.level)}${"☆".repeat(MAX_LEVEL - question.level)}`;
  $("q-text").textContent = question.text;
  $("q-feedback").hidden = true;

  const message = $("q-message");
  if (leveledUp) {
    setFlori(IMG.surprised, "おどろくフロリ");
    message.textContent = "おっ! むずかしく なったヨ!";
    message.hidden = false;
  } else {
    setFlori(IMG.think, "本とペンを持つフロリ");
    message.hidden = true;
  }

  renderers[question.type](question, answer);
  show("question");
}

function answer(response) {
  if (answered) return;
  answered = true;
  const correct = session.answer(current, response);
  renderers.markChoice(current, response);

  setFlori(correct ? IMG.correct : IMG.wrong, correct ? "わらうフロリ" : "目をつぶるフロリ");
  $("q-message").hidden = true;
  const verdict = $("q-verdict");
  verdict.textContent = correct ? "せいかい!" : "ざんねん…";
  verdict.className = `verdict ${correct ? "is-right" : "is-wrong"}`;
  $("q-explanation").textContent = current.explanation;
  $("btn-next").textContent = session.roundFinished ? "けっかを みる" : "つぎへ";
  $("q-feedback").hidden = false;
  $("btn-next").focus();
}

function showResult() {
  const result = session.finishRound();
  const isRecord = saveBestScore(result.score);
  $("r-correct").textContent = `${result.correct} / ${result.total}もん`;
  $("r-score").textContent = `${result.score}点 (${MAX_SCORE}点まんてん)`;
  $("r-best").textContent = `${loadBestScore()}点`;
  $("r-record").hidden = !isRecord;
  $("r-comment").textContent = comment(result.correct);

  const setNote = $("r-set");
  if (result.setCompleted) {
    setNote.textContent = `${ROUNDS_PER_SET}回 ぜんぶ おわったヨ! つぎは また はじめから!`;
  } else {
    setNote.textContent = `${result.roundNumber}回め / ${ROUNDS_PER_SET}回(つづけて あそぶと、むずかしさも つづくヨ)`;
  }
  setNote.hidden = false;
  show("result");
}

function comment(correct) {
  if (correct === QUESTIONS_PER_ROUND) return "ぜんぶ せいかい! すごいヨ!";
  if (correct >= 3) return "いいね! よく ひらめいたネ!";
  if (correct >= 1) return "ナイスチャレンジ! つぎは もっと とれるヨ!";
  return "だいじょうぶ! かんがえるのが たのしいんだヨ!";
}

function next() {
  if (session.roundFinished) showResult();
  else showQuestion();
}

document.addEventListener("keydown", (event) => {
  if ($("screen-question").hidden || answered || event.ctrlKey || event.metaKey || event.altKey) return;
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < current.choices.length) answer(index);
});

$("btn-start").addEventListener("click", showQuestion);
$("btn-next").addEventListener("click", next);
$("btn-again").addEventListener("click", showQuestion);
$("btn-cover").addEventListener("click", () => show("cover"));

async function init() {
  try {
    const response = await fetch(QUESTIONS_URL);
    if (!response.ok) throw new Error(response.status);
    const data = await response.json();
    session = new Session(data.questions);
    show("cover");
  } catch (error) {
    console.error(error);
    show("error");
  }
}

init();
