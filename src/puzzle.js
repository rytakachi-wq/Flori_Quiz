// スライドパズル(リラックスモード)。フロリの絵を、n×n に切って、1枚ぬいた盤で、タイルをすべらせて、もとの絵にもどす。
// 点数もタイムもない。ゆっくり遊ぶためのもの。

// 絵を切ったタイルは、CSS の background で作る(絵そのものは、描き直さない)。
export class SlidePuzzle {
  constructor(container, { size = 3, image, onSolved = () => {} } = {}) {
    this.container = container;
    this.size = size;
    this.image = image;
    this.onSolved = onSolved;
    this.moves = 0;
    this.solved = false;
    this.preview = false;
    // tiles[位置] = そこにあるタイルの番号(0〜n*n-2)。空きは null。
    this.tiles = [];
    this.build();
  }

  get count() {
    return this.size * this.size;
  }

  // 盤をはじめの形にして、かきまぜる。もどせる動きだけをくり返すので、必ず解ける。
  shuffle(random = Math.random) {
    this.tiles = [...Array(this.count - 1).keys(), null];
    let blank = this.count - 1;
    let previous = -1;
    const steps = this.size * this.size * 18;
    for (let step = 0; step < steps; step += 1) {
      const options = this.neighbors(blank).filter((position) => position !== previous);
      const next = options[Math.floor(random() * options.length)];
      [this.tiles[blank], this.tiles[next]] = [this.tiles[next], this.tiles[blank]];
      previous = blank;
      blank = next;
    }
    if (this.isSolved()) this.shuffle(random); // たまたま、そろったままのときは、やりなおす
    this.moves = 0;
    this.solved = false;
    this.render();
  }

  neighbors(position) {
    const row = Math.floor(position / this.size);
    const col = position % this.size;
    const result = [];
    if (row > 0) result.push(position - this.size);
    if (row < this.size - 1) result.push(position + this.size);
    if (col > 0) result.push(position - 1);
    if (col < this.size - 1) result.push(position + 1);
    return result;
  }

  isSolved() {
    return this.tiles.every((tile, position) => (position === this.count - 1 ? tile === null : tile === position));
  }

  // 位置 position のタイルを、となりの空きに動かす。動かせたら true。
  move(position) {
    if (this.solved) return false;
    const blank = this.tiles.indexOf(null);
    if (!this.neighbors(blank).includes(position)) return false;
    [this.tiles[blank], this.tiles[position]] = [this.tiles[position], this.tiles[blank]];
    this.moves += 1;
    this.render();
    if (this.isSolved()) {
      this.solved = true;
      this.render();
      this.onSolved(this.moves);
    }
    return true;
  }

  // 矢印キー用。空きから見て、指定の方向にあるタイルを、空きにすべらせる(キーの向きに、タイルが動く)。
  moveByDirection(dx, dy) {
    const blank = this.tiles.indexOf(null);
    const row = Math.floor(blank / this.size) - dy;
    const col = (blank % this.size) - dx;
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return false;
    return this.move(row * this.size + col);
  }

  setPreview(on) {
    this.preview = on;
    this.render();
  }

  build() {
    this.container.classList.add("puzzle-board");
    this.container.style.setProperty("--size", this.size);
  }

  render() {
    const { size } = this;
    this.container.replaceChildren();
    this.container.classList.toggle("is-solved", this.solved || this.preview);
    this.tiles.forEach((tile, position) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "tile";
      if (tile === null && !(this.solved || this.preview)) {
        button.classList.add("is-blank");
        button.disabled = true;
        button.setAttribute("aria-label", "あき");
      } else {
        const shown = tile === null ? this.count - 1 : tile; // できあがりの絵では、空きの場所にも、絵を出す
        const x = shown % size;
        const y = Math.floor(shown / size);
        button.style.backgroundImage = `url("${this.image}")`;
        button.style.backgroundSize = `${size * 100}% ${size * 100}%`;
        button.style.backgroundPosition = `${(x / (size - 1)) * 100}% ${(y / (size - 1)) * 100}%`;
        button.setAttribute("aria-label", `タイル ${shown + 1}`);
        button.textContent = shown + 1; // 絵が空白のタイルでも、順番が分かるように、小さく番号を出す
        if (this.solved || this.preview) button.disabled = true;
      }
      button.dataset.position = position;
      button.addEventListener("click", () => this.move(position));
      this.container.append(button);
    });
  }
}
