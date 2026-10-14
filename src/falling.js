// 落ちものパズル2つの、ルールの部分(画面に依存しない)。
//   ・ぽんぽんブロブ:2つくっついたブロブが落ちてくる。同じ色が4つ以上つながると、ぽんと消える。消えた上のブロブが落ちて、
//     また消えると「連鎖」(ぷよぷよのような遊び)。
//   ・ばい菌バスター:ビンの中のばい菌を、2色のカプセルを落として、同じ色を4つ縦か横にならべて、ぜんぶ消す(ドクターマリオのような遊び)。
// どちらも、オリジナルの名前と絵で、作っている。

// 落ちてくる2つの組(ペア)。軸(pivot)のまわりを、もう1つ(satellite)が回る。
// dir:0=うえ、1=みぎ、2=した、3=ひだり に、もう1つがある。
const OFFSETS = [[0, -1], [1, 0], [0, 1], [-1, 0]];

class FallingGame {
  constructor({ width, height, rng = Math.random }) {
    this.width = width;
    this.height = height;
    this.rng = rng;
    this.grid = Array.from({ length: height }, () => Array(width).fill(null));
    this.piece = null; // { x, y, dir, cells:[a, b] }  a が軸
    this.state = "falling"; // falling / over / won
    this.score = 0;
  }

  inside(x, y) {
    return x >= 0 && x < this.width && y < this.height;
  }

  free(x, y) {
    return this.inside(x, y) && (y < 0 || this.grid[y][x] === null);
  }

  positions(piece = this.piece) {
    const [ox, oy] = OFFSETS[piece.dir];
    return [[piece.x, piece.y], [piece.x + ox, piece.y + oy]];
  }

  canPlace(x, y, dir) {
    const [ox, oy] = OFFSETS[dir];
    return this.free(x, y) && this.free(x + ox, y + oy);
  }

  move(dx) {
    if (!this.piece || this.state !== "falling") return false;
    if (!this.canPlace(this.piece.x + dx, this.piece.y, this.piece.dir)) return false;
    this.piece.x += dx;
    return true;
  }

  // step:1=右まわり、-1=左まわり。まわした先がふさがっていたら、軸を少しずらして、まわす。
  rotate(step = 1) {
    if (!this.piece || this.state !== "falling") return false;
    const { x, y } = this.piece;
    const dir = (this.piece.dir + step + 4) % 4;
    const [ox, oy] = OFFSETS[dir];
    const attempts = [[0, 0], [-ox, 0], [0, -oy]];
    for (const [ax, ay] of attempts) {
      if (this.canPlace(x + ax, y + ay, dir)) {
        this.piece.x = x + ax;
        this.piece.y = y + ay;
        this.piece.dir = dir;
        return true;
      }
    }
    return false;
  }

  // 1マスおろす。おろせなければ、そこに置く(lock)。置いたら true を返す。
  step() {
    if (!this.piece || this.state !== "falling") return false;
    if (this.canPlace(this.piece.x, this.piece.y + 1, this.piece.dir)) {
      this.piece.y += 1;
      return false;
    }
    this.lock();
    return true;
  }

  lock() {
    const cells = this.positions();
    this.piece.cells.forEach((cell, index) => {
      const [x, y] = cells[index];
      if (y >= 0) this.grid[y][x] = cell;
    });
    this.lockedAbove = cells.some(([, y]) => y < 0); // ビンの上から、はみ出して置いた
    this.piece = null;
  }

  clone() {
    return this.grid.map((row) => row.map((cell) => (cell ? { ...cell } : null)));
  }
}

// ---------------- ぽんぽんブロブ ----------------
export class PopGame extends FallingGame {
  constructor({ width = 6, height = 12, colors = 4, rng = Math.random } = {}) {
    super({ width, height, rng });
    this.colors = colors;
    this.maxChain = 0;
    this.upcoming = this.randomPair();
    this.spawn();
  }

  randomPair() {
    const pick = () => 1 + Math.floor(this.rng() * this.colors);
    return [{ color: pick() }, { color: pick() }];
  }

