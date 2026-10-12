#!/usr/bin/env python3
"""
AI(PDF 호환) 원본에서 로고 벡터와 컬러 시안 8개를 추출한다.

입력 : source/N-FUD_2026_Logo_261012.pdf   (Illustrator에서 내보낸 PDF, 16페이지)
출력 : scripts/out/extracted.json          (로고 3종 패스 + 원본 8색 매핑)

- 로고를 새로 그리거나 트레이싱하지 않는다. PDF 안의 벡터 패스를 그대로 읽고,
  좌표만 이동/배율 변환한다.
- 2페이지 The Longest / 3페이지 Long / 4페이지 Short : 안내선·D 표시·주황색 선 제외
- 9~16페이지 : 컬러 시안 8개 (원본 순서 유지)
"""
import json, re, subprocess, sys, tempfile, os
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PDF = ROOT / "source" / "N-FUD_2026_Logo_261012.pdf"
OUT = ROOT / "scripts" / "out"
OUT.mkdir(parents=True, exist_ok=True)

TMP = Path(tempfile.mkdtemp(prefix="hcdt_pages_"))


def page_svg(p: int) -> str:
    f = TMP / f"p{p}.svg"
    subprocess.run(["pdftocairo", "-svg", "-f", str(p), "-l", str(p), str(PDF), str(f)],
                   check=True, stderr=subprocess.DEVNULL)
    return f.read_text()


def to_hex(c: str):
    if not c or c == "none":
        return c
    v = [float(x) for x in re.findall(r"[\d.]+(?=%)", c)]
    return "#%02X%02X%02X" % tuple(round(x * 2.55) for x in v)


NUM = r"-?\d+\.?\d*(?:e-?\d+)?"


def parse(p: int):
    s = page_svg(p)
    out = []
    for m in re.finditer(r"<path ([^>]*?)/>", s):
        a = m.group(1)
        d = re.search(r' d="([^"]*)"', a).group(1)
        assert set(re.findall(r"[A-Za-z]", d)) <= set("MLCZ"), "지원하지 않는 패스 명령"
        pts = np.array([float(x) for x in re.findall(NUM, d)]).reshape(-1, 2)
        fill = re.search(r'fill="([^"]*)"', a)
        stroke = re.search(r'stroke="([^"]*)"', a)
        assert 'fill-opacity="1"' in a or "none" in (fill.group(1) if fill else "none")
        out.append(dict(
            idx=len(out), d=d, pts=pts,
            fill=to_hex(fill.group(1)) if fill else None,
            stroke=to_hex(stroke.group(1)) if stroke else None,
            bbox=(pts[:, 0].min(), pts[:, 1].min(), pts[:, 0].max(), pts[:, 1].max()),
        ))
    return out


def bbox_of(L):
    return (min(q["bbox"][0] for q in L), min(q["bbox"][1] for q in L),
            max(q["bbox"][2] for q in L), max(q["bbox"][3] for q in L))


def allpts(L):
    return np.vstack([q["pts"] for q in L])


def fit_similarity(A, B):
    """B ≈ s*A + t  (균등 배율 + 이동)"""
    ma, mb = A.mean(0), B.mean(0)
    s = ((B - mb) * (A - ma)).sum() / ((A - ma) ** 2).sum()
    t = mb - s * ma
    return s, t, float(np.abs(B - (s * A + t)).max())


def apply_d(d: str, s: float, t, dx=0.0, dy=0.0):
    """패스 문자열의 모든 좌표쌍에 x' = s*x + t 를 적용"""
    toks = re.findall(r"[MLCZ]|" + NUM, d)
    out, buf = [], []
    for k in toks:
        if k in "MLCZ":
            out.append(k)
        else:
            buf.append(float(k))
            if len(buf) == 2:
                out.append(fmt(s * buf[0] + t[0] + dx)); out.append(fmt(s * buf[1] + t[1] + dy)); buf = []
    r = " ".join(out)
    # pdftocairo 가 닫힌 패스 뒤에 붙이는 의미 없는 이동 명령(Z M x y) 제거
    return re.sub(r"(Z) M [-\d. ]+$", r"\1", r)


