// 端末内に保存するのは最高得点だけ。使えない環境でも動くように、失敗は無視する。

const KEY = "floriQuiz.bestScore";

export function loadBestScore() {
  try {
    const value = Number(localStorage.getItem(KEY));
    return Number.isFinite(value) && value > 0 ? value : 0;
  } catch {
    return 0;
  }
}

// 新記録なら保存して true を返す。
export function saveBestScore(score) {
  if (score <= loadBestScore()) return false;
  try {
    localStorage.setItem(KEY, String(score));
  } catch {
    // 保存できなくても遊びは続けられる。
  }
  return true;
}