  spawn() {
    const x = Math.floor((this.width - 1) / 2);
    const piece = { x, y: 0, dir: 0, cells: this.upcoming };
    this.upcoming = this.randomPair();
    if (!this.canPlace(piece.x, piece.y, 0) || this.grid[0][x] !== null) {
      this.state = "over";
      this.piece = null;
      return false;
    }
    this.piece = piece;
    return true;
  }

  // ブロブを、下に、つめる。
  gravity() {
    for (let x = 0; x < this.width; x += 1) {
      let write = this.height - 1;
      for (let y = this.height - 1; y >= 0; y -= 1) {
        if (this.grid[y][x]) {
          this.grid[write][x] = this.grid[y][x];
          if (write !== y) this.grid[y][x] = null;
          write -= 1;
        }
      }
    }
  }

  // 同じ色が4つ以上つながった場所を、すべて見つける。
  findGroups() {
    const seen = Array.from({ length: this.height }, () => Array(this.width).fill(false));
    const groups = [];
    for (let y = 0; y < this.height; y += 1) {
      for (let x = 0; x < this.width; x += 1) {
        const cell = this.grid[y][x];
        if (!cell || seen[y][x]) continue;
        const stack = [[x, y]];
        const group = [];
        seen[y][x] = true;
        while (stack.length) {
          const [cx, cy] = stack.pop();
          group.push([cx, cy]);
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const nx = cx + dx;
            const ny = cy + dy;
            if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) continue;
            if (seen[ny][nx] || !this.grid[ny][nx] || this.grid[ny][nx].color !== cell.color) continue;
            seen[ny][nx] = true;
            stack.push([nx, ny]);
          }
        }
        if (group.length >= 4) groups.push(group);
      }
    }
    return groups;
  }

  // 置いたあとの、落ちる→消える→落ちる…を、最後までやる。画面で順番に見せるための、手順(steps)を返す。
  resolve() {
    const steps = [];
    let chain = 0;
    for (;;) {
      this.gravity();
      const fallen = this.clone();
      const groups = this.findGroups();
      if (groups.length === 0) {
        steps.push({ grid: fallen, cleared: [], chain });
        break;
      }
      chain += 1;
      const cleared = groups.flat();
      for (const [x, y] of cleared) this.grid[y][x] = null;
      const gained = cleared.length * 10 * chain;
      this.score += gained;
      steps.push({ grid: fallen, cleared, chain, gained, after: this.clone() });
    }
    this.maxChain = Math.max(this.maxChain, chain);
    return { steps, chain };
  }

  // 置いたあとに呼ぶ。次のペアを出して、出せなければ、ゲームオーバー。
  next() {
    if (this.lockedAbove) {
      this.state = "over";
      return false;
    }
    return this.spawn();
  }
}

// ---------------- ばい菌バスター ----------------
export class VirusGame extends FallingGame {
  constructor({ width = 8, height = 16, viruses = 8, colors = 3, rng = Math.random } = {}) {
    super({ width, height, rng });
    this.colors = colors;
    this.nextId = 1;
    this.totalViruses = viruses;
    this.placeViruses(viruses);
    this.upcoming = this.randomCapsule();
    this.spawn();
  }

  get virusesLeft() {
    return this.grid.flat().filter((cell) => cell && cell.kind === "virus").length;
  }

  randomColor() {
    return 1 + Math.floor(this.rng() * this.colors);
  }

