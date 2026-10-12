#!/usr/bin/env python3
"""
시각 대조(자동): 사이트가 만든 SVG(메인 8색 × 적용 방식 6)를 Chromium으로 그리고,
원본 PDF를 pdftocairo로 그린 같은 자리와 픽셀을 비교한다.
  - 심볼 창 : 심볼 위치·크기를 맞춰 비교
  - 워드마크 창 : 워드마크 위치·크기를 맞춰 비교 (색 페이지 워드마크가 3페이지와 0.6% 다르게 배치되어 있어 따로 맞춤)
사용: FIXTURE_DIR=... python3 tests/raster_compare.py
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
FX = Path(os.environ["FIXTURE_DIR"])
ext = json.loads((ROOT / "scripts/out/extracted.json").read_text())
colorways = json.loads((ROOT / "src/data/colorways.json").read_text())[:8]
assets = json.loads((ROOT / "src/data/logoAssets.json").read_text())
K = 4  # px per pt
S = ext["exampleLayout"]["exampleSymbolScaleVsLong"]
PDF = ROOT / "source/N-FUD_2026_Logo_261012.pdf"
TMP = Path(tempfile.mkdtemp())

SLUG = {1: "duotone-purple", 2: "reverse-on-purple", 3: "purple-on-aux", 4: "duotone-aux-text", 5: "duotone-purple-accent", 6: "mono-aux"}
CIRC = {1: "①", 2: "②", 3: "③", 4: "④", 5: "⑤", 6: "⑥"}

def pbox(paths):
    n = np.array([float(x) for d in paths for x in re.findall(r"-?\d+\.?\d*", d)]).reshape(-1, 2)
    return n[:, 0].min(), n[:, 1].min(), n[:, 0].max(), n[:, 1].max()

long = assets["long"]
sym_b = pbox(long["base"])
wm_b = pbox(long["wordmark"] + long["accent"])

def pdf_crop(page, box):
    x0, y0, x1, y1 = box
    out = TMP / f"pdf_{page}_{int(x0)}_{int(y0)}"
    subprocess.run(["pdftocairo", "-png", "-r", str(72 * K), "-f", str(page), "-l", str(page), "-x", str(int(x0 * K)), "-y", str(int(y0 * K)),
                    "-W", str(int((x1 - x0) * K)), "-H", str(int((y1 - y0) * K)), "-singlefile", str(PDF), str(out)], check=True, stderr=subprocess.DEVNULL)
    return Image.open(str(out) + ".png").convert("RGB")

def window(img, box, crop0):
    x0, y0, x1, y1 = box
    a = [int((x0 - crop0[0]) * K) - 2, int((y0 - crop0[1]) * K) - 2, int((x1 - crop0[0]) * K) + 3, int((y1 - crop0[1]) * K) + 3]
    return np.asarray(img.crop(a)).astype(int)

def tol_diff(a, b, r=1):
    """±r 픽셀 이동을 허용한 차이 (경계선의 반픽셀 위치 차이·안티앨리어싱 차이를 오차로 세지 않기 위함)"""
    h, w, _ = a.shape
    best = None
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            ys0, ys1 = max(0, dy), h + min(0, dy); xs0, xs1 = max(0, dx), w + min(0, dx)
            aa = a[ys0:ys1, xs0:xs1]; bb = b[ys0 - dy:ys1 - dy, xs0 - dx:xs1 - dx]
            d = np.abs(aa - bb).max(axis=2)
            if best is None: best = np.full((h, w), 255); 
            sub = best[ys0:ys1, xs0:xs1]
            np.minimum(sub, d, out=sub)
    # 가장자리 r 픽셀은 제외
    return best[r:h - r, r:w - r]


def main():
    rows = []
    with sync_playwright() as pw:
        br = pw.chromium.launch()
        pg = br.new_page(device_scale_factor=1)
        for mi, cw in enumerate(colorways):
            page_no = 9 + mi
            sh = ext["pageShift"][str(page_no)]
            for v in range(1, 7):
                ex = ext["exampleBoxes"][CIRC[v]]
                sb = ex["baseOnly"]; sbox = ex["symbol"]; wbox = ex["wordmark"]
                union = [min(sbox[0], wbox[0]), min(sbox[1], wbox[1]), max(sbox[2], wbox[2]), max(sbox[3], wbox[3])]
                if ex["bg"]: union = ex["bg"]
                crop = [union[0] + sh[0] - 6, union[1] + sh[1] - 6, union[2] + sh[0] + 6, union[3] + sh[1] + 6]
                ref = pdf_crop(page_no, crop)
                w_px, h_px = ref.size
                bgcol = cw["mapping"][str(v)]["bg"] or "#FFFFFF"
                svg = (FX / f"HCDT_{cw['id']}_main_long_{SLUG[v]}_transparent{'-for-purple-bg' if v == 2 else ('-for-aux-bg' if v == 3 else '')}.svg").read_text()
                svg = re.sub(r"^<\?xml[^>]*>\s*", "", svg)
                svg = re.sub(r' width="[\d.]+" height="[\d.]+"', "", svg, count=1)
                res = {}
                for kind, scale, anchor_pdf, anchor_mine, win in (
                    ("symbol", K * S, (sb[0] + sh[0], sb[1] + sh[1]), (sym_b[0] + 0, sym_b[1] + 0), [sb[0] + sh[0], sb[1] + sh[1], sb[2] + sh[0], sb[3] + sh[1]]),
                    ("wordmark", K * (wbox[2] - wbox[0]) / (wm_b[2] - wm_b[0]), (wbox[0] + sh[0], wbox[1] + sh[1]), (wm_b[0], wm_b[1]), [wbox[0] + sh[0], wbox[1] + sh[1], wbox[2] + sh[0], wbox[3] + sh[1]]),
                ):
                    # long.json 좌표는 이미 좌상단 기준(viewBox 0,0)이므로 anchor_mine 이 그 안에서의 위치
                    left = (anchor_pdf[0] - crop[0]) * K - anchor_mine[0] * scale
                    top = (anchor_pdf[1] - crop[1]) * K - anchor_mine[1] * scale
                    vb = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
                    W, H = float(vb.group(1)), float(vb.group(2))
                    html = f'<body style="margin:0"><div style="position:relative;width:{w_px}px;height:{h_px}px;background:{bgcol};overflow:hidden">' \
                           f'<div style="position:absolute;left:{left}px;top:{top}px;width:{W*scale}px;height:{H*scale}px">' + \
                           svg.replace("<svg ", '<svg style="width:100%;height:100%;display:block" ', 1) + '</div></div></body>'
                    pg.set_viewport_size({"width": w_px, "height": h_px})
                    pg.set_content(html)
                    shot = TMP / "mine.png"
                    pg.screenshot(path=str(shot))
                    mine = Image.open(shot).convert("RGB")
                    a = window(ref, win, crop); b = window(mine, win, crop)
                    if os.environ.get("DEBUG_DIR") and mi == 0 and v in (1, 3):
                        dd = Path(os.environ["DEBUG_DIR"]); dd.mkdir(exist_ok=True)
                        Image.fromarray(np.hstack([a, b, np.abs(a - b)]).astype("uint8")).save(dd / f"dbg_{cw['id']}_{v}_{kind}.png")
                    d = tol_diff(a, b)
                    res[kind] = (float((d > 48).mean() * 100), float(d.mean()))
                rows.append((cw["id"], cw["name"], CIRC[v], res["symbol"], res["wordmark"]))
        br.close()
    print("id  name      방식  심볼:다른픽셀%  평균차 | 워드마크:다른픽셀%  평균차")
    worst = 0
    for r in rows:
        print(f"{r[0]} {r[1]:<8} {r[2]}   {r[3][0]:6.2f}  {r[3][1]:5.2f} |  {r[4][0]:6.2f}  {r[4][1]:5.2f}")
        worst = max(worst, r[3][0], r[4][0])
    print("최악 다른픽셀 %:", round(worst, 2))
    return worst

if __name__ == "__main__":
    w = main()
    sys.exit(0 if w < 3.0 else 1)
