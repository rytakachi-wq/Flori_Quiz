// リラックス:お花畑。ぽかぽかの水やりパズル(点数も時間もない)。
// ルール:花をおすと、その花と、上下左右の花に水がかかって、1段階育つ(つぼみ→つぼみ→満開→つぼみ…)。
//        ぜんぶの花を、満開にしたら完成。
// 作りかた:満開の畑から、ランダムに水やりを逆にもどして作るので、かならず解ける。

export const STAGES = ["🌱", "🌷", "🌸"]; // 0:芽、1:つぼみ、2:満開
const FULL = 2;

export class Garden {
  constructor(size) {
    this.size = size;
    this.moves = 0;
    this.cells = new Array(size * size).fill(FULL);
    do {
      this.cells.fill(FULL);
      const count = size + 1 + Math.floor(Math.random() * size);
      for (let k = 0; k < count; k += 1) {
        const index = Math.floor(Math.random() * this.cells.length);
        this.water(index, 2); // 2回水をやる=1回もどす(3で一周するから)
      }
    } while (this.solved);
  }

  neighbors(index) {
    const { size } = this;
    const x = index % size;
    const y = Math.floor(index / size);
    const list = [index];
    if (x > 0) list.push(index - 1);
    if (x < size - 1) list.push(index + 1);
    if (y > 0) list.push(index - size);
    if (y < size - 1) list.push(index + size);
    return list;
  }

  water(index, times = 1) {
    for (const cell of this.neighbors(index)) this.cells[cell] = (this.cells[cell] + times) % 3;
  }

  tap(index) {
    this.water(index);
    this.moves += 1;
  }

  get solved() {
    return this.cells.every((stage) => stage === FULL);
  }

  get bloomed() {
    return this.cells.filter((stage) => stage === FULL).length;
  }
}

// 画面。container に、花のボタンを並べる。
export class GardenUI {
  constructor(container, { size = 3, onChange = () => {}, onSolved = () => {} } = {}) {
    this.container = container;
    this.onChange = onChange;
    this.onSolved = onSolved;
    this.garden = new Garden(size);
    this.render();
  }

  render() {
    const { container, garden } = this;
    container.className = "garden";
    container.style.setProperty("--size", garden.size);
    container.classList.toggle("is-solved", garden.solved);
    container.replaceChildren();
    garden.cells.forEach((stage, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `flower stage-${stage}`;
      button.textContent = STAGES[stage];
      button.disabled = garden.solved;
      button.setAttribute("aria-label", `${["芽", "つぼみ", "満開"][stage]}の花`);
      button.addEventListener("click", () => this.tap(index));
      container.append(button);
    });
    this.onChange({ moves: garden.moves, bloomed: garden.bloomed, total: garden.cells.length });
  }

  tap(index) {
    if (this.garden.solved) return;
    this.garden.tap(index);
    this.render();
    if (this.garden.solved) this.onSolved(this.garden.moves);
  }
}