def fmt(v: float) -> str:
    r = round(v, 3)
    if r == 0:
        r = 0.0
    s = ("%.3f" % r).rstrip("0").rstrip(".")
    return s if s != "-0" else "0"


def shoelace(pts):
    x, y = pts[:, 0], pts[:, 1]
    return 0.5 * float(np.sum(x[:-1] * y[1:] - x[1:] * y[:-1]) + x[-1] * y[0] - x[0] * y[-1])


# ───────────────────────── 1) 로고 3종 ─────────────────────────
p2, p3, p4 = parse(2), parse(3), parse(4)
PURPLE = "#6B00FF"

# (페이지, 심볼 인덱스 범위, 워드마크 인덱스 범위) — 안내선 없는 깨끗한 쪽만 사용
SPEC = {
    "longest": dict(page=p2, sym=(184, 274), wm=(137, 184), xmin=1000, nsym=90, nwm=47),
    "long":    dict(page=p3, sym=(144, 234), wm=(234, 266), xmin=1000, nsym=90, nwm=32),
    "short":   dict(page=p4, sym=(118, 208), wm=(208, 215), xmin=1000, nsym=90, nwm=7),
}
# 4페이지 짧은 형식은 같은 위치에 동일 오브젝트가 한 벌 더 겹쳐 있다 → 동일함을 확인하고 한 벌만 쓴다
assert all(p4[118 + i]["d"] == p4[215 + i]["d"] for i in range(97)), "Short 중복본이 다름"

formats = {}
for key, sp in SPEC.items():
    P = sp["page"]
    sym = P[sp["sym"][0]:sp["sym"][1]]
    wm = P[sp["wm"][0]:sp["wm"][1]]
    assert len(sym) == sp["nsym"] and len(wm) == sp["nwm"], (key, len(sym), len(wm))
    assert all(q["fill"] == PURPLE for q in sym), key
    assert all(q["bbox"][0] > sp["xmin"] for q in sym + wm), key  # 오른쪽(깨끗한) 사본인지
    assert all(q["fill"] == "#1E1A1A" for q in wm), key
    # 패스 안내선/주황색 요소가 섞이지 않았는지
    assert not any(q["fill"] in ("#F95716",) or q["stroke"] for q in sym + wm)
    formats[key] = dict(sym=sym, wm=wm)

# 워드마크 안의 '–' '+' 막대: 꼭짓점 4개짜리 직사각형(좌표 5개)이면서 가로·세로로 길쭉한 것 3개
# (I 글자는 세리프가 있어 꼭짓점이 더 많다)
for key, f in formats.items():
    rects = [q for q in f["wm"] if len(q["pts"]) == 5]
    assert len(rects) == 3, (key, len(rects))
    f["accent_idx"] = [q["idx"] for q in rects]

# ───────────────────────── 2) 컬러 시안 8개 ─────────────────────────
pages = {p: parse(p) for p in range(9, 17)}
base9 = pages[9]
assert all(len(v) == 1365 for v in pages.values())

# 모든 컬러 페이지는 같은 도형을 통째로 이동만 한 것이다 → 인덱스 대응 + 균일 이동 확인
for p, P in pages.items():
    deltas = {tuple(np.round(a["pts"][0] - b["pts"][0], 1)) for a, b in zip(P, base9)}
    assert len(deltas) == 1, ("페이지 이동량이 균일하지 않음", p, deltas)

# 예시 영역 (9페이지 기준 좌표)
def region(q):
    x0, y0, x1, y1 = q["bbox"]
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    if x1 - x0 > 1000: return "strip"
    if cx < 650: return "large"
    col = "c2" if cx < 1260 else "c3"
    row = 0 if cy < 435 else (1 if cy < 617 else 2)
    return f"{col}r{row}"

