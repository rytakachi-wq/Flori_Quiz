import "./emoji-img.js";
import {
  HARD_LEVEL,
  HARD_MIN_LEVEL,
  HINT_COST,
  MAP_CHEST_BONUS,
  MAP_CHESTS,
  MAP_MAX_QUESTIONS,
  MAP_STAGES,
  MapRound,
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
  SURVIVAL_LIVES,
  SurvivalRound,
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
  saveCourseKey,
  recordOni,
  recordReview,
  recordRound,
  recordVersus,
} from "./storage.js";
import { illustrationFor } from "./illustrations.js";
import { createTalker } from "./talk.js";
import { initTutorial, openTutorial } from "./tutorial.js";
import { initRules, openRules as resetRules } from "./rules.js";
import { BODIES, COLORS, FACES, HEADS, RANKS, THEMES, earnedBadges, getText, groupLabel, canWear, isOpen, loadDress, progressOf, rankOf, saveDress, todoText } from "./badges.js";
import { GardenUI } from "./garden.js";
import { refreshDecor, setAutoDecor } from "./decor-overlay.js";
import { applyFloriSrc, recolor, setFloriColor, setWarmList } from "./flori-color.js";
import { getVolume, loopName, playJingle, playSe, resetVolumes, setScene, setVolume, startLoop, stopLoop, unlock } from "./audio.js";
import { getFuriganaMode, setFuriganaMode, speechOf, startFurigana } from "./furigana.js";

const QUESTIONS_URL = "../data/questions/questions.json";
const ONI_TAPS = 5; // 表紙のすみのフロリを、この回数押すと、オニ問題が出る
const IMG = {
  think: "../assets/flori/m/book_pen.png",
  correct: "../assets/flori/m/wave_smile.png",
  wrong: "../assets/flori/m/wave_wrong.png",
  surprised: "../assets/flori/m/wave_surprised.png",
};

const $ = (id) => document.getElementById(id);
const SCREENS = ["cover", "rules", "setup", "confirm", "menu", "note", "relax", "records", "settings", "dex", "dress", "question", "result", "error"];

let coverTaps = 0;
let mode = "normal"; // 遊び方:"normal"(普通) "hard"(難しい) "oni"(オニ) "versus"(皆で対戦) "review"(復習) "daily"(毎日1問) "survival"(サバイバル) "map"(ミニマップ)
let timeLimit = false; // この回に、制限時間を付けるか(普通・難しい・復習・毎日1問で、はじめに聞く)
let hinted = false; // 今の問題で、ヒントを見たか
let versusPlayers = 2; // 皆で対戦する人数

// 画面ごとのBGMの場面(audio.js の BGM と対応)
function sceneOf(name) {
  if (name === "question") {
    return { oni: "oni", hard: "hard", versus: "versus" }[mode] ?? "question";
  }
  if (name === "relax") return "relax";
  if (name === "result") return "result";
  return name === "error" ? null : "cover";
}

// 表紙のフロリ:表紙を出して3秒たったら、ときどき、はねる(30秒なにもしなくても、オープニングには、もどらない)
let idleTimer = 0;
function startCoverIdle() {
  clearTimeout(idleTimer);
  $("screen-cover").classList.remove("is-lively");
  if (!$("opening").hidden) return; // オープニングの間は、まだ
  idleTimer = setTimeout(() => $("screen-cover").classList.add("is-lively"), 3000);
}

// 着せ替えのフロリ:ふだんは止まっていて、20秒なにもさわらないと、動きだす(さわると、止まる)
let dressIdleTimer = 0;
function startDressIdle() {
  clearTimeout(dressIdleTimer);
  $("screen-dress").classList.remove("is-lively");
  if (currentScreen !== "dress") return;
  dressIdleTimer = setTimeout(() => $("screen-dress").classList.add("is-lively"), 20000);
}

// 表紙で、画面にさわる・動かす・キーを押すと、動きを止めて、また3秒数えなおす
function noteActivity() {
  if (!$("screen-cover").hidden) {
    startCoverIdle();
    talker.poke();
  }
  if (!$("screen-dress").hidden) startDressIdle();
}
for (const type of ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"]) {
  document.addEventListener(type, noteActivity, { passive: true });
}

// 表紙のフロリのセリフ:表紙を出して30秒はあいさつ。そのあとは、10秒に1回、豆知識に変わる
const talker = createTalker({ textEl: $("cover-talk") });

// 横にスワイプ(なぞる)して、行き来できる画面
const PAGER = ["cover", "dress", "dex", "records", "menu", "settings"];
const PAGER_ICON = { cover: "🏠", menu: "📋", dex: "📚", dress: "👑", records: "🏆", settings: "⚙️" };
const PAGER_NAME = { cover: "ホーム", menu: "その他", dex: "図鑑", dress: "着せ替え", records: "成績", settings: "設定" };
let currentScreen = "cover";

function renderPager(name) {
  const pager = $("pager");
  pager.replaceChildren(
    ...PAGER.map((key) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.className = `pager-dot${key === name ? " is-on" : ""}`;
      dot.innerHTML = '<span class="pi" aria-hidden="true"></span><span class="pl"></span>';
      dot.querySelector(".pi").textContent = PAGER_ICON[key];
      dot.querySelector(".pl").textContent = PAGER_NAME[key];
      dot.setAttribute("aria-label", PAGER_NAME[key]);
      if (key === "dress" || key === "dex" || key === "records") dot.dataset.news = key;
      dot.addEventListener("click", () => PAGE_OPEN[key]());
      return dot;
    }),
  );
}

let movingTimer = 0;
// 画面が変わるときの、横に流れる短い動き(動きは、transform と opacity だけ。カクつかないように)
// direction:1=右から入ってくる(先へ進む)、-1=左から入ってくる(戻る)
function slideIn(name, direction) {
  const el = $(`screen-${name}`);
  el.classList.remove("slide-r", "slide-l");
  void el.offsetWidth;
  el.classList.add(direction > 0 ? "slide-r" : "slide-l");
  el.addEventListener("animationend", () => el.classList.remove("slide-r", "slide-l"), { once: true });
}

