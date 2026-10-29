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
    "sheet13": ["hand_point", "person_icon", "microscope", "globe", "flask", "oni", "diamond", "hanamaru_old",
                "key", "floppy", "newtag", "balloon", "popper2", "heart", "clover", "ribbon"],
    # 顔のかざり(ChatGPT。docs/illustration-prompts/face_parts*.txt)。左右1組は、1つの絵にまとめる(MERGE)
    "face1": ["fp_sunglasses", "fp_eyepatch", "fp_spiral", "fp_hearteyes", "fp_lashes", "fp_freckles", "fp_whiskers"],
    "face2": ["fp_mustache", "fp_mask", "fp_snow", "fp_tongue", "fp_starcheek", "fp_flowercheek", "fp_nose"],
    "sheet14": ["note", "butterfly", "sakura", "shine", "star_fill", "star_line", "egg", "hatch",
                "chick", "bird", "fox", "dolphin", "owl", "unicorn"],
}
# 絵のまとまりの数が、絵の数と食いちがう絵(まとめる)
DIL = {"sheet01": 5, "sheet02": 10, "sheet14": 10}  # 指定がなければ 14
MARG = {"sheet01": (4, 32, 8, 8)}  # 上・下・左・右(スクリーンショットのふち)
MERGE = {"redo01": [(0, 1)], "face1": [(2, 3), (4, 5), (6, 7), (8, 9), (10, 11)], "face2": [(4, 5), (6, 7)]}  # 2つの目は、左右を1つに
HOLES = {"gear", "circle_red", "matchsq"}  # わの中も、透明にする
HOLES_TOP = {"trophy"}  # 上の方(持ち手のあいだ)の白だけ、透明にする(下の名札は残す)
# ふちの黒い線の、ざらざら(ノイズ)を、ならして けずる強さ(大きいほど、なめらか。指定がなければ 1.0)
SMOOTH = {"trophy": 2.2, "tophat": 2.2, "globe": 2.2, "balloon": 2.0}
CLEAN = {"trophy", "tophat", "globe", "balloon"}  # ふちの線を、なめらかな1本の線にひきなおす(もとの線の、ざらざらを、けずる)
OUTLINE = (72, 94, 112)  # 青みのダークグレー(フロリと同じ線の色)
BGTHR = {"trophy": 228, "tophat": 228, "globe": 228, "balloon": 228}  # 背景とみなす白さ(下げるほど、ふちのうすいノイズも、背景にする)
THR = 244
PAD = 10
# 左右1組の かざりの、2つの間のあき(1つの はば に対する割合)。目や ほっぺの位置に合わせて、あけなおす
GAPS = {"fp_spiral": 0.82, "fp_hearteyes": 0.75, "fp_lashes": 0.75, "fp_freckles": 1.8, "fp_whiskers": 2.1}
ANCHORS = {}  # ひもを つけた絵の、「もとの絵の中心」の場所(割合)。ゲームで位置をきめるとき使う(assets/illust/fp_anchor.json)
MAXSIDE = 160
MAXSIDE_FACE = 480
MAXSIDE_WIDE = {"fp_eyepatch": 900}  # ひもで、横に長い絵  # 顔のかざり(fp_)は、横長の組もあるので、大きめに


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


