import {
  HARD_LEVEL,
  HARD_MIN_LEVEL,
  HINT_COST,
  MAX_LEVEL,
  levelFromCounter,
  MAX_SCORE,
  ONI_POINTS_PER_CORRECT,
  OniRound,
  POINTS_PER_CORRECT,
  PracticeRound,
  TIMED_SECONDS,
  QUESTIONS_PER_ROUND,
  Session,
  TOTAL_POINTS,
  VERSUS_MAX_PLAYERS,
  VERSUS_MIN_PLAYERS,
  VERSUS_ROUNDS,
  VersusRound,
  dailyQuestion,
  dateKey,
  pickRandom,
  previousDateKey,
  totalScore,
} from "./game.js";
import {
  addStars,
  loadStats,
  pruneStats,
  recordBadges,
  recordDaily,
  recordDex,
  recordGarden,
  saveCourse,
  saveHardCourse,
  recordOni,
  recordReview,
  recordRound,
  recordVersus,
} from "./storage.js";
import { illustrationFor } from "./illustrations.js";
import { BADGES, COLORS, HATS, THEMES, TITLES, badgeName, earnedBadges, isOpen, loadDress, lockText, saveDress, starTitleFor, STAR_TITLES, titleFor } from "./badges.js";
import { GardenUI } from "./garden.js";
import { applyFloriSrc, setFloriColor, setWarmList } from "./flori-color.js";
import { getVolume, playJingle, playSe, resetVolumes, setScene, setVolume, unlock } from "./audio.js";
import { getFuriganaMode, readingOf, setFuriganaMode, startFurigana } from "./furigana.js";

const QUESTIONS_URL = "../data/questions/questions.json";
const ONI_TAPS = 5; // 表紙のすみのフロリを、この回数おすと、オニ問題が出る
const IMG = {
  think: "../assets/flori/src/book_pen.png",
  correct: "../assets/flori/wave_smile.png",
  wrong: "../assets/flori/wave_wrong.png",
  surprised: "../assets/flori/wave_surprised.png",
};

const $ = (id) => document.getElementById(id);
const SCREENS = ["cover", "versus", "relax", "records", "settings", "dex", "badges", "dress", "question", "result", "error"];

let coverTaps = 0;
let mode = "normal"; // 遊び方:"normal"(ふつう)、"hard"(難しい)、"oni"(オニ)、"versus"(みんなで対戦)、"review"(おさらい)、"daily"(毎日1問)
let timeLimit = false; // この回に、制限時間をつけるか(ふつう・難しい・おさらい・毎日1問で、はじめに聞く)
let hinted = false; // いまの問題で、ヒントを見たか
let versusPlayers = 2; // みんなで対戦する人数

// 画面ごとのBGMの場面(audio.js の BGM と対応)
function sceneOf(name) {
  if (name === "question") {
    return { oni: "oni", hard: "hard", versus: "versus" }[mode] ?? "question";
  }
  if (name === "relax") return "relax";
  if (name === "result") return "result";
  return name === "error" ? null : "cover";
}

// 表紙のフロリ:表紙を出して3秒たったら、動きだす
let idleTimer = 0;
function startCoverIdle() {
  clearTimeout(idleTimer);
  $("screen-cover").classList.remove("is-lively");
  clearTimeout(idleReturnTimer);
  if (!$("opening").hidden) return; // オープニングの間は、まだ
  idleTimer = setTimeout(() => $("screen-cover").classList.add("is-lively"), 3000);
  idleReturnTimer = setTimeout(returnToOpening, IDLE_RETURN_MS);
}

// 表紙で30秒間なにもしなかったら、オープニング画面にもどって、フロリが遊ぶ。さわると、表紙にもどる。
const IDLE_RETURN_MS = 30000;
let idleReturnTimer = 0;
function returnToOpening() {
  if ($("screen-cover").hidden || !$("opening").hidden || announcing || document.querySelector("dialog[open]")) return;
  clearTimeout(idleTimer);
  $("screen-cover").classList.remove("is-lively");
  const opening = $("opening");
  opening.classList.remove("is-leaving", "is-playing");
  opening.classList.add("is-idle");
  const flori = opening.querySelector(".opening-flori");
  flori.hidden = false;
  flori.style.animation = "none";
  void flori.offsetWidth; // フロリの登場を、はじめから動かす
  flori.style.animation = "";
  opening.hidden = false;
  setScene("cover"); // もどったあいだも、表紙のBGM
}

// 表紙で、画面にさわる・動かす・キーをおすと、動きを止めて、また3秒数えなおす
function noteActivity() {
  if (!$("screen-cover").hidden) startCoverIdle();
}
for (const type of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]) {
  document.addEventListener(type, noteActivity, { passive: true });
}