// direction を書かないときは、ならびの順(PAGER)か、先へ進む向き
function show(name, direction = 0) {
  const previous = currentScreen;
  for (const key of SCREENS) $(`screen-${key}`).hidden = key !== name;
  if (name !== "cover") coverTaps = 0;
  if (name === "cover") {
    refreshCover();
    startCoverIdle();
    talker.start();
  } else {
    clearTimeout(idleTimer);
    $("screen-cover").classList.remove("is-lively");
    talker.stop();
  }
  if (name !== "question") {
    stopTimer();
    stopSpeaking();
  }
  if (name !== "result") stopResultSound();
  currentScreen = name;
  if (name === "dress") startDressIdle();
  else {
    clearTimeout(dressIdleTimer);
    $("screen-dress").classList.remove("is-lively");
  }
  const pager = $("pager");
  pager.hidden = !PAGER.includes(name);
  if (!pager.hidden) renderPager(name);
  if (previous !== name) {
    const ordered = PAGER.includes(name) && PAGER.includes(previous);
    slideIn(name, direction || (ordered ? (PAGER.indexOf(name) > PAGER.indexOf(previous) ? 1 : -1) : 1));
  }
  document.body.classList.toggle("has-pager", PAGER.includes(name));
  setScene(sceneOf(name));
  window.scrollTo(0, 0);
  refreshDecor();
  // 画面が切りかわる間(と、指で触っている間)は、背景の動く絵を止めて、かくつかないようにする
  document.body.classList.add("is-moving");
  clearTimeout(movingTimer);
  movingTimer = setTimeout(() => document.body.classList.remove("is-moving"), 450);
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
const idToUid = new Map(); // 問題の番号 → uid(「続きから」の保存に使う)
let allQuestions = []; // 全部の問題(オニもふくむ。図鑑で着せ替えの条件で使う)
let playableQuestions = []; // 普通+難しい問題(復習・毎日1問で使う)
let normalIds = new Set(); // 普通の問題の uid(成績の記録に使う。番号が付けなおされても、変わらない)
let hardIds = new Set(); // 難しい問題の uid
let oniIds = new Set(); // オニ問題の uid
const sessions = new Map(); // 「理系-normal」のような名前 → 普通・難しいモードの遊び(難しさのカウンターを引き継ぐ)
let activeKey = null; // いま遊んでいる、sessions の名前
const pick = { kind: "solo", group: "理系", level: "normal", time: false, players: 2 }; // 設定の画面で選んだ、遊ぶ人・分類・難しさ(人数)・制限時間
const GROUPS = ["理系", "文系", "ひらめき"];
const MIN_POOL = 10; // 1つの組み合わせで、最低これだけの問題がないと、他の分類から足す
let versusQuestions = []; // 対戦で使う問題(段階1〜3)
let play; // いま遊んでいるもの(session・hardSession・オニ問題など)
let current = null; // 今出している問題
let answered = false;

function setFlori(src, alt) {
  const img = $("q-flori");
  applyFloriSrc(img, src);
  img.alt = alt;
}

// 画面いっぱいに、ひとことを出して、短い曲を鳴らしてから、次へ進む(「それでは、スタート!」など)。
let announcing = false; // 大きな表示を出している間は、他の操作(キーボードの連打など)を受け付けない
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

// 表紙のボタンの文字(今日の毎日1問をやったか、復習が何問あるか)を、今の記録に合わせる。
function refreshCover() {
  if (playableQuestions.length === 0) return;
  const stats = loadStats();
  const total = currentTotal(stats);
  const rank = rankOf(total);
  $("hud-total").textContent = total;
  $("hud-rank").textContent = rank.name;
  $("hud-rank-icon").textContent = rank.icon;
  $("hud-stars").textContent = stats.stars;
  $("hud-dress").textContent = dressOwned(stats);
  $("hud-dress-all").textContent = dressTotal();
  const today = dateKey();
  const dailyDone = stats.dailyLast === today;
  $("btn-daily").querySelector(".tile-label").textContent = "毎日1問";
  $("btn-daily").querySelector(".tile-icon").textContent = dailyDone ? "✅" : "📅"; // 今日の分をやったら、チェック
  $("btn-daily").classList.toggle("is-done", dailyDone);
  const left = stats.wrong.filter((id) => playableIds().has(id)).length;
  $("btn-review").querySelector(".tile-label").textContent = left > 0 ? `復習(${left}問)` : "復習(なし)";
  refreshNoticeDots();
}

// 難しさの星(全部で4段階)
function stars(level) {
  return `${"★".repeat(level)}${"☆".repeat(HARD_LEVEL - level)}`;
}

function playableIds() {
  return new Set([...normalIds, ...hardIds]);
}

let reviewFromQuiz = false; // クイズの結果から、すぐ復習に来たか(戻る先が、モード選択になる)
let reviewOnly = null; // 結果から「すぐ復習」したときの、復習する問題(uid)
let lastCorrect = null; // 前の問題に正解したか(フロリのセリフに使う)
// 画面に出す得点は、5点満点(中の点は、1問2点のまま。出すときに、半分にする)
const fmtPts = (internal) => {
  const v = internal / 2;
  return Number.isInteger(v) ? String(v) : v.toFixed(1);
};
const pickOf = (list) => list[Math.floor(Math.random() * list.length)];

function startPlay(nextMode, startMessage = null) {
  mode = nextMode;
  lastCorrect = null;
  if (mode === "oni") timeLimit = false; // オニ問題には、制限時間はない
  if (mode === "oni") play = new OniRound(oniQuestions);
  else if (mode === "hard") play = getSession(pick.group, "hard");
  else if (mode === "versus") play = new VersusRound(versusPool(), versusPlayers);
  else if (mode === "review") {
    const wrong = new Set(reviewOnly ?? loadStats().wrong);
    reviewOnly = null;
    const pool = playableQuestions.filter((q) => wrong.has(q.uid ?? q.id));
    if (pool.length === 0) return show("cover");
    play = new PracticeRound(pool); // 間違えた問題を、全部(正解すると、復習から消える)
  } else if (mode === "daily") {
    play = new PracticeRound([dailyQuestion(playableQuestions, dateKey())]);
  } else if (mode === "survival") play = new SurvivalRound(adventurePool());
  else if (mode === "map") play = new MapRound(adventurePool());
  else play = getSession(pick.group, "normal");
  const resume = (mode === "normal" || mode === "hard") && hasCourseKey(activeKey); // 続きから遊ぶときは、そう知らせる
  announce(startMessage ?? (resume ? "続きから スタート!" : "それでは スタート!"), "start", showQuestion, "../assets/flori/m/body_wave.webp");
}

// サバイバル・ミニマップの問題:選んだ分類の、普通・難しい問題(少ないときは、他の分類から足す)
function adventurePool() {
  const inGroup = pick.group === "ランダム" ? playableQuestions : playableQuestions.filter((q) => groupOf(q) === pick.group);
  const others = playableQuestions.filter((q) => !inGroup.includes(q)).sort(() => Math.random() - 0.5);
  return [...inGroup, ...others.slice(0, Math.max(0, 20 - inGroup.length))];
}

// 問題の画面の上の、しるし。サバイバル=ハート、ミニマップ=ゴールまでの道(🤖がいまいるマス)
function adventureProgress() {
  const n = Math.min(play.asked + (answered ? 0 : 1), 99);
  if (mode === "survival") return `${"❤️".repeat(Math.max(0, play.lives))}${"🖤".repeat(SURVIVAL_LIVES - Math.max(0, play.lives))}`;
  return `第${Math.min(n, MAP_MAX_QUESTIONS)}/${MAP_MAX_QUESTIONS}問`;
}

// ミニマップの道:🤖がいまいるマス(🚩スタート・🎁宝箱・🏆ゴール)。問題の画面の上に、1行で出す
function mapTrail() {
  const nodes = ["🚩", ...Array.from({ length: MAP_STAGES }, (_, i) => (i + 1 === MAP_STAGES ? "🏆" : MAP_CHESTS.includes(i + 1) ? "🎁" : "▫️"))];
  nodes[play.position] = "🤖";
  return nodes.join("");
}

// 対戦の問題:選んだ分類の問題。回戦ごとに、人数ぶんの問題がないときは、他の分類から足す
function versusPool() {
  const all = allQuestions.filter((q) => q.level <= VERSUS_ROUNDS);
  if (pick.group === "ランダム") return all;
  const inGroup = all.filter((q) => groupOf(q) === pick.group);
  const pool = [...inGroup];
  for (let level = 1; level <= VERSUS_ROUNDS; level += 1) {
    const need = versusPlayers - inGroup.filter((q) => q.level === level).length;
    if (need <= 0) continue;
    const others = all.filter((q) => q.level === level && groupOf(q) !== pick.group).sort(() => Math.random() - 0.5);
    pool.push(...others.slice(0, need));
  }
  return pool;
}

function showQuestion() {
  const { question, leveledUp } = play.nextQuestion();
  current = question;
  answered = false;

  const versus = mode === "versus";
  const total = mode === "map" ? MAP_MAX_QUESTIONS : (play.total ?? (mode === "survival" ? 99 : QUESTIONS_PER_ROUND));
  const prefix = {
    normal: "",
    hard: "難しい ",
    oni: "オニ ",
    versus: "",
    review: "復習 ",
    daily: "毎日1問 ",
    survival: "",
    map: "",
  }[mode];
  const adventure = mode === "survival" || mode === "map";
  $("q-progress").textContent = versus
    ? `${play.round} / ${VERSUS_ROUNDS}回戦`
    : adventure
      ? adventureProgress()
      : `${prefix}第${play.asked + 1}問 / ${total}問`;
  renderTurn(versus);
  $("q-level").textContent =
    mode === "oni"
      ? "難しさ オニ"
      : versus
          ? `${"★".repeat(play.round)}${"☆".repeat(VERSUS_ROUNDS - play.round)} 正解で${play.round}点` : `難しさ ${stars(question.level)}`;
  // 問題に合わせた、イラスト(絵と動きで、場面が分かるように)
  const art = illustrationFor(question);
  $("q-art").innerHTML = art;
  $("q-art").hidden = art === "";
  $("q-trail").hidden = mode !== "map";
  if (mode === "map") $("q-trail").textContent = mapTrail();
  $("q-text").textContent = question.text;
  $("q-text").classList.toggle("long", question.text.length > 70); // 長い問題は、文字を少し小さくして、画面に収める
  $("screen-question").classList.toggle("is-long", question.text.length > 100); // とても長い問題は、もっとぎゅっと
  $("screen-question").classList.remove("is-answered", "is-hinted", "is-tight3");
  $("q-feedback").hidden = true;

  // フロリのセリフ(問題の番号によって変わる。皆で対戦では出さない)
  const message = $("q-message");
  const coach = versus ? null : mode === "map" && play.chestAhead ? { text: "🎁 宝箱マス! 正解で ボーナス点!" } : coachLine(play.asked, total, leveledUp);
  if (coach) {
    setFlori(coach.surprised ? IMG.surprised : IMG.think, coach.surprised ? "驚くフロリ" : "本とペンを持つフロリ");
    message.textContent = coach.text;
    message.hidden = false;
  } else {
    setFlori(IMG.think, "本とペンを持つフロリ");
    message.hidden = true;
  }

  // ヒント:普通・難しい・復習・毎日1問・皆で対戦で、1問に1回だけ(見ると、その問題の点が半分)。オニは、ヒントなし。「分からない」だけ
  hinted = false;
  $("q-hint").hidden = true;
  $("btn-hint").disabled = false;
  const hintable = Boolean(question.hint) && mode !== "oni";
  $("q-hint-area").hidden = false;
  $("btn-hint").hidden = !hintable;
  $("btn-giveup").hidden = false;
  $("btn-giveup").disabled = false;

  renderers[question.type].render(question, answer);
  show("question");
  fitQuestion();
  setTimeout(fitQuestion, 120); // ふりがなが付いたあとに、もう1度
  if (timeLimit) startTimer();
  else $("q-timer").hidden = true;
  stopSpeaking();
  // 自動の読み上げ(400ミリ秒のあいだに、先へ進んだり、他の画面にいったときは、読まない)
  if (readAloud() && canSpeak) {
    setSpeaking(true); // 読み上げが始まる前から、制限時間を止めておく
    setTimeout(() => {
      if (current === question && !answered && !$("screen-question").hidden) speak(readableQuestion(question));
      else if (!speechSynthesis.speaking) setSpeaking(false);
    }, 400);
  }
}


// 問題の画面が、はみ出すときは、イラスト → フロリ・セリフの順に、小さくして、1画面に収める
function fitQuestion() {
  const screen = $("screen-question");
  if (screen.hidden || screen.classList.contains("is-answered")) return;
  screen.classList.remove("is-tight1", "is-tight2");
  if (screen.scrollHeight <= screen.clientHeight + 1) return;
  screen.classList.add("is-tight1");
  if (screen.scrollHeight <= screen.clientHeight + 1) return;
  screen.classList.add("is-tight2");
}
window.addEventListener("resize", () => fitQuestion());

// 問題の番号に合わせた、フロリのセリフと声(first=最初の問題、last=最後の問題)
function coachLine(asked, total, leveledUp) {
  const last = total > 1 && asked === total - 1 && mode !== "survival";
  const base = (() => {
    if (asked === 0) {
      if (mode === "hard") return { text: "難しいモード! さぁ がんばるぞ!" };
      if (mode === "oni") return { text: "オニ問題! 頑張って!" };
      if (mode === "daily") return { text: "今日の 1問! 頑張って!" };
      if (mode === "review") return { text: "復習 さぁ がんばるぞ!" };
      if (mode === "survival") return { text: "ハートは 3つ! どこまで いけるかな?" };
      if (mode === "map") return { text: `ゴールまで ${MAP_STAGES}マス! ${MAP_MAX_QUESTIONS}問までに いこう!` };
      return { text: "さぁ がんばるぞ!" };
    }
    if (last) return { text: "ラスト 1問! がんばれー!" };
    if (total >= 5 && asked === Math.floor(total / 2)) return { text: "ちょうど 半分! フレーフレー!" };
    if (total >= 5 && asked === total - 2) return { text: "あと ちょっと~!" };
    return lastCorrect === false ? { text: "どんまい! 次は いけるヨ!" } : { text: "その調子 その調子!" };
  })();
  if (leveledUp && mode !== "oni") return { text: "難しくなりました!", surprised: true, levelup: true };
  return base;
}

// ---- 制限時間モード ----
let timerId = 0;
let timerLeft = 0;

function stopTimer() {
  clearInterval(timerId);
  timerId = 0;
  stopLoop();
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
  startLoop("tick");
  timerId = setInterval(() => {
    if ($("dlg-quit").open || $("dlg-giveup").open || $("dlg-volume").open || $("dlg-hint").open) {
      stopLoop(); // 設定やめるの確認を開いている間は、とめる
      return;
    }
    if (speaking || (canSpeak && (speechSynthesis.speaking || speechSynthesis.pending))) {
      // 読み上げが終わるまで、とめる(終わりの知らせが来ないときの、ほけんつき)
      if (speaking && Date.now() - speakingSince > 2500 && !speechSynthesis.speaking && !speechSynthesis.pending) setSpeaking(false);
      else {
        if (!speaking) setSpeaking(true);
        stopLoop();
        return;
      }
    }
    timerLeft -= 0.1;
    renderTimer();
    const want = timerLeft <= 5 ? "timerFast" : "tick"; // 時計の音:のこり5秒は、速く
    if (loopName() !== want) startLoop(want);
    if (timerLeft <= 0) {
      stopTimer();
      if (!answered) {
        playSe("whistle"); // 時間切れ
        timedOut = true;
        answer(current.type === "choice" ? -1 : ""); // 時間切れ=まちがい
      }
    }
  }, 100);
}
let timedOut = false;
let gaveUp = false; // 「分からない」で、答えを見たか

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
const RATE_KEY = "floriQuiz.readRate";
const RATE_DEFAULT = 1.6;
function readRate() {
  try {
    const n = parseFloat(localStorage.getItem(RATE_KEY));
    return n >= 0.8 && n <= 2.4 ? n : RATE_DEFAULT;
  } catch {
    return RATE_DEFAULT;
  }
}
function setReadRate(n) {
  try {
    localStorage.setItem(RATE_KEY, String(n));
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
  speechToken += 1;
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
// 読み上げは、1文(「。」まで)ずつ読む。速さを変えたとき、今読んでいる文から、新しい速さで読み直せる
let speechSentences = [];
let speechIndex = 0;
let speechToken = 0; // 読み直したとき、前の声の止まった知らせ(onend・onerror)を、無視するため
let speakTimer = 0;
function playSentence(index, token) {
  if (token !== speechToken) return;
  if (index >= speechSentences.length) {
    setSpeaking(false);
    return;
  }
  speechIndex = index;
  const voice = new SpeechSynthesisUtterance(speechSentences[index]);
  voice.lang = "ja-JP";
  if (japaneseVoice) voice.voice = japaneseVoice;
  voice.rate = readRate();
  voice.onend = () => token === speechToken && playSentence(index + 1, token);
  voice.onerror = () => token === speechToken && setSpeaking(false);
  speechSynthesis.resume();
  speechSynthesis.speak(voice);
}
function startSpeech(index) {
  clearTimeout(speakTimer);
  speechToken += 1;
  const token = speechToken;
  speechSynthesis.cancel();
  setSpeaking(true);
  // cancel の直後に話させると、声が出ないブラウザがあるので、少し待つ
  speakTimer = setTimeout(() => playSentence(index, token), 120);
}
function speak(text) {
  if (!canSpeak || !readableText(text)) return;
  // 漢字は、ふりがな(辞書の読み)に置きかえて、読みまちがいを減らす
  speechSentences = speechOf(text).replace(/□/g, "なにか").replace(/\n/g, "。").match(/[^。]+。?/g) ?? [];
  speechSentences = speechSentences.filter((sentence) => sentence.replace(/[。\s]/g, "") !== "");
  startSpeech(0);
}
// 速さを変えたとき:読んでいる途中なら、今の文から、新しい速さで読み直す
function respeakNow() {
  if (canSpeak && speaking && speechSentences.length) startSpeech(speechIndex);
}
function readableText(text) {
  return typeof text === "string" && text.trim() !== "";
}
function readableQuestion(question) {
  const choices = question.type === "choice" ? question.choices.map((text, i) => `${i + 1}番、${text}`).join("。") : "";
  return `${question.text}。${choices}`;
}

// 対戦のとき:だれの番かを、プレイヤーの色で知らせる案内板と、皆の点数の表
const PLAYER_NAMES = ["プレイヤー1", "プレイヤー2", "プレイヤー3", "プレイヤー4"];

function renderBoard(list, scores, active) {
  list.replaceChildren(
    ...scores.map((score, index) => {
      const item = document.createElement("li");
      item.className = `p${index + 1}${index === active ? " is-active" : ""}`;
      item.textContent = list.classList.contains("big") ? `${PLAYER_NAMES[index]}  ${score}点` : `${score}点`; // 問題の画面は、せまいので、点数だけ(だれかは、色で分かる)
      return item;
    }),
  );
  list.hidden = false;
}

function renderTurn(versus) {
  $("screen-question").dataset.player = versus ? String(play.player + 1) : ""; // 対戦のとき、いま答える人の色で、画面のふちを染める
  const turn = $("q-player");
  const board = $("q-board");
  turn.hidden = !versus;
  board.hidden = !versus;
  if (!versus) return;
  turn.className = `turn p${play.player + 1}`;
  turn.textContent = `👉 ${PLAYER_NAMES[play.player]}の番!`;
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
  if (mode === "normal" || mode === "hard") persistSession(); // 答えるたびに「続き」を保存(途中でやめても、💾 続き が付く)
  $("btn-hint").disabled = true;
  $("btn-giveup").disabled = true;
  if (mode === "versus") renderBoard($("q-board"), play.scores, answeringPlayer);
  renderers[current.type].mark(current, response, correct);
  playSe(correct ? "correct" : "wrong");
  lastCorrect = correct;
  if (mode === "survival" || mode === "map") {
    $("q-progress").textContent = adventureProgress(); // ハート・いまのマスを、すぐ変える
    if (mode === "map") $("q-trail").textContent = mapTrail();
  }

  setFlori(correct ? IMG.correct : IMG.wrong, correct ? "笑うフロリ" : "目をつぶるフロリ");
  $("q-message").hidden = true;
  const verdict = $("q-verdict");
  verdict.textContent =
    mode === "versus" && correct
      ? `正解! ${PLAYER_NAMES[answeringPlayer]}に${hinted ? `半分の${answeringRound / 2}` : answeringRound}点!`
      : correct
        ? hinted
          ? `正解!(ヒントを使ったので 半分の${fmtPts(POINTS_PER_CORRECT - HINT_COST)}点)`
          : mode === "map" && play.chestOpened
            ? `正解! 🎁 宝箱が ひらいた! ボーナス +${fmtPts(MAP_CHEST_BONUS)}点`
            : "正解!"
        : wasTimedOut
          ? "時間切れ…"
          : wasGivenUp
            ? "答えを見ました…"
            : mode === "survival"
              ? "残念… ハートが 1つ へった!"
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
  fitExplanation(); // 解説が長くても、スクロールしなくても、全部見えるように
  $("q-feedback").scrollIntoView({ block: "nearest", behavior: "instant" });
  fitFeedback();
  setTimeout(fitFeedback, 80); // ふりがなが付いたあとに、もう1度(高さが変わるため)
  setTimeout(fitFeedback, 400);
  if (readAloud()) speak(answerReading()); // 正解と解説も読み上げる
}

// 解説が、スクロールしなくても、全部見えるように、文字の大きさを調整する(小さくしても、11px まで)
function fitFeedback() {
  const box = $("q-feedback");
  if (box.hidden) return;
  const screen = $("screen-question");
  screen.classList.remove("is-tight3");
  const pass = () => {
    const text = $("q-explanation");
    const flori = $("q-react-flori");
    text.style.fontSize = "";
    text.style.lineHeight = "";
    flori.style.height = "";
    let size = parseFloat(getComputedStyle(text).fontSize);
    let guard = 0;
    while (box.scrollHeight > box.clientHeight + 1 && size > 12 && guard++ < 40) {
      size -= 0.5;
      text.style.fontSize = `${size}px`;
      text.style.lineHeight = "1.45";
    }
    let height = flori.getBoundingClientRect().height;
    while (box.scrollHeight > box.clientHeight + 1 && height > 44 && guard++ < 80) {
      height -= 6;
      flori.style.height = `${height}px`;
    }
  };
  pass();
  if (box.scrollHeight > box.clientHeight + 1) {
    screen.classList.add("is-tight3"); // それでも収まらないときは、問題文と時間の棒を、かくして、解説に場所を回す
    pass();
  }
  box.scrollLeft = 0;
  box.scrollTop = 0;
  refreshDecor(); // フロリの大きさ・場所が変わったので、かざりも、合わせ直す
}
window.addEventListener("resize", () => fitFeedback());
// ふりがなが、あとから付いて、高さが変わったときも、収めなおす
let fitTimer = 0;
const refit = () => {
  clearTimeout(fitTimer);
  fitTimer = setTimeout(() => {
    fitFeedback();
    fitQuestion();
  }, 30);
};
new MutationObserver(refit).observe($("q-explanation"), { childList: true, subtree: true });
// Webフォント(Zen Maru Gothic)は、文字の種類ごとに、あとから読みこまれて、高さが変わる。読みこみが終わるたび・大きさが変わるたびに、収めなおす(スマホで、はみ出す原因だった)
document.fonts?.addEventListener?.("loadingdone", refit);
document.fonts?.ready.then(refit);
if (window.ResizeObserver) {
  const observer = new ResizeObserver(refit);
  observer.observe($("q-explanation"));
  observer.observe($("q-feedback"));
}

// 解説の文字の大きさを、枠に収まるまで、少しずつ小さくする。それでも収まらないときは、上の問題文をかくす
function fitExplanation() {
  const box = $("q-feedback");
  const text = $("q-explanation");
  const screen = $("screen-question");
  screen.classList.remove("is-tight");
  text.style.fontSize = "";
  let size = parseFloat(getComputedStyle(text).fontSize);
  const over = () => box.scrollHeight > box.clientHeight + 1;
  while (over() && size > 12) {
    size -= 0.5;
    text.style.fontSize = `${size}px`;
  }
  if (over()) {
    screen.classList.add("is-tight");
    text.style.fontSize = "";
    size = parseFloat(getComputedStyle(text).fontSize);
    while (over() && size > 12) {
      size -= 0.5;
      text.style.fontSize = `${size}px`;
    }
  }
}

// 答えたあとに読む文(正解かどうか・正解・解説)
function answerReading() {
  return `${$("q-verdict").textContent}。正解は、${renderers[current.type].correctText(current)}。${current.explanation}`;
}

// 総合得点(100点満点)を、保存した記録から数える。いまある普通・難しい問題の、問題ごとの最高の点を足す(1問2点・ヒントを見たら1点)。
function currentTotal(stats = loadStats()) {
  const valid = playableIds();
  return totalScore(stats.right.filter((id) => valid.has(id)).map((id) => stats.qpts[id] ?? POINTS_PER_CORRECT), valid.size);
}

function showResult() {
  const result = play.finishRound();
  const versus = mode === "versus";
  $("screen-result").classList.toggle("is-versus", versus);
  $("btn-again").hidden = false;
  const adventure = mode === "survival" || mode === "map";
  $("r-best-row").querySelector("dt").textContent = mode === "map" ? "最短記録" : adventure ? "最高記録" : "最高得点"; // ミニマップ=いちばん少ない問題数でゴール
  recordDex(result.answers); // 図鑑(どのモードでも)
  $("r-correct-row").hidden = versus;
  $("r-board").hidden = true;
  if (!versus) {
    $("r-correct").textContent = `${result.correct} / ${result.total}問`;
    $("r-score").textContent =
      mode === "oni"
        ? `${result.score}点(${result.total * ONI_POINTS_PER_CORRECT}点満点)`
        : adventure
          ? `${fmtPts(result.score)}点`
          : `${fmtPts(result.score)}点(${fmtPts(result.total * POINTS_PER_CORRECT)}点満点)`;
  }
  $("r-score-row").hidden = versus; // 対戦のときは、1人の得点は出さない
  $("r-comment").textContent =
    mode === "oni" ? oniComment(result.correct, result.total) : versus ? versusComment(result) : adventure ? adventureComment(result) : comment(result.correct, result.total);
  celebrateResult(result, versus);

  const setNote = $("r-set");
  const before = currentTotal();
  // 総合得点は、初めて正解した問題の分だけ、ふえる。
  const gainText = () => {
    const gained = currentTotal() - before;
    return gained > 0 ? `総合得点が${gained}点増えたヨ!` : "総合得点は 新しく正解したり ヒントなしで正解しなおしたときだけ増えるヨ。";
  };
  if (versus) {
    // 皆で対戦した結果は、1人で遊ぶ記録(遊んだ回数、正解率、総合得点など)には入れない。
    recordVersus();
    $("r-title").textContent = "対戦の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    renderBoard($("r-board"), result.scores, -1);
    result.winners.forEach((index) => $("r-board").children[index].classList.add("is-winner"));
    setNote.textContent = "";
    $("btn-again").textContent = "もう1度対戦";
  } else if (mode === "review") {
    // 復習:間違えた問題の一覧だけが変わる。成績の回数や、総合得点には入れない。
    const left = recordReview(result.answers);
    $("r-title").textContent = "復習の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = left > 0 ? `復習が必要な問題はあと${left}問だヨ。` : "復習完了! 間違えた問題はもうないヨ!";
    $("btn-again").textContent = "もう1度復習";
    $("btn-again").hidden = left === 0;
  } else if (mode === "daily") {
    // 毎日1問:1日1回だけ記録する。続けた日数を数える。
    const key = dateKey();
    const saved = recordDaily({ date: key, previous: previousDateKey(key), answer: result.answers[0] });
    $("r-title").textContent = "毎日1問の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = `${saved.streak}日連続!(全部で${saved.days}日)また明日も挑戦してネ!`;
    $("btn-again").hidden = true;
  } else if (mode === "oni") {
    // オニ問題は、成績の「遊んだ回数」「正解率」「総合得点」には入れない(オニ問題の正解数だけ数える)。
    recordOni(result.answers);
    const oniDone = loadStats().oniRight.filter((id) => oniIds.has(id)).length;
    $("r-title").textContent = "オニ問題の結果!";
    $("r-best-row").hidden = true;
    $("r-record").hidden = true;
    setNote.textContent = `オニ問題に正解したことがあるのは、${oniDone} / ${oniIds.size}問だヨ。`;
    $("btn-again").textContent = "もう1度挑戦";
  } else if (adventure) {
    // サバイバル・ミニマップは、成績の「遊んだ回数」「正解率」「総合得点」には入れない(この遊びだけの記録を、端末の中に残す)。
    const saved = recordAdventure(mode, result);
    $("r-title").textContent = mode === "map" ? (result.goal ? "ゴール! 🏆" : "ゴールまで あと少し!") : "サバイバルの結果!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = adventureBestText(mode);
    $("r-record").hidden = !saved.isRecord;
    setNote.textContent =
      mode === "map"
        ? `${result.position} / ${MAP_STAGES}マスまで 進んだヨ。${MAP_MAX_QUESTIONS}問のうちに ゴールをめざそう!`
        : `${result.correct}問 正解して ハートが なくなったヨ。もっと先まで いけるかな?`;
    $("btn-again").textContent = "もう1度挑戦";
  } else if (mode === "hard") {
    const saved = recordRound({ ...result, mode: "hard", timed: timeLimit });
    persistHard(); // 「続きから」の記録
    $("r-title").textContent = "難しいモードの結果!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = `${fmtPts(loadStats().bestHard)}点`;
    $("r-record").hidden = !saved.isRecord;
    setNote.textContent = gainText();
    $("btn-again").textContent = "もう1度挑戦";
  } else {
    const saved = recordRound({ ...result, timed: timeLimit });
    const stats = loadStats();
    $("r-title").textContent = "結果発表!";
    $("r-best-row").hidden = false;
    $("r-best").textContent = `${fmtPts(stats.best)}点`;
    $("r-record").hidden = !saved.isRecord;
    $("btn-again").textContent = "続けて遊ぶ";
    setNote.textContent = "続けて遊ぶと 難しさも続きます。正解が続くと難しく 間違えると易しくなります。";
    persistCourse(); // 「続きから」の記録
  }
  setNote.hidden = false;
  // 制限時間を付けたご褒美:正解した数ぶんの星。全問正解なら、さらに3つ(オニと対戦は、なし)
  const reward = $("r-reward");
  reward.hidden = true;
  if (timeLimit && !versus && mode !== "oni" && !adventure) {
    const earned = result.correct + (result.correct === result.total ? 3 : 0);
    const stars = addStars(earned);
    reward.textContent = `制限時間のご褒美! ⭐ +${earned}(全部で ${stars}個)`;
    reward.hidden = false;
  }
  awardBadges();
  renderNews();
  renderRewardCard($("r-next-reward"));
  // すぐ復習:1人の普通・難しいモードで、間違えた問題・ヒントを見た問題があるとき
  const toReview = !versus && (mode === "normal" || mode === "hard") ? result.answers.filter((a) => !a.correct || a.hinted).map((a) => a.id) : [];
  reviewNow = toReview;
  $("btn-r-review").hidden = toReview.length === 0;
  $("btn-r-review").textContent = `📖 間違えた問題を すぐ 復習(${toReview.length}問)`;
  show("result");
  fitResult();
  setTimeout(fitResult, 150);
  setTimeout(fitResult, 700);
  resultTimers.push(setTimeout(celebrateUnlocks, DRUMROLL_MS + 3300)); // 着せ替えが、ふえていたら、お祝いの画面(結果の画面を出ると、取り消す)
}

// 結果の画面が、1画面に収まるように、大事でないものから順に、かくす
function fitResult() {
  const screen = $("screen-result");
  if (screen.hidden) return;
  const order = ["r-set", "r-next-reward", "r-news", "r-reward"].map($);
  for (const el of order) el.classList.remove("fit-hide");
  for (const el of order) {
    if (screen.scrollHeight <= screen.clientHeight + 1) break;
    if (!el.hidden) el.classList.add("fit-hide");
  }
}
window.addEventListener("resize", () => fitResult());

// 結果発表を、盛り上げる:星・まわる紙ふぶき・点数の数えあげ・フロリの声
let reviewNow = [];
let resultSound = null;
let resultTimers = [];
const DRUMROLL_MS = 1200; // ドラムロールが鳴って、点数を数えあげてから、「ジャン!」で、発表する
function stopResultSound() {
  resultTimers.forEach(clearTimeout);
  resultTimers = [];
  resultSound?.stop();
  resultSound = null;
}
function celebrateResult(result, versus) {
  stopResultSound();
  const screen = $("screen-result");
  const ratio = versus ? 1 : result.total > 0 ? result.correct / result.total : 0;
  const mood = ratio === 1 ? "perfect" : ratio >= 0.6 ? "good" : ratio > 0 ? "ok" : "low";
  screen.dataset.mood = versus ? "perfect" : mood;
  screen.classList.remove("is-celebrate", "is-reveal");
  void screen.offsetWidth;
  screen.classList.add("is-celebrate"); // フロリは、すぐ、はねて登場
  const stars = $("r-stars");
  if (versus) stars.replaceChildren();
  else {
    const filled = Math.round(ratio * 5);
    stars.replaceChildren(
      ...Array.from({ length: 5 }, (_, i) => {
        const star = document.createElement("span");
        star.textContent = "💡"; // ひらめきの電球(とれた数だけ、光る)
        star.className = i < filled ? "on" : "off";
        star.style.setProperty("--i", String(i));
        return star;
      }),
    );
  }
  // 紙ふぶき(盛り上がるほど、多く)。発表のときに、降る
  const icons = ["🎉", "⭐", "✨", "🎊", "🌟", "💖"];
  // 紙ふぶき:画面のあちこちに、まばらに ぽんと出て、ゆっくり、ひらひら、散っていく(1人でも皆でも同じ)
  const count = ratio === 0 && !versus ? 0 : versus || mood === "perfect" ? 30 : 22;
  $("r-fx").replaceChildren(
    ...Array.from({ length: count }, (_, i) => {
      const bit = document.createElement("span");
      bit.textContent = icons[i % icons.length];
      bit.style.fontSize = `${20 + ((i * 7) % 18)}px`;
      bit.style.left = `${(i * 37 + 7) % 92}%`;
      bit.style.top = `${4 + ((i * 53) % 52)}%`;
      bit.style.setProperty("--sway", `${((i % 2 ? 1 : -1) * (16 + ((i * 11) % 30)))}px`);
      bit.style.animationDelay = `${((i * 7) % 12) * 0.28}s`;
      bit.style.animationDuration = `${7 + ((i * 5) % 5)}s`;
      return bit;
    }),
  );
  // ドラムロールが鳴っている間は、結果を出さない。鳴りおわったら、ロールのしめと一緒に、発表(点数の数えあげ・電球・紙ふぶき)
  resultSound = playSe("drumroll", DRUMROLL_MS);
  const scoreEl = $("r-score");
  const scoreText = scoreEl.textContent;
  const scoreTail = scoreText.slice(scoreText.indexOf("点"));
  const oni = mode === "oni";
  if (!versus && result.score > 0 && !scoreEl.hidden) scoreEl.textContent = `0${scoreTail}`;
  resultTimers.push(
    setTimeout(() => {
      resultSound = playSe("rollend");
      screen.classList.add("is-reveal");
      if (!versus && result.score > 0 && !scoreEl.hidden) {
        let n = 0;
        const step = Math.max(60, Math.floor(900 / result.score));
        const timer = setInterval(() => {
          n += 1;
          scoreEl.textContent = `${oni ? Math.min(n, result.score) : fmtPts(Math.min(n, result.score))}${scoreTail}`;
          if (n >= result.score) clearInterval(timer);
        }, step);
        resultTimers.push(timer);
      }
    }, DRUMROLL_MS),
  );
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
  if (result.winners.length > 1) return `${names.join("と")}の同点トップ! 皆よく頑張ったネ!`;
  return `${names[0]}の勝ち! おめでとう!`;
}

function oniComment(correct, total) {
  if (correct === total) return "ええっ! 全部正解! 天才だヨ!";
  if (correct >= total / 2) return "オニを相手にすごいヨ!";
  if (correct >= 1) return "オニ問題を解くなんてえらいヨ!";
  return "オニは難しいんだヨ。また挑戦してネ!";
}

function adventureComment(result) {
  if (mode === "map") return result.goal ? "ゴール到着! すごいヨ!" : result.position >= 3 ? "惜しい! もう少しで ゴールだったヨ!" : "ナイスチャレンジ! また 道を進もう!";
  return result.correct >= 10 ? "すごい! 最後まで 生きのこったヨ!" : result.correct >= 5 ? "いいね! まだまだ 進めるヨ!" : "ハートを 大事に! もう1度 いってみよう!";
}

// サバイバル・ミニマップの記録(端末の中だけ。成績のデータとは別に持つ)。サバイバル=いちばん多く正解した問題数、ミニマップ=いちばん少ない問題数でゴール(最短記録)
const ADVENTURE_KEY = "floriQuiz.adventure";
function loadAdventure() {
  try {
    const raw = JSON.parse(localStorage.getItem(ADVENTURE_KEY) ?? "{}");
    return { survival: Math.max(0, Number(raw.survival) || 0), map: Math.max(0, Number(raw.map) || 0) };
  } catch {
    return { survival: 0, map: 0 };
  }
}
function recordAdventure(kind, result) {
  const best = loadAdventure();
  let isRecord = false;
  if (kind === "survival" && result.correct > best.survival) {
    best.survival = result.correct;
    isRecord = true;
  } else if (kind === "map" && result.goal && (best.map === 0 || result.total < best.map)) {
    best.map = result.total;
    isRecord = true;
  }
  try {
    localStorage.setItem(ADVENTURE_KEY, JSON.stringify(best));
  } catch {
    // 保存できなくても、遊べる
  }
  return { isRecord };
}
function adventureBestText(kind) {
  const best = loadAdventure();
  if (kind === "survival") return `${best.survival}問`;
  return best.map > 0 ? `${best.map}問` : "なし";
}

// オニ問題を解放したか(オニの問題に、1度でも出会っている)
function oniOpened(stats) {
  return [...stats.seen, ...stats.dex, ...stats.right, ...stats.oniRight].some((id) => oniIds.has(id));
}

function showRecords() {
  const s = loadStats();
  // 「出会った問題」「正解した問題」は、いまある問題(普通+難しい)のうち、何問か。問題が増えても、全体の数を合わせる。
  const playable = new Set([...normalIds, ...hardIds]);
  // 総合得点は、100点満点(普通+難しい問題、1問2点)
  $("s-total").textContent = `${currentTotal(s)}点 / ${TOTAL_POINTS}点`;
  $("s-total-bar").style.width = `${(currentTotal(s) / TOTAL_POINTS) * 100}%`;
  $("s-plays").textContent = `${s.plays}回(対戦${s.versusPlays}回)`;
  $("s-dress").textContent = `${dressOwned(s)} / ${dressTotal()}個`;
  $("s-stars").textContent = `⭐ ${s.stars}個`;
  // 毎日1問:きのうか今日やっていれば、続けた日数。それより前なら、0日(とぎれた)
  const today = dateKey();
  const running = s.dailyLast === today || s.dailyLast === previousDateKey(today) ? s.dailyStreak : 0;
  $("s-daily").textContent = `${running}日連続(計${s.dailyDays}日)`;
  $("s-wrong").textContent = `${s.wrong.filter((id) => playable.has(id)).length}問`;
  const total = currentTotal(s);
  const rank = rankOf(total);
  const nextRank = RANKS.find((item) => item.min > total);
  $("s-rank-icon").textContent = rank.icon;
  $("s-rank").textContent = rank.name;
  // 次のランクまで:1問をヒントなしで正解すると、100点÷問題数の点が入る
  const perQuestion = TOTAL_POINTS / Math.max(1, playable.size);
  $("s-rank-next").textContent = nextRank
    ? `次は ${nextRank.icon}${nextRank.name} あと${nextRank.min - total}点(約${Math.ceil((nextRank.min - total) / perQuestion)}問)`
    : "最高ランク! すごいヨ!";
  const rightIds = new Set(s.right);
  // 理系・文系・ひらめき・ランダム(=全部)は総合得点の問題。オニ問題は、別に数える
  const oniRight = new Set(s.oniRight);
  const groupRows = [...GROUPS, "ランダム", "オニ"].map((group) => {
    const oni = group === "オニ";
    const list = oni ? oniQuestions : group === "ランダム" ? playableQuestions : playableQuestions.filter((q) => groupOf(q) === group);
    const got = list.filter((q) => (oni ? oniRight : rightIds).has(q.uid ?? q.id)).length;
    const item = document.createElement("li");
    item.innerHTML = '<span class="gb-name"></span><span class="gb-bar"><i></i></span><b class="gb-num"></b>';
    const hidden = oni && !oniOpened(s); // オニを解放するまでは「？？」
    item.querySelector(".gb-name").textContent = hidden ? "❓ ？？" : oni ? "👹 オニ" : `${GROUP_ICON[group]} ${group}`;
    item.querySelector(".gb-bar i").style.width = hidden ? "0%" : `${list.length ? (got / list.length) * 100 : 0}%`;
    item.querySelector(".gb-num").textContent = hidden ? "？？" : oni ? `${got}/${list.length}(${got * ONI_POINTS_PER_CORRECT}点)` : `${got}/${list.length}`;
    return item;
  });
  $("s-groups").replaceChildren(...groupRows);
  const rightPlayable = s.right.filter((id) => playable.has(id));
  const full = rightPlayable.filter((id) => (s.qpts[id] ?? POINTS_PER_CORRECT) >= POINTS_PER_CORRECT).length;
  $("s-full").textContent = `${full}問`;
  $("s-half").textContent = `${rightPlayable.length - full}問`;
  $("s-rate").textContent = s.answered ? `${Math.round((s.correct / s.answered) * 100)}%(${s.correct}/${s.answered}問)` : "まだないよ";
  markSeen("records");
  show("records");
}

// ランクの一覧:いまのランクに しるしをつける
function openRankInfo() {
  const total = currentTotal();
  const now = rankOf(total);
  $("ranks-list").replaceChildren(
    ...RANKS.map((rank) => {
      const item = document.createElement("li");
      item.className = rank.min === now.min ? "is-now" : total >= rank.min ? "is-past" : "";
      item.innerHTML = '<span class="rk-icon" aria-hidden="true"></span><span class="rk-name"></span><span class="rk-min"></span>';
      item.querySelector(".rk-icon").textContent = rank.icon;
      item.querySelector(".rk-name").textContent = rank.name;
      item.querySelector(".rk-min").textContent = (rank.min === 100 ? "〜100点" : `${rank.min}点〜`) + (rank.min === now.min ? " いま!" : "");
      return item;
    }),
  );
  $("dlg-ranks").showModal();
}
$("btn-rank-info").addEventListener("click", openRankInfo);
$("btn-ranks-close").addEventListener("click", () => $("dlg-ranks").close());

function next() {
  stopSpeaking(); // 先へ進んだら、読み上げは止める
  if (play.roundFinished) announce("結果発表〜!", "result", showResult, "../assets/flori/m/wave_surprised.png");
  else showQuestion();
}

document.addEventListener("keydown", (event) => {
  if ($("screen-question").hidden || answered || event.ctrlKey || event.metaKey || event.altKey) return;
  if ($("dlg-quit").open || $("dlg-giveup").open || $("dlg-oni").open || $("dlg-volume").open || current.type !== "choice") return;
  const index = Number(event.key) - 1;
  if (Number.isInteger(index) && index >= 0 && index < current.choices.length) answer(index);
});

// 音:画面を初めてさわったら音を出せるようにして、ボタンを押すと効果音をならす。
for (const type of ["pointerdown", "keydown"]) {
  document.addEventListener(type, () => {
    unlock();
  }, { capture: true });
}
document.addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (button && !button.dataset.noSe) playSe("button");
});

// 設定:BGMと効果音の大きさ(0〜100)。表紙の「設定」と、問題を解いているときの「設定」で、同じ大きさを使う。
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

// ふりがな:4つから選ぶ(全部 / おおめ / すくなめ / なし)。設定の画面と、問題を解いているときの設定で、同じ設定を使う。
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
  setReadRate(RATE_DEFAULT);
  syncReadSettings();
  setTextSize("normal");
  setFuriganaMode("all");
  showVolumes();
  showFurigana();
  $("settings-message").textContent = "初期設定に戻したヨ。";
});