REG = {"①": "c2r0", "②": "c2r1", "③": "c2r2", "④": "c3r0", "⑤": "c3r1", "⑥": "c3r2"}
by_reg = {}
for q in base9:
    by_reg.setdefault(region(q), []).append(q["idx"])

# 심볼 기준 형상 : Long 형식의 심볼(보라 90모듈) → 9페이지 ① 예시에서의 위치 (배율+이동 균일)
long_base = allpts(formats["long"]["sym"])
ex1_all = [base9[i] for i in by_reg["c2r0"]]
ex1_base = [q for q in ex1_all if q["fill"] == PURPLE and q["bbox"][2] < 850]
assert len(ex1_base) == 90
ex1_hi = [q for q in ex1_all if q["fill"] == "#DAF61F" and q["bbox"][2] < 850]
assert len(ex1_hi) == 90
S_ex1, T_ex1, res = fit_similarity(long_base, allpts(ex1_base))
assert res < 0.01, res
EX_SCALE = S_ex1  # 모든 예시 공통


def wordmark_origin(idxs, xmin):
    L = [base9[i] for i in idxs if (base9[i]["bbox"][0] + base9[i]["bbox"][2]) / 2 > xmin]
    return bbox_of(L)[:2]


# 예시별 워드마크 시작점(심볼 오른쪽 경계) 기준으로 이동량 계산
ex_xsplit = {"c2": 850, "c3": 1455}
def wm_group(name):
    col = name[:2]
    return [i for i in by_reg[name]
            if (base9[i]["bbox"][0] + base9[i]["bbox"][2]) / 2 > ex_xsplit[col] and base9[i]["bbox"][2] - base9[i]["bbox"][0] < 300]
def sym_group(name):
    col = name[:2]
    return [i for i in by_reg[name]
            if (base9[i]["bbox"][0] + base9[i]["bbox"][2]) / 2 <= ex_xsplit[col]]

wm1 = bbox_of([base9[i] for i in wm_group("c2r0")])
shift = {}  # 예시 → (dx, dy) : ① 대비 이동
for name in REG.values():
    wb = bbox_of([base9[i] for i in wm_group(name)])
    shift[name] = (wb[0] - wm1[0], wb[1] - wm1[1])

base_ref = np.array([q["pts"] for q in ex1_base], dtype=object)

def classify_symbol(name, idxs):
    """심볼 패스를 base(큰 면)/hi(보조 면)로 나눈다 : ① 예시의 형상을 이동해 가장 가까운 쪽"""
    dx, dy = shift[name]
    bc = np.array([[(q["bbox"][0] + q["bbox"][2]) / 2 + 0, (q["bbox"][1] + q["bbox"][3]) / 2] for q in ex1_base]) + [dx, dy]
    hc = np.array([[(q["bbox"][0] + q["bbox"][2]) / 2, (q["bbox"][1] + q["bbox"][3]) / 2] for q in ex1_hi]) + [dx, dy]
    bsz = np.array([[q["bbox"][2] - q["bbox"][0], q["bbox"][3] - q["bbox"][1]] for q in ex1_base])
    hsz = np.array([[q["bbox"][2] - q["bbox"][0], q["bbox"][3] - q["bbox"][1]] for q in ex1_hi])
    res = {}
    for i in idxs:
        q = base9[i]
        c = np.array([(q["bbox"][0] + q["bbox"][2]) / 2, (q["bbox"][1] + q["bbox"][3]) / 2])
        sz = np.array([q["bbox"][2] - q["bbox"][0], q["bbox"][3] - q["bbox"][1]])
        db = np.min(np.abs(bc - c).sum(1) + np.abs(bsz - sz).sum(1))
        dh = np.min(np.abs(hc - c).sum(1) + np.abs(hsz - sz).sum(1))
        assert min(db, dh) < 0.05, (name, i, db, dh)
        res[i] = "base" if db < dh else "hi"
    return res