function show(name) {
  for (const key of SCREENS) $(`screen-${key}`).hidden = key !== name;
  if (name !== "cover") coverTaps = 0;
  if (name === "cover") {
    refreshCover();
    startCoverIdle();
  } else {
    clearTimeout(idleTimer);
    clearTimeout(idleReturnTimer);
    $("screen-cover").classList.remove("is-lively");
  }
  if (name !== "question") {
    stopTimer();
    stopSpeaking();
  }
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
const idToUid = new Map(); // 問題の番号 → uid(「つづきから」の保存に使う)
let allQuestions = []; // 全部の問題(オニもふくむ。図鑑とバッジで使う)
let playableQuestions = []; // ふつう+難しい問題(おさらい・毎日1問で使う)
let normalIds = new Set(); // ふつうの問題の uid(成績の記録に使う。番号がつけなおされても、変わらない)
let hardIds = new Set(); // 難しい問題の uid
let oniIds = new Set(); // オニ問題の uid
let session; // ふつうモードの遊び(難しさのカウンターを引き継ぐ)
let hardSession; // 難しいモードの遊び(こちらも、引き継ぐ)
let versusQuestions = []; // 対戦で使う問題(段階1〜3)
let play; // いま遊んでいるもの(session・hardSession・オニ問題など)
let current = null; // 今出している問題
let answered = false;

function setFlori(src, alt) {
  const img = $("q-flori");
  applyFloriSrc(img, src);
  img.alt = alt;
}

// 画面いっぱいに、ひとことを出して、短い曲を鳴らしてから、つぎへ進む(「それでは、スタート!」など)。
let announcing = false; // 大きな表示を出している間は、ほかの操作(キーボードの連打など)を受けつけない
function announce(text, jingle, then, image) {
  if (announcing) return;
  announcing = true;
  $("announce-text").textContent = text;
  const flori = $("announce-flori");
  applyFloriSrc(flori, image);
  flori.hidden = false;
  flori.style.animation = "none";
  void flori.offsetWidth; // フロリの登場を、はじめから動かす
  flori.style.animation = "";
  $("announce").hidden = false;
  const length = Math.max(1600, playJingle(jingle) + 300);
  setTimeout(() => {
    $("announce").hidden = true;
    announcing = false;
    then();
  }, length);
}

// 表紙のボタンの文字(今日の毎日1問をやったか、おさらいが何問あるか)を、いまの記録に合わせる。
function refreshCover() {
  if (playableQuestions.length === 0) return;
  const stats = loadStats();
  const starTitle = starTitleFor(stats.stars);
  $("cover-title").textContent = `称号:${titleFor(currentTotal(stats))}${starTitle ? `  ☆${starTitle}` : ""}`;
  const today = dateKey();
  const dailyDone = stats.dailyLast === today;
  $("btn-daily").querySelector(".tile-label").textContent = "毎日1問";
  $("btn-daily").querySelector(".tile-icon").textContent = dailyDone ? "✅" : "📅"; // 今日の分をやったら、チェック
  $("btn-daily").classList.toggle("is-done", dailyDone);
  const left = stats.wrong.filter((id) => playableIds().has(id)).length;
  $("btn-review").querySelector(".tile-label").textContent = left > 0 ? `おさらい(${left}問)` : "おさらい(なし)";
  $("btn-review").disabled = left === 0;
  // 記録があれば「つづきから」、なければ「始める」(どちらも、押せる)
  const saved = hasCourse(stats);
  $("btn-continue").querySelector(".tile-label").textContent = saved ? "つづきから" : "始める";
  refreshNoticeDots();
  const level = levelFromCounter(stats.courseCounter, 1, MAX_LEVEL);
  $("hard-sub").textContent = hasHardCourse(stats) ? `つづきから ・ ${stars(levelFromCounter(stats.hardCounter, HARD_MIN_LEVEL, HARD_LEVEL))}` : "";
  $("continue-sub").textContent = saved ? `難しさ ${stars(level)}` : "";
}

// 難しさの星(全部で4段階)
function stars(level) {
  return `${"★".repeat(level)}${"☆".repeat(HARD_LEVEL - level)}`;
}

function playableIds() {
  return new Set([...normalIds, ...hardIds]);
}

function startPlay(nextMode) {
  mode = nextMode;
  if (mode === "oni") timeLimit = false; // オニ問題には、制限時間はない
  if (mode === "oni") play = new OniRound(oniQuestions);
  else if (mode === "hard") play = hardSession;
  else if (mode === "versus") play = new VersusRound(versusQuestions, versusPlayers);
  else if (mode === "review") {
    const wrong = new Set(loadStats().wrong);
    const pool = playableQuestions.filter((q) => wrong.has(q.uid ?? q.id));
    if (pool.length === 0) return show("cover");
    play = new PracticeRound(pool); // まちがえた問題を、ぜんぶ(正解すると、おさらいから消える)
  } else if (mode === "daily") {
    play = new PracticeRound([dailyQuestion(playableQuestions, dateKey())]);
  } else play = session;
  const resume = (mode === "normal" && hasCourse()) || (mode === "hard" && hasHardCourse()); // つづきから遊ぶときは、そう知らせる
  announce(resume ? "つづきから、スタート!" : "それでは、スタート!", "start", showQuestion, "../assets/flori/src/body_wave.webp");
}

function showQuestion() {
  const { question, leveledUp } = play.nextQuestion();
  current = question;
  answered = false;

  const versus = mode === "versus";
  const total = play.total ?? QUESTIONS_PER_ROUND;
  const prefix = {
    normal: "",
    hard: "難しい ",
    oni: "オニ ",
    versus: "",
    review: "おさらい ",
    daily: "毎日1問 ",
  }[mode];
  $("q-progress").textContent = versus
    ? `第${play.round}回戦 / ${VERSUS_ROUNDS}回戦`
    : `${timeLimit ? "⏱ " : ""}${prefix}第${play.asked + 1}問 / ${total}問`;
  renderTurn(versus);
  $("q-level").textContent =
    mode === "oni"
      ? "難しさ オニ"
      : versus
          ? `${play.round}回戦 ${"★".repeat(play.round)}${"☆".repeat(VERSUS_ROUNDS - play.round)} ${VERSUS_LEVEL_WORDS[play.round]}・正解で${play.round}点(${versusPlayers}人)` : `難しさ ${stars(question.level)}`;
  // 問題に合わせた、イラスト(絵と動きで、場面が分かるように)
  const art = illustrationFor(question);
  $("q-art").innerHTML = art;
  $("q-art").hidden = art === "";
  $("q-text").textContent = question.text;
  $("q-text").classList.toggle("long", question.text.length > 70); // 長い問題は、文字を少し小さくして、画面に収める
  $("screen-question").classList.toggle("is-long", question.text.length > 100); // とても長い問題は、もっとぎゅっと
  $("screen-question").classList.remove("is-answered");
  $("q-feedback").hidden = true;

  const message = $("q-message");
  const roundStart = versus && play.player === 0; // 対戦で、新しい回戦の最初の問題
  if (leveledUp || roundStart || ((mode === "hard" || mode === "oni") && play.asked === 0)) {
    setFlori(IMG.surprised, "驚くフロリ");
    message.textContent =
      mode === "versus"
        ? `第${play.round}回戦です。正解で${play.round}点!`
        : { normal: "難しくなりました!", hard: "難しいモードです。じっくり考えましょう。", oni: "オニ問題です。がんばれ!" }[mode];
    message.hidden = false;
  } else {
    setFlori(IMG.think, "本とペンを持つフロリ");
    message.hidden = true;
  }

  // ヒント:ふつう・難しい・おさらい・毎日1問で、1問に1回だけ。オニと対戦では、出さない。
  hinted = false;
  $("q-hint").hidden = true;
  $("btn-hint").disabled = false;
  const hintable = Boolean(question.hint) && mode !== "oni" && mode !== "versus";
  $("q-hint-area").hidden = !(hintable || mode === "oni"); // オニ問題は、ヒントなし。「わからない」だけ
  $("btn-hint").hidden = !hintable;
  $("btn-giveup").hidden = mode === "versus";
  $("btn-giveup").disabled = false;

  renderers[question.type].render(question, answer);
  show("question");
  if (timeLimit) startTimer();
  else $("q-timer").hidden = true;
  stopSpeaking();
  // 自動の読み上げ(400ミリ秒のあいだに、先へ進んだり、ほかの画面にいったときは、読まない)
  if (readAloud()) setTimeout(() => current === question && !answered && !$("screen-question").hidden && speak(readableQuestion(question)), 400);
}

// 対戦の難しさ(回戦ごと):画面にも出す
const VERSUS_LEVEL_WORDS = { 1: "やさしい", 2: "ふつう", 3: "むずかしめ" };

// ---- 制限時間モード ----
let timerId = 0;
let timerLeft = 0;

function stopTimer() {
  clearInterval(timerId);
  timerId = 0;
}

function renderTimer() {
  const bar = $("q-timer-bar");
  bar.style.width = `${Math.max(0, (timerLeft / TIMED_SECONDS) * 100)}%`;
  bar.classList.toggle("is-low", timerLeft <= 5);
  $("q-timer-text").textContent = speaking ? "読み上げ中" : `${Math.ceil(Math.max(0, timerLeft))}秒`;
  $("q-timer").classList.toggle("is-paused", speaking);
}

function startTimer() {
  stopTimer();
  timerLeft = TIMED_SECONDS;
  $("q-timer").hidden = false;
  renderTimer();
  timerId = setInterval(() => {
    if ($("dlg-quit").open || $("dlg-giveup").open || $("dlg-volume").open) return; // 設定やめるの確認を開いている間は、とめる
    if (speaking) {
      // 読み上げが終わるまで、とめる(終わりの知らせが来ないときの、ほけんつき)
      if (Date.now() - speakingSince > 1500 && !speechSynthesis.speaking && !speechSynthesis.pending) setSpeaking(false);
      else return;
    }
    timerLeft -= 0.1;
    renderTimer();
    if (timerLeft <= 0) {
      stopTimer();
      if (!answered) {
        timedOut = true;
        answer(current.type === "choice" ? -1 : ""); // 時間切れ=まちがい
      }
    }
  }, 100);
}
let timedOut = false;
let gaveUp = false; // 「わからない」で、答えを見たか

// ---- 読み上げ(ブラウザの機能。ひらがなの読みは、機械まかせ)----
const READ_KEY = "floriQuiz.readAloud";
function readAloud() {
  try {
    return localStorage.getItem(READ_KEY) === "1";
  } catch {
    return false;
  }
}
function setReadAloud(on) {
  try {
    localStorage.setItem(READ_KEY, on ? "1" : "0");
  } catch {
    // 保存できなくても、そのページを開いている間は、かわったまま。
  }
}
const canSpeak = "speechSynthesis" in window && typeof SpeechSynthesisUtterance === "function";
let speaking = false; // 読み上げている間は、制限時間を止める
let speakingSince = 0;
function setSpeaking(on) {
  speaking = on;
  speakingSince = Date.now();
  if (timerId) renderTimer();
}
function stopSpeaking() {
  clearTimeout(speakTimer);
  if (canSpeak) speechSynthesis.cancel();
  setSpeaking(false);
}
// 声の一覧は、ブラウザが、あとから用意することがある(それまで待つ)
let japaneseVoice = null;
function pickVoice() {
  if (!canSpeak) return;
  const voices = speechSynthesis.getVoices();
  japaneseVoice = voices.find((v) => v.lang === "ja-JP") ?? voices.find((v) => v.lang.startsWith("ja")) ?? null;
}
if (canSpeak) {
  pickVoice();
  speechSynthesis.addEventListener?.("voiceschanged", pickVoice);
}
let nowSpeaking = null; // 読み上げ中の声を持っておく(途中で、とぎれないように)
let speakTimer = 0;
function speak(text) {
  if (!canSpeak || !readableText(text)) return;
  clearTimeout(speakTimer);
  speechSynthesis.cancel();
  // 漢字は、ふりがな(辞書の読み)に置きかえて、読みまちがいを減らす
  const voice = new SpeechSynthesisUtterance(readingOf(text).replace(/□/g, "なにか").replace(/\n/g, "。"));
  voice.lang = "ja-JP";
  if (japaneseVoice) voice.voice = japaneseVoice;
  voice.rate = 1.6;
  // 読み直したとき、前の声が止まった知らせ(onend・onerror)が、あとから来る。いまの声のときだけ、時間を動かす
  voice.onend = () => nowSpeaking === voice && setSpeaking(false);
  voice.onerror = () => nowSpeaking === voice && setSpeaking(false);
  nowSpeaking = voice;
  setSpeaking(true);
  // cancel の直後に話させると、声が出ないブラウザがあるので、少し待つ
  speakTimer = setTimeout(() => {
    speechSynthesis.resume();
    speechSynthesis.speak(voice);
  }, 120);
}
function readableText(text) {
  return typeof text === "string" && text.trim() !== "";
}
function readableQuestion(question) {
  const choices = question.type === "choice" ? question.choices.map((text, i) => `${i + 1}番、${text}`).join("。") : "";
  return `${question.text}。${choices}`;
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
  turn.textContent = `${PLAYER_NAMES[play.player]}の番です。(正解で${play.round}点)`;
  renderBoard(board, play.scores, play.player);
}

function answer(response) {
  if (answered) return;
  answered = true;
  const answeringPlayer = mode === "versus" ? play.player : 0;
  const answeringRound = mode === "versus" ? play.round : 0;
  stopTimer();
  const wasTimedOut = timedOut;
  const wasGivenUp = gaveUp;
  timedOut = false;
  gaveUp = false;
  const correct = play.answer(current, response, hinted);
  $("btn-hint").disabled = true;
  $("btn-giveup").disabled = true;
  if (mode === "versus") renderBoard($("q-board"), play.scores, answeringPlayer);
  renderers[current.type].mark(current, response, correct);
  playSe(correct ? "correct" : "wrong");

  setFlori(correct ? IMG.correct : IMG.wrong, correct ? "笑うフロリ" : "目をつぶるフロリ");
  $("q-message").hidden = true;
  const verdict = $("q-verdict");
  verdict.textContent =
    mode === "versus" && correct
      ? `正解! ${PLAYER_NAMES[answeringPlayer]}に${answeringRound}点!`
      : correct
        ? hinted
          ? `正解!(ヒントを使ったので${POINTS_PER_CORRECT - HINT_COST}点)`
          : "正解!"
        : wasTimedOut
          ? "時間切れ…"
          : wasGivenUp
            ? "答えを見ました…"
            : "残念…";
  verdict.className = `verdict ${correct ? "is-right" : "is-wrong"}`;
  const rightText = renderers[current.type].correctText(current);
  $("q-explanation").textContent = `正解は「${rightText}」\n${current.explanation}`;
  $("btn-next").textContent = play.roundFinished ? "結果を見る" : "次へ";
  $("screen-question").classList.add("is-answered"); // 答えたあとは、上のフロリや、ヒントを、かくして、場所をあける
  // まず、全身のフロリを見せる(大きくはしない)。そのあとで、解説と「次へ」の所まで、画面を動かす。
  applyFloriSrc($("q-react-flori"), correct ? IMG.correct : IMG.wrong);
  $("q-react-flori").alt = correct ? "笑うフロリ" : "目をつぶるフロリ";
  // 全身のフロリと、解説と、「次へ」を、一度に(時間をあけずに)見せる。画面に収まるので、動かす必要はない。
  $("q-detail").hidden = false;
  $("q-feedback").hidden = false;
  $("btn-next").focus({ preventScroll: true });
  $("q-feedback").scrollIntoView({ block: "nearest", behavior: "instant" });
  if (readAloud()) speak(answerReading()); // 正解と解説も読み上げる
}

// 答えたあとに読む文(正解かどうか・正解・解説)
function answerReading() {
  return `${$("q-verdict").textContent}。正解は、${renderers[current.type].correctText(current)}。${current.explanation}`;
}

// 総合得点(100点満点)を、保存した記録から数える。いまあるふつう・難しい問題の、問題ごとの最高の点を足す(1問2点・ヒントを見たら1点)。
function currentTotal(stats = loadStats()) {
  const valid = playableIds();
  return totalScore(stats.right.filter((id) => valid.has(id)).map((id) => stats.qpts[id] ?? POINTS_PER_CORRECT));
}

function showResult() {
  const result = play.finishRound();
  const versus = mode === "versus";
  $("btn-again").hidden = false;
  recordDex(result.answers); // 図鑑(どのモードでも)
  $("r-correct-row").hidden = versus;
  $("r-board").hidden = true;
  if (!versus) {
    $("r-correct").textContent = `${result.correct} / ${result.total}問`;
    $("r-score").textContent = `${result.score}点(${result.total * (mode === "oni" ? ONI_POINTS_PER_CORRECT : POINTS_PER_CORRECT)}点満点)`;
  }
  $("r-score-row").hidden = versus; // 対戦のときは、ひとりの得点は出さない
  $("r-comment").textContent =
    mode === "oni" ? oniComment(result.correct) : versus ? versusComment(result) : comment(result.correct, result.total);

  const setNote = $("r-set");
  const before = currentTotal();
  // 総合得点は、はじめて正解した問題の分だけ、ふえる。
  const gainText = () => {
    const gained = currentTotal() - before;
    return gained > 0 ? `総合得点が${gained}点増えたヨ!` : "総合得点は、新しく正解したり、ヒントなしで正解しなおしたときだけ増えるヨ。";
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
  } else if (mode === "review") {
    // おさらい:まちがえた問題の一覧だけが変わる。成績の回数や、総合得点には入れない。
    const left = recordReview(result.answers);
    $("r-title").textContent = "おさらいの結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = left > 0 ? `おさらいが必要な問題はあと${left}問だヨ。` : "おさらい完了! まちがえた問題はもうないヨ!";
    $("btn-again").textContent = "もう一度おさらい";
    $("btn-again").hidden = left === 0;
  } else if (mode === "daily") {
    // 毎日1問:1日1回だけ記録する。続けた日数を数える。
    const key = dateKey();
    const saved = recordDaily({ date: key, previous: previousDateKey(key), answer: result.answers[0] });
    $("r-title").textContent = "毎日1問の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = `${saved.streak}日連続!(ぜんぶで${saved.days}日)また明日も挑戦してネ!`;
    $("btn-again").hidden = true;
  } else if (mode === "oni") {
    // オニ問題は、成績の「遊んだ回数」「正解率」「総合得点」には入れない(オニ問題の正解数だけ数える)。
    recordOni(result.answers);
    const oniDone = loadStats().oniRight.filter((id) => oniIds.has(id)).length;
    $("r-title").textContent = "オニ問題の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = `オニ問題に正解したことがあるのは、${oniDone} / ${oniIds.size}問だヨ。`;
    $("btn-again").textContent = "もう一度挑戦";
  } else if (mode === "hard") {
    const saved = recordRound({ ...result, mode: "hard", timed: timeLimit });
    persistHard(); // 「つづきから」の記録
    $("r-title").textContent = "難しいモードの結果!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = `${loadStats().bestHard}点`;
    $("r-record").hidden = !saved.isRecord;
    setNote.textContent = gainText();
    $("btn-again").textContent = "もう一度挑戦";
  } else {
    const saved = recordRound({ ...result, timed: timeLimit });
    const stats = loadStats();
    $("r-title").textContent = "結果発表!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = `${stats.best}点`;
    $("r-record").hidden = !saved.isRecord;
    $("btn-again").textContent = "続けて遊ぶ";
    setNote.textContent = "続けて遊ぶと、難しさも続きます。正解が続くと難しく、まちがえるとやさしくなります。";
    persistCourse(); // 「つづきから」の記録
  }
  setNote.hidden = false;
  // 制限時間をつけたごほうび:正解した数ぶんの星。全問正解なら、さらに3つ(オニと対戦は、なし)
  const reward = $("r-reward");
  reward.hidden = true;
  if (timeLimit && !versus && mode !== "oni") {
    const earned = result.correct + (result.correct === result.total ? 3 : 0);
    const stars = addStars(earned);
    reward.textContent = `制限時間のごほうび! ⭐ +${earned}(ぜんぶで ${stars}こ)`;
    reward.hidden = false;
  }
  awardBadges();
  renderNews();
  show("result");
}

function comment(correct, total = QUESTIONS_PER_ROUND) {
  if (correct === total) return "全部正解! すごいヨ!";
  if (correct >= total - 2 && total > 1) return "いいね! よくひらめいたネ!";
  if (correct >= 1) return "ナイスチャレンジ! 次はもっと取れるヨ!";
  return "大丈夫! 考えるのが楽しいんだヨ!";
}

function versusComment(result) {
  const names = result.winners.map((index) => PLAYER_NAMES[index]);
  if (result.winners.length === result.players) return "全員同点! 引き分けだヨ!";
  if (result.winners.length > 1) return `${names.join("と")}の同点トップ! みんなよく頑張ったネ!`;
  return `${names[0]}の勝ち! おめでとう!`;
}

function oniComment(correct) {
  if (correct === QUESTIONS_PER_ROUND) return "ええっ! 全部正解! 天才だヨ!";
  if (correct >= 3) return "オニを相手にすごいヨ!";
  if (correct >= 1) return "オニ問題を解くなんてえらいヨ!";
  return "オニは難しいんだヨ。また挑戦してネ!";
}

function showRecords() {
  const s = loadStats();
  // 「出会った問題」「正解した問題」は、いまある問題(ふつう+難しい)のうち、何問か。問題が増えても、全体の数を合わせる。
  const playable = new Set([...normalIds, ...hardIds]);
  const seen = s.seen.filter((id) => playable.has(id)).length;
  const right = s.right.filter((id) => playable.has(id)).length;
  // 総合得点は、100点満点(ふつう+難しい問題、1問2点)
  $("s-total").textContent = `${currentTotal(s)}点 / ${TOTAL_POINTS}点`;
  $("s-total-bar").style.width = `${(currentTotal(s) / TOTAL_POINTS) * 100}%`;
  $("s-plays").textContent = `${s.plays}回`;
  $("s-title").textContent = titleFor(currentTotal(s));
  $("s-badges").textContent = `${s.badges.length} / ${BADGES.length}個`;
  $("s-stars").textContent = `⭐ ${s.stars}こ`;
  $("s-versus").textContent = `${s.versusPlays}回`;
  // 毎日1問:きのうか今日やっていれば、続けた日数。それより前なら、0日(とぎれた)
  const today = dateKey();
  const running = s.dailyLast === today || s.dailyLast === previousDateKey(today) ? s.dailyStreak : 0;
  $("s-daily").textContent = `${running}日連続・計${s.dailyDays}日`;
  $("s-wrong").textContent = `${s.wrong.filter((id) => playable.has(id)).length}問`;
  $("s-seen").textContent = `${seen} / ${playable.size}問`;
  $("s-right").textContent = `${right} / ${playable.size}問`;
  $("s-answered").textContent = `${s.answered}問・正解${s.correct}問`;
  $("s-rate").textContent = s.answered ? `${Math.round((s.correct / s.answered) * 100)}%` : "まだないよ";
  markSeen("records");
  show("records");
}

function next() {
  stopSpeaking(); // 先へ進んだら、読み上げは止める
  if (play.roundFinished) announce("結果発表〜!", "result", showResult, "../assets/flori/wave_surprised.png");
  else showQuestion();
}

document.addEventListener("keydown", (event) => {
  if ($("screen-question").hidden || answered || event.ctrlKey || event.metaKey || event.altKey) return;
  if ($("dlg-quit").open || $("dlg-giveup").open || $("dlg-oni").open || $("dlg-volume").open || current.type !== "choice") return;
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

// 初期設定に戻す(音の大きさと、ふりがな。成績は、そのまま)
$("btn-settings-reset").addEventListener("click", () => {
  resetVolumes();
  setReadAloud(false);
  syncReadSettings();
  setTextSize("normal");
  setFuriganaMode("all");
  showVolumes();
  showFurigana();
  $("settings-message").textContent = "初期設定に戻したヨ。";
});

// 問題を解いているときの「せってい」
$("btn-q-settings").addEventListener("click", () => {
  showVolumes();
  $("dlg-volume").showModal();
});
$("btn-volume-close").addEventListener("click", () => $("dlg-volume").close());

// 問題を解く前に、制限時間をつけるかを聞く(ふつう・難しい・おさらい・毎日1問)
let pendingMode = null;
function chooseTime(nextMode) {
  pendingMode = nextMode;
  // おさらいのときだけ、どんな問題が出るかを、さきに説明する
  $("dlg-time-review").hidden = nextMode !== "review";
  $("dlg-time").showModal();
}
function closeTimeDialog(limit) {
  $("dlg-time").close();
  if (limit === null) return;
  timeLimit = limit;
  startPlay(pendingMode);
}
$("btn-time-yes").addEventListener("click", () => closeTimeDialog(true));
$("btn-time-no").addEventListener("click", () => closeTimeDialog(false));
$("btn-time-cancel").addEventListener("click", () => closeTimeDialog(null));

// 「つづきから」と「最初から」(ふつうモードの、難しさと、何回目かを、つづける)
function hasCourse(stats = loadStats()) {
  return stats.courseUsed.length > 0 || stats.courseCounter > 0;
}
function hasHardCourse(stats = loadStats()) {
  return stats.hardUsed.length > 0 || stats.hardCounter > 0;
}
function persistCourse() {
  saveCourse({ counter: session.counter, used: [...session.used].map((id) => idToUid.get(id)).filter(Boolean) });
}
$("btn-continue").addEventListener("click", () => chooseTime("normal"));
// セーブデータを消す(設定から):データが消えるので、本当にいいか、聞く
let restartAction = null;
function askRestart(action) {
  restartAction = action;
  $("dlg-restart").showModal();
}
// 消すのは、成績・バッジ・図鑑・きせかえ・つづき。音の大きさ・ふりがな・文字の大きさなどの設定は、のこす。
function eraseSaveData() {
  for (const key of ["floriQuiz.stats", "floriQuiz.dress", "floriQuiz.dexViewed", "floriQuiz.notice", "floriQuiz.bestScore"]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // 消せなくても、ページを開きなおせば、つづきから始まる。
    }
  }
  location.reload();
}
$("btn-erase").addEventListener("click", () => askRestart(eraseSaveData));
$("btn-restart-no").addEventListener("click", () => $("dlg-restart").close());
$("btn-restart-yes").addEventListener("click", () => {
  $("dlg-restart").close();
  restartAction?.();
  restartAction = null;
});
// 難しいモードの「つづきから」と「最初から」(もう出した問題を、おぼえておく)
function persistHard() {
  saveHardCourse({ counter: hardSession.counter, used: [...hardSession.used].map((id) => idToUid.get(id)).filter(Boolean) });
}
$("btn-hard").addEventListener("click", () => chooseTime("hard"));
$("btn-daily").addEventListener("click", () => {
  if (loadStats().dailyLast === dateKey()) {
    // 今日の分は、もう終わっている
    $("dlg-info-text").textContent = "今日の分はもう終わったヨ。また明日挑戦してネ!";
    $("dlg-info").showModal();
  } else chooseTime("daily");
});
$("btn-info-close").addEventListener("click", () => $("dlg-info").close());
$("btn-review").addEventListener("click", () => chooseTime("review"));
// ヒント:1問に1回。見ると、その問題の点が1点へる。
$("btn-hint").addEventListener("click", () => {
  if (answered || hinted || !current?.hint) return;
  hinted = true;
  $("q-hint").textContent = `ヒント:${current.hint}`;
  $("q-hint").hidden = false;
  $("btn-hint").disabled = true;
  if (readAloud()) speak(`ヒント。${current.hint}`); // ヒントも読み上げる
});
$("btn-versus").addEventListener("click", () => show("versus"));
$("btn-versus-back").addEventListener("click", () => show("cover"));
for (const button of document.querySelectorAll("[data-players]")) {
  button.addEventListener("click", () => {
    versusPlayers = Math.min(VERSUS_MAX_PLAYERS, Math.max(VERSUS_MIN_PLAYERS, Number(button.dataset.players)));
    chooseTime("versus"); // 対戦でも、制限時間をつけられる
  });
}

// リラックス:お花畑(点数も時間もない)
let garden = null;
let gardenSize = 3;

function startGarden(size = gardenSize) {
  gardenSize = size;
  $("garden-message").textContent = "木をおして全部を桜の木にしよう。";
  $("garden-hint").hidden = true;
  garden = new GardenUI($("garden"), {
    size,
    onChange: ({ bloomed, total, moves }) => {
      if (moves > 0) $("garden-message").textContent = `桜の木 ${bloomed} / ${total} ・ ${moves}回`;
    },
    onSolved: (moves) => {
      $("garden-message").textContent = `全部桜の木になったヨ!${moves}回で完成。すごいネ!`;
      playSe("correct");
      recordGarden();
      const fresh = awardBadges();
      if (fresh.length) $("garden-message").textContent += `  新しいバッジ:${fresh.map(badgeName).join("、")}`;
    },
  });
  show("relax");
}

$("btn-relax").addEventListener("click", () => startGarden());
$("btn-relax-back").addEventListener("click", () => show("cover"));
$("btn-garden-hint").addEventListener("click", () => {
  // ヒントは、おすたびに、出す・かくすが入れかわる
  // (説明を閉じても、光った木は、そのまま)
  const show = $("garden-hint").hidden;
  $("garden-hint").hidden = !show;
  if (show) garden?.hint();
});
$("btn-garden-again").addEventListener("click", () => startGarden());
for (const button of document.querySelectorAll("[data-garden]")) {
  button.addEventListener("click", () => startGarden(Number(button.dataset.garden)));
}

$("btn-records").addEventListener("click", showRecords);
$("btn-records-back").addEventListener("click", () => show("cover"));
$("btn-settings").addEventListener("click", () => {
  $("settings-message").textContent = "";
  show("settings");
});
$("btn-settings-back").addEventListener("click", () => show("cover"));
$("btn-next").addEventListener("click", next);
$("btn-again").addEventListener("click", () => startPlay(mode));
$("btn-cover").addEventListener("click", () => show("cover"));

// やめる:確認してから、この回をなかったことにして表紙へ戻る。
// 「わからない」:答えを見ると、不正解になる。まちがえて押さないように、先に聞く
$("btn-giveup").addEventListener("click", () => {
  if (answered) return;
  $("dlg-giveup").showModal();
});
$("btn-giveup-no").addEventListener("click", () => $("dlg-giveup").close());
$("btn-giveup-yes").addEventListener("click", () => {
  $("dlg-giveup").close();
  if (answered) return;
  gaveUp = true;
  answer(current.type === "choice" ? -1 : ""); // 答えを見た=まちがい
});
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
    hardQuestions = questions.filter((q) => q.level >= HARD_MIN_LEVEL && q.level <= HARD_LEVEL);
    versusQuestions = questions.filter((q) => q.level <= VERSUS_ROUNDS);
    oniQuestions = questions.filter((q) => q.level > HARD_LEVEL);
    normalIds = new Set(normal.map((q) => q.uid ?? q.id));
    hardIds = new Set(hardQuestions.map((q) => q.uid ?? q.id));
    oniIds = new Set(oniQuestions.map((q) => q.uid ?? q.id));
    playableQuestions = [...normal, ...hardQuestions];
    allQuestions = questions;
    renderBadgeBackground();
    // 答えたあと・結果で出す、フロリの絵を先に読みこんでおく(すぐ出せるように)
    const preload = [...Object.values(IMG), "../assets/flori/wave_nikkori.png", "../assets/flori/src/body_wave.webp"];
    for (const src of preload) new Image().src = src;
    setWarmList(preload);
    pruneStats(new Set([...normalIds, ...hardIds, ...oniIds])); // 古い番号の記録を、取りのぞく
    for (const q of normal) idToUid.set(q.id, q.uid ?? q.id);
    for (const q of hardQuestions) idToUid.set(q.id, q.uid ?? q.id);
    session = new Session(normal, Math.random, 1, MAX_LEVEL);
    hardSession = new Session(hardQuestions, Math.random, HARD_MIN_LEVEL, HARD_LEVEL);
    const saved = loadStats();
    const uidToId = new Map([...idToUid].map(([id, uid]) => [uid, id]));
    const idsOf = (uids, list) => {
      const valid = new Set(list.map((q) => q.id));
      return uids.map((uid) => uidToId.get(uid)).filter((id) => valid.has(id));
    };
    session.restore(saved.courseCounter, idsOf(saved.courseUsed, normal)); // つづきから
    hardSession.restore(saved.hardCounter, idsOf(saved.hardUsed, hardQuestions)); // 難しいモードの、つづきから
    show("cover");
  } catch (error) {
    console.error(error);
    show("error");
  }
}

