// 表紙のフロリのセリフ。表紙を出してから30秒は、あいさつ。そのあとは、10秒に1回、豆知識に変わる(読めるように、少し長めに出す)。
// 変わるときは、じんわり消えて、じんわり出てくる(動きは style.css の .cover-talk)。
// 画面の文字は、ふりがな(furigana.js)が、あとから付ける。

export const GREETING = "ヤア! ボクはフロリだヨ! 一緒に ひらめきクイズで 遊ぼう!";
export const GREETING_MS = 30000;
export const TALK_INTERVAL = 10000;
const FADE_MS = 700;

export const TALKS = [
  "豆知識:タコの 心臓は 3つ あるんだヨ。",
  "豆知識:バナナは 木じゃなくて、大きな 草なんだって。",
  "豆知識:雪の 結晶は、どれも 6つの かどが あるヨ。",
  "豆知識:1年で 1番 昼が 長い日を 夏至って 言うヨ。",
  "豆知識:ホタテは 泳ぐことが できるんだヨ。",
  "豆知識:虹は 本当は 丸い 形を しているんだって。",
  "豆知識:日本には 島が 14000個 以上 あるヨ。",
  "豆知識:コアラは 1日に 20時間くらい 寝るんだヨ。",
  "豆知識:地球の 70%くらいは 海なんだヨ。",
  "豆知識:光は 1秒で 地球を 7周半 するんだヨ。",
  "豆知識:カタツムリの 目は、長い ツノの 先に あるヨ。",
  "豆知識:ひらがなは「あ」から「ん」まで 46文字 あるヨ。",
  "豆知識:1年は 365日。でも 4年に 1回は 366日だヨ。",
  "豆知識:クモは 昆虫じゃなくて、足が 8本 あるんだヨ。",
  "豆知識:富士山の 高さは 3776メートル。「みなろう」で 覚えよう!",
  "豆知識:サイコロの 向かい合う目は、足すと いつも 7だヨ。",
  "豆知識:ペンギンは 鳥だけど、空は 飛べないんだヨ。",
  "豆知識:ペンギンが いるのは 南極。北極には いないヨ。",
  "豆知識:月は 1年に 4センチくらい、地球から 離れているヨ。",
  "豆知識:ゾウは ジャンプが できないんだって。",
  "豆知識:ミツバチは 1秒に 200回くらい 羽を 動かすヨ。",
  "豆知識:首の 骨は 人も キリンも 7本なんだヨ。",
  "豆知識:日本で 2番目に 高い山は 山梨県の 北岳だヨ。",
  "豆知識:「温故知新」は 古いことから 新しいことを 学ぶ という意味だヨ。",
];

export function createTalker({ textEl }) {
  let greetTimer = 0;
  let factTimer = 0;
  let fadeTimer = 0;
  let last = "";
  const pick = () => {
    let text = last;
    for (let i = 0; i < 8 && text === last; i += 1) text = TALKS[Math.floor(Math.random() * TALKS.length)];
    return text;
  };
  // じんわり消して、文字を入れかえて、じんわり出す
  const swap = (text, instant = false) => {
    clearTimeout(fadeTimer);
    last = text;
    if (instant) {
      textEl.classList.remove("talk-hide");
      textEl.textContent = text;
      return;
    }
    textEl.classList.add("talk-hide");
    fadeTimer = setTimeout(() => {
      textEl.textContent = text;
      requestAnimationFrame(() => textEl.classList.remove("talk-hide"));
    }, FADE_MS);
  };
  const stop = () => {
    clearTimeout(greetTimer);
    clearInterval(factTimer);
    clearTimeout(fadeTimer);
    textEl.classList.remove("talk-hide");
  };
  return {
    start() {
      stop();
      swap(GREETING, true);
      greetTimer = setTimeout(() => {
        swap(pick());
        factTimer = setInterval(() => swap(pick()), TALK_INTERVAL);
      }, GREETING_MS);
    },
    stop,
  };
}
