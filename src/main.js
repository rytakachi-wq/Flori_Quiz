import { Session, OniRound, MAX_LEVEL, MAX_SCORE, MAX_SET_SCORE, QUESTIONS_PER_ROUND, ROUNDS_PER_SET } from "./game.js";
import { loadStats, recordRound } from "./storage.js";
import { getVolume, playSe, setScene, setVolume, unlock } from "./audio.js";

const QUESTIONS_URL = "../data/questions/questions.json";
const ONI_TAPS = 5; // 表紙のすみのフロリを、この回数おすと、オニ問題が出る
const IMG = {
  think: "../assets/flori/src/book_pen.png",
  correct: "../assets/flori/wave_smile.png",
  wrong: "../assets/flori/wave_wrong.png",
  surprised: "../assets/flori/wave_surprised.png",
};

const $ = (id) => document.getElementById(id);
const SCREENS = ["cover", "records", "settings", "question", "result", "error"];

let coverTaps = 0;
let isOni = false;

// 画面ごとのBGMの場面(audio.js の BGM と対応)
function sceneOf(name) {
  if (name === "question") return isOni ? "oni" : "question";
  if (name === "result") return "result";
  return name === "error" ? null : "cover";
}

function show(name) {
  for (const key of SCREENS) $(`screen-${key}`).hidden = key !== name;
  if (name !== "cover") coverTaps = 0;
  setScene(sceneOf(name));
  window.scrollTo(0, 0);
}

// 回答の形式ごとの画面部品(出題 render、回答後の表示 mark、正解の言いかた correctText)。
// 新しい回答形式を足すときは、ここに追加する。
const renderers = {
  choice: {
    render(question, onAnswer) {
      const list = $("q-choices");
      list.replaceChildren();
      question.choices.forEach((text, index) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "choice";
        button.dataset.noSe = "1"; // 回答の音(正解・不正解)をなかせる
        button.innerHTML = `<span class="choice-no">${index + 1}</span><span class="choice-text"></span>`;
        button.querySelector(".choice-text").textContent = text;
        button.addEventListener("click", () => onAnswer(index));
        item.append(button);
        list.append(item);
      });
    },
    mark(question, response) {
      [...$("q-choices").querySelectorAll(".choice")].forEach((button, index) => {
        button.disabled = true;
        if (index === question.answer) button.classList.add("is-right");
        else if (index === response) button.classList.add("is-wrong");
      });
    },
    correctText: (question) => question.choices[question.answer],
  },
  text: {
    render(question, onAnswer) {
      const list = $("q-choices");
      list.replaceChildren();
      const form = document.createElement("form");
      form.className = "answer-form";
      form.innerHTML = `<input id="q-input" class="answer-input" type="text" autocomplete="off" placeholder="ここに かいてね" aria-label="こたえ"><button class="btn btn-main" type="submit" data-no-se="1">こたえる</button>`;
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        const value = form.querySelector("input").value.trim();
        if (value) onAnswer(value);
      });
      const item = document.createElement("li");
      item.append(form);
      list.append(item);
      form.querySelector("input").focus();
    },
    mark(question, response, correct) {
      const input = $("q-input");
      input.disabled = true;
      input.classList.add(correct ? "is-right" : "is-wrong");
      $("q-choices").querySelector("button").disabled = true;
    },
    correctText: (question) => question.answers[0],
  },
};

let oniQuestions = [];
let session; // ふつうの遊び(難しさのカウンターを引き継ぐ)
let play; // いま遊んでいるもの(session かオニ問題)
let current = null; // 今出している問題
let answered = false;

function setFlori(src, alt) {
  const img = $("q-flori");
  img.src = src;
  img.alt = alt;
}

function startPlay(oni) {
  isOni = oni;
  play = oni ? new OniRound(oniQuestions) : session;
  showQuestion();
}