startFurigana();
init();

// ゲームを開いたときのオープニング。画面をさわると、曲がなって、表紙になる(ブラウザは、さわるまで音を出せない)。
function closeOpening() {
  const opening = $("opening");
  if (opening.hidden || opening.classList.contains("is-playing")) return;
  unlock();
  if (opening.classList.contains("is-idle")) {
    // 1分何もしなくて、もどってきたオープニング:さわると、すぐ表紙にもどる
    opening.classList.add("is-leaving");
    setTimeout(() => {
      opening.hidden = true;
      opening.classList.remove("is-idle", "is-leaving");
      setScene("cover"); // 表紙にもどったら、表紙のBGM
      startCoverIdle();
    }, 600);
    return;
  }
  opening.classList.add("is-playing"); // フロリが、動いて登場する
  opening.querySelector(".opening-flori").hidden = false;
  const length = Math.max(2600, playJingle("opening") + 400);
  setTimeout(() => opening.classList.add("is-leaving"), length);
  setTimeout(() => {
    opening.hidden = true;
    startCoverIdle();
  }, length + 600);
}
$("opening").addEventListener("click", closeOpening);
$("opening").addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") closeOpening();
});

// ================= バッジ・称号 =================
function badgeContext(stats = loadStats()) {
  return { stats, total: currentTotal(stats), playable: playableQuestions.length, all: allQuestions.length, oni: oniQuestions.length };
}

