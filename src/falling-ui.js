// 落ちものパズル(ぽんぽんブロブ・ばい菌バスター)の、絵と動き。ルールは falling.js。
import { PopGame, VirusGame } from "./falling.js";

const CELL = 32;
const POP_COLORS = ["#f28b9b", "#6fb7e0", "#b4d65e", "#f4c27a"];
const POP_MARKS = ["♥", "●", "▲", "★"];
const VIRUS_COLORS = ["#f28b9b", "#6fb7e0", "#e8cf4f"];
const VIRUS_MARKS = ["♥", "●", "▲"];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function mark(ctx, text, cx, cy, color = "rgba(255,255,255,0.85)", size = 14) {
  ctx.fillStyle = color;
  ctx.font = `bold ${size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, cx, cy + 1);
}

// ブロブ(丸い、つやのあるもの)
function drawBlob(ctx, x, y, colorIndex, flash) {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  ctx.beginPath();
  ctx.arc(cx, cy, CELL * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = flash ? "#ffffff" : POP_COLORS[colorIndex - 1];
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#46555e";
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx - 6, cy - 7, 4, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.fill();
  mark(ctx, POP_MARKS[colorIndex - 1], cx + 1, cy + 3, flash ? "#46555e" : "rgba(70,85,94,0.65)", 13);
}

// ばい菌(とげとげの丸)
function drawVirus(ctx, x, y, colorIndex, flash) {
  const cx = x * CELL + CELL / 2;
  const cy = y * CELL + CELL / 2;
  ctx.strokeStyle = "#46555e";
  ctx.lineWidth = 2;
  for (let i = 0; i < 8; i += 1) {
    const angle = (i * Math.PI) / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(angle) * CELL * 0.3, cy + Math.sin(angle) * CELL * 0.3);
    ctx.lineTo(cx + Math.cos(angle) * CELL * 0.48, cy + Math.sin(angle) * CELL * 0.48);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(cx, cy, CELL * 0.33, 0, Math.PI * 2);
  ctx.fillStyle = flash ? "#ffffff" : VIRUS_COLORS[colorIndex - 1];
  ctx.fill();
  ctx.stroke();
  for (const dx of [-5, 5]) {
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 3, 2.6, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx + dx, cy - 3, 1.2, 0, Math.PI * 2);
    ctx.fillStyle = "#46555e";
    ctx.fill();
  }
  mark(ctx, VIRUS_MARKS[colorIndex - 1], cx, cy + 6, "rgba(70,85,94,0.7)", 10);
}

// カプセルの半分(相手がいる側は、つなげて見せる)
function drawPill(ctx, grid, x, y, flash) {
  const cell = grid[y][x];
  const px = x * CELL + 2;
  const py = y * CELL + 2;
  const size = CELL - 4;
  const color = flash ? "#ffffff" : VIRUS_COLORS[cell.color - 1];
  roundRect(ctx, px, py, size, size, 10);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = "#46555e";
  ctx.stroke();
  // 相手とつなぐ
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const other = grid[y + dy]?.[x + dx];
    if (other && other.kind === "pill" && other.pid === cell.pid && other !== cell) {
      ctx.fillStyle = color;
      const jx = dx === 1 ? px + size - 8 : dx === -1 ? px - 4 : px + 3;
      const jy = dy === 1 ? py + size - 8 : dy === -1 ? py - 4 : py + 3;
      const jw = dx !== 0 ? 12 : size - 6;
      const jh = dy !== 0 ? 12 : size - 6;
      ctx.fillRect(jx, jy, jw, jh);
    }
  }
  mark(ctx, VIRUS_MARKS[cell.color - 1], x * CELL + CELL / 2, y * CELL + CELL / 2, "rgba(70,85,94,0.7)", 12);
}

export class FallingUI {
  // kind: "pop" または "virus"。options: { speed(ミリ秒), viruses }
  constructor({ canvas, nextCanvas, kind, options = {}, onStatus = () => {}, onEnd = () => {} }) {
    this.canvas = canvas;
    this.nextCanvas = nextCanvas;
    this.kind = kind;
    this.options = options;
    this.onStatus = onStatus;
    this.onEnd = onEnd;
    this.paused = false;
    this.busy = false; // 消えるところを見せている間
    this.dead = false;
    this.timer = 0;
    this.restart();
  }

  restart() {
    clearTimeout(this.timer);
    this.dead = false;
    this.paused = false;
    this.busy = false;
    this.game =
      this.kind === "pop"
        ? new PopGame({ colors: 4 })
        : new VirusGame({ viruses: this.options.viruses ?? 8, colors: 3 });
    this.canvas.width = this.game.width * CELL;
    this.canvas.height = this.game.height * CELL;
    this.draw();
    this.status();
    this.schedule();
  }

  destroy() {
    this.dead = true;
    clearTimeout(this.timer);
  }

  get running() {
    return !this.dead && !this.paused && !this.busy && this.game.state === "falling";
  }

  schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.tick(), this.options.speed ?? 800);
  }

  tick() {
    if (this.dead) return;
    if (this.running && this.game.step()) this.afterLock();
    else this.draw();
    this.schedule();
  }

  press(action) {
    if (action === "pause") {
      this.paused = !this.paused;
      this.draw();
      this.onStatus({ ...this.info(), paused: this.paused });
      return;
    }
    if (!this.running) return;
    if (action === "left") this.game.move(-1);
    else if (action === "right") this.game.move(1);
    else if (action === "rotate") this.game.rotate(1);
    else if (action === "rotate-back") this.game.rotate(-1);
    else if (action === "down") {
      if (this.game.step()) this.afterLock();
      else this.schedule();
    }
    this.draw();
  }

  async afterLock() {
    this.busy = true;
    const { steps } = this.game.resolve();
    for (const step of steps) {
      if (this.dead) return;
      this.draw(step.grid, null, null);
      if (step.cleared.length) {
        await sleep(160);
        this.draw(step.grid, null, new Set(step.cleared.map(([x, y]) => `${x},${y}`)));
        await sleep(240);
        this.draw(step.after, null, null);
        this.onStatus({ ...this.info(), chain: step.chain });
        await sleep(160);
      }
    }
    if (this.dead) return;
    this.game.next();
    this.busy = false;
    this.draw();
    this.status();
    if (this.game.state !== "falling") this.onEnd(this.game.state, this.info());
  }

  info() {
    const g = this.game;
    return this.kind === "pop"
      ? { score: g.score, maxChain: g.maxChain }
      : { score: g.score, left: g.virusesLeft, total: g.totalViruses };
  }

  status() {
    this.onStatus(this.info());
  }

  draw(gridOverride = null, pieceOverride = undefined, flash = null) {
    const ctx = this.canvas.getContext("2d");
    const g = this.game;
    const grid = gridOverride ?? g.grid;
    const piece = pieceOverride === undefined ? g.piece : pieceOverride;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // ます目
    ctx.fillStyle = "#f3f9fc";
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.strokeStyle = "rgba(126,195,224,0.35)";
    ctx.lineWidth = 1;
    for (let x = 1; x < g.width; x += 1) {
      ctx.beginPath();
      ctx.moveTo(x * CELL, 0);
      ctx.lineTo(x * CELL, this.canvas.height);
      ctx.stroke();
    }
    for (let y = 1; y < g.height; y += 1) {
      ctx.beginPath();
      ctx.moveTo(0, y * CELL);
      ctx.lineTo(this.canvas.width, y * CELL);
      ctx.stroke();
    }
    this.drawGrid(ctx, grid, flash);
    if (piece) this.drawPiece(ctx, piece);
    if (this.paused) {
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      mark(ctx, "一時停止", this.canvas.width / 2, this.canvas.height / 2, "#3f8fb3", 26);
    }
    this.drawNext();
  }

  drawGrid(ctx, grid, flash) {
    for (let y = 0; y < this.game.height; y += 1) {
      for (let x = 0; x < this.game.width; x += 1) {
        const cell = grid[y][x];
        if (!cell) continue;
        const flashing = flash?.has(`${x},${y}`);
        if (this.kind === "pop") drawBlob(ctx, x, y, cell.color, flashing);
        else if (cell.kind === "virus") drawVirus(ctx, x, y, cell.color, flashing);
        else drawPill(ctx, grid, x, y, flashing);
      }
    }
  }

  drawPiece(ctx, piece) {
    const spots = this.game.positions(piece);
    if (this.kind === "pop") {
      piece.cells.forEach((cell, index) => {
        const [x, y] = spots[index];
        if (y >= 0) drawBlob(ctx, x, y, cell.color, false);
      });
      return;
    }
    // カプセル:仮の盤に置いて、つなぎ目を、いっしょに描く
    const temp = this.game.clone();
    piece.cells.forEach((cell, index) => {
      const [x, y] = spots[index];
      if (y >= 0) temp[y][x] = { ...cell, pid: -1 };
    });
    spots.forEach(([x, y]) => {
      if (y >= 0) drawPill(ctx, temp, x, y, false);
    });
  }

  drawNext() {
    if (!this.nextCanvas) return;
    const ctx = this.nextCanvas.getContext("2d");
    ctx.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
    const cells = this.game.upcoming;
    if (!cells) return;
    if (this.kind === "pop") {
      drawBlob(ctx, 0, 0, cells[1].color, false); // ふつうは、軸が下。上がもう1つ
      ctx.translate(0, CELL);
      drawBlob(ctx, 0, 0, cells[0].color, false);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else {
      const temp = [[{ ...cells[0], pid: -2 }, { ...cells[1], pid: -2 }]];
      drawPill(ctx, temp, 0, 0, false);
      drawPill(ctx, temp, 1, 0, false);
    }
  }
}
