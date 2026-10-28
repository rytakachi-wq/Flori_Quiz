"""ChatGPT で作ったイラストのシート(assets/illust/sheets/*.webp)から、1つずつ切り出して、
背景(白)を透明にして、assets/illust/<名前>.webp に書き出す。

使い方: python -I tools/illust/export.py
各シートの絵は、行ごとに左から右の順。ならびは MANIFEST(シートごとの名前のならび)に合わせる。
背景は、まっさらな白(254くらい)の前提。外側とつながった白だけを透明にする(絵の中の白は残す)。
HOLES の絵だけは、輪の中(まる・歯車・四角のわく)も透明にする。
"""
import os
import sys

import numpy as np
from PIL import Image
from scipy import ndimage as ndi

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..")
SHEETS = os.path.join(ROOT, "assets", "illust", "sheets")
OUT = os.path.join(ROOT, "assets", "illust")

# シートごとの、絵の名前(左上から右へ、上から下へ)
MANIFEST = {
    "sheet01": ["face_laugh", "face_smile", "face_beam", "face_relief", "face_think", "face_angel", "face_devil", "face_cool",
                "face_hug", "face_talk", "shrug", "kid", "stand_base", "baby", "grandpa", "teacher"],
    "sheet02": ["stand_a", "stand_b", "stand_c", "stand_d", "walk_a", "walk_b", "walk_c", "walk_d",
                "run_1", "run_2", "run_3", "run_4", "businessman", "duo", "drop", "wave", "sun"],
    "sheet03": ["cloud", "sun_cloud", "rain_cloud", "umbrella", "rainbow", "wind", "snowflake", "snowman",
                "moon", "star_face", "sparkle", "fire", "candle", "steam", "sprout", "branch"],
    "sheet04": ["tree", "leaves", "mountain", "fuji", "river", "desert", "island", "bridge",
                "city", "torii", "castle", "shell", "japan", "earth", "cat", "mouse"],
    "sheet05": ["frog", "wolf", "goat", "cabbage", "scorpion", "dragon", "paws", "apple",
                "orange", "candy", "onigiri", "tea", "pancake_old", "cake", "glass", "drink"],
    "sheet06": ["ice", "pot", "salt", "chopsticks", "plate", "bag", "gift", "box",
                "yarn", "scissors", "bucket", "faucet", "battery", "bulb", "handshake", "finger_up"],
    "sheet07": ["muscle", "girl_face", "eye_face", "bubble", "sweat", "masks", "popper", "flag",
                "gold", "silver", "boat", "clock_4", "clock_10", "clock_2", "clock_12", "alarm"],
    "sheet08": ["stopwatch", "hourglass", "daycal", "monthcal", "bell", "mirror", "flashlight", "magnet",
                "bolt", "triset", "ruler", "balance", "thermo", "compass", "map", "scroll"],
    "redo01": ["eyes2", "eye1", "pancake", "clock_1020", "clock_230", "clock_450"],
    "sheet09": ["book", "notebook", "pen", "pencil", "paper", "bandage", "pricetag", "money",
                "coin", "ballot", "door", "signal", "card", "puzzle", "dice", "dice3"],
    "sheet10": ["magnifier", "forbid", "question", "arrow_r", "arrow_u", "arrow_d", "ff", "rew",
                "repeat", "rotate", "wavy", "triangle_red", "blocks123", "blocks_aiu", "six", "plus"],
    "sheet11": ["times", "divide", "matchsq", "stairs", "cards4", "buckets", "bags", "clock_o04",
                "target", "back", "tri_r", "tri_l", "gear", "house", "clipboard", "books"],
    "sheet12": ["crown", "trophy", "clapper", "gamepad", "palette", "tophat", "backpack", "frame",
                "speaker", "drum", "medal", "checkbox", "check", "circle_red", "cross_red", "hand_push"],
    "sheet13": ["hand_point", "person_icon", "microscope", "globe", "flask", "oni", "diamond", "hanamaru",
                "key", "floppy", "newtag", "balloon", "popper2", "heart", "clover", "ribbon"],
    "sheet14": ["note", "butterfly", "sakura", "shine", "star_fill", "star_line", "egg", "hatch",
                "chick", "bird", "fox", "dolphin", "owl", "unicorn"],
}
# 絵のまとまりの数が、絵の数と食いちがう絵(まとめる)
DIL = {"sheet01": 5, "sheet02": 10, "sheet14": 10}  # 指定がなければ 14
MARG = {"sheet01": (4, 32, 8, 8)}  # 上・下・左・右(スクリーンショットのふち)
MERGE = {"redo01": [(0, 1)]}  # 2つの目は、左右を1つに
HOLES = {"gear", "circle_red", "matchsq"}  # わの中も、透明にする
THR = 244
PAD = 10
MAXSIDE = 160