// もらえるバッジを数えなおして、はじめてのものを、おぼえる。新しいバッジの id を返す。
function awardBadges() {
  const stats = loadStats();
  const earned = earnedBadges(badgeContext(stats));
  const fresh = earned.filter((id) => !stats.badges.includes(id));
  if (fresh.length) {
    recordBadges([...stats.badges, ...fresh]);
    renderBadgeBackground();
  }
  return fresh;
}

// もらったバッジを、背景に、うっすらとちらす(ふんわり動く)
function renderBadgeBackground() {
  const have = loadStats().badges;
  const layer = $("badge-bg");
  layer.replaceChildren(
    ...have.flatMap((id, index) => {
      const badge = BADGES.find((item) => item.id === id);
      if (!badge) return [];
      return [0, 1].map((copy) => {
        const span = document.createElement("span");
        const n = index * 2 + copy;
        span.textContent = badge.icon;
        span.style.left = `${(n * 61.8 + 7) % 96}%`;
        span.style.top = `${(n * 38.2 + (copy ? 41 : 9)) % 92}%`;
        span.style.fontSize = `${30 + ((n * 7) % 22)}px`;
        span.style.setProperty("--rot", `${((n * 29) % 50) - 25}deg`);
        span.style.animationDelay = `${(n % 7) * -0.9}s`;
        return span;
      });
    }),
  );
}

