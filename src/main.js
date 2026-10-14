import {
  HARD_LEVEL,
  HardRound,
  MAX_LEVEL,
  MAX_SCORE,
  OniRound,
  QUESTIONS_PER_ROUND,
  ROUNDS_PER_SET,
  Session,
  TOTAL_POINTS,
  VERSUS_MAX_PLAYERS,
  VERSUS_MIN_PLAYERS,
  VERSUS_ROUNDS,
  VersusRound,
  totalScore,
} from "./game.js";
import { loadStats, pruneStats, recordOni, recordRound, recordVersus } from "./storage.js";
import { GardenUI } from "./garden.js";
import { getVolume, playSe, setScene, setVolume, unlock } from "./audio.js";
import { getFuriganaMode, setFuriganaMode, startFurigana } from "./furigana.js";

const QUESTIONS_URL = "../data/questions/questions.json";
const ONI_TAPS = 5; // 表紙のすみのフロリを、この回数おすと、オニ問題が出る
const IMG = {
  think: "../assets/flori/src/book_pen.png",
  correct: "../assets/flori/wave_smile.png",
  wrong: "../assets/flori/wave_wrong.png",
  surprised: "../assets/flori/wave_surprised.png",
};

const $ = (id) => document.getElementById(id);
const SCREENS = ["cover", "versus", "relax", "records", "settings", "question", "result", "error"];

let coverTaps = 0;
let mode = "normal"; // 遊び方:"normal"(ふつう)、"hard"(難しい)、"oni"(オニ)、"versus"(みんなで対戦)
let versusPlayers = 2; // みんなで対戦する人数