// 問題を解いているときの「設定」
$("btn-q-settings").addEventListener("click", () => {
  showVolumes();
  $("dlg-volume").showModal();
});
$("btn-volume-close").addEventListener("click", () => $("dlg-volume").close());


// ================= クイズ:ルール → モード選択(1つの画面で、ぜんぶ選ぶ)→ 確認 → スタート =================
const GROUP_ICON = { 理系: "🔬", 文系: "📖", ひらめき: "💡", ランダム: "🎲" };
const SAVE_MARK = "💾 続き"; // 続きから遊べるしるし

// ボタンのならび(絵文字の色に合わせた色は、style.css の .c-○○)。badge:ボタンの角のしるし、sub:文字の下の小さい文
function renderSeg(el, options, value, onPick) {
  el.replaceChildren(
    ...options.map((option) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `seg-btn ${option.color}${option.value === value ? " is-on" : ""}${option.small ? " is-small" : ""}`;
      button.setAttribute("aria-pressed", String(option.value === value));
      button.innerHTML = '<span class="si" aria-hidden="true"></span><span class="st"></span><span class="ss"></span><span class="sb"></span>';
      button.querySelector(".si").textContent = option.icon;
      button.querySelector(".st").textContent = option.text;
      button.querySelector(".ss").textContent = option.sub ?? "";
      const badge = button.querySelector(".sb");
      badge.textContent = option.badge ?? "";
      badge.hidden = !option.badge;
      if (option.badge) button.setAttribute("aria-label", `${option.text}(${option.badge})`);
      button.addEventListener("click", () => onPick(option.value));
      return button;
    }),
  );
}