// ===== お知らせ:図鑑・バッジ・称号・きせかえ・成績で、あたらしく手に入れたものを知らせる =====
const NOTICE_KEY = "floriQuiz.notice"; // どこまで見たか(カードは、図鑑のほうで)
function loadNotice() {
  try {
    return JSON.parse(localStorage.getItem(NOTICE_KEY) ?? "null");
  } catch {
    return null;
  }
}
function saveNotice(notice) {
  try {
    localStorage.setItem(NOTICE_KEY, JSON.stringify(notice));
  } catch {
    // 保存できなくても、遊びは続けられる。
  }
}
function openDressKeys(stats) {
  const ctx = { have: new Set(stats.badges), stars: stats.stars };
  return Object.entries(DRESS_LISTS).flatMap(([kind, list]) => list.filter((item) => isOpen(item, ctx)).map((item) => `${kind}:${item.id}`));
}
function dressName(key) {
  const [kind, id] = key.split(":");
  return DRESS_LISTS[kind].find((item) => item.id === id)?.name ?? "";
}
function noticeNow(stats) {
  const total = currentTotal(stats);
  return { badges: [...stats.badges], dress: openDressKeys(stats), title: titleFor(total), starTitle: starTitleFor(stats.stars), total };
}
// 見たところまでの記録。はじめて(この機能を使うのが、はじめて)のときは、いまの状態を、見たことにする。
function noticeBase() {
  let base = loadNotice();
  if (!base) {
    base = noticeNow(loadStats());
    saveNotice(base);
  }
  return base;
}
function computeNews() {
  const stats = loadStats();
  const base = noticeBase();
  const now = noticeNow(stats);
  const valid = new Set(allQuestions.map((q) => q.uid ?? q.id));
  const viewed = dexViewed();
  const met = [...new Set([...stats.dex, ...stats.seen, ...stats.right, ...stats.oniRight])].filter((id) => valid.has(id));
  return {
    cards: met.filter((id) => !viewed.has(id)).length,
    badges: now.badges.filter((id) => !base.badges.includes(id)),
    titles: [now.title !== base.title ? now.title : "", now.starTitle && now.starTitle !== base.starTitle ? `☆${now.starTitle}` : ""].filter(Boolean),
    dress: now.dress.filter((key) => !base.dress.includes(key)),
    gain: Math.max(0, now.total - base.total),
    now,
  };
}
// その画面を開いたら、「見た」ことにする
function markSeen(kind) {
  const base = noticeBase();
  const now = noticeNow(loadStats());
  if (kind === "badges") Object.assign(base, { badges: now.badges, title: now.title, starTitle: now.starTitle });
  if (kind === "dress") base.dress = now.dress;
  if (kind === "records") base.total = now.total;
  saveNotice(base);
}
// 表紙のボタンに、赤いしるし
function refreshNoticeDots() {
  if (allQuestions.length === 0) return;
  const news = computeNews();
  const set = (id, text) => {
    const dot = $(id).querySelector(".tile-dot");
    dot.hidden = !text;
    dot.textContent = text;
  };
  set("btn-dex", news.cards > 0 ? `NEW ${news.cards}` : "");
  set("btn-badges", news.badges.length + news.titles.length > 0 ? "NEW" : "");
  set("btn-dress", news.dress.length > 0 ? "NEW" : "");
  set("btn-records", news.gain > 0 ? "UP" : "");
}
// 結果の画面に、あたらしく手に入れたものを、まとめて出す
function renderNews() {
  const news = computeNews();
  const lines = [];
  if (news.cards > 0) lines.push(`📚 問題図鑑:新しいカードが ${news.cards}まい!`);
  if (news.badges.length) lines.push(`🏅 新しいバッジ:${news.badges.map((id) => `${BADGES.find((badge) => badge.id === id)?.icon ?? ""}${badgeName(id)}`).join("  ")}`);
  if (news.titles.length) lines.push(`🎖 新しい称号:${news.titles.join("・")}`);
  if (news.dress.length) lines.push(`👑 きせかえが ふえたヨ:${news.dress.map(dressName).join("・")}`);
  if (news.gain > 0) lines.push(`🏆 総合得点が ${news.gain}点 アップ!(いま ${news.now.total}点)`);
  const list = $("r-news");
  list.hidden = lines.length === 0;
  list.replaceChildren(
    ...lines.map((text) => {
      const item = document.createElement("li");
      item.textContent = text;
      return item;
    }),
  );
}

