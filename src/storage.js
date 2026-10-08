// 端末内に保存する成績。名前や個人情報は入れない。
// 保存できない環境でも遊べるように、失敗しても、そのページを開いている間は覚えておく。

import { ROUNDS_PER_SET } from "./game.js";

const KEY = "floriQuiz.stats";
const OLD_BEST_KEY = "floriQuiz.bestScore"; // 最高得点だけだったころの保存

const EMPTY = {
  best: 0, // 5問の最高得点
  plays: 0, // 遊んだ回数(5問を1回と数える)
  answered: 0, // 答えた問題の数
  correct: 0, // 正解した問題の数
  setRounds: [], // いまの20問(4回分)で終わった回の得点
  bestSet: 0, // 20問(4回分)の最高得点
  sets: 0, // 20問(4回分)を終えた回数
  seen: [], // 出会ったことのある問題の番号
  right: [], // 正解したことのある問題の番号
};

let cache = null;

function number(value) {
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function ids(list) {
  return Array.isArray(list) ? [...new Set(list.filter((id) => typeof id === "string"))] : [];
}

function clean(raw) {
  const rounds = Array.isArray(raw?.setRounds) ? raw.setRounds.map(number).slice(0, ROUNDS_PER_SET - 1) : [];
  return {
    best: number(raw?.best),
    plays: number(raw?.plays),
    answered: number(raw?.answered),
    correct: number(raw?.correct),
    setRounds: rounds,
    bestSet: number(raw?.bestSet),
    sets: number(raw?.sets),
    seen: ids(raw?.seen),
    right: ids(raw?.right),
  };
}

export function loadStats() {
  if (cache) return { ...cache, setRounds: [...cache.setRounds], seen: [...cache.seen], right: [...cache.right] };
  let stats = clean(EMPTY);
  try {
    const saved = localStorage.getItem(KEY);
    if (saved) stats = clean(JSON.parse(saved));
    else stats.best = number(Number(localStorage.getItem(OLD_BEST_KEY)));
  } catch {
    // 読めなければ、はじめからにする。
  }
  cache = stats;
  return loadStats();
}

function save(stats) {
  cache = stats;
  try {
    localStorage.setItem(KEY, JSON.stringify(stats));
  } catch {
    // 保存できなくても遊びは続けられる。
  }
}

// 5問の結果を記録する。20問(4回分)がそろったら、その合計も記録する。
export function recordRound({ correct, total, score, answers = [] }) {
  const stats = loadStats();
  const isRecord = score > stats.best;
  stats.plays += 1;
  stats.answered += total;
  stats.correct += correct;
  stats.best = Math.max(stats.best, score);
  stats.setRounds.push(score);
  stats.seen = ids([...stats.seen, ...answers.map((answer) => answer.id)]);
  stats.right = ids([...stats.right, ...answers.filter((answer) => answer.correct).map((answer) => answer.id)]);

  const result = { isRecord, setCompleted: false, setScore: 0, isSetRecord: false };
  if (stats.setRounds.length >= ROUNDS_PER_SET) {
    result.setCompleted = true;
    result.setScore = stats.setRounds.reduce((sum, value) => sum + value, 0);
    result.isSetRecord = result.setScore > stats.bestSet;
    stats.bestSet = Math.max(stats.bestSet, result.setScore);
    stats.sets += 1;
    stats.setRounds = [];
  }
  save(stats);
  return result;
}