const LEVEL_TEXT = { normal: "普通", hard: "難しい", map: "ミニマップ", survival: "サバイバル" };
const courseKey = (group = pick.group, level = pick.level) => `${group}-${level}`;
const anySavedCourse = () => [...GROUPS, "ランダム"].some((group) => ["normal", "hard"].some((level) => hasCourseKey(courseKey(group, level))));

function renderSetup() {
  const versus = pick.kind === "versus";
  renderSeg(
    $("seg-kind"),
    [
      { value: "solo", icon: "🙂", text: "1人", color: "c-yellow" },
      { value: "versus", icon: "👥", text: "皆で", color: "c-blue" },
    ],
    pick.kind,
    (value) => {
      pick.kind = value;
      renderSetup();
    },
  );
  renderSeg(
    $("seg-group"),
    [
      { value: "理系", icon: "🔬", text: "理系", color: "c-sky" },
      { value: "文系", icon: "📖", text: "文系", color: "c-tan" },
      { value: "ひらめき", icon: "💡", text: "ひらめき", color: "c-yellow" },
      { value: "ランダム", icon: "🎲", text: "ランダム", color: "c-red" },
    ].map((option) => ({ ...option, badge: !versus && hasCourseKey(courseKey(option.value)) ? SAVE_MARK : "" })),
    pick.group,
    (value) => {
      pick.group = value;
      renderSetup();
    },
  );
  // 3つめの行は、1人のときは「難しさ」、皆のときは「皆の人数」(場所と高さは、同じ)
  $("set-label-3").innerHTML = versus ? '<span aria-hidden="true">🔢</span> 皆の人数' : '<span aria-hidden="true">🎮</span> 遊び方';
  if (versus) {
    renderSeg(
      $("seg-third"),
      [2, 3, 4].map((n) => ({ value: n, icon: "👤", text: `${n}人`, color: "c-blue" })),
      pick.players,
      (value) => {
        pick.players = value;
        renderSetup();
      },
    );
  } else {
    renderSeg(
      $("seg-third"),
      [
        { value: "normal", icon: "🌱", text: "普通", color: "c-green" },
        { value: "hard", icon: "🔥", text: "難しい", color: "c-orange" },
        { value: "map", icon: "🗺️", text: "マップ", color: "c-sky" },
        { value: "survival", icon: "❤️", text: "ライフ", color: "c-red" },
      ].map((option) => ({ ...option, badge: hasCourseKey(courseKey(pick.group, option.value)) ? SAVE_MARK : "" })),
      pick.level,
      (value) => {
        pick.level = value;
        renderSetup();
      },
    );
  }
  $("seg-third").classList.toggle("is-four", !versus); // 遊び方は4つ並ぶので、文字を少し小さく
  // 制限時間:「つける」を大きく、「なし」を小さく
  renderSeg(
    $("seg-time"),
    [
      { value: true, icon: "⏱", text: "つける", sub: "星が もらえる", color: "c-red" },
      { value: false, icon: "🙂", text: "なし", sub: "ご褒美が なくなるよ", color: "c-gray", small: true },
    ],
    pick.time,
    (value) => {
      pick.time = value;
      renderSetup();
    },
  );
  $("setup-note").textContent = versus
    ? "1台の画面で 順番に 答えるよ。毎回 はじめから。"
    : pick.level === "map"
      ? `ゴールまで ${MAP_STAGES}マス! 正解で 進む。${MAP_MAX_QUESTIONS}問までに 🎁宝箱を ひらいて ゴールしよう!`
      : pick.level === "survival"
        ? "サバイバル:ハートは 3つ。まちがえると へるよ。どこまで 正解できるかな?"
        : hasCourseKey(courseKey())
      ? "💾 続きから 始まるよ!"
      : anySavedCourse()
        ? "はじめから 始まるよ。(💾 = 続きあり)"
        : "はじめから 始まるよ。じっくり 考えよう!";
  renderRewardCard($("flow-reward"));
}