original = {}
CLASS = {}
for name in REG.values():
    # 배경 사각형(폭 300pt 초과) / 심볼 / 워드마크 분리
    bg = [i for i in by_reg[name] if (base9[i]["bbox"][2] - base9[i]["bbox"][0]) > 300]
    sidx = [i for i in sym_group(name) if i not in bg]
    CLASS[name] = dict(bg=bg, wm=wm_group(name), sym=classify_symbol(name, sidx))

# 심볼 해당 영역의 base/hi 패스 수 확인 (예: ⑥은 base만)
for name, c in CLASS.items():
    nb = sum(1 for v in c["sym"].values() if v == "base")
    nh = sum(1 for v in c["sym"].values() if v == "hi")
    c["counts"] = (nb, nh, len(c["wm"]), len(c["bg"]))

# wm 중 '–' '+' 막대(좌표 5개짜리 직사각형)
for name, c in CLASS.items():
    c["accent"] = [i for i in c["wm"] if len(base9[i]["pts"]) == 5]
    c["wm_main"] = [i for i in c["wm"] if len(base9[i]["pts"]) != 5]

# 페이지별 원본 색 읽기
PAGE_NAMES = {9: "라임", 10: "오렌지", 11: "민트그린", 12: "옐로", 13: "피치", 14: "핑크", 15: "라이트블루", 16: "아쿠아"}

def uniq(P, idxs):
    s = {P[i]["fill"] for i in idxs}
    return sorted(s)

main_colors = []
for p in range(9, 17):
    P = pages[p]
    entry = {"page": p, "name": PAGE_NAMES[p], "examples": {}}
    for sym_name, name in REG.items():
        c = CLASS[name]
        layers = {}
        layers["bg"] = uniq(P, c["bg"])
        layers["base"] = uniq(P, [i for i, v in c["sym"].items() if v == "base"])
        layers["hi"] = uniq(P, [i for i, v in c["sym"].items() if v == "hi"])
        layers["wordmark"] = uniq(P, c["wm_main"])
        layers["accent"] = uniq(P, c["accent"])
        for k, v in layers.items():
            assert len(v) <= 1, (p, sym_name, k, v)
        entry["examples"][sym_name] = {k: (v[0] if v else None) for k, v in layers.items()}
        # 그리는 순서(z-order)상 배경 사각형 '아래'에 깔려 보이지 않는 층 찾기 (③의 연결색 면이 여기에 해당)
        occluded = []
        if c["bg"]:
            bg_first = min(c["bg"])
            for layer in ("base", "hi"):
                li = [i for i, v in c["sym"].items() if v == layer]
                if li and max(li) < bg_first:
                    occluded.append(layer)
        entry["examples"][sym_name]["occluded"] = occluded
    # 페이지 상단 색 띠
    entry["strip"] = uniq(P, [i for i in by_reg["strip"]])[0]
    main_colors.append(entry)

