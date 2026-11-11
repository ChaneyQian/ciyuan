"""把古文字位图描成矢量轮廓，生成 js/glyph-data.js

输入目录里是 <字的十六进制码位>-<oracle|bronze|seal>.png（黑字、透明或白底），
来自维基共享资源「Ancient Chinese characters」项目的公有领域字形（原始数据：Richard Sears, hanziyuan.net）。
每个字形被归一到 1000×1000 的格子里，轮廓化成二次贝塞尔路径；以 '~' 开头表示用 evenodd 规则填充。

用法:  python tools/trace_glyphs.py <png 目录> js/glyph-data.js
依赖:  opencv-python-headless, numpy
"""
import glob, json, os, sys
import cv2, numpy as np

SRC, OUT = sys.argv[1], sys.argv[2]
KEY = {"oracle": "o", "bronze": "b", "seal": "s"}
BOX, MARGIN, EPS = 1000, 70, 3.0


def mask_of(path):
    img = cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_UNCHANGED)
    if img is None:
        return None
    if img.ndim == 3 and img.shape[2] == 4 and img[..., 3].min() < 200:
        m = img[..., 3]
    else:
        g = img if img.ndim == 2 else cv2.cvtColor(img[..., :3], cv2.COLOR_BGR2GRAY)
        m = 255 - g
    return (m > 110).astype(np.uint8) * 255


def trace(path):
    m = mask_of(path)
    if m is None or m.max() == 0:
        return None
    ys, xs = np.where(m > 0)
    x0, x1, y0, y1 = xs.min(), xs.max() + 1, ys.min(), ys.max() + 1
    crop = m[y0:y1, x0:x1]
    h, w = crop.shape
    s = (BOX - 2 * MARGIN) / max(w, h)
    nw, nh = max(2, round(w * s)), max(2, round(h * s))
    big = cv2.resize(crop, (nw, nh), interpolation=cv2.INTER_CUBIC)
    big = cv2.GaussianBlur(big, (0, 0), 2.2)
    canvas = np.zeros((BOX, BOX), np.uint8)
    ox, oy = (BOX - nw) // 2, (BOX - nh) // 2
    canvas[oy:oy + nh, ox:ox + nw] = (big > 127).astype(np.uint8) * 255
    contours, _ = cv2.findContours(canvas, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    parts = []
    for c in contours:
        if cv2.contourArea(c) < 60:
            continue
        p = cv2.approxPolyDP(c, EPS, True).reshape(-1, 2)
        n = len(p)
        if n < 3:
            continue
        mid = lambda a, b: ((a[0] + b[0]) // 2, (a[1] + b[1]) // 2)
        m0 = mid(p[-1], p[0])
        d = [f"M{m0[0]} {m0[1]}"]
        for i in range(n):
            v, mm = p[i], mid(p[i], p[(i + 1) % n])
            d.append(f"Q{v[0]} {v[1]} {mm[0]} {mm[1]}")
        parts.append("".join(d) + "Z")
    return "~" + "".join(parts) if parts else None


glyphs = {}
for f in sorted(glob.glob(os.path.join(SRC, "*.png"))):
    code, st = os.path.splitext(os.path.basename(f))[0].split("-")
    d = trace(f)
    if d:
        glyphs.setdefault(chr(int(code, 16)), {})[KEY[st]] = d

body = json.dumps(glyphs, ensure_ascii=False, separators=(",", ":"))
with open(OUT, "w", encoding="utf-8", newline="\n") as fh:
    fh.write("/* 古文字字形（甲骨文 o · 金文 b · 小篆 s）。公有领域：维基共享资源 Ancient Chinese characters 项目，\n"
             "   原始字形数据 Richard Sears (hanziyuan.net)。由 tools/trace_glyphs.py 生成，勿手改。 */\n"
             "window.MS = window.MS || {};\nMS.GLYPHS = " + body + ";\n")
n = sum(len(v) for v in glyphs.values())
print(f"{len(glyphs)} chars, {n} glyphs, {len(body) / 1024:.0f} KB")
