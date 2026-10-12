#!/usr/bin/env python3
"""
다른 렌더러로 교차 확인: 내려받는 SVG 파일 자체를 CairoSVG(Cairo 기반 벡터 렌더러)와 Chromium으로 각각 그려 비교한다.
Illustrator가 없는 환경에서 '다른 벡터 도구에서도 같은 모양으로 열리는지'를 대신 확인하는 용도.
사용: FIXTURE_DIR=... python3 tests/cross_renderer.py
"""
import io, os, sys, re
from pathlib import Path
import numpy as np
from PIL import Image
import cairosvg
from playwright.sync_api import sync_playwright

FX = Path(os.environ["FIXTURE_DIR"])
files = sorted(FX.glob("*.svg"))
W = 700
bad = []; worst = 0
with sync_playwright() as pw:
    br = pw.chromium.launch(); pg = br.new_page(viewport={"width": W, "height": 900})
    for f in files:
        svg = f.read_bytes()
        png = cairosvg.svg2png(bytestring=svg, output_width=W, background_color="#808080")
        a = np.asarray(Image.open(io.BytesIO(png)).convert("RGB")).astype(int)
        h = a.shape[0]
        pg.set_viewport_size({"width": W, "height": h})
        pg.set_content(f'<body style="margin:0;background:#808080"><img src="data:image/svg+xml;base64,{__import__('base64').b64encode(svg).decode()}" style="width:{W}px;height:{h}px;display:block"></body>')
        pg.wait_for_timeout(30)
        b = np.asarray(Image.open(io.BytesIO(pg.screenshot())).convert("RGB")).astype(int)
        # ±1px 허용 비교
        d = np.full(a.shape[:2], 255)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                aa = a[max(0, dy):h + min(0, dy), max(0, dx):W + min(0, dx)]; bb = b[max(0, -dy):h + min(0, -dy), max(0, -dx):W + min(0, -dx)]
                dd = np.abs(aa - bb).max(axis=2)
                sub = d[max(0, dy):h + min(0, dy), max(0, dx):W + min(0, dx)]
                np.minimum(sub, dd, out=sub)
        frac = float((d > 48).mean() * 100)
        worst = max(worst, frac)
        if frac > 1.0: bad.append((f.name, round(frac, 2)))
    br.close()
print(f"비교한 SVG {len(files)}개 · 최대 불일치 픽셀 {worst:.3f}% · 1% 초과 {len(bad)}개", bad[:5])
sys.exit(1 if bad else 0)