function showQuestion() {
  const { question, leveledUp } = play.nextQuestion();
  current = question;
  answered = false;

  $("q-progress").textContent = `${isOni ? "オニ " : ""}だい ${play.asked + 1} もん / ${QUESTIONS_PER_ROUND}もん`;
  $("q-level").textContent = isOni
    ? "むずかしさ オニ"
    : `むずかしさ ${"★".repeat(question.level)}${"☆".repeat(MAX_LEVEL - question.level)}`;
  $("q-text").textContent = question.text;
  $("q-feedback").hidden = true;

  const message = $("q-message");
  if (leveledUp || (isOni && play.asked === 0)) {
    setFlori(IMG.surprised, "おどろくフロリ");
    message.textContent = isOni ? "オニもんだいだヨ! がんばれ!" : "おっ! むずかしく なったヨ!";
    message.hidden = false;
  } else {
    setFlori(IMG.think, "本とペンを持つフロリ");
    message.hidden = true;
  }

  renderers[question.type].render(question, answer);
  show("question");
}

function answer(response) {
  if (answered) return;
  answered = true;
  const correct = play.answer(current, response);
  renderers[current.type].mark(current, response, correct);
  playSe(correct ? "correct" : "wrong");

  setFlori(correct ? IMG.correct : IMG.wrong, correct ? "わらうフロリ" : "目をつぶるフロリ");
  $("q-message").hidden = true;
  const verdict = $("q-verdict");
  verdict.textContent = correct ? "せいかい!" : "ざんねん…";
  verdict.className = `verdict ${correct ? "is-right" : "is-wrong"}`;
  const rightText = renderers[current.type].correctText(current);
  $("q-explanation").textContent = `せいかいは 「${rightText}」\n${current.explanation}`;
  $("btn-next").textContent = play.roundFinished ? "けっかを みる" : "つぎへ";
  $("q-feedback").hidden = false;
  $("btn-next").focus();
}

function showResult() {
  const result = play.finishRound();
  $("r-correct").textContent = `${result.correct} / ${result.total}もん`;
  $("r-score").textContent = `${result.score}点 (${MAX_SCORE}点まんてん)`;
  $("r-comment").textContent = isOni ? oniComment(result.correct) : comment(result.correct);

  const setNote = $("r-set");
  if (isOni) {
    // オニ問題は、成績には入れない。
    $("r-title").textContent = "オニもんだい けっか!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = "オニもんだいは、せいせきには はいらないヨ。";
    $("btn-again").textContent = "もういちど ちょうせん";
  } else {
    const saved = recordRound(result);
    const stats = loadStats();
    $("r-title").textContent = "けっかはっぴょう!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = `${stats.best}点`;
    $("r-record").hidden = !saved.isRecord;
    $("btn-again").textContent = "もういちど あそぶ";
    if (saved.setCompleted) {
      setNote.textContent = `${ROUNDS_PER_SET}回ぶん(20問)で ${saved.setScore}点!${saved.isSetRecord ? " 20問の しんきろく!" : ""} つぎは また はじめから!`;
      session.resetSet();
    } else {
      setNote.textContent = `${ROUNDS_PER_SET}回のうち ${stats.setRounds.length}回め が おわったヨ(つづけて あそぶと、むずかしさも つづくヨ)`;
    }
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

function oniComment(correct) {
  if (correct === QUESTIONS_PER_ROUND) return "ええっ、ぜんぶ せいかい! てんさいだヨ!";
  if (correct >= 3) return "オニを あいてに すごいヨ!";
  if (correct >= 1) return "オニもんだいを とくなんて、えらいヨ!";
  return "オニは むずかしいんだヨ。また ちょうせんしてネ!";
}

function showRecords() {
  const s = loadStats();
  $("s-best").textContent = `${s.best}点 / ${MAX_SCORE}点`;
  $("s-plays").textContent = `${s.plays}回`;
  $("s-rate").textContent = s.answered
    ? `${Math.round((s.correct / s.answered) * 100)}%(${s.correct} / ${s.answered}もん)`
    : "まだ ないよ";
  const now = s.setRounds.reduce((sum, value) => sum + value, 0);
  $("s-set-now").textContent = `${s.setRounds.length} / ${ROUNDS_PER_SET}回 (${now}点)`;
  $("s-set-best").textContent = s.sets ? `${s.bestSet}点 / ${MAX_SET_SCORE}点` : "まだ ないよ";
  $("s-set-count").textContent = `${s.sets}回`;
  show("records");
}

function next() {
  if (play.roundFinished) showResult();
  else showQuestion();
}

document.addEventListener("keydown", (event) => {
  if ($("screen-question").hidden || answered || event.ctrlKey || event.metaKey || event.altKey) return;
  if ($("dlg-quit").open || $("dlg-oni").open || $("dlg-volume").open || current.type !== "choice") return;
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < current.choices.length) answer(index);
});

// 音:画面をはじめてさわったら音を出せるようにして、ボタンをおすと効果音をならす。
for (const type of ["pointerdown", "keydown"]) {
  document.addEventListener(type, () => {
    unlock();
    $("sound-hint").hidden = true;
  }, { capture: true });
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && !button.dataset.noSe) playSe("button");
});