// 画面ごとのBGMの場面(audio.js の BGM と対応)
function sceneOf(name) {
  if (name === "question") return { oni: "oni", hard: "hard", versus: "versus" }[mode] ?? "question";
  if (name === "relax") return "relax";
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
      form.innerHTML = `<input id="q-input" class="answer-input" type="text" autocomplete="off" placeholder="ここに書いてね" aria-label="答え"><button class="btn btn-main" type="submit" data-no-se="1">答える</button>`;
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

let normalQuestions = [];
let hardQuestions = [];
let oniQuestions = [];
const hardUsed = new Set(); // 難しいモードで、もう出した問題(回をまたいで使う)
let normalIds = new Set(); // ふつうの問題の uid(成績の記録に使う。番号がつけなおされても、変わらない)
let hardIds = new Set(); // 難しい問題の uid
let oniIds = new Set(); // オニ問題の uid
let session; // ふつうの遊び(難しさのカウンターを引き継ぐ)
let play; // いま遊んでいるもの(session かオニ問題)
let current = null; // 今出している問題
let answered = false;

function setFlori(src, alt) {
  const img = $("q-flori");
  img.src = src;
  img.alt = alt;
}

function startPlay(nextMode) {
  mode = nextMode;
  if (mode === "oni") play = new OniRound(oniQuestions);
  else if (mode === "hard") play = new HardRound(hardQuestions, hardUsed);
  else if (mode === "versus") play = new VersusRound(normalQuestions, versusPlayers);
  else play = session;
  showQuestion();
}

function showQuestion() {
  const { question, leveledUp } = play.nextQuestion();
  current = question;
  answered = false;

  const versus = mode === "versus";
  const prefix = { normal: "", hard: "難しい ", oni: "オニ ", versus: "" }[mode];
  $("q-progress").textContent = versus
    ? `第${play.round}回戦 / ${VERSUS_ROUNDS}回戦`
    : `${prefix}第${play.asked + 1}問 / ${QUESTIONS_PER_ROUND}問`;
  renderTurn(versus);
  $("q-level").textContent =
    mode === "oni"
      ? "難しさ オニ"
      : mode === "hard"
        ? "難しさ ★★★★"
        : versus
          ? `${versusPlayers}人で対戦`
          : `難しさ ${"★".repeat(question.level)}${"☆".repeat(MAX_LEVEL - question.level)}`;
  $("q-text").textContent = question.text;
  $("q-feedback").hidden = true;

  const message = $("q-message");
  const roundStart = versus && play.player === 0; // 対戦で、新しい回戦の最初の問題
  if (leveledUp || roundStart || ((mode === "hard" || mode === "oni") && play.asked === 0)) {
    setFlori(IMG.surprised, "驚くフロリ");
    message.textContent =
      mode === "versus"
        ? `第${play.round}回戦だヨ! 正解で${play.round}点!`
        : { normal: "おっ! 難しくなったヨ!", hard: "難しいモードだヨ! じっくり考えてネ!", oni: "オニ問題だヨ! がんばれ!" }[mode];
    message.hidden = false;
  } else {
    setFlori(IMG.think, "本とペンを持つフロリ");
    message.hidden = true;
  }

  renderers[question.type].render(question, answer);
  show("question");
}

// 対戦のとき:だれの番かを、プレイヤーの色で知らせる案内板と、みんなの点数の表
const PLAYER_NAMES = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"];

function renderBoard(list, scores, active) {
  list.replaceChildren(
    ...scores.map((score, index) => {
      const item = document.createElement("li");
      item.className = `p${index + 1}${index === active ? " is-active" : ""}`;
      item.textContent = `${PLAYER_NAMES[index]}  ${score}点`;
      return item;
    }),
  );
  list.hidden = false;
}

function renderTurn(versus) {
  const turn = $("q-player");
  const board = $("q-board");
  turn.hidden = !versus;
  board.hidden = !versus;
  if (!versus) return;
  turn.className = `turn p${play.player + 1}`;
  turn.textContent = `${PLAYER_NAMES[play.player]}の番だヨ!(正解で${play.round}点)`;
  renderBoard(board, play.scores, play.player);
}

function answer(response) {
  if (answered) return;
  answered = true;
  const answeringPlayer = mode === "versus" ? play.player : 0;
  const answeringRound = mode === "versus" ? play.round : 0;
  const correct = play.answer(current, response);
  if (mode === "versus") renderBoard($("q-board"), play.scores, answeringPlayer);
  renderers[current.type].mark(current, response, correct);
  playSe(correct ? "correct" : "wrong");

  setFlori(correct ? IMG.correct : IMG.wrong, correct ? "笑うフロリ" : "目をつぶるフロリ");
  $("q-message").hidden = true;
  const verdict = $("q-verdict");
  verdict.textContent =
    mode === "versus" && correct ? `正解! ${PLAYER_NAMES[answeringPlayer]}に${answeringRound}点!` : correct ? "正解!" : "残念…";
  verdict.className = `verdict ${correct ? "is-right" : "is-wrong"}`;
  const rightText = renderers[current.type].correctText(current);
  $("q-explanation").textContent = `正解は「${rightText}」\n${current.explanation}`;
  $("btn-next").textContent = play.roundFinished ? "結果を見る" : "次へ";
  $("q-feedback").hidden = false;
  // 次へのボタンに移るとき、画面が勝手に下までスクロールして、正解・不正解の表示が見えなくならないようにする。
  $("btn-next").focus({ preventScroll: true });
  $("q-feedback").scrollIntoView({ block: "nearest", behavior: "smooth" });
}

// 総合得点(100点満点)を、保存した記録から数える。いまある問題だけを数える(問題が増えても、満点は100点のまま)。
function currentTotal(stats = loadStats()) {
  const count = (list, ids) => list.filter((id) => ids.has(id)).length;
  return totalScore({
    normalRight: count(stats.right, normalIds),
    normalCount: normalIds.size,
    hardRight: count(stats.right, hardIds),
    hardCount: hardIds.size,
    oniRight: count(stats.oniRight, oniIds),
    oniCount: oniIds.size,
  });
}

function showResult() {
  const result = play.finishRound();
  const versus = mode === "versus";
  $("r-correct-row").hidden = versus;
  $("r-board").hidden = true;
  if (!versus) {
    $("r-correct").textContent = `${result.correct} / ${result.total}問`;
    $("r-score").textContent = `${result.score}点(${MAX_SCORE}点満点)`;
  }
  $("r-score-row").hidden = versus; // 対戦のときは、ひとりの得点は出さない
  $("r-comment").textContent =
    mode === "oni" ? oniComment(result.correct) : versus ? versusComment(result) : comment(result.correct);

  const setNote = $("r-set");
  const before = currentTotal();
  // 総合得点は、はじめて正解した問題の分だけ、ふえる。
  const gainText = () => {
    const gained = currentTotal() - before;
    return gained > 0 ? `初めての正解で、総合得点が${gained}点増えたヨ!` : "総合得点は、初めて正解したときだけ増えるヨ。";
  };
  if (versus) {
    // みんなで対戦した結果は、ひとりで遊ぶ記録(遊んだ回数、正解率、総合得点など)には入れない。
    recordVersus();
    $("r-title").textContent = "対戦の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    renderBoard($("r-board"), result.scores, -1);
    result.winners.forEach((index) => $("r-board").children[index].classList.add("is-winner"));
    setNote.textContent = "";
    $("btn-again").textContent = "もう一度対戦";
  } else if (mode === "oni") {
    // オニ問題は、成績の「遊んだ回数」や「正解率」には入れない。総合得点にだけ入る。
    recordOni(result.answers);
    $("r-title").textContent = "オニ問題の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = gainText();
    $("btn-again").textContent = "もう一度挑戦";
  } else if (mode === "hard") {
    const saved = recordRound({ ...result, mode: "hard" });
    $("r-title").textContent = "難しいモードの結果!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = `${loadStats().bestHard}点`;
    $("r-record").hidden = !saved.isRecord;
    setNote.textContent = gainText();
    $("btn-again").textContent = "もう一度挑戦";
  } else {
    const saved = recordRound(result);
    const stats = loadStats();
    $("r-title").textContent = "結果発表!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = `${stats.best}点`;
    $("r-record").hidden = !saved.isRecord;
    $("btn-again").textContent = "もう一度遊ぶ";
    if (saved.setCompleted) {
      setNote.textContent = `${ROUNDS_PER_SET}回遊んだヨ! 難しさは、また最初から!`;
      session.resetSet();
    } else {
      setNote.textContent = `${ROUNDS_PER_SET}回のうち${stats.setRounds.length}回目が終わったヨ(続けて遊ぶと、難しさも続くヨ)`;
    }
  }
  setNote.hidden = false;
  show("result");
}

function comment(correct) {
  if (correct === QUESTIONS_PER_ROUND) return "全部正解! すごいヨ!";
  if (correct >= 3) return "いいね! よくひらめいたネ!";
  if (correct >= 1) return "ナイスチャレンジ! 次はもっと取れるヨ!";
  return "大丈夫! 考えるのが楽しいんだヨ!";
}

function versusComment(result) {
  const names = result.winners.map((index) => PLAYER_NAMES[index]);
  if (result.winners.length === result.players) return "全員同点! 引き分けだヨ!";
  if (result.winners.length > 1) return `${names.join("と")}の同点トップ! みんな、よく頑張ったネ!`;
  return `${names[0]}の勝ち! おめでとう!`;
}

function oniComment(correct) {
  if (correct === QUESTIONS_PER_ROUND) return "ええっ、全部正解! 天才だヨ!";
  if (correct >= 3) return "オニを相手にすごいヨ!";
  if (correct >= 1) return "オニ問題を解くなんて、えらいヨ!";
  return "オニは難しいんだヨ。また挑戦してネ!";
}

function showRecords() {
  const s = loadStats();
  // 「出会った問題」「正解した問題」は、いまある問題(ふつう+難しい)のうち、何問か。問題が増えても、全体の数を合わせる。
  const playable = new Set([...normalIds, ...hardIds]);
  const seen = s.seen.filter((id) => playable.has(id)).length;
  const right = s.right.filter((id) => playable.has(id)).length;
  // 総合得点は、いつでも100点満点で見せる(ふつうと難しい問題だけでは95点まで)
  $("s-total").textContent = `${currentTotal(s)}点 / ${TOTAL_POINTS}点`;
  $("s-best").textContent = `${s.best}点 / ${MAX_SCORE}点`;
  $("s-best-hard").textContent = `${s.bestHard}点 / ${MAX_SCORE}点`;
  $("s-plays").textContent = `${s.plays}回`;
  $("s-versus").textContent = `${s.versusPlays}回`;
  $("s-seen").textContent = `${seen} / ${playable.size}問`;
  $("s-right").textContent = `${right} / ${playable.size}問`;
  $("s-answered").textContent = `${s.answered}問(正解 ${s.correct}問)`;
  $("s-rate").textContent = s.answered ? `${Math.round((s.correct / s.answered) * 100)}%` : "まだないよ";
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

// ふりがな:3つから選ぶ(すべての漢字 / 中学以降に習う漢字だけ / なし)。設定の画面と、問題を解いているときの設定で、同じ設定を使う。
function showFurigana() {
  for (const radio of document.querySelectorAll('input[type="radio"][name^="furigana"]')) {
    radio.checked = radio.value === getFuriganaMode();
  }
}
showFurigana();
for (const radio of document.querySelectorAll('input[type="radio"][name^="furigana"]')) {
  radio.addEventListener("change", () => {
    setFuriganaMode(radio.value);
    showFurigana();
  });
}

// 問題を解いているときの「せってい」
$("btn-q-settings").addEventListener("click", () => {
  showVolumes();
  $("dlg-volume").showModal();
});
$("btn-volume-close").addEventListener("click", () => $("dlg-volume").close());

$("btn-start").addEventListener("click", () => startPlay("normal"));
$("btn-hard").addEventListener("click", () => startPlay("hard"));
$("btn-versus").addEventListener("click", () => show("versus"));
$("btn-versus-back").addEventListener("click", () => show("cover"));
for (const button of document.querySelectorAll("[data-players]")) {
  button.addEventListener("click", () => {
    versusPlayers = Math.min(VERSUS_MAX_PLAYERS, Math.max(VERSUS_MIN_PLAYERS, Number(button.dataset.players)));
    startPlay("versus");
  });
}

// リラックス:お花畑(点数も時間もない)
let garden = null;
let gardenSize = 3;

function startGarden(size = gardenSize) {
  gardenSize = size;
  $("garden-message").textContent = "花をおして、全部を満開にしよう。";
  $("garden-hint").hidden = true;
  garden = new GardenUI($("garden"), {
    size,
    onChange: ({ bloomed, total, moves }) => {
      if (moves > 0) $("garden-message").textContent = `桜の木 ${bloomed} / ${total} ・ ${moves}回`;
    },
    onSolved: (moves) => {
      $("garden-message").textContent = `全部、桜の木になったヨ!${moves}回で完成。すごいネ!`;
      playSe("correct");
    },
  });
  show("relax");
}

$("btn-relax").addEventListener("click", () => startGarden());
$("btn-relax-back").addEventListener("click", () => show("cover"));
$("btn-garden-hint").addEventListener("click", () => {
  $("garden-hint").hidden = false;
  garden?.hint();
});
$("btn-garden-again").addEventListener("click", () => startGarden());
for (const button of document.querySelectorAll("[data-garden]")) {
  button.addEventListener("click", () => startGarden(Number(button.dataset.garden)));
}

$("btn-records").addEventListener("click", showRecords);
$("btn-records-back").addEventListener("click", () => show("cover"));
$("btn-settings").addEventListener("click", () => show("settings"));
$("btn-settings-back").addEventListener("click", () => show("cover"));
$("btn-next").addEventListener("click", next);
$("btn-again").addEventListener("click", () => startPlay(mode));
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
  startPlay("oni");
});

async function init() {
  try {
    const response = await fetch(QUESTIONS_URL);
    if (!response.ok) throw new Error(response.status);
    const { questions } = await response.json();
    const normal = questions.filter((q) => q.level <= MAX_LEVEL);
    normalQuestions = normal;
    hardQuestions = questions.filter((q) => q.level === HARD_LEVEL);
    oniQuestions = questions.filter((q) => q.level > HARD_LEVEL);
    normalIds = new Set(normal.map((q) => q.uid ?? q.id));
    hardIds = new Set(hardQuestions.map((q) => q.uid ?? q.id));
    oniIds = new Set(oniQuestions.map((q) => q.uid ?? q.id));
    pruneStats(new Set([...normalIds, ...hardIds, ...oniIds])); // 古い番号の記録を、取りのぞく
    session = new Session(normal);
    show("cover");
  } catch (error) {
    console.error(error);
    show("error");
  }
}

startFurigana();
init();