def cut(im, box, holes=False, holes_top=False, smooth=1.0, thr=THR, clean=False):
    a = np.array(im).astype(np.uint8)
    h, w, _ = a.shape
    y0, x0, y1, x1 = box
    y0 = max(0, y0 - PAD); x0 = max(0, x0 - PAD); y1 = min(h, y1 + PAD); x1 = min(w, x1 + PAD)
    c = a[y0:y1, x0:x1].astype(int)
    bgish = c.min(2) >= thr
    if holes:
        bg = c.min(2) >= 250
    else:
        lab, _ = ndi.label(bgish)
        border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
        bg = np.isin(lab, list(border))
    if holes_top:  # 持ち手のあいだ(絵の上の方の、中に閉じこめられた白)だけ、透明にする
        lab2, n2 = ndi.label(c.min(2) >= THR)
        for i in range(1, n2 + 1):
            ys, xs = np.where(lab2 == i)
            if len(ys) > 6 and ys.mean() < c.shape[0] * 0.62:
                bg = bg | (lab2 == i)
    fg = ~bg
    fl, fn = ndi.label(ndi.binary_dilation(fg, iterations=12))
    if fn > 1:  # 隣の絵のはしっこを消す(大きいかたまりだけ残す)
        sizes = ndi.sum(fg, fl, range(1, fn + 1))
        main = int(np.argmax(sizes)) + 1
        fg = (fg & (fl == main)) | (fg & np.isin(fl, [i + 1 for i, s in enumerate(sizes) if s > 600]))
    # ふちのざらざらを、ならす: ぼかして、少し内がわで切りなおす(黒い線の、いちばん外がわを、けずる)
    if smooth > 1.0:  # 1〜2px のぽつぽつ(ノイズ)を消す
        fg = ndi.binary_opening(fg, structure=np.ones((3, 3)))
    soft = ndi.gaussian_filter(fg.astype(float), smooth)
    fg = soft > (0.5 if smooth <= 1.0 else 0.58)
    alpha = np.clip((ndi.gaussian_filter(fg.astype(float), 0.8) - 0.12) / 0.76, 0, 1)
    inner = ndi.binary_erosion(fg, iterations=2)
    idx = ndi.distance_transform_edt(~inner, return_distances=False, return_indices=True)
    use = np.where(inner[..., None], c, c[idx[0], idx[1]])  # ふちの白いにじみを、内側の色でぬりかえる
    if clean:  # 外がわ3pxを、線の色でぬりなおす(ざらざらの線を、1本の、なめらかな線に)
        band = fg & ~ndi.binary_erosion(fg, iterations=3)
        use = np.where(band[..., None], np.array(OUTLINE), use)
    rgba = np.dstack([use, (alpha * 255).astype(int)]).astype(np.uint8)
    out = Image.fromarray(rgba, "RGBA")
    bb = out.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    return out.crop(bb) if bb else out


def respace(img, gap_ratio):
    """左右1組の絵を、まん中のいちばん広い空きで、左右に分けて、あきを gap_ratio(1つの はば に対する割合)にして、くっつけなおす"""
    al = np.array(img.getchannel("A")) > 20
    cols = al.any(0)
    xs = np.where(cols)[0]
    x0, x1 = xs.min(), xs.max()
    best, run, start = (0, 0, 0), 0, 0
    for x in range(int((x0 + x1) * 0.3), int((x0 + x1) * 0.7)):
        if not cols[x]:
            if run == 0:
                start = x
            run += 1
            if run > best[0]:
                best = (run, start, x)
        else:
            run = 0
    _, gs, ge = best
    left, right = img.crop((x0, 0, gs, img.height)), img.crop((ge + 1, 0, x1 + 1, img.height))
    piece = (left.width + right.width) / 2
    gap = int(round(gap_ratio * piece))
    out = Image.new("RGBA", (left.width + gap + right.width, img.height), (0, 0, 0, 0))
    out.paste(left, (0, 0))
    out.paste(right, (left.width + gap, 0))
    return out


def _bez(p0, c1, c2, p3, n=40):
    pts = []
    for i in range(n + 1):
        t = i / n
        pts.append(tuple((1 - t) ** 3 * p0[j] + 3 * (1 - t) ** 2 * t * c1[j] + 3 * (1 - t) * t * t * c2[j] + t ** 3 * p3[j] for j in range(2)))
    return pts


def _strap_lines(canvas, paths, k, W):
    """ひも(線の色のふち+うすい色の中)を、paths(点の列)にそって、描く。太さは、絵の はば(W)に合わせる"""
    from PIL import ImageDraw
    d = ImageDraw.Draw(canvas)
    wo, wi = 0.06 * W * k, 0.032 * W * k
    for path in paths:
        d.line(path, fill=OUTLINE + (255,), width=int(wo), joint="curve")
    for path in paths:
        d.line(path, fill=(240, 245, 249, 255), width=int(wi), joint="curve")
    for path in paths:  # 先を丸く
        for x, y in (path[0], path[-1]):
            d.ellipse((x - wo / 2, y - wo / 2, x + wo / 2, y + wo / 2), fill=OUTLINE + (255,))
            d.ellipse((x - wi / 2, y - wi / 2, x + wi / 2, y + wi / 2), fill=(240, 245, 249, 255))


