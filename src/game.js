// ゲームの決まり(画面に依存しない部分)。decisions.md の決定事項に対応。

export const QUESTIONS_PER_ROUND = 5; // 1回の問題数
export const ROUNDS_PER_SET = 4; // 4回で20問
export const POINTS_PER_CORRECT = 5; // 1問5点(5問で25点満点)
export const MAX_LEVEL = 4;
const COUNTER_PER_LEVEL = 3; // カウンターが3増えるごとに1段階上がる

export const MAX_SCORE = QUESTIONS_PER_ROUND * POINTS_PER_CORRECT;

export function levelFromCounter(counter) {
  return Math.min(MAX_LEVEL, 1 + Math.floor(counter / COUNTER_PER_LEVEL));
}

// ページを開いている間だけ続く遊びの状態。保存はしない(保存するのは最高得点だけ)。
export class Session {
  constructor(questions, rng = Math.random) {
    this.questions = questions;
    this.rng = rng;
    this.resetSet();
  }

  resetSet() {
    this.counter = 0;
    this.used = new Set();
    this.roundsInSet = 0;
    this.startRound();
  }

  startRound() {
    this.asked = 0;
    this.correct = 0;
    this.lastLevel = null;
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

  // 回答を判定して、カウンターを動かす。回答の形式ごとに判定を足せるようにしてある。
  answer(question, response) {
    const correct = judge(question, response);
    this.used.add(question.id);
    this.asked += 1;
    if (correct) this.correct += 1;
    this.counter = Math.max(0, this.counter + (correct ? 1 : -1));
    return correct;
  }

  get roundFinished() {
    return this.asked >= QUESTIONS_PER_ROUND;
  }

  // 1回(5問)の結果。4回目が終わったら、次はカウンターも問題も最初から数え直す。
  finishRound() {
    const result = {
      correct: this.correct,
      total: QUESTIONS_PER_ROUND,
      score: this.correct * POINTS_PER_CORRECT,
      roundNumber: this.roundsInSet + 1,
      setCompleted: false,
    };
    this.roundsInSet += 1;
    if (this.roundsInSet >= ROUNDS_PER_SET) {
      result.setCompleted = true;
      this.resetSet();
    } else {
      this.startRound();
    }
    return result;
  }
}

const judges = {
  choice: (question, response) => response === question.answer,
};

export function judge(question, response) {
  const fn = judges[question.type];
  if (!fn) throw new Error(`未対応の回答形式: ${question.type}`);
  return fn(question, response);
}