# ───────────────────────── 3) 형식별 hi 레이어 : ① 예시의 hi 면을 같은 변환으로 옮겨 온다 ─────────────────────────
out_formats = {}
for key, f in formats.items():
    A = allpts(f["sym"])
    s, t, res = fit_similarity(allpts(ex1_base), A)       # ① 예시 base → 이 형식 base
    assert res < 0.01, (key, res)
    hi_d = [apply_d(q["d"], s, t) for q in ex1_hi]
    base_bb = bbox_of(f["sym"]); wm_bb = bbox_of(f["wm"])
    # 보조 면(hi)은 큰 면(base)보다 왼쪽으로 조금 더 나오므로, 두 면을 합친 영역을 심볼 영역으로 쓴다
    hn = np.array([float(x) for d in hi_d for x in re.findall(NUM, d)]).reshape(-1, 2)
    base_bb = (min(base_bb[0], hn[:, 0].min()), min(base_bb[1], hn[:, 1].min()), max(base_bb[2], hn[:, 0].max()), max(base_bb[3], hn[:, 1].max()))
    full = (min(base_bb[0], wm_bb[0]), min(base_bb[1], wm_bb[1]), max(base_bb[2], wm_bb[2]), max(base_bb[3], wm_bb[3]))
    sym_h = base_bb[3] - base_bb[1]
    pad = round(0.1 * sym_h, 3)
    ox, oy = full[0] - pad, full[1] - pad
    W, H = (full[2] - full[0]) + 2 * pad, (full[3] - full[1]) + 2 * pad

    def shift_d(d):  # 좌상단 기준으로 이동 (배율 1)
        return apply_d(d, 1.0, (-ox, -oy))

    acc = set(f["accent_idx"])
    out_formats[key] = dict(
        viewBox=[0, 0, round(W, 3), round(H, 3)],
        padding=pad,
        symbolHeight=round(sym_h, 3),
        symbolBox=[round(base_bb[0] - ox, 3), round(base_bb[1] - oy, 3), round(base_bb[2] - ox, 3), round(base_bb[3] - oy, 3)],
        base=[shift_d(q["d"]) for q in f["sym"]],
        hi=[shift_d(d) for d in hi_d],
        wordmark=[shift_d(q["d"]) for q in f["wm"] if q["idx"] not in acc],
        accent=[shift_d(q["d"]) for q in f["wm"] if q["idx"] in acc],
        source=dict(page=SPEC[key]["page"] is p2 and 2 or (SPEC[key]["page"] is p3 and 3 or 4),
                    symbolPaths=len(f["sym"]), wordmarkPaths=len(f["wm"]),
                    hiLayerFit=dict(scale=round(s, 6), residualPt=round(res, 5))),
    )
    # 심볼 두 면이 겹치지 않는지, 감김 방향이 한 방향인지 점검 (한 개 패스로 합쳐도 안전한지)
    sa = [shoelace(q["pts"]) for q in f["sym"]]
    out_formats[key]["source"]["baseWindingSigns"] = sorted({int(np.sign(a)) for a in sa})

def bb_list(idxs):
    b = bbox_of([base9[i] for i in idxs]); return [round(float(v), 3) for v in b]

example_boxes = {}
for sym_name, name in REG.items():
    c = CLASS[name]
    sym_idx = list(c["sym"].keys())
    example_boxes[sym_name] = dict(
        symbol=bb_list(sym_idx), wordmark=bb_list(c["wm"]),
        bg=bb_list(c["bg"]) if c["bg"] else None,
        baseOnly=bb_list([i for i, v in c["sym"].items() if v == "base"]),
    )
page_shift = {str(p): [round(float(x), 3) for x in (pages[p][0]["pts"][0] - base9[0]["pts"][0])] for p in pages}
large_idx = by_reg["large"]
example_boxes["large"] = dict(symbol=bb_list(large_idx))

result = dict(
    exampleBoxes=example_boxes, pageShift=page_shift,
    formats=out_formats,
    mainColors=main_colors,
    exampleLayout=dict(regions=REG, counts={k: list(v["counts"]) for k, v in CLASS.items()},
                       exampleSymbolScaleVsLong=round(EX_SCALE, 6)),
)
(OUT / "extracted.json").write_text(json.dumps(result, ensure_ascii=False, indent=1))
print("OK", {k: (len(v["base"]), len(v["hi"]), len(v["wordmark"]), len(v["accent"]), v["viewBox"]) for k, v in out_formats.items()})
print("counts(base,hi,wm,bg)", result["exampleLayout"]["counts"])
for m in main_colors:
    print(m["page"], m["name"], m["strip"], {k: (tuple(v.values())) for k, v in m["examples"].items()})
