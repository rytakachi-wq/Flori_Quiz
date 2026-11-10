"""静止画のフロリ(assets/flori/m/)の線を太くする(口はそのまま)。もとの絵は git の履歴に残っている。
使い方: python tools/thick_static.py   (リポジトリの直下で)"""
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

FILES = [("body_wave.webp", True), ("wave_smile.png", True), ("wave_nikkori.png", True), ("wave_surprised.png", True), ("wave_wrong.png", True), ("book_pen.png", False)]


def process(path, face_parts):
    src = Image.open(path).convert("RGBA")
    a = np.array(src).astype(float)
    H, W = a.shape[:2]
    lum = a[..., :3].mean(axis=2)
    opaque = a[..., 3] > 40
    dark_strict = opaque & (lum < 152)
    visor = ndi.binary_dilation(ndi.binary_erosion(dark_strict, iterations=5), iterations=6) & dark_strict
    visor_zone = ndi.binary_dilation(visor, iterations=5)
    cand = opaque & (lum < 150) & ~visor_zone
    lab, n = ndi.label(cand, structure=np.ones((3, 3)))
    sizes = ndi.sum(cand, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= 120
    lines = keep[lab]
    soft = ndi.gaussian_filter(lines.astype(float), sigma=1.1)
    al = np.maximum(np.clip((soft - 0.30) / 0.25, 0, 1), lines.astype(float))
    col = np.array([52, 62, 74], float)
    body = a.copy()
    for c in range(3):
        body[..., c] = np.where(al > 0, a[..., c] * (1 - al) + col[c] * al, a[..., c])
    body[..., 3] = np.maximum(a[..., 3], al * 255)
    out = body
    if face_parts:
        visor_fill = ndi.binary_fill_holes(visor)
        mx, mn = a[..., :3].max(axis=2), a[..., :3].min(axis=2)
        sat = (mx - mn) / np.maximum(mx, 1)
        feat = visor_fill & ((sat > 0.30) | (lum > 185) | (lum < 100))
        lab2, n2 = ndi.label(feat, structure=np.ones((3, 3)))
        objs = ndi.find_objects(lab2)
        sz2 = ndi.sum(feat, lab2, index=np.arange(1, n2 + 1))
        k2 = np.zeros(n2 + 1, bool)
        k2[1:] = sz2 >= 25
        feat = k2[lab2]
        # 口(下の真ん中の大きなかたまり)は、太くしない
        mouth_box = None
        for i, sl in enumerate(objs, 1):
            area = (lab2[sl] == i).sum()
            cx = (sl[1].start + sl[1].stop) / 2
            if area >= 1500 and 325 <= sl[0].start and sl[0].stop <= 440 and abs(cx - 415) < 45:
                b = (sl[0].start - 14, sl[0].stop + 14, sl[1].start - 14, sl[1].stop + 14)
                mouth_box = b if mouth_box is None else (min(mouth_box[0], b[0]), max(mouth_box[1], b[1]), min(mouth_box[2], b[2]), max(mouth_box[3], b[3]))
        rgb = a[..., :3].copy()
        sat_mask = feat & (sat > 0.30)
        dark_mask = feat & (lum < 100) & ~sat_mask
        white_mask = feat & ~sat_mask & ~dark_mask
        bg = visor_fill & ~feat
        assigned = np.zeros((H, W), bool)
        new_rgb = rgb.copy()
        shifts = sorted([(dy, dx) for dy in (-2, -1, 0, 1, 2) for dx in (-2, -1, 0, 1, 2) if (dy or dx) and dy * dy + dx * dx <= 5], key=lambda t: t[0] ** 2 + t[1] ** 2)
        for cls in (sat_mask, dark_mask, white_mask):
            for dy, dx in shifts:
                cnd = np.roll(np.roll(cls, dy, 0), dx, 1) & bg & ~assigned
                if cnd.any():
                    shc = np.roll(np.roll(rgb, dy, 0), dx, 1)
                    new_rgb[cnd] = shc[cnd]
                    assigned |= cnd
        alpha_soft = ndi.gaussian_filter(assigned.astype(float), 0.5)
        alpha_soft = np.where(assigned, np.maximum(alpha_soft, 0.85), 0)
        face = body.copy()
        for c in range(3):
            face[..., c] = np.where(assigned, body[..., c] * (1 - alpha_soft) + new_rgb[..., c] * alpha_soft, body[..., c])
        if mouth_box:
            y0, y1, x0, x1 = mouth_box
            face[y0:y1, x0:x1] = a[y0:y1, x0:x1]
        out = face
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


if __name__ == "__main__":
    for name, face_parts in FILES:
        p = "assets/flori/m/" + name
        im = process(p, face_parts)
        if name.endswith(".webp"):
            im.save(p, "WEBP", quality=92, method=6)
        else:
            im.save(p, optimize=True)
        print(name, "ok")
