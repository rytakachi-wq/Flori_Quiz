// ゲームの決まり(画面に依存しない部分)。decisions.md の決定事項に対応。

export const QUESTIONS_PER_ROUND = 5; // 1回の問題数
export const ROUNDS_PER_SET = 4; // 4回で20問
export const POINTS_PER_CORRECT = 5; // 1問5点(5問で25点満点)
export const MAX_LEVEL = 3; // ふつうモードの段階(1〜3)
export const HARD_LEVEL = 4; // 難しいモードの問題の段階
export const ONI_LEVEL = 5; // オニ問題の段階
const COUNTER_PER_LEVEL = 3; // カウンターが3増えるごとに1段階上がる

export const MAX_SCORE = QUESTIONS_PER_ROUND * POINTS_PER_CORRECT;

// みんなであそぶ(協力型)。全員で10問を、順番に答えて、7問以上の正解を目指す。
export const COOP_QUESTIONS = 10;
export const COOP_GOAL = 7;
export const COOP_MIN_PLAYERS = 2;
export const COOP_MAX_PLAYERS = 4;

// 総合得点(100点満点)。ふつうの問題が60点、難しい問題が35点、オニ問題が5点。
// それぞれ、一度でも正解した問題の数の割合で、点が入る(何度正解しても、同じ問題は1回ぶん)。
// 問題の数が増えても、満点は100点のままになる。
export const POOL_POINTS = { normal: 60, hard: 35, oni: 5 };
export const TOTAL_POINTS = POOL_POINTS.normal + POOL_POINTS.hard + POOL_POINTS.oni;

export function totalScore({ normalRight, normalCount, hardRight, hardCount, oniRight, oniCount }) {
  const part = (points, right, count) => (count > 0 ? (points * right) / count : 0);
  return Math.round(
    part(POOL_POINTS.normal, normalRight, normalCount) +
      part(POOL_POINTS.hard, hardRight, hardCount) +
      part(POOL_POINTS.oni, oniRight, oniCount),
  );
}

export function levelFromCounter(counter) {
  return Math.min(MAX_LEVEL, 1 + Math.floor(counter / COUNTER_PER_LEVEL));
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

function roundResult(round) {
  return {
    correct: round.correct,
    total: QUESTIONS_PER_ROUND,
    score: round.correct * POINTS_PER_CORRECT,
    answers: [...(round.roundAnswers ?? [])], // 答えた問題と、正解したか(成績の「出会った問題」「正解した問題」に使う)
  };
}

// ふつうの問題の遊び。難しさのカウンターは、ページを開いている間だけ続く(保存しない)。
export class Session {
  constructor(questions, rng = Math.random) {
    this.questions = questions;
    this.rng = rng;
    this.resetSet();
  }

  // 20問(4回分)が終わったとき。カウンターも、出した問題の記録も、最初に戻す。
  resetSet() {
    this.counter = 0;
    this.used = new Set();
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.correct = 0;
    this.lastLevel = null;
    this.roundStartCounter = this.counter;
    this.roundUsed = [];
    this.roundAnswers = [];
  }

  // 途中でやめたとき。この回の問題とカウンターを、はじめる前の状態に戻す。
  abandonRound() {
    this.counter = this.roundStartCounter;
    for (const id of this.roundUsed) this.used.delete(id);
    this.startRound();
  }

  get level() {
    return levelFromCounter(this.counter);
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

  answer(question, response) {
    const correct = judge(question, response);
    this.used.add(question.id);
    this.roundUsed.push(question.id);
    this.roundAnswers.push({ id: question.id, correct });
    this.asked += 1;
    if (correct) this.correct += 1;
    this.counter = Math.max(0, this.counter + (correct ? 1 : -1));
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
  }

  abandonRound() {
    this.startRound();
  }

  nextQuestion() {
    return { question: this.questions[this.asked], leveledUp: false };
  }

  answer(question, response) {
    const correct = judge(question, response);
    this.roundAnswers.push({ id: question.id, correct });
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

// 難しいモードの遊び。難しい問題から、まだ出していない5問を、ランダムに選ぶ(難しさの調整はない)。
// used は、ページを開いている間、回をまたいで使う(全部出したら、また最初から)。
export class HardRound {
  constructor(questions, used = new Set(), rng = Math.random) {
    this.used = used;
    let pool = questions.filter((q) => !used.has(q.id));
    if (pool.length < QUESTIONS_PER_ROUND) {
      used.clear();
      pool = [...questions];
    }
    const picked = [];
    while (picked.length < QUESTIONS_PER_ROUND && pool.length > 0) {
      picked.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
    }
    this.questions = picked;
    for (const q of picked) used.add(q.id);
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.correct = 0;
    this.roundAnswers = [];
  }

  // 途中でやめたとき。この回で選んだ問題を、また出せるようにもどす。
  abandonRound() {
    for (const q of this.questions) this.used.delete(q.id);
    this.startRound();
  }

  nextQuestion() {
    return { question: this.questions[this.asked], leveledUp: false };
  }

  answer(question, response) {
    const correct = judge(question, response);
    this.roundAnswers.push({ id: question.id, correct });
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

// みんなであそぶ(協力型)。1台の画面を、2〜4人で囲む。相談しながら、順番に答える係を交代して、チームで正解数をためる。
// 難しさの調整は、ふつうモードと同じ(ただし、ひとりで遊ぶ記録とは、別に数える)。
export class CoopRound {
  constructor(questions, players, rng = Math.random) {
    this.session = new Session(questions, rng);
    this.players = players;
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.correct = 0;
    this.session.resetSet();
  }

  // 次に答える人(0から数える)。人数で、順番に交代する。
  get player() {
    return this.asked % this.players;
  }

  nextQuestion() {
    return this.session.nextQuestion();
  }

  answer(question, response) {
    const correct = this.session.answer(question, response);
    this.asked += 1;
    if (correct) this.correct += 1;
    return correct;
  }

  get roundFinished() {
    return this.asked >= COOP_QUESTIONS;
  }

  abandonRound() {
    this.startRound();
  }

  finishRound() {
    const result = {
      correct: this.correct,
      total: COOP_QUESTIONS,
      players: this.players,
      cleared: this.correct >= COOP_GOAL,
      answers: [],
    };
    this.startRound();
    return result;
  }
}