// おすすめ:分類・難しさ・制限時間を、まとめて選ぶ(人数選択は、そのまま)。続きがあるときは、いちばん進んでいる続きを選ぶ
function chooseRecommended() {
  const courses = loadStats().courses;
  let best = null;
  for (const group of [...GROUPS, "ランダム"]) {
    for (const level of ["normal", "hard"]) {
      const saved = courses[courseKey(group, level)];
      const progress = saved ? saved.used.length + saved.counter : 0;
      if (hasCourseKey(courseKey(group, level)) && (!best || progress > best.progress)) best = { group, level, progress };
    }
  }
  pick.group = best && pick.kind !== "versus" ? best.group : "ランダム";
  pick.level = best ? best.level : "normal";
  pick.time = false;
  renderSetup();
}

// 確認の画面:選んだものを、ならべて見せる
function renderConfirm() {
  const versus = pick.kind === "versus";
  const saved = !versus && hasCourseKey(courseKey());
  const rows = [
    ["👥", "人数選択", versus ? `皆で(${pick.players}人)` : "1人", "c-blue"],
    ["📚", "分類", `${GROUP_ICON[pick.group]} ${pick.group}`, "c-tan"],
    versus ? ["🏁", "進み方", "3回戦で 対戦", "c-green"] : ["🎮", "遊び方", LEVEL_TEXT[pick.level], "c-orange"],
    ["⏱", "制限時間", pick.time ? "つける(30秒)" : "なし", pick.time ? "c-red" : "c-gray"],
    saved ? ["💾", "続き", "前の続きから 遊ぶ", "c-yellow"] : ["🆕", "続き", "はじめから 遊ぶ", "c-yellow"],
  ];
  $("confirm-list").replaceChildren(
    ...rows.map(([icon, label, value, color]) => {
      const item = document.createElement("li");
      item.className = color;
      item.innerHTML = '<span class="cl-i" aria-hidden="true"></span><span class="cl-l"></span><b class="cl-v"></b>';
      item.querySelector(".cl-i").textContent = icon;
      item.querySelector(".cl-l").textContent = label;
      item.querySelector(".cl-v").textContent = value;
      return item;
    }),
  );
}

// クイズのルール(フリップ)は、はじめて「クイズ」を押したときだけ、ゲームの前に流れる。2回目からは、モード選択へ(モード選択の「ルールをもう1度見る」で、いつでも見られる)
const RULES_SEEN_KEY = "floriQuiz.guideSeen.quiz";
function openRules() {
  let seen = false;
  try {
    seen = localStorage.getItem(RULES_SEEN_KEY) === "1";
    localStorage.setItem(RULES_SEEN_KEY, "1");
  } catch {
    // 保存できなくても、遊べる(毎回ルールが出るだけ)
  }
  if (seen) {
    renderSetup();
    show("setup");
    return;
  }
  resetRules();
  show("rules");
}
$("btn-quiz").addEventListener("click", openRules);
initRules(() => {
  renderSetup();
  show("setup");
});
$("btn-recommend").addEventListener("click", chooseRecommended);
$("btn-start").addEventListener("click", () => {
  renderConfirm();
  show("confirm");
});
$("btn-confirm-back").addEventListener("click", () => show("setup", -1));
$("btn-confirm-start").addEventListener("click", () => {
  timeLimit = pick.time;
  if (pick.kind === "versus") {
    versusPlayers = Math.min(VERSUS_MAX_PLAYERS, Math.max(VERSUS_MIN_PLAYERS, pick.players));
    startPlay("versus");
  } else startPlay(pick.level);
});

// 戻るボタンは、どの画面でも、左上の同じ場所。表紙から、ひとつずつ戻る
$("btn-rules-back").addEventListener("click", () => show("cover", -1));
$("btn-flow-back").addEventListener("click", () => show("cover", -1));
$("btn-show-rules").addEventListener("click", () => {
  resetRules();
  show("rules");
});
$("btn-menu-back").addEventListener("click", () => show("cover", -1));

// その他(2ページ目):下のページ点、または、横スワイプで出る(縦にスクロールしても、表紙をさわっても、画面は変わらない)
function openMenu() {
  refreshCover();
  show("menu");
}
const PAGE_OPEN = {
  cover: () => show("cover"),
  menu: () => openMenu(),
  dex: () => showDex(),
  dress: () => openDress(),
  records: () => showRecords(),
  settings: () => {
    $("settings-message").textContent = "";
    show("settings");
  },
};
let swipe = null;
// 横にスワイプ:左へなぞると、次の画面。右へなぞると、前の画面。
// 少しずらしただけでは動かさない。大きくなぞったら、指を離す前に移動。短くても、すばやく払う(フリック)なら、離したときに移動。
function trySwipe(touch, released) {
  const start = swipe;
  if (!start || start.done || !PAGER.includes(currentScreen)) return;
  if (document.querySelector("dialog[open]") || !$("tutorial").hidden || !$("opening").hidden || announcing) return;
  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  const elapsed = Math.max(1, Date.now() - start.t);
  const horizontal = Math.abs(dx) > Math.abs(dy) * 2.2;
  const bigDrag = Math.abs(dx) > 110 && horizontal;
  const flick = released && Math.abs(dx) > 45 && horizontal && Math.abs(dx) / elapsed > 0.45; // 1ミリ秒に 0.45px 以上
  if (bigDrag || flick) {
    start.done = true;
    const next = PAGER.indexOf(currentScreen) + (dx < 0 ? 1 : -1);
    if (next >= 0 && next < PAGER.length) PAGE_OPEN[PAGER[next]]();
  }
}
document.addEventListener(
  "touchstart",
  (event) => {
    swipe = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY, t: Date.now(), done: false } : null;
    document.body.classList.add("is-touching");
  },
  { passive: true },
);
document.addEventListener("touchmove", (event) => trySwipe(event.touches[0], false), { passive: true });
document.addEventListener(
  "touchend",
  (event) => {
    trySwipe(event.changedTouches[0], true);
    swipe = null;
    setTimeout(() => document.body.classList.remove("is-touching"), 250);
  },
  { passive: true },
);
document.addEventListener("touchcancel", () => { swipe = null; document.body.classList.remove("is-touching"); }, { passive: true });