function announceBadges(element) {
  const fresh = awardBadges();
  element.hidden = fresh.length === 0;
  if (fresh.length) {
    const icons = fresh.map((id) => `${BADGES.find((badge) => badge.id === id).icon}${badgeName(id)}`);
    element.textContent = `新しいバッジ!  ${icons.join("  ")}`;
  }
}

function showBadges() {
  awardBadges(); // これまでの記録で、もらえるものを、先にそろえる
  const stats = loadStats();
  const have = new Set(stats.badges);
  $("badge-title").textContent = `いまの称号:${titleFor(currentTotal(stats))}  ・  バッジ ${have.size} / ${BADGES.length}個`;
  $("badge-detail").textContent = "バッジをおすと、もらいかたが見られるヨ。";
  $("badge-list").replaceChildren(
    ...BADGES.map((badge) => {
      const owned = have.has(badge.id);
      const item = document.createElement("li");
      const button = document.createElement("button");
      button.type = "button";
      button.className = `badge-chip${owned ? "" : " locked"}`;
      button.dataset.noSe = "1";
      const icon = document.createElement("span");
      icon.className = "badge-icon";
      icon.textContent = owned ? badge.icon : "🔒";
      const name = document.createElement("span");
      name.className = "badge-name";
      name.textContent = owned ? badge.name : "???";
      button.append(icon, name);
      button.addEventListener("click", () => {
        $("badge-detail").textContent = `${owned ? `${badge.icon} ${badge.name}` : "🔒 まだ"}:${badge.text}`;
      });
      item.append(button);
      return item;
    }),
  );
  // 称号一覧:総合得点で決まる
  const total = currentTotal(stats);
  const now = titleFor(total);
  $("title-list").replaceChildren(
    ...[...TITLES].reverse().map((title) => {
      const item = document.createElement("li");
      item.className = title.name === now ? "is-now" : total >= title.min ? "" : "locked";
      item.textContent = `${title.min}点〜  ${title.name}`;
      return item;
    }),
  );
  // ☆の称号:ごほうびの星の数で、きまる
  const starNow = starTitleFor(stats.stars);
  $("star-title-list").replaceChildren(
    ...[...STAR_TITLES].reverse().map((title) => {
      const item = document.createElement("li");
      item.className = title.name === starNow ? "is-now" : stats.stars >= title.min ? "" : "locked";
      item.textContent = `☆ ${title.min}こ〜  ${title.name}`;
      return item;
    }),
  );
  markSeen("badges");
  show("badges");
}

