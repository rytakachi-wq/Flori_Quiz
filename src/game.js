// ゲームの決まり(画面に依存しない部分)。decisions.md の決定事項に対応。

export const QUESTIONS_PER_ROUND = 5; // 1回の問題数
export const POINTS_PER_CORRECT = 2; // 1問2点(5問で10点満点)
export const ONI_POINTS_PER_CORRECT = 5; // オニ問題は、いままでどおり1問5点(5問で25点満点)
export const MAX_LEVEL = 2; // ふつうモードの段階(1〜2)。正解が続くと2、まちがえると1にもどる
export const HARD_MIN_LEVEL = 3; // 難しいモードの段階(3〜4)。正解が続くと4、まちがえると3にもどる
export const HARD_LEVEL = 4;
export const ONI_LEVEL = 5; // オニ問題の段階
const COUNTER_PER_LEVEL = 3; // カウンターが3増えるごとに1段階上がる

export const MAX_SCORE = QUESTIONS_PER_ROUND * POINTS_PER_CORRECT;
export const TIMED_SECONDS = 30; // 制限時間をつけたときの、1問の制限時間(秒)
export const HINT_COST = 1; // ヒントを見ると、その問題の点が1点へる(正解したとき、2点→1点)

// みんなで対戦。2〜4人が、1台の画面で、順番に答えて点数を競う。3回戦(段階1・2・3)で、1回戦は1点、2回戦は2点、3回戦は3点。
export const VERSUS_MIN_PLAYERS = 2;
export const VERSUS_MAX_PLAYERS = 4;
export const VERSUS_ROUNDS = 3;

// 総合得点(100点満点)。ふつうの問題と難しい問題が、1問2点で、合わせて100点(50問)。
// 問題ごとに、これまでの最高の点(ヒントなしで正解=2点、ヒントを見て正解=1点)を足す。何度正解しても、同じ問題は1回ぶん。
// 問題が増えても、100点をこえないようにする。オニ問題は、総合得点には入れない(オニの記録は、別に数える)。
export const TOTAL_POINTS = 100;

export function totalScore(questionPoints) {
  const sum = questionPoints.reduce((total, points) => total + points, 0);
  return Math.min(TOTAL_POINTS, sum);
}

export function levelFromCounter(counter, minLevel = 1, maxLevel = MAX_LEVEL) {
  return Math.min(maxLevel, minLevel + Math.floor(counter / COUNTER_PER_LEVEL));
}

// 記述式の答えをくらべやすくする。全角・半角、大文字・小文字、カタカナ・ひらがな、空白や記号のちがいを無視する。
export function normalizeAnswer(text) {
  return String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60))
    .replace(/[\s、。,.!?「」『』()]/g, "");
}

const judges = {
  choice: (question, response) => response === question.answer,
  text: (question, response) => {
    const given = normalizeAnswer(response);
    return given !== "" && question.answers.some((answer) => normalizeAnswer(answer) === given);
  },
};

// 回答の形式ごとに判定を足せるようにしてある。
export function judge(question, response) {
  const fn = judges[question.type];
  if (!fn) throw new Error(`未対応の回答形式: ${question.type}`);
  return fn(question, response);
}

// 1問の点。正解で2点。ヒントを見たときは、HINT_COST 点へる。
export function questionPoints(correct, hinted) {
  return correct ? POINTS_PER_CORRECT - (hinted ? HINT_COST : 0) : 0;
}

function roundResult(round) {
  return {
    correct: round.correct,
    total: QUESTIONS_PER_ROUND,
    score: round.points ?? round.correct * POINTS_PER_CORRECT,
    answers: [...(round.roundAnswers ?? [])], // 答えた問題と、正解したか(成績の「出会った問題」「正解した問題」に使う)
  };
}

// ふつうモード(段階1〜2)・難しいモード(段階3〜4)の遊び。正解が続くと上の段階、まちがえると下の段階になる。
// 難しさのカウンターと、出した問題の記録は、回をまたいで続く(「つづきから」で、保存して、もどす)。
export class Session {
  constructor(questions, rng = Math.random, minLevel = 1, maxLevel = MAX_LEVEL) {
    this.questions = questions;
    this.rng = rng;
    this.minLevel = minLevel;
    this.maxLevel = maxLevel;
    this.resetCourse();
  }