// 問題を解く前に、制限時間を付けるかを聞く(普通・難しい・復習・毎日1問)
let pendingMode = null;
function chooseTime(nextMode) {
  pendingMode = nextMode;
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

// 普通・難しいモードの遊び。分類(理系・文系・ひらめき)×難しさごとに、ひとつずつ作って、「続きから」を保存する。
const groupOf = (q) => q.group ?? "ひらめき";
let uidToIdMap = new Map();
function getSession(group, kind) {
  const key = `${group}-${kind}`;
  activeKey = key;
  if (sessions.has(key)) return sessions.get(key);
  const [min, max] = kind === "hard" ? [HARD_MIN_LEVEL, HARD_LEVEL] : [1, MAX_LEVEL];
  const inBand = playableQuestions.filter((q) => q.level >= min && q.level <= max);
  let pool = group === "ランダム" ? inBand : inBand.filter((q) => groupOf(q) === group);
  if (pool.length < MIN_POOL) {
    // 問題が少ない組み合わせは、他の分類の同じ段階の問題を足して、同じ問題がすぐに戻ってこないようにする
    const others = inBand.filter((q) => groupOf(q) !== group);
    pool = [...pool, ...others.slice(0, MIN_POOL - pool.length)];
  }
  const s = new Session(pool, Math.random, min, max);
  const saved = loadStats().courses[key];
  if (saved) {
    const valid = new Set(pool.map((q) => q.id));
    s.restore(saved.counter, saved.used.map((uid) => uidToIdMap.get(uid)).filter((id) => valid.has(id)));
  }
  sessions.set(key, s);
  return s;
}
function hasCourseKey(key) {
  const saved = loadStats().courses[key];
  return Boolean(saved && (saved.counter > 0 || saved.used.length > 0));
}
function persistSession() {
  const s = sessions.get(activeKey);
  if (!s) return;
  saveCourseKey(activeKey, { counter: s.counter, used: [...s.used].map((id) => idToUid.get(id)).filter(Boolean) });
}
const persistCourse = persistSession;
const persistHard = persistSession;
// セーブデータを消す(設定から):データが消えるので、本当にいいか、聞く
let restartAction = null;
function askRestart(action) {
  restartAction = action;
  $("dlg-restart").showModal();
}
// 消すのは、成績・図鑑・着せ替え・続き。音の大きさ・ふりがな・文字の大きさなどの設定は、のこす。
function eraseSaveData() {
  for (const key of ["floriQuiz.stats", "floriQuiz.dress", "floriQuiz.dexViewed", "floriQuiz.notice", "floriQuiz.bestScore", "floriQuiz.relaxGuideSeen", ...GUIDE_SEEN_KEYS]) {
    try {
      localStorage.removeItem(key);
    } catch {
      // 消せなくても、ページを開きなおせば、続きから始まる。
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
function openDaily() {
  if (loadStats().dailyLast === dateKey()) {
    // 今日の分は、もう終わっている
    $("dlg-info-text").textContent = "今日の分はもう終わったヨ。また明日挑戦してネ!";
    $("dlg-info").showModal();
  } else guideOnce("daily", () => chooseTime("daily"));
}
$("btn-daily").addEventListener("click", openDaily);
$("btn-info-close").addEventListener("click", () => $("dlg-info").close());
// 復習には制限時間は付けない(ムービーで説明してから始める)
$("btn-review").addEventListener("click", showNote); // 復習は、まちがいノートの画面から始める
// ヒント:1問に1回。見ると、その問題の点が半分になる。
$("btn-hint").addEventListener("click", () => {
  if (answered || hinted || !current?.hint) return;
  $("dlg-hint").showModal(); // 点が半分になるけど、いいか、聞く
});
$("btn-hint-no").addEventListener("click", () => $("dlg-hint").close());
$("btn-hint-yes").addEventListener("click", () => {
  $("dlg-hint").close();
  showHint();
});
function showHint() {
  if (answered || hinted || !current?.hint) return;
  hinted = true;
  $("q-hint").textContent = `ヒント:${current.hint}`;
  $("q-hint").hidden = false;
  $("screen-question").classList.add("is-hinted"); // ヒントの文が出たぶん、フロリを小さくして、場所をあける
  fitQuestion();
  setTimeout(fitQuestion, 120);
  $("btn-hint").disabled = true;
  if (readAloud()) speak(`ヒント。${current.hint}`); // ヒントも読み上げる
}

// リラックス:お花畑(点数も時間もない)
let garden = null;
let gardenSize = 3;

function startGarden(size = gardenSize) {
  gardenSize = size;
  $("garden-message").textContent = "ボタンを押した回数:0回";
  garden = new GardenUI($("garden"), {
    size,
    onChange: ({ moves }) => {
      $("garden-message").textContent = `ボタンを押した回数:${moves}回`;
    },
    onSolved: (moves) => {
      $("garden-message").textContent = `全部桜の木になったヨ!${moves}回で完成。すごいネ!`;
      playSe("correct");
      recordGarden();
      awardBadges();
      setTimeout(celebrateUnlocks, 1400); // 着せ替えが、ふえていたら、お祝いの画面
    },
  });
  show("relax");
}

// リラックスを選ぶと、説明・遊び方・コツのムービーを見てから、お花畑へ進む
// (ムービーは、はじめて選んだときだけ。あとは、「遊び方・コツ」ボタンで、いつでも見られる)
// 毎日1問・復習・リラックスのムービーは、はじめて選んだときだけ、ゲームの前に流れる
const GUIDE_SEEN_KEYS = ["daily", "review", "relax"].map((kind) => `floriQuiz.guideSeen.${kind}`);
function guideOnce(kind, then) {
  const key = `floriQuiz.guideSeen.${kind}`;
  let seen = false;
  try {
    seen = localStorage.getItem(key) === "1";
    localStorage.setItem(key, "1");
  } catch {
    // 保存できなくても、遊べる(毎回ムービーが出るだけ)
  }
  if (seen) then();
  else playTutorial(kind, then);
}
$("btn-relax").addEventListener("click", () => guideOnce("relax", () => startGarden()));
$("btn-relax-back").addEventListener("click", () => openMenu());
$("btn-garden-hint").addEventListener("click", () => garden?.hint()); // 光る木を教える
// リセット:配置が変わるので、確認してから
$("btn-garden-again").addEventListener("click", () => $("dlg-garden-reset").showModal());
$("btn-garden-reset-yes").addEventListener("click", () => {
  $("dlg-garden-reset").close();
  startGarden();
});
$("btn-garden-reset-no").addEventListener("click", () => $("dlg-garden-reset").close());
$("btn-garden-guide").addEventListener("click", () => playTutorial("relax")); // 説明・遊び方・コツ(ムービー)
for (const button of document.querySelectorAll("[data-garden]")) {
  button.addEventListener("click", () => startGarden(Number(button.dataset.garden)));
}

$("btn-records-back").addEventListener("click", () => show("cover", -1));
$("btn-settings").addEventListener("click", () => PAGE_OPEN.settings());
$("btn-settings-back").addEventListener("click", () => show("cover", -1));
$("btn-next").addEventListener("click", next);
$("btn-again").addEventListener("click", () => startPlay(mode));
// 結果から、間違えた問題を、すぐ復習する
$("btn-r-review").addEventListener("click", () => {
  if (reviewNow.length === 0) return;
  reviewOnly = [...reviewNow];
  reviewFromQuiz = true;
  timeLimit = false;
  startPlay("review", "ここで 正解すると 復習モードから 消えるヨ!");
});
// 毎日1問・復習のあとは、「その他」へ戻る
const leaveGame = () => {
  if (mode === "review" && reviewFromQuiz) {
    renderSetup();
    show("setup", -1); // クイズから来た復習は、クイズのモード選択へ戻る
  } else if (mode === "review") showNote();
  else if (mode === "daily") openMenu();
  else show("cover", -1);
};
$("btn-cover").addEventListener("click", leaveGame);

// やめる:確認してから、この回をなかったことにして表紙へ戻る。
// 「分からない」:答えを見ると、不正解になる。まちがえて押さないように、先に聞く
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
  if (mode === "normal" || mode === "hard") sessions.delete(activeKey); // 保存した続きから、作りなおす
  leaveGame();
});

// 表紙のすみのフロリ:何回か押すと、オニ問題が出る。
$("corner-flori").addEventListener("click", (event) => {
  const button = event.currentTarget;
  button.classList.remove("is-tapped");
  void button.offsetWidth; // アニメーションをもう1度動かす
  button.classList.add("is-tapped");
  coverTaps += 1;
  if (coverTaps >= ONI_TAPS) {
    coverTaps = 0;
    window.getSelection()?.removeAllRanges(); // 連打で選ばれた部分を、全部外す
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
    for (const theme of THEMES) new Image().src = `../assets/bg/${theme.id}.webp`; // 表紙の背景を、先に読みこむ(着せ替えで変えたとき、すぐ変わるように)
    // 答えたあと・結果で出す、フロリの絵を先に読みこんでおく(すぐ出せるように)
    const preload = [...Object.values(IMG), "../assets/flori/m/wave_nikkori.png", "../assets/flori/m/body_wave.webp"];
    for (const src of preload) new Image().src = src;
    setWarmList(preload);
    pruneStats(new Set([...normalIds, ...hardIds, ...oniIds])); // 古い番号の記録を、取りのぞく
    for (const q of normal) idToUid.set(q.id, q.uid ?? q.id);
    for (const q of hardQuestions) idToUid.set(q.id, q.uid ?? q.id);
    uidToIdMap = new Map([...idToUid].map(([id, uid]) => [uid, id]));
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
    // 1分何もしなくて、戻ってきたオープニング:さわると、すぐ表紙に戻る
    opening.classList.add("is-leaving");
    setTimeout(() => {
      opening.hidden = true;
      opening.classList.remove("is-idle", "is-leaving");
      setScene("cover"); // 表紙にもどったら、表紙のBGM
      startCoverIdle();
      talker.start();
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
    talker.start(); // オープニングから表紙に来たときは、ふきだしを、ぱっと出す
  }, length + 600);
}
$("opening").addEventListener("click", closeOpening);
$("opening").addEventListener("keydown", (event) => {
  if (event.target === $("opening") && (event.key === "Enter" || event.key === " ")) closeOpening();
});
// 遊び方(チュートリアルムービー):オープニングからも、その他からも、見られる
initTutorial();
function playTutorial(kind = "play", then = null) {
  setScene("tutorial");
  openTutorial(() => {
    setScene(sceneOf(currentScreen)); // 閉じたら、もとの画面のBGMに戻る
    then?.();
  }, kind);
}
$("btn-tutorial").addEventListener("click", (event) => {
  event.stopPropagation(); // オープニングを、閉じてしまわないように
  playTutorial();
});
$("btn-tutorial-menu").addEventListener("click", () => playTutorial());

// ================= 着せ替えの解放(条件は badges.js) =================
// 条件を数えるための材料
function badgeContext(stats = loadStats()) {
  return { stats, total: currentTotal(stats), playable: playableQuestions.length, all: allQuestions.length, oni: oniQuestions.length };
}

// 条件を満たしたものを、数えな押して、初めてのものを、おぼえる(画面には、出さない。着せ替えの解放に使う)
function awardBadges() {
  const stats = loadStats();
  const earned = earnedBadges(badgeContext(stats));
  const fresh = earned.filter((id) => !stats.badges.includes(id));
  if (fresh.length) recordBadges([...stats.badges, ...fresh]);
  return fresh;
}

// 背景に、うっすらと、ふんわり動く絵をちらす(きまった絵)
const DECOR = ["⭐", "🌸", "💡", "🎈", "✨", "🍀", "🌈", "🎀", "🌟", "🍎", "🎵", "🦋"];
function renderBadgeBackground() {
  $("badge-bg").replaceChildren(
    ...DECOR.flatMap((icon, index) =>
      [0, 1].map((copy) => {
        const span = document.createElement("span");
        const n = index * 2 + copy;
        span.textContent = icon;
        span.style.left = `${(n * 61.8 + 7) % 96}%`;
        span.style.top = `${(n * 38.2 + (copy ? 41 : 9)) % 92}%`;
        span.style.fontSize = `${30 + ((n * 7) % 22)}px`;
        span.style.setProperty("--rot", `${((n * 29) % 50) - 25}deg`);
        span.style.animationDelay = `${(n % 7) * -0.9}s`;
        return span;
      }),
    ),
  );
}

// ===== お知らせ:図鑑・着せ替え・成績で、あたらしく手に入れたものを知らせる =====
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
  return Object.entries(DRESS_LISTS).flatMap(([kind, list]) => list.filter((item) => item.unlock && isOpen(item, ctx)).map((item) => `${kind}:${item.id}`));
}
function dressOwned(stats) {
  const ctx = { have: new Set(stats.badges), stars: stats.stars };
  return Object.values(DRESS_LISTS).reduce((sum, list) => sum + list.filter((item) => item.unlock && isOpen(item, ctx)).length, 0);
}
function dressTotal() {
  return Object.values(DRESS_LISTS).reduce((sum, list) => sum + list.filter((item) => item.unlock).length, 0);
}
function dressName(key) {
  const [kind, id] = key.split(":");
  return DRESS_LISTS[kind].find((item) => item.id === id)?.name ?? "";
}
function noticeNow(stats) {
  return { dress: openDressKeys(stats), total: currentTotal(stats) };
}
// 見たところまでの記録。初めて(この機能を使うのが、初めて)のときは、今の状態を、見たことにする。
// celebrated:お祝いの画面を出した、着せ替え。
function noticeBase() {
  let base = loadNotice();
  if (!base) {
    base = noticeNow(loadStats());
    base.celebrated = [...base.dress];
    saveNotice(base);
  } else if (!Array.isArray(base.celebrated) || !Array.isArray(base.dress)) {
    base.dress = Array.isArray(base.dress) ? base.dress : openDressKeys(loadStats());
    base.celebrated = [...base.dress];
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
    dress: now.dress.filter((key) => !base.dress.includes(key)),
    gain: Math.max(0, now.total - (base.total ?? 0)),
    now,
  };
}
// その画面を開いたら、「見た」ことにする
function markSeen(kind) {
  const base = noticeBase();
  const now = noticeNow(loadStats());
  if (kind === "dress") base.dress = now.dress;
  if (kind === "records") base.total = now.total;
  saveNotice(base);
}
// 表紙のボタンに、赤いしるし
function refreshNoticeDots() {
  if (allQuestions.length === 0) return;
  const news = computeNews();
  for (const [key, on] of [["dex", news.cards > 0], ["dress", news.dress.length > 0], ["records", news.gain > 0]]) {
    for (const dot of document.querySelectorAll(`#pager [data-news="${key}"]`)) dot.classList.toggle("has-news", on);
  }
}
// 結果の画面に、あたらしく手に入れたものを、まとめて出す
function renderNews() {
  const news = computeNews();
  const lines = [];
  if (news.cards > 0) lines.push(`📚 問題図鑑:新しいカードが ${news.cards}枚!`);
  if (news.dress.length) lines.push(`🎁 着せ替えが 増えたヨ:${news.dress.map(dressName).join("・")}`);
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

// ===== 次の、ご褒美(着せ替え)の案内 =====
// まだ手に入れていないものの中で、もらえるまでが、1番近いものを、さがす
function nextRewards(count = 1) {
  const stats = loadStats();
  const ctx = badgeContext(stats);
  const state = { have: new Set(stats.badges), stars: stats.stars };
  const list = [];
  for (const [kind, items] of Object.entries(DRESS_LISTS)) {
    for (const item of items) {
      if (!item.unlock || isOpen(item, state)) continue;
      const p = progressOf(item, ctx);
      if (p && p.goal > 0) list.push({ kind, item, p, ratio: p.now / p.goal });
    }
  }
  list.sort((a, b) => b.ratio - a.ratio || a.p.goal - a.p.now - (b.p.goal - b.p.now));
  return list.slice(0, count);
}
function rewardArt(kind, item) {
  const art = document.createElement("span");
  art.className = `reward-art is-${kind}`;
  if (kind === "color") art.style.background = item.swatch ?? item.tint;
  else if (kind === "theme") art.style.background = item.preview ?? item.tint;
  else if (item.img) {
    const pic = document.createElement("img");
    pic.src = item.img;
    pic.alt = "";
    art.append(pic);
  }
  return art;
}
// 「🎁 次の ご褒美」カード:絵・もらうまでの進み具合の棒・あと、どれくらいか
function renderRewardCard(el) {
  const next = nextRewards(1)[0];
  if (!next) {
    el.hidden = true;
    return;
  }
  const { kind, item, p } = next;
  const icon = document.createElement("span");
  icon.className = "reward-icon";
  icon.textContent = "🎁";
  icon.setAttribute("aria-hidden", "true");
  const info = document.createElement("div");
  info.className = "reward-info";
  const title = document.createElement("b");
  title.className = "reward-title";
  title.textContent = `次の ご褒美:${item.name}(${KIND_WORD[kind]})`;
  const bar = document.createElement("span");
  bar.className = "reward-bar";
  const fill = document.createElement("i");
  fill.style.width = `${Math.round((p.now / p.goal) * 100)}%`;
  bar.append(fill);
  const note = document.createElement("small");
  note.className = "reward-note";
  note.textContent = p.goal > 1 ? `${getText(item)}(いま ${p.now} / ${p.goal}${p.unit ?? ""})` : getText(item);
  info.append(title, bar, note);
  el.replaceChildren(icon, rewardArt(kind, item), info);
  el.hidden = false;
}
// ===== 着せ替えを手に入れたときの、お祝いの画面 =====
let unlockQueue = [];
let unlockIndex = 0;
function celebrateUnlocks() {
  if ($("dlg-unlock").open || announcing) return;
  if (currentScreen !== "result" && currentScreen !== "relax") return; // 結果・お花畑の画面を出たあとは、出さない(クイズの画面に出てしまっていた)
  const base = noticeBase();
  const pending = openDressKeys(loadStats()).filter((key) => !base.celebrated.includes(key));
  if (pending.length === 0) return;
  base.celebrated = [...base.celebrated, ...pending];
  saveNotice(base);
  unlockQueue = pending;
  unlockIndex = 0;
  showUnlock();
  $("dlg-unlock").showModal();
  playSe("levelup");
}
const KIND_WORD = { color: "フロリの色", head: "頭の飾り", body: "体の飾り", face: "顔の飾り", theme: "背景" };
async function showUnlock() {
  const [kind, id] = unlockQueue[unlockIndex].split(":");
  const item = DRESS_LISTS[kind].find((entry) => entry.id === id);
  const dialog = $("dlg-unlock");
  dialog.style.setProperty("--tint", item.tint);
  $("unlock-kicker").textContent = `🎁 新しい${KIND_WORD[kind]}を GET!`;
  $("unlock-name").textContent = item.name;
  $("unlock-why").textContent = getText(item);
  $("unlock-count").textContent = unlockQueue.length > 1 ? `${unlockIndex + 1} / ${unlockQueue.length}` : "";
  $("unlock-count").hidden = unlockQueue.length < 2;
  // フロリに、付けたところを見せる
  const flori = $("unlock-flori");
  const stage = $("unlock-stage");
  stage.style.background = kind === "theme" ? (item.preview ?? item.tint) : "";
  setDecor("unlock-decor", wornItems(kind === "head" || kind === "body" || kind === "face" ? { [kind]: id } : {}));
  flori.dataset.sample = "1";
  if (kind === "color") {
    try {
      flori.src = await recolor("../assets/flori/m/body_wave.webp", item);
    } catch {
      flori.src = "../assets/flori/m/body_wave.webp";
    }
  } else {
    applyFloriSrc(flori, "../assets/flori/m/body_wave.webp");
  }
  const wear = $("btn-unlock-wear");
  wear.disabled = false;
  wear.textContent = "付けてみる";
  wear.onclick = () => {
    dress = { ...dress, [kind]: id };
    saveDress(dress);
    applyDress();
    wear.textContent = "✔ 付けたよ!";
    wear.disabled = true;
    playSe("correct");
  };
  $("btn-unlock-next").textContent = unlockIndex + 1 < unlockQueue.length ? "次へ" : "閉じる";
}
$("btn-unlock-next").addEventListener("click", () => {
  if (unlockIndex + 1 < unlockQueue.length) {
    unlockIndex += 1;
    showUnlock();
  } else {
    $("dlg-unlock").close();
    if (!$("screen-dress").hidden) renderDress(); // 着せ替えの画面にいたら、見た目を更新
    refreshCover();
  }
});

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
  const body = question.text.replace(/。(?=[^\n」)])/g, "。\n"); // 文の終わりで改行(文の途中で切れて読みにくくならないように)
  const tail = body.match(/[^、。\n」]{2,10}$/)?.[0]; // 最後の「どれになる?」などは、切り離さない(1行に「なる?」だけ残らないように)
  if (tail && tail.length < body.length) {
    const keep = document.createElement("span");
    keep.className = "dex-tail";
    keep.textContent = tail;
    text.append(body.slice(0, body.length - tail.length), keep);
  } else {
    text.textContent = body;
  }
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
    mark.innerHTML = '<span class="dex-hana" aria-hidden="true">💮</span><span class="dex-owned-text">正解したことがあるヨ!</span>';
    big.append(mark);
  }
  $("dlg-dex").showModal();
}

let dexFilter = "すべて"; // 図鑑で、いま見ている分類
const DEX_FILTER_ICON = { すべて: "📚", 理系: "🔬", 文系: "📖", ひらめき: "💡", オニ: "👹" };

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
      star.textContent = "💮";
      button.append(star);
    }
    button.addEventListener("click", () => {
      if (owned) {
        // カードを めくる動き(めくってから、問題を開く)
        if (button.classList.contains("is-flip") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          openDexCard(question, label, rightSet.has(uid));
          return;
        }
        button.classList.add("is-flip");
        setTimeout(() => {
          openDexCard(question, label, rightSet.has(uid));
          button.classList.remove("is-flip");
        }, 110);
      } else $("dex-comment").textContent = "まだ出会っていないヨ。問題を解くと カードがもらえるヨ!";
    });
    return button;
  };
  const numbered = playableList.map((q, i) => ({ q, label: `No.${i + 1}` }));
  const oniOpen = oniList.some((q) => met.has(q.uid ?? q.id)); // オニを解放するまでは「？？」
  const oniAll = oniList.map((q, i) => ({ q, label: oniOpen ? `オニ${i + 1}` : "？？" })); // オニも、全部のカードを並べる(まだのカードは「？」)
  const rows = dexFilter === "オニ" ? oniAll : dexFilter === "すべて" ? [...numbered, ...oniAll] : numbered.filter(({ q }) => groupOf(q) === dexFilter);
  const cards = rows.map(({ q, label }) => card(q, label));
  const everyList = [...playableList, ...oniList];
  const have = everyList.filter((q) => met.has(q.uid ?? q.id)).length;
  const percent = Math.round((have / everyList.length) * 100);
  $("dex-count").textContent = `カード ${have} / ${everyList.length}枚(${percent}%)`;
  $("dex-meter-bar").style.width = `${percent}%`;
  // 分類のボタン(いくつ集めたか)
  const tabs = ["すべて", ...GROUPS, "オニ"].map((name) => {
    const list = name === "すべて" ? everyList : name === "オニ" ? oniList : playableList.filter((q) => groupOf(q) === name);
    const got = list.filter((q) => met.has(q.uid ?? q.id)).length;
    const button = document.createElement("button");
    button.type = "button";
    button.className = `dex-tab${name === dexFilter ? " is-on" : ""}`;
    button.dataset.noSe = "";
    button.innerHTML = '<span class="dt-name"></span><small></small>';
    const secret = name === "オニ" && !oniOpen;
    button.querySelector(".dt-name").textContent = secret ? "❓ ？？" : `${DEX_FILTER_ICON[name]} ${name}`;
    button.querySelector("small").textContent = secret ? "？？" : `${got}/${list.length}`;
    button.addEventListener("click", () => {
      dexFilter = name;
      showDex();
    });
    return button;
  });
  $("dex-filter").replaceChildren(...tabs);
  $("dex-comment").textContent =
    have === everyList.length
      ? "🎉 コンプリート! 全部のカードが揃ったヨ!"
      : have === 0
        ? "問題を解くと カードが集まるヨ!"
        : "押すと 問題が見られるヨ!";
  $("screen-dex").classList.toggle("is-complete", have === everyList.length);
  $("dex-grid").replaceChildren(...cards);
  $("dex-grid").scrollTop = 0;
  // NEW! は、一度見たら、つぎからは出さない
  try {
    localStorage.setItem(DEX_VIEWED_KEY, JSON.stringify([...met]));
  } catch {
    // 保存できなくても、遊びは続けられる。
  }
  show("dex");
  fadeNewMarks("screen-dex", ".dex-new", "is-new");
}
// めくって閉じる:カード(□)を押すと、ぱっとめくって閉じる
function closeDexCard() {
  const dialog = $("dlg-dex");
  const big = $("dex-big");
  if (!dialog.open) return;
  if (big.classList.contains("is-flip-out") || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    dialog.close();
    return;
  }
  big.classList.add("is-flip-out");
  setTimeout(() => {
    dialog.close();
    big.classList.remove("is-flip-out");
  }, 110);
}
$("dlg-dex").addEventListener("click", closeDexCard);