// ================= 問題図鑑 =================
// ================= 問題図鑑(カードを集める) =================
const CATEGORY_ICON = { ひらめき: "💡", 社会: "🌏", 理科: "🔬", 科学: "⚗️", 日常: "🏠", 規則: "🔢", 国語: "📖", 論理: "🧩", 算数: "➗", オニ: "👹" };
const RARITY = { 1: "★", 2: "★★", 3: "★★★", 4: "💎", 5: "👹" };
const DEX_VIEWED_KEY = "floriQuiz.dexViewed"; // 図鑑を開いて、もう見たカード(NEW! を一度だけ出すため)

function dexViewed() {
  try {
    return new Set(JSON.parse(localStorage.getItem(DEX_VIEWED_KEY) ?? "[]"));
  } catch {
    return new Set();
  }
}

function openDexCard(question, label, owned) {
  const big = $("dex-big");
  big.className = `dex-big lv${question.level}`;
  const head = document.createElement("div");
  head.className = "dex-big-head";
  head.textContent = `${CATEGORY_ICON[question.category] ?? "❓"} ${label}  ${question.category}  ${RARITY[question.level] ?? ""}`;
  const text = document.createElement("p");
  text.className = "dex-q";
  text.textContent = question.text;
  big.replaceChildren(head, text);
  if (question.type === "choice") {
    const list = document.createElement("ol");
    list.className = "dex-choices";
    list.type = "A";
    for (const choice of question.choices) {
      const item = document.createElement("li");
      item.textContent = choice;
      list.append(item); // 答えと解説とヒントは、のせない(問題を解いて、たしかめる)
    }
    big.append(list);
  }
  if (owned) {
    const mark = document.createElement("p");
    mark.className = "dex-owned";
    mark.textContent = "✔ 正解したことがあるヨ!";
    big.append(mark);
  }
  $("dlg-dex").showModal();
}

