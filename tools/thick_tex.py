import sys, os, shutil
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

root = sys.argv[1]
src = root + "/src/live2d"
dst = src + "/_thick"
os.makedirs(dst + "/tex", exist_ok=True)
shutil.copy(src + "/model.json", dst + "/model.json")
S = 3.1  # 絵(テクスチャ)の拡大: 平らな絵(幅800)に対して、約3.1倍

BODY = [31, 34, 35, 36, 32, 33, 48, 49]   # 顔・体・足・腕
FACE = [19, 22, 20, 21, 23, 24, 25, 26]   # 白目・まぶた・眉
MOUTH = [27, 28]                           # 口:さわらない


def thicken(path, small):
    im = Image.open(path).convert("RGBA")
    a = np.array(im).astype(float)
    lum = a[..., :3].mean(axis=2)
    opaque = a[..., 3] > 40
    dark = opaque & (lum < 152)
    if not small:
        er = max(1, int(5 * S))
        visor = ndi.binary_dilation(ndi.binary_erosion(dark, iterations=er), iterations=int(6 * S)) & dark
        zone = ndi.binary_dilation(visor, iterations=int(5 * S))
    else:
        zone = np.zeros(dark.shape, bool)
    cand = opaque & (lum < 150) & ~zone
    lab, n = ndi.label(cand, structure=np.ones((3, 3)))
    if n == 0:
        return im
    sizes = ndi.sum(cand, lab, index=np.arange(1, n + 1))
    keep = np.zeros(n + 1, bool)
    keep[1:] = sizes >= (40 if small else 120 * S * S / 4)
    lines = keep[lab]
    sig = 1.1 * S * (0.7 if small else 1.0)
    soft = ndi.gaussian_filter(lines.astype(float), sigma=sig)
    al = np.maximum(np.clip((soft - 0.30) / 0.25, 0, 1), lines.astype(float))
    # 新しく線になるところの色 = いちばん近い、もとの線の色
    _, (iy, ix) = ndi.distance_transform_edt(~lines, return_indices=True)
    near = a[iy, ix, :3]
    out = a.copy()
    for c in range(3):
        out[..., c] = np.where(al > 0, a[..., c] * (1 - al) + near[..., c] * al, a[..., c])
    out[..., 3] = np.maximum(a[..., 3], al * 255)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


for f in sorted(os.listdir(src + "/tex")):
    n = int(f.split("_")[1].split(".")[0])
    p = src + "/tex/" + f
    if n in BODY:
        thicken(p, False).save(dst + "/tex/" + f)
    elif n in FACE:
        thicken(p, True).save(dst + "/tex/" + f)
    else:
        shutil.copy(p, dst + "/tex/" + f)
    print(f, "ok")