// ================= まちがいノート =================
// まちがえて、まだ正解していない問題(stats.wrong)を、答えと解説つきで並べる。記録は増やさない(復習と同じ印を使う)。
function openNoteCard(question) {
  const big = $("note-big");
  big.className = `dex-big lv${question.level}`;
  const head = document.createElement("div");
  head.className = "dex-big-head";
  head.textContent = `${CATEGORY_ICON[question.category] ?? "❓"} ${question.category}  ${RARITY[question.level] ?? ""}`;
  const text = document.createElement("p");
  text.className = "dex-q";
  text.textContent = question.text.replace(/。(?=[^\n」)])/g, "。\n");
  const list = document.createElement("ol");
  list.className = "dex-choices";
  list.type = "A";
  question.choices.forEach((choice, index) => {
    const item = document.createElement("li");
    item.textContent = choice;
    list.append(item);
  });
  const why = document.createElement("p");
  why.className = "note-why";
  why.textContent = `💡 ${question.explanation}`;
  big.replaceChildren(head, text, list, why);
  $("dlg-note").showModal();
}
$("dlg-note").addEventListener("click", () => $("dlg-note").close());

function noteQuestions() {
  const wrong = new Set(loadStats().wrong);
  return playableQuestions.filter((q) => wrong.has(q.uid ?? q.id));
}

function showNote() {
  const items = noteQuestions();
  const rows = items.map((question) => {
    const row = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = `note-row lv${question.level}`;
    const icon = document.createElement("span");
    icon.className = "note-icon";
    icon.textContent = CATEGORY_ICON[question.category] ?? "❓";
    const label = document.createElement("span");
    label.className = "note-text";
    label.textContent = question.text.replace(/\n/g, "");
    button.append(icon, label);
    button.addEventListener("click", () => openNoteCard(question));
    row.append(button);
    return row;
  });
  $("note-list").replaceChildren(...rows);
  $("note-list").scrollTop = 0;
  $("note-count").textContent = items.length > 0 ? `ノートの問題 ${items.length}問` : "ノートは まっさら!";
  const byGroup = GROUPS.map((name) => [name, items.filter((q) => groupOf(q) === name).length]);
  const [top, topCount] = byGroup.reduce((a, b) => (b[1] > a[1] ? b : a));
  $("note-comment").textContent =
    items.length === 0
      ? "まちがえた問題は ないヨ。すごい!"
      : topCount >= 2 && topCount > items.length / 2
        ? `${top}の問題が 多いヨ。押すと 答えと 解説が 見られるヨ!`
        : "押すと 答えと 解説が 見られるヨ!";
  $("btn-note-review").disabled = items.length === 0;
  show("note");
}
$("btn-note-back").addEventListener("click", () => openMenu());
$("btn-note-guide").addEventListener("click", () => playTutorial("review")); // 復習の説明ムービー(いつでも)
$("btn-note-review").addEventListener("click", () =>
  guideOnce("review", () => {
    reviewFromQuiz = false;
    timeLimit = false;
    startPlay("review");
  }),
);

// ================= 着せ替え・背景 =================
let dress = loadDress();
const DRESS_LISTS = { color: COLORS, head: HEADS, body: BODIES, face: FACES, theme: THEMES };