function showDex() {
  const stats = loadStats();
  const met = new Set([...stats.dex, ...stats.seen, ...stats.right, ...stats.oniRight]);
  const rightSet = new Set([...stats.right, ...stats.oniRight]);
  const viewed = dexViewed();
  const sorted = [...allQuestions].sort((a, b) => a.id.localeCompare(b.id));
  const playableList = sorted.filter((q) => q.level <= HARD_LEVEL);
  const oniList = sorted.filter((q) => q.level > HARD_LEVEL);
  const card = (question, label) => {
    const uid = question.uid ?? question.id;
    const owned = met.has(uid);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dex-card lv${question.level}${owned ? "" : " locked"}`;
    button.dataset.noSe = owned ? "" : "1";
    const no = document.createElement("span");
    no.className = "dex-no";
    no.textContent = label;
    const rarity = document.createElement("span");
    rarity.className = "dex-rarity";
    rarity.textContent = owned ? RARITY[question.level] : "";
    const icon = document.createElement("span");
    icon.className = "dex-icon";
    icon.textContent = owned ? (CATEGORY_ICON[question.category] ?? "❓") : "？";
    const cat = document.createElement("span");
    cat.className = "dex-cat";
    cat.textContent = owned ? question.category : "???";
    button.append(no, rarity, icon, cat);
    if (owned && !viewed.has(uid)) {
      const fresh = document.createElement("span");
      fresh.className = "dex-new";
      fresh.textContent = "NEW!";
      button.append(fresh);
    }
    if (owned && rightSet.has(uid)) {
      const star = document.createElement("span");
      star.className = "dex-star";
      star.textContent = "✔";
      button.append(star);
    }
    button.addEventListener("click", () => {
      if (owned) openDexCard(question, label, rightSet.has(uid));
      else $("dex-comment").textContent = "まだ出会っていないヨ。問題を解くと、カードがもらえるヨ!";
    });
    return button;
  };
  const cards = playableList.map((q, i) => card(q, `No.${i + 1}`));
  // オニ問題は、出会ったものだけを、のせる(あることは、先にばらさない)
  oniList.forEach((q, i) => {
    if (met.has(q.uid ?? q.id)) cards.push(card(q, `オニ${i + 1}`));
  });
  const have = playableList.filter((q) => met.has(q.uid ?? q.id)).length;
  const percent = Math.round((have / playableList.length) * 100);
  $("dex-count").textContent = `カード ${have} / ${playableList.length}まい(${percent}%)`;
  $("dex-meter-bar").style.width = `${percent}%`;
  $("dex-comment").textContent =
    have === playableList.length
      ? "🎉 コンプリート! 全部のカードがそろったヨ!"
      : have === 0
        ? "問題を解くと、カードが集まるヨ!"
        : "カードをおすと、問題がもう一度見られるヨ。";
  $("screen-dex").classList.toggle("is-complete", have === playableList.length);
  $("dex-grid").replaceChildren(...cards);
  // NEW! は、一度見たら、つぎからは出さない
  try {
    localStorage.setItem(DEX_VIEWED_KEY, JSON.stringify([...met]));
  } catch {
    // 保存できなくても、遊びは続けられる。
  }
  show("dex");
}
$("btn-dex-close").addEventListener("click", () => $("dlg-dex").close());

// ================= きせかえ・背景 =================
let dress = loadDress();

function applyDress() {
  document.documentElement.dataset.theme = dress.theme;
  setFloriColor(COLORS.find((color) => color.id === dress.color) ?? null);
  // フロリのかざり(画像)。かざりごとに、場所と大きさが、ちがう(style.css の data-hat)
  const hat = HATS.find((item) => item.id === dress.hat);
  for (const id of ["hero-hat", "dress-hat"]) {
    const img = $(id);
    img.hidden = !hat?.img;
    if (hat?.img) img.src = hat.img;
    img.dataset.hat = hat?.id ?? "";
  }
}

let dressTab = "color"; // きせかえで、いま見ている種類(color / hat / theme)
const DRESS_LISTS = { color: COLORS, hat: HATS, theme: THEMES };

function showDress() {
  awardBadges();
  const stats = loadStats();
  const ctx = { have: new Set(stats.badges), stars: stats.stars };
  $("dress-stars").textContent = stats.stars;
  for (const tab of document.querySelectorAll("[data-dress-tab]")) tab.classList.toggle("is-on", tab.dataset.dressTab === dressTab);
  const nameOf = (list, id) => list.find((item) => item.id === id)?.name ?? "";
  $("dress-now").textContent = `いま:${nameOf(COLORS, dress.color)} ・ ${nameOf(HATS, dress.hat)} ・ ${nameOf(THEMES, dress.theme)}`;
  const kind = dressTab;
  $("dress-list").replaceChildren(
    ...DRESS_LISTS[kind].map((choice) => {
      const open = isOpen(choice, ctx);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `dress-item${dress[kind] === choice.id ? " is-on" : ""}${open ? "" : " is-locked"}`;
      button.style.borderColor = choice.tint; // 縁を、その色に
      // 絵だけを見せる(名前や、もらいかたは、マウスをのせたときに出す)
      const art = document.createElement("span");
      art.className = `dress-art is-${kind}`;
      if (kind === "color") art.style.background = choice.original ? "linear-gradient(135deg, #dfe8ee, #7ec3e0)" : choice.tint;
      else if (kind === "theme") art.style.background = choice.preview ?? choice.tint;
      else if (choice.img) {
        const pic = document.createElement("img");
        pic.src = choice.img;
        pic.alt = "";
        art.append(pic);
      } else art.textContent = "🚫";
      button.append(art);
      if (dress[kind] === choice.id) {
        const check = document.createElement("span");
        check.className = "dress-check";
        check.textContent = "✔";
        check.setAttribute("aria-hidden", "true");
        button.append(check);
      }
      if (!open) {
        const lock = document.createElement("span");
        lock.className = "dress-lock";
        lock.textContent = "🔒";
        lock.setAttribute("aria-hidden", "true");
        button.append(lock);
      }
      const tip = document.createElement("span");
      tip.className = "dress-tip";
      tip.textContent = open ? choice.name : `🔒 ${choice.name}:${lockText(choice)}でもらえます`;
      button.append(tip);
      button.setAttribute("aria-label", open ? choice.name : `${choice.name}(${lockText(choice)}でもらえます)`);
      if (dress[kind] === choice.id) button.style.backgroundColor = `color-mix(in srgb, ${choice.tint} 35%, white)`;
      button.addEventListener("click", () => {
        if (!open) {
          // まだ使えないもの:もらいかたを、知らせる
          $("dress-message").textContent = `「${choice.name}」は${lockText(choice)}でもらえるヨ。`;
          return;
        }
        $("dress-message").textContent = "";
        dress = { ...dress, [kind]: choice.id };
        saveDress(dress);
        applyDress();
        showDress();
      });
      return button;
    }),
  );
  markSeen("dress");
  show("dress");
}
for (const tab of document.querySelectorAll("[data-dress-tab]")) {
  tab.addEventListener("click", () => {
    dressTab = tab.dataset.dressTab;
    $("dress-message").textContent = "";
    showDress();
  });
}
applyDress();

$("btn-dex").addEventListener("click", showDex);
$("btn-dex-back").addEventListener("click", () => show("cover"));
$("btn-badges").addEventListener("click", showBadges);
$("btn-badges-back").addEventListener("click", () => show("cover"));
$("btn-dress").addEventListener("click", showDress);
$("btn-dress-back").addEventListener("click", () => show("cover"));

// 読み上げ
function syncReadSettings() {
  $("set-read").checked = readAloud();
  $("set-read-dlg").checked = readAloud();
  $("btn-read").hidden = !(canSpeak && readAloud()); // 設定でチェックを入れたときだけ、「読み上げ」ボタンを出す
}
syncReadSettings();
for (const box of [$("set-read"), $("set-read-dlg")]) {
  box.addEventListener("change", () => {
    setReadAloud(box.checked);
    syncReadSettings();
    if (!box.checked) stopSpeaking();
  });
}

$("btn-read").addEventListener("click", () => {
  if (answered) speak(answerReading());
  else speak(`${readableQuestion(current)}${hinted ? `。ヒント。${current.hint}` : ""}`);
});

// ================= 文字の大きさ =================
const SIZE_KEY = "floriQuiz.textSize";
const SIZES = { small: 0.9, normal: 1, large: 1.15, xlarge: 1.3 };
function textSize() {
  try {
    const saved = localStorage.getItem(SIZE_KEY);
    return saved in SIZES ? saved : "normal";
  } catch {
    return "normal";
  }
}
function setTextSize(size) {
  if (!(size in SIZES)) return;
  try {
    localStorage.setItem(SIZE_KEY, size);
  } catch {
    // 保存できなくても、そのページを開いている間は、かわったまま。
  }
  applyTextSize();
}
function applyTextSize() {
  document.documentElement.style.setProperty("--ui-zoom", String(SIZES[textSize()]));
  for (const radio of document.querySelectorAll('input[type="radio"][name^="size-"]')) radio.checked = radio.value === textSize();
}
applyTextSize();
for (const radio of document.querySelectorAll('input[type="radio"][name^="size-"]')) {
  radio.addEventListener("change", () => setTextSize(radio.value));
}