// せってい:BGMと効果音の大きさ(0〜100)。表紙の「せってい」と、問題を解いているときの「せってい」で、同じ大きさを使う。
function showVolumes() {
  for (const slider of document.querySelectorAll("[data-volume]")) {
    slider.value = Math.round(getVolume(slider.dataset.volume) * 100);
  }
  for (const label of document.querySelectorAll("[data-volume-out]")) {
    label.textContent = Math.round(getVolume(label.dataset.volumeOut) * 100);
  }
}
showVolumes();
for (const slider of document.querySelectorAll("[data-volume]")) {
  const kind = slider.dataset.volume;
  slider.addEventListener("input", () => {
    setVolume(kind, Number(slider.value) / 100);
    showVolumes();
  });
  // 効果音は、つまみをはなしたときに、ためしにならす
  if (kind === "se") slider.addEventListener("change", () => playSe("correct"));
}

// 問題を解いているときの「せってい」
$("btn-q-settings").addEventListener("click", () => {
  showVolumes();
  $("dlg-volume").showModal();
});
$("btn-volume-close").addEventListener("click", () => $("dlg-volume").close());

$("btn-start").addEventListener("click", () => startPlay(false));
$("btn-records").addEventListener("click", showRecords);
$("btn-records-back").addEventListener("click", () => show("cover"));
$("btn-settings").addEventListener("click", () => show("settings"));
$("btn-settings-back").addEventListener("click", () => show("cover"));
$("btn-next").addEventListener("click", next);
$("btn-again").addEventListener("click", () => startPlay(isOni));
$("btn-cover").addEventListener("click", () => show("cover"));

// やめる:確認してから、この回をなかったことにして表紙へ戻る。
$("btn-quit").addEventListener("click", () => $("dlg-quit").showModal());
$("btn-quit-no").addEventListener("click", () => $("dlg-quit").close());
$("btn-quit-yes").addEventListener("click", () => {
  $("dlg-quit").close();
  play.abandonRound();
  show("cover");
});

// 表紙のすみのフロリ:何回かおすと、オニ問題が出る。
$("corner-flori").addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.classList.remove("is-tapped");
  void button.offsetWidth; // アニメーションをもう一度動かす
  button.classList.add("is-tapped");
  coverTaps += 1;
  if (coverTaps >= ONI_TAPS) {
    coverTaps = 0;
    window.getSelection()?.removeAllRanges(); // 連打で選ばれた部分を、ぜんぶ外す
    $("dlg-oni").showModal();
  }
});
$("btn-oni-no").addEventListener("click", () => $("dlg-oni").close());
$("btn-oni-yes").addEventListener("click", () => {
  $("dlg-oni").close();
  startPlay(true);
});

async function init() {
  try {
    const response = await fetch(QUESTIONS_URL);
    if (!response.ok) throw new Error(response.status);
    const { questions } = await response.json();
    oniQuestions = questions.filter((q) => q.level > MAX_LEVEL);
    session = new Session(questions.filter((q) => q.level <= MAX_LEVEL));
    show("cover");
  } catch (error) {
    console.error(error);
    show("error");
  }
}

init();