  // カウンターも、出した問題の記録も、最初に戻す。
  resetCourse() {
    this.counter = 0;
    this.used = new Set();
    this.startRound();
  }

  // カウンターは、0から「いちばん上の段階に上がる3 + 1」までにする。(上の段階にいるときは、多くても2問まちがえると、下の段階にもどる)
  clampCounter(counter) {
    const top = (this.maxLevel - this.minLevel) * COUNTER_PER_LEVEL;
    return Math.min(top + 1, Math.max(0, counter));
  }

  // 「つづきから」:保存した、難しさのカウンターと、出した問題を、もどす。
  restore(counter, usedIds) {
    this.counter = this.clampCounter(counter);
    this.used = new Set(usedIds);
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.correct = 0;
    this.lastLevel = null;
    this.roundStartCounter = this.counter;
    this.roundUsed = [];
    this.roundAnswers = [];
    this.points = 0;
  }

  // 途中でやめたとき。この回の問題とカウンターを、はじめる前の状態に戻す。
  abandonRound() {
    this.counter = this.roundStartCounter;
    for (const id of this.roundUsed) this.used.delete(id);
    this.startRound();
  }

  get level() {
    return levelFromCounter(this.counter, this.minLevel, this.maxLevel);
  }

  // 今の段階の未使用問題から選ぶ。なければいちばん近い段階(同じ近さなら下の段階)で補う。
  nextQuestion() {
    let pool = this.questions.filter((q) => !this.used.has(q.id));
    if (pool.length === 0) {
      this.used.clear();
      pool = this.questions;
    }
    const target = this.level;
    const distance = (q) => Math.abs(q.level - target) + (q.level > target ? 0.5 : 0);
    const best = Math.min(...pool.map(distance));
    const candidates = pool.filter((q) => distance(q) === best);
    const question = candidates[Math.floor(this.rng() * candidates.length)];
    const leveledUp = this.lastLevel !== null && question.level > this.lastLevel;
    this.lastLevel = question.level;
    return { question, leveledUp };
  }

  answer(question, response, hinted = false) {
    const correct = judge(question, response);
    this.points += questionPoints(correct, hinted);
    this.used.add(question.id);
    this.roundUsed.push(question.id);
    this.roundAnswers.push({ id: question.uid ?? question.id, correct, hinted: correct && hinted, points: questionPoints(correct, hinted) }); // 成績には、番号がかわっても変わらない uid で、記録する
    this.asked += 1;
    if (correct) this.correct += 1;
    this.counter = this.clampCounter(this.counter + (correct ? 1 : -1));
    return correct;
  }

  get roundFinished() {
    return this.asked >= QUESTIONS_PER_ROUND;
  }

  // 1回(5問)の結果を返して、次の回の準備をする。
  finishRound() {
    const result = roundResult(this);
    this.startRound();
    return result;
  }
}

// オニ問題の遊び。決まった順に5問。難しさの調整はなく、記録にも入れない。
export class OniRound {
  constructor(questions) {
    this.questions = [...questions].sort((a, b) => a.id.localeCompare(b.id)).slice(0, QUESTIONS_PER_ROUND);
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.correct = 0;
    this.roundAnswers = [];
    this.points = 0;
  }

  abandonRound() {
    this.startRound();
  }

  nextQuestion() {
    return { question: this.questions[this.asked], leveledUp: false };
  }

  answer(question, response) {
    const correct = judge(question, response);
    this.roundAnswers.push({ id: question.uid ?? question.id, correct, points: correct ? ONI_POINTS_PER_CORRECT : 0 }); // 成績には、番号がかわっても変わらない uid で、記録する
    if (correct) this.points += ONI_POINTS_PER_CORRECT;
    this.asked += 1;
    if (correct) this.correct += 1;
    return correct;
  }

  get roundFinished() {
    return this.asked >= QUESTIONS_PER_ROUND;
  }

  finishRound() {
    const result = roundResult(this);
    this.startRound();
    return result;
  }
}