// フロリの絵の上に、頭・体・顔のかざりを重ねる(場所と大きさは、badges.js の pos。うしろに回るものは、フロリのうしろに)
function setDecor(containerId, items) {
  const box = $(containerId);
  box.replaceChildren(
    ...items
      .filter((item) => item?.img)
      .map((item) => {
        const img = document.createElement("img");
        img.src = item.img;
        img.alt = "";
        img.draggable = false;
        if (item.pos.back) img.className = "is-back";
        img.style.left = `${item.pos.x}%`;
        img.style.top = `${item.pos.y}%`;
        img.style.width = `${item.pos.w}%`;
        img.style.transform = `translate(-50%, -50%) rotate(${item.pos.r ?? 0}deg) scale(${item.pos.sx ?? 1}, ${item.pos.sy ?? 1})`;
        return img;
      }),
  );
}
// いまの着せ替え(over:ためしに、ほかのものに入れかえるとき)
function wornItems(over = {}) {
  const now = { ...dress, ...over };
  return [BODIES.find((i) => i.id === now.body), HEADS.find((i) => i.id === now.head), FACES.find((i) => i.id === now.face)];
}

function applyDress() {
  document.documentElement.dataset.theme = dress.theme;
  document.documentElement.style.setProperty("--cover-bg", `url("../assets/bg/${dress.theme}.webp")`); // 表紙の背景の模様(色ごと)
  const theme = THEMES.find((item) => item.id === dress.theme);
  const root = document.documentElement.style;
  for (const [name, key] of [["--bg", "bg"], ["--blue", "blue"], ["--blue-dark", "dark"]]) {
    if (theme?.[key]) root.setProperty(name, theme[key]);
    else root.removeProperty(name);
  }
  setFloriColor(COLORS.find((color) => color.id === dress.color) ?? null);
  setDecor("hero-decor", wornItems());
  setAutoDecor(wornItems());
  setDecor("menu-decor", wornItems());
  setDecor("dress-decor", wornItems());
}


// NEW のしるしは、その画面を見ていれば、さわらなくても(別の画面に移らなくても)、少しして消える
let newFadeTimer = 0;
function fadeNewMarks(screenId, markSelector, itemClass, onDone) {
  clearTimeout(newFadeTimer);
  newFadeTimer = setTimeout(() => {
    if ($(screenId).hidden) return;
    const marks = [...$(screenId).querySelectorAll(markSelector)];
    for (const mark of marks) mark.classList.add("is-fading");
    setTimeout(() => {
      for (const mark of marks) {
        mark.parentElement?.classList.remove(itemClass);
        mark.remove();
      }
      onDone?.();
    }, 500);
  }, 1800);
}

let dressTab = "color"; // 着せ替えで、いま見ている種類(color / head / body / face / theme)
let seenTabs = new Set(); // この見学で、もう開いた種類(タブの NEW を消す)
let freshKeys = new Set(); // この画面を、あたらしく開いて、初めて見るもの(NEW のしるし)

// 表紙から開く:あたらしく増えたものに NEW を付ける
function openDress() {
  awardBadges();
  const base = noticeBase();
  freshKeys = new Set(noticeNow(loadStats()).dress.filter((key) => !base.dress.includes(key)));
  seenTabs = new Set();
  if (freshKeys.size > 0) {
    // NEW があるのは、その種類のタブから
    dressTab = [...freshKeys][0].split(":")[0];
  }
  renderDress();
  markSeen("dress");
  show("dress");
}

// マウスをのせたとき、付ける前に、見ためを、ためせる(かざり・背景)
function previewDress(kind, item) {
  if (kind === "head" || kind === "body" || kind === "face") setDecor("dress-decor", wornItems({ [kind]: item.id }));
  if (kind === "theme") $("dress-stage").style.background = item.preview ?? item.tint;
}
function endPreview() {
  setDecor("dress-decor", wornItems());
  {
    const theme = THEMES.find((item) => item.id === dress.theme);
    $("dress-stage").style.background = theme?.stage ?? theme?.preview ?? ""; // 虹色は、表紙と同じ、うすい色
  }
}

// ロック中のきせかえの、もらい方の吹き出し。画面の上に1つだけ出す(一覧が動いても、切れないように)
const tipBox = document.createElement("div");
tipBox.className = "dress-tipbox";
tipBox.hidden = true;
document.body.append(tipBox);
function hideTip() {
  tipBox.hidden = true;
}
function showTip(button, text) {
  tipBox.textContent = text;
  tipBox.hidden = false;
  const rect = button.getBoundingClientRect();
  const left = Math.min(Math.max(6, rect.left + rect.width / 2 - tipBox.offsetWidth / 2), innerWidth - tipBox.offsetWidth - 6);
  const above = rect.top - tipBox.offsetHeight - 8;
  tipBox.style.left = `${left}px`;
  tipBox.style.top = `${above >= 6 ? above : rect.bottom + 8}px`;
}
document.addEventListener("click", (event) => {
  if (!event.target.closest(".dress-item")) hideTip();
});
$("dress-list").addEventListener("scroll", hideTip, { passive: true });

// 一覧の絵の大きさ:たて長・横長でも、見かけの広さ(面積)が、だいたい同じになるようにする
function fitIcon(pic) {
  if (!pic.naturalWidth || !pic.naturalHeight) return;
  const ratio = pic.naturalWidth / pic.naturalHeight;
  let w = Math.sqrt(0.6 * ratio);
  let h = w / ratio;
  const k = Math.min(1, 0.88 / w, 0.84 / h);
  w *= k;
  h *= k;
  pic.style.width = `${(w * 100).toFixed(1)}%`;
  pic.style.height = `${(h * 100).toFixed(1)}%`;
}

function renderDress() {
  hideTip();
  const stats = loadStats();
  const bctx = badgeContext(stats);
  const ctx = { have: new Set(stats.badges), stars: stats.stars };
  $("dress-stars").textContent = stats.stars;
  // ご褒美を、いくつ GETしたか(進み具合の棒)と、次の ご褒美
  const owned = dressOwned(stats);
  const total = dressTotal();
  $("dress-meter-bar").style.width = `${Math.round((owned / total) * 100)}%`;
  $("dress-meter-text").textContent = `ご褒美 GET ${owned} / ${total}個${owned >= total ? "  全部 コンプリート! 🎉" : ""}`;
  renderRewardCard($("dress-reward"));
  {
    const theme = THEMES.find((item) => item.id === dress.theme);
    $("dress-stage").style.background = theme?.stage ?? theme?.preview ?? ""; // 虹色は、表紙と同じ、うすい色
  }
  setDecor("dress-decor", wornItems());
  seenTabs.add(dressTab); // いま開いている種類の NEW は、すぐ消える
  for (const tab of document.querySelectorAll("[data-dress-tab]")) {
    const kind = tab.dataset.dressTab;
    const list = DRESS_LISTS[kind].filter((item) => item.unlock);
    const have = list.filter((item) => isOpen(item, ctx)).length;
    tab.classList.toggle("is-on", kind === dressTab);
    let count = tab.querySelector("small");
    if (!count) {
      count = document.createElement("small");
      tab.append(count);
    }
    count.textContent = `${have}/${list.length}`;
    tab.classList.toggle("has-new", !seenTabs.has(kind) && [...freshKeys].some((key) => key.startsWith(`${kind}:`))); // 開いた種類の NEW は、消える
  }
  const kind = dressTab;
  let lastGroup = null; // 系統(帽子・耳・冠…)が変わるごとに、線と説明を入れて、改行する
  $("dress-list").replaceChildren(
    ...DRESS_LISTS[kind].flatMap((choice, index) => {
      // 「なし」は、さいしょの系統の行に入れる(1行だけ、むだにしない)
      const groupNo = choice.group ?? (index === 0 ? DRESS_LISTS[kind][1]?.group : undefined);
      const newGroup = groupNo !== undefined && groupNo !== lastGroup;
      if (groupNo !== undefined) lastGroup = groupNo;
      const open = canWear(choice, ctx);
      const isNew = freshKeys.has(`${kind}:${choice.id}`);
      const button = document.createElement("button");
      button.type = "button";
      button.className = `dress-item${dress[kind] === choice.id ? " is-on" : ""}${open ? "" : " is-locked"}${isNew ? " is-new" : ""}`;
      button.style.setProperty("--tint", choice.tint);
      // 絵だけを見せる(名前や、もらいかたは、押したときや、マウスをのせたときに出す)
      const art = document.createElement("span");
      art.className = `dress-art is-${kind}`;
      if (kind === "color") art.style.background = choice.swatch ?? choice.tint;
      else if (kind === "theme") art.style.background = choice.preview ?? choice.tint;
      else if (choice.img) {
        const pic = document.createElement("img");
        pic.addEventListener("load", () => fitIcon(pic)); // 細長いもの・横長のものも、見かけの大きさが、そろうように
        pic.src = choice.img;
        pic.alt = "";
        art.append(pic);
        if (pic.complete) fitIcon(pic);
      } else art.textContent = "🚫";
      button.append(art);
      if (dress[kind] === choice.id) {
        const check = document.createElement("span");
        check.className = "dress-check";
        check.textContent = "✔";
        check.setAttribute("aria-hidden", "true");
        button.append(check);
      }
      if (isNew) {
        const ribbon = document.createElement("span");
        ribbon.className = "dress-new";
        ribbon.textContent = "NEW";
        ribbon.setAttribute("aria-hidden", "true");
        button.append(ribbon);
      }
      if (!open) {
        const lock = document.createElement("span");
        lock.className = "dress-lock";
        lock.textContent = "🔒";
        lock.setAttribute("aria-hidden", "true");
        button.append(lock);
      }
      const progress = open ? null : progressOf(choice, bctx);
      const tipText = `🔒 ${getText(choice)}${progress && progress.goal > 1 ? `(${progress.now}/${progress.goal})` : ""}`;
      button.setAttribute("aria-label", open ? choice.name : `${choice.name}(${getText(choice)})`);
      if (open) {
        button.addEventListener("mouseenter", () => previewDress(kind, choice));
        button.addEventListener("focus", () => previewDress(kind, choice));
        button.addEventListener("mouseleave", endPreview);
        button.addEventListener("blur", endPreview);
      } else {
        button.addEventListener("mouseenter", () => showTip(button, tipText));
        button.addEventListener("mouseleave", hideTip);
      }
      button.addEventListener("click", () => {
        if (!open) {
          showTip(button, tipText); // まだ使えないもの:もらい方を、吹き出しで知らせる(指で押したときにも見える)
          return;
        }
        dress = { ...dress, [kind]: choice.id };
        saveDress(dress);
        applyDress();
        renderDress();
        playSe("button");
      });
      const label = newGroup ? groupLabel(kind, groupNo) : "";
      if (label) {
        // 系統が変わるところに、線と文字を入れて、どのあたりに着けるものかを、説明する
        const head = document.createElement("div");
        head.className = "dress-sec";
        head.textContent = label;
        return [head, button];
      }
      return [button];
    }),
  );
  // いま見ている種類の NEW は、見ていれば(さわらなくても)少しして消える。消えたら、つぎの描きなおしでも出さない
  if ($("dress-list").querySelector(".dress-new")) {
    fadeNewMarks("screen-dress", ".dress-new", "is-new", () => {
      for (const key of [...freshKeys]) if (key.startsWith(`${kind}:`)) freshKeys.delete(key);
    });
  }
}
for (const tab of document.querySelectorAll("[data-dress-tab]")) {
  tab.addEventListener("click", () => {
    dressTab = tab.dataset.dressTab;
    renderDress();
  });
}
applyDress();

$("btn-dex-back").addEventListener("click", () => show("cover", -1));
$("btn-dress-back").addEventListener("click", () => show("cover", -1));

// 読み上げ
function syncReadSettings() {
  $("set-read").checked = readAloud();
  $("set-read-dlg").checked = readAloud();
  $("set-rate").value = readRate();
  $("set-rate-out").textContent = `${readRate().toFixed(1)}倍`;
  $("set-rate-dlg").value = readRate();
  $("set-rate-dlg-out").textContent = `${readRate().toFixed(1)}倍`;
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

$("set-rate").addEventListener("input", () => {
  setReadRate(parseFloat($("set-rate").value));
  syncReadSettings();
});
$("set-rate").addEventListener("change", () => {
  if (!canSpeak) return;
  if (speaking) respeakNow(); // 読んでいる途中なら、今の文から、新しい速さで
  else speak("この速さで読み上げるよ。"); // 読んでいないときは、試しに聞ける
});
// クイズの途中の設定でも、同じ速さを変えられる(読んでいる途中なら、今の文から反映)
$("set-rate-dlg").addEventListener("input", () => {
  setReadRate(parseFloat($("set-rate-dlg").value));
  syncReadSettings();
});
$("set-rate-dlg").addEventListener("change", () => respeakNow());

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

// 画面を横にずらさない(はみ出しをドラッグ・文字選択・フォーカスで動いたときも、真ん中に戻す)
for (const target of [window, document.documentElement, document.body]) {
  target.addEventListener("scroll", () => {
    if (window.scrollX !== 0) window.scrollTo(0, window.scrollY);
    document.documentElement.scrollLeft = 0;
    document.body.scrollLeft = 0;
  }, { passive: true });
}