  // 3つ以上、同じ色がならばないように、ばい菌を、ビンの下のほうに、ばらまく。
  placeViruses(count) {
    const top = this.height - 10;
    const hasRun = (x, y, color) => {
      const same = (cx, cy) => this.grid[cy]?.[cx]?.color === color;
      const run = (dx, dy) => {
        let n = 1;
        for (const sign of [1, -1]) {
          for (let k = 1; same(x + sign * k * dx, y + sign * k * dy); k += 1) n += 1;
        }
        return n;
      };
      return run(1, 0) >= 3 || run(0, 1) >= 3;
    };
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < 5000) {
      guard += 1;
      const x = Math.floor(this.rng() * this.width);
      const y = top + Math.floor(this.rng() * 10);
      if (this.grid[y][x]) continue;
      const color = this.randomColor();
      if (hasRun(x, y, color)) continue;
      this.grid[y][x] = { kind: "virus", color, pid: null };
      placed += 1;
    }
  }

  randomCapsule() {
    return [{ kind: "pill", color: this.randomColor() }, { kind: "pill", color: this.randomColor() }];
  }

  spawn() {
    const piece = { x: Math.floor(this.width / 2) - 1, y: 0, dir: 1, cells: this.upcoming };
    this.upcoming = this.randomCapsule();
    const [[ax, ay], [bx, by]] = this.positions(piece);
    if (this.grid[ay][ax] || this.grid[by][bx]) {
      this.state = "over";
      this.piece = null;
      return false;
    }
    this.piece = piece;
    return true;
  }

  lock() {
    const pid = this.nextId;
    this.nextId += 1;
    this.piece.cells = this.piece.cells.map((cell) => ({ ...cell, pid }));
    super.lock();
  }

  // 同じ色が、縦か横に、4つ以上ならんだ場所。
  findRuns() {
    const marked = new Set();
    const scan = (starts, dx, dy) => {
      for (const [sx, sy] of starts) {
        let x = sx;
        let y = sy;
        let run = [];
        let color = 0;
        while (x >= 0 && x < this.width && y >= 0 && y < this.height) {
          const cell = this.grid[y][x];
          if (cell && cell.color === color) {
            run.push([x, y]);
          } else {
            if (run.length >= 4) run.forEach(([rx, ry]) => marked.add(ry * this.width + rx));
            run = cell ? [[x, y]] : [];
            color = cell ? cell.color : 0;
          }
          x += dx;
          y += dy;
        }
        if (run.length >= 4) run.forEach(([rx, ry]) => marked.add(ry * this.width + rx));
      }
    };
    scan(Array.from({ length: this.height }, (_, y) => [0, y]), 1, 0);
    scan(Array.from({ length: this.width }, (_, x) => [x, 0]), 0, 1);
    return [...marked].map((index) => [index % this.width, Math.floor(index / this.width)]);
  }

  // カプセル(ばい菌ではないもの)を、下に落とす。2つくっついているカプセルは、いっしょに落ちる。
  gravity() {
    let moved = true;
    while (moved) {
      moved = false;
      // 下の段から順に、落とせるカプセルを落とす
      for (let y = this.height - 2; y >= 0; y -= 1) {
        for (let x = 0; x < this.width; x += 1) {
          const cell = this.grid[y][x];
          if (!cell || cell.kind !== "pill") continue;
          const unit = this.unitOf(x, y);
          const canFall = unit.every(([ux, uy]) => {
            const below = this.grid[uy + 1]?.[ux];
            return uy + 1 < this.height && (below === null || unit.some(([vx, vy]) => vx === ux && vy === uy + 1));
          });
          if (!canFall) continue;
          // 上の段のセルから、順に、1つ下へ動かす
          [...unit].sort((p, q) => q[1] - p[1]).forEach(([ux, uy]) => {
            this.grid[uy + 1][ux] = this.grid[uy][ux];
            this.grid[uy][ux] = null;
          });
          moved = true;
        }
      }
    }
  }

  // (x, y) のカプセルと、くっついている相手(あれば)の位置
  unitOf(x, y) {
    const cell = this.grid[y][x];
    const unit = [[x, y]];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const other = this.grid[y + dy]?.[x + dx];
      if (other && other.kind === "pill" && other.pid === cell.pid && other !== cell) unit.push([x + dx, y + dy]);
    }
    return unit;
  }

  resolve() {
    const steps = [];
    let chain = 0;
    for (;;) {
      this.gravity();
      const fallen = this.clone();
      const runs = this.findRuns();
      if (runs.length === 0) {
        steps.push({ grid: fallen, cleared: [], chain });
        break;
      }
      chain += 1;
      let viruses = 0;
      for (const [x, y] of runs) {
        if (this.grid[y][x].kind === "virus") viruses += 1;
        this.grid[y][x] = null;
      }
      // 消えた相手と、くっついていたカプセルは、1つだけになる
      this.score += viruses * 100 * chain + (runs.length - viruses) * 10;
      steps.push({ grid: fallen, cleared: runs, chain, gained: viruses * 100 * chain, after: this.clone() });
    }
    return { steps, chain };
  }

  next() {
    if (this.virusesLeft === 0) {
      this.state = "won";
      return false;
    }
    return this.spawn();
  }
}