// 決まった問題を、段階の低い順に出す遊び(おさらい・毎日1問)。難しさの調整はない。
export class PracticeRound {
  constructor(questions) {
    this.questions = [...questions].sort((a, b) => a.level - b.level || a.id.localeCompare(b.id));
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.correct = 0;
    this.roundAnswers = [];
    this.points = 0;
  }

  abandonRound() {
    this.startRound();
  }

  get total() {
    return this.questions.length;
  }

  nextQuestion() {
    return { question: this.questions[this.asked], leveledUp: false };
  }

  answer(question, response, hinted = false) {
    const correct = judge(question, response);
    this.points += questionPoints(correct, hinted);
    this.roundAnswers.push({ id: question.uid ?? question.id, correct, hinted: correct && hinted, points: questionPoints(correct, hinted) });
    this.asked += 1;
    if (correct) this.correct += 1;
    return correct;
  }

  get roundFinished() {
    return this.asked >= this.questions.length;
  }

  finishRound() {
    const result = { ...roundResult(this), total: this.questions.length };
    this.startRound();
    return result;
  }
}

// 問題の中から、count 問を、ランダムに選ぶ。
export function pickRandom(pool, count, rng = Math.random) {
  const rest = [...pool];
  const picked = [];
  while (picked.length < count && rest.length > 0) picked.push(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  return picked;
}

// 日付("2026-10-14" のような文字列)。端末の日付を使う。
export function dateKey(date = new Date()) {
  const two = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${two(date.getMonth() + 1)}-${two(date.getDate())}`;
}

// 前の日の日付
export function previousDateKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  return dateKey(new Date(y, m - 1, d - 1));
}

// 毎日1問:その日の問題は、日付で決まる(同じ日は、だれでも同じ問題。番号順の問題の中から、日付をもとに選ぶ)。
export function dailyQuestion(questions, key) {
  const sorted = [...questions].sort((a, b) => a.id.localeCompare(b.id));
  const [y, m, d] = key.split("-").map(Number);
  const day = Math.floor(Date.UTC(y, m - 1, d) / 86400000); // 1970年からの日数
  return sorted[((day % sorted.length) + sorted.length) % sorted.length];
}

// みんなで対戦。各回戦(段階1→2→3)で、全員に、同じ段階の、別々の問題を出す。ふつうモードの問題から、ランダムに選ぶ。
// 正解すると、回戦の数だけ点が入る(1回戦は1点、2回戦は2点、3回戦は3点)。最後に、点数が一番高い人が勝ち(同点は引き分け)。
export class VersusRound {
  constructor(questions, players, rng = Math.random) {
    this.players = players;
    this.sequence = [];
    for (let round = 1; round <= VERSUS_ROUNDS; round += 1) {
      const pool = questions.filter((q) => q.level === round);
      for (let player = 0; player < players && pool.length > 0; player += 1) {
        const question = pool.splice(Math.floor(rng() * pool.length), 1)[0];
        this.sequence.push({ question, round, player });
      }
    }
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.scores = Array(this.players).fill(0);
    this.roundAnswers = []; // 図鑑のために、出た問題をおぼえる(成績には入れない)
  }

  get current() {
    return this.sequence[this.asked] ?? this.sequence[this.sequence.length - 1];
  }

  get player() {
    return this.current.player;
  }

  get round() {
    return this.current.round;
  }

  get total() {
    return this.sequence.length;
  }

  nextQuestion() {
    return { question: this.current.question, leveledUp: false };
  }

  answer(question, response) {
    const correct = judge(question, response);
    this.roundAnswers.push({ id: question.uid ?? question.id, correct, points: 0 });
    if (correct) this.scores[this.current.player] += this.current.round;
    this.asked += 1;
    return correct;
  }

  get roundFinished() {
    return this.asked >= this.sequence.length;
  }

  abandonRound() {
    this.startRound();
  }

  finishRound() {
    const best = Math.max(...this.scores);
    const result = {
      scores: [...this.scores],
      winners: this.scores.flatMap((score, index) => (score === best ? [index] : [])),
      players: this.players,
      answers: [...this.roundAnswers],
    };
    this.startRound();
    return result;
  }
}