def boxes_of(name, im):
    a = np.array(im).astype(int)
    h, w, _ = a.shape
    m = a.min(2) < THR
    t, b, l, r = MARG.get(name, (6, 6, 6, 6))
    m[:t] = False; m[h - b:] = False; m[:, :l] = False; m[:, w - r:] = False
    big = ndi.binary_dilation(m, structure=np.ones((3, 3)), iterations=DIL.get(name, 14))
    lab, _ = ndi.label(big)
    out = []
    for i, sl in enumerate(ndi.find_objects(lab), 1):
        if ((lab[sl] == i) & m[sl]).sum() < 400:
            continue
        out.append((sl[0].start, sl[1].start, sl[0].stop, sl[1].stop))
    out.sort(key=lambda b: (b[0] + b[2]) / 2)
    rows = []
    for b in out:
        cy = (b[0] + b[2]) / 2
        if rows and abs(cy - rows[-1][0]) < h * 0.09:
            rows[-1][1].append(b)
        else:
            rows.append([cy, [b]])
    ordered = []
    for _, bs in rows:
        ordered += sorted(bs, key=lambda b: b[1])
    for i, j in MERGE.get(name, []):
        a_, b_ = ordered[i], ordered[j]
        ordered[i] = (min(a_[0], b_[0]), min(a_[1], b_[1]), max(a_[2], b_[2]), max(a_[3], b_[3]))
        ordered[j] = None
    return [b for b in ordered if b is not None]


def cut(im, box, holes=False):
    a = np.array(im).astype(np.uint8)
    h, w, _ = a.shape
    y0, x0, y1, x1 = box
    y0 = max(0, y0 - PAD); x0 = max(0, x0 - PAD); y1 = min(h, y1 + PAD); x1 = min(w, x1 + PAD)
    c = a[y0:y1, x0:x1].astype(int)
    bgish = c.min(2) >= THR
    if holes:
        bg = c.min(2) >= 250
    else:
        lab, _ = ndi.label(bgish)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(border))
    fg = ~bg
    fl, fn = ndi.label(ndi.binary_dilation(fg, iterations=12))
    if fn > 1:  # 隣の絵のはしっこを消す(大きいかたまりだけ残す)
        sizes = ndi.sum(fg, fl, range(1, fn + 1))
        main = int(np.argmax(sizes)) + 1
        fg = (fg & (fl == main)) | (fg & np.isin(fl, [i + 1 for i, s in enumerate(sizes) if s > 600]))
    alpha = np.clip((ndi.gaussian_filter(fg.astype(float), 0.6) - 0.15) / 0.7, 0, 1)
    inner = ndi.binary_erosion(fg, iterations=2)
    idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    use = np.where(inner[..., None], c, c[idx[0], idx[1]])  # ふちの白いにじみを、内側の色でぬりかえる
    rgba = np.dstack([use, (alpha * 255).astype(int)]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    bb = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(bb) if bb else out


def main():
    total = 0
    for name, names in MANIFEST.items():
        im = Image.open(os.path.join(SHEETS, name + ".webp")).convert("RGB")
        boxes = boxes_of(name, im)
        if len(boxes) != len(names):
            sys.exit(f"{name}: 絵が {len(boxes)} 個見つかったが、名前は {len(names)} 個(DIL を見直す)")
        for slug, box in zip(names, boxes):
            it = cut(im, box, holes=slug in HOLES)
            it.thumbnail((MAXSIDE, MAXSIDE), Image.LANCZOS)
            path = os.path.join(OUT, slug + ".webp")
            it.save(path, "WEBP", quality=90, method=6)
            total += os.path.getsize(path)
    print("書き出し", sum(len(v) for v in MANIFEST.values()), "個,", round(total / 1024), "KB")


if __name__ == "__main__":
    main()
