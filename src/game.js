// ゲームの決まり(画面に依存しない部分)。decisions.md の決定事項に対応。

export const QUESTIONS_PER_ROUND = 5; // 1回の問題数
export const ROUNDS_PER_SET = 4; // 4回で20問
export const POINTS_PER_CORRECT = 5; // 1問5点(5問で25点満点)
export const MAX_LEVEL = 4; // ふつうの問題の段階。オニ問題は段階5で、別あつかい。
const COUNTER_PER_LEVEL = 3; // カウンターが3増えるごとに1段階上がる

export const MAX_SCORE = QUESTIONS_PER_ROUND * POINTS_PER_CORRECT;
export const MAX_SET_SCORE = MAX_SCORE * ROUNDS_PER_SET;

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
  }

  abandonRound() {
    this.startRound();
  }

  nextQuestion() {
    return { question: this.questions[this.asked], leveledUp: false };
  }

  answer(question, response) {
    const correct = judge(question, response);
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
