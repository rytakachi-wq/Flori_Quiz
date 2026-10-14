// リラックス:お花畑。ぽかぽかの水やりパズル(点数も時間もない)。
// ルール:木をおすと、その木と、上下左右の木に水がかかって、1段階育つ(芽→枝→木→桜の木→芽…)。
//        ぜんぶを、桜の木にしたら完成。
// 作りかた:ぜんぶ桜の木の畑から、ランダムに水やりを逆にもどして作るので、かならず解ける。
//        もどした回数を覚えているので、ヒントで「まだおす必要のある木」を教えられる。

export const STAGES = ["🌱", "🌿", "🌳", "🌸"]; // 0:芽、1:枝、2:木、3:桜の木
export const STAGE_NAMES = ["芽", "枝", "木", "桜の木"];
const FULL = STAGES.length - 1;
const KINDS = STAGES.length;

export class Garden {
  constructor(size) {
    this.size = size;
    this.moves = 0;
    this.cells = new Array(size * size).fill(FULL);
    this.need = new Array(size * size).fill(0); // あと何回おせば、そろうか(ヒント用)
    do {
      this.cells.fill(FULL);
      this.need.fill(0);
      const count = size + 1 + Math.floor(Math.random() * size);
      for (let k = 0; k < count; k += 1) {
        const index = Math.floor(Math.random() * this.cells.length);
        this.water(index, KINDS - 1); // 3回水をやる=1回もどす(4で一周するから)
        this.need[index] = (this.need[index] + 1) % KINDS;
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
    for (const cell of this.neighbors(index)) this.cells[cell] = (this.cells[cell] + times) % KINDS;
  }

  tap(index) {
    this.water(index);
    this.need[index] = (this.need[index] + KINDS - 1) % KINDS;
    this.moves += 1;
  }

  // ヒント:まだ、おす必要のある木(なければ -1)
  hintIndex() {
    return this.need.findIndex((n) => n > 0);
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
    this.hinted = -1;
    this.render();
  }

  // ヒント:おすとよい木を、光らせる。
  hint() {
    this.hinted = this.garden.hintIndex();
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
      button.setAttribute("aria-label", STAGE_NAMES[stage]);
      if (index === this.hinted && !garden.solved) button.classList.add("is-hint");
      button.addEventListener("click", () => this.tap(index));
      container.append(button);
    });
    this.onChange({ moves: garden.moves, bloomed: garden.bloomed, total: garden.cells.length });
  }

  tap(index) {
    if (this.garden.solved) return;
    this.garden.tap(index);
    this.hinted = -1;
    this.render();
    if (this.garden.solved) this.onSolved(this.garden.moves);
  }
}