def strap_mask(img, reach=0.5):
    """マスクの両わきに、耳(ヘルメットのわき)まで のびる、耳ひもを つける。上と下に、1本ずつ(線のように、外へ すこし ひらく)。本体は、ひもの上"""
    k = 4
    W, H = img.size
    L = int(W * reach)
    M = int(H * 0.25)  # 上下の、ひもの はみ出し分
    canvas = Image.new("RGBA", ((W + 2 * L) * k, (H + 2 * M) * k), (0, 0, 0, 0))
    paths = []
    for sign in (-1, 1):
        edge = (L + (W - 6 if sign > 0 else 6)) * k
        end_x = edge + sign * (L - 6) * k
        for y0, y1 in ((0.30, -0.10), (0.70, 1.10)):  # 上のひも・下のひも(マスクの角から、外へ)
            ys, ye = (M + H * y0) * k, (M + H * y1) * k
            paths.append(_bez((edge, ys), (edge + sign * L * 0.35 * k, ys + (ye - ys) * 0.1), (edge + sign * L * 0.7 * k, ys + (ye - ys) * 0.6), (end_x, ye)))
    _strap_lines(canvas, paths, k, W)
    canvas = canvas.resize((W + 2 * L, H + 2 * M), Image.LANCZOS)
    canvas.alpha_composite(img, (L, M))
    return canvas, (0.5, 0.5)


def strap_eyepatch(img, left=2.0, right=0.9, rise=1.1):
    """眼帯に、ひもを つける(線のように、1本ずつ):右は、ほぼ水平に、耳へ。左は、ななめに のぼって、ヘルメットの左上へ。
    戻り値の2つ目は、眼帯の中心が、絵のどこ(はば・高さの割合)にあるか"""
    k = 4
    W, H = img.size
    Ll, Lr, Up = int(W * left), int(W * right), int(W * rise)
    Dn = int(H * 0.15)
    Wc, Hc = W + Ll + Lr, H + Up + Dn
    canvas = Image.new("RGBA", (Wc * k, Hc * k), (0, 0, 0, 0))
    px, py = Ll, Up
    paths = []
    # 右: 眼帯の右がわから、ほぼ水平に
    sx, sy = (px + W - 6) * k, (py + H * 0.50) * k
    paths.append(_bez((sx, sy), (sx + Lr * 0.4 * k, sy), (sx + Lr * 0.7 * k, sy + H * 0.04 * k), ((px + W + Lr - 6) * k, sy + H * 0.06 * k)))
    # 左: 眼帯の左上から、ななめに(ほぼ まっすぐ)、左上へ
    sx, sy = (px + 6) * k, (py + H * 0.30) * k
    paths.append(_bez((sx, sy), (sx - Ll * 0.33 * k, sy - Up * 0.30 * k), (sx - Ll * 0.66 * k, sy - Up * 0.64 * k), (6 * k, (H * 0.05) * k)))
    _strap_lines(canvas, paths, k, W)
    canvas = canvas.resize((Wc, Hc), Image.LANCZOS)
    canvas.alpha_composite(img, (px, py))
    return canvas, ((px + W / 2) / Wc, (py + H / 2) / Hc)


STRAPS = {"fp_mask": strap_mask, "fp_eyepatch": strap_eyepatch}  # ひもを つける


def main():
    total = 0
    only = sys.argv[1:]  # 例: python -I tools/illust/export.py face1 face2(指定がなければ、全部)
    for name, names in MANIFEST.items():
        if only and name not in only:
            continue
        path = os.path.join(SHEETS, name + ".webp")
        if not os.path.exists(path):
            path = os.path.join(SHEETS, name + ".png")
        im = Image.open(path).convert("RGB")
        boxes = boxes_of(name, im)
        if len(boxes) != len(names):
            sys.exit(f"{name}: 絵が {len(boxes)} 個見つかったが、名前は {len(names)} 個(DIL を見直す)")
        for slug, box in zip(names, boxes):
            it = cut(im, box, holes=slug in HOLES, holes_top=slug in HOLES_TOP, smooth=SMOOTH.get(slug, 1.0), thr=BGTHR.get(slug, THR), clean=slug in CLEAN)
            if slug in GAPS:
                it = respace(it, GAPS[slug])
            if slug in STRAPS:
                it, ANCHORS[slug] = STRAPS[slug](it)
            side = MAXSIDE_WIDE.get(slug, MAXSIDE_FACE if slug.startswith("fp_") else MAXSIDE)
            it.thumbnail((side, side), Image.LANCZOS)
            path = os.path.join(OUT, slug + ".webp")
            it.save(path, "WEBP", quality=90, method=6)
            total += os.path.getsize(path)
    if ANCHORS:
        import json
        meta = os.path.join(OUT, "fp_anchor.json")
        old = json.load(open(meta, encoding="utf8")) if os.path.exists(meta) else {}
        old.update({k: [round(v[0], 4), round(v[1], 4)] for k, v in ANCHORS.items()})
        json.dump(old, open(meta, "w", encoding="utf8"), ensure_ascii=False, indent=1)
    print("書き出し", sum(len(v) for v in MANIFEST.values()), "個,", round(total / 1024), "KB")


if __name__ == "__main__":
    main()
