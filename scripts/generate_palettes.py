#!/usr/bin/env python3
"""
확장 컬러 92개를 결정적(고정)으로 생성한다.  같은 입력이면 항상 같은 결과가 나온다(랜덤 없음).

규칙(원본 8개에서 읽은 구조를 그대로 따른다)
  기준 보라  #6B00FF              : 모든 시안 공통(8개 원본도 전부 동일)
  연결색     #5960D8              : ③번 적용 방식 전용. 8개 원본에서 전부 동일 → 고정
  보조색 A                        : 심볼의 두 번째 면, 보라/보조색 배경
  보조색 진한 톤 B                : 흰 배경 위 글자·단색 사용(④⑤⑥). 원본 8개에서 A보다 항상 어둡고 채도가 같거나 높다

확장 컬러 A는 아래 조건을 모두 만족하는 후보 중에서 '서로 가장 멀리 떨어지는 순서'로 고른다.
  1) 보라와 구분 : 명암비(보라, A) ≥ 2.75  (원본 최저 2.95 = 오렌지. 빨강·파랑 계열을 넣기 위해 약간만 낮춤)
  2) 흰 배경에서 심볼 보조면이 사라지지 않음 : 명암비(A, 흰색) ≥ 1.22   (원본 최저 1.22 = 라이트블루)
  3) 진한 톤 B의 흰 배경 가독성 : 명암비(B, 흰색) ≥ 1.6    (원본 8개 중 7개가 1.6 이상, 최저 1.41 = 라임)
  4) ⑤번에서 보라 워드마크 옆 B 기호 구분 : 명암비(B, 보라) ≥ 2.0   (원본 최저 2.48)
  5) 무채색 방지 : OKLCH 채도 ≥ 0.05                       (원본 최저 0.051)
  6) 보라 계열 제외 : OKLCH 색상각이 보라(287°)에서 ±40° 안이면서 채도 ≥ 0.05 인 색은 제외
  7) 이미 있는 색과 비슷하지 않음 : OKLab 거리 ≥ MIN_DIST (원본 8개 + 먼저 고른 색 모두와)
"""
import json, math, sys
from pathlib import Path
from colorlib import *

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "scripts" / "out"
PURPLE = "#6B00FF"
BRIDGE = "#5960D8"

LIM = dict(purple_vs_A=2.75, A_vs_white=1.22, B_vs_white=1.6, B_vs_purple=2.0, min_chroma=0.05, purple_hue_excl=40)
MIN_DIST = float(__import__("os").environ.get("MIN_DIST", "0.038"))   # 보조색 A끼리 최소 거리(OKLab)
MIN_DIST_B = float(__import__("os").environ.get("MIN_DIST_B", "0.028"))  # 진한 톤 B끼리 최소 거리


def clamp(x, a, b):
    return max(a, min(b, x))


def derive_deep(A):
    """보조색 A → 진한 톤 B (원본 8개의 A→B 관계를 근사한 규칙)"""
    L, C, h = hex_to_oklch(A)
    t = clamp((0.17 - C) / 0.12, 0, 1)
    LB = L - (0.035 + 0.10 * t)
    CB = C * (1 + 0.9 * t)
    hB = (h - 3) % 360
    for _ in range(200):
        CB = min(CB, max_chroma(LB, hB))
        B, _ = oklch_to_hex(LB, CB, hB)
        if contrast(B, WHITE) >= LIM["B_vs_white"]:
            return B
        LB -= 0.005
    return B


def ok(A, B):
    L, C, h = hex_to_oklch(A)
    if C < LIM["min_chroma"]: return False
    if C >= 0.05 and hue_dist(h, 287) < LIM["purple_hue_excl"]: return False
    if contrast(PURPLE, A) < LIM["purple_vs_A"]: return False
    if contrast(A, WHITE) < LIM["A_vs_white"]: return False
    if contrast(B, WHITE) < LIM["B_vs_white"]: return False
    if contrast(B, PURPLE) < LIM["B_vs_purple"]: return False
    return True


# ── 후보 풀 : 색상각 3° 간격 × 명도 × 채도 (sRGB 안에 들어오는 색만) ──
def candidates():
    pool, seen = [], set()
    for hh in range(0, 360, 3):
        for L in (0.74, 0.77, 0.80, 0.83, 0.86, 0.89, 0.92, 0.95):
            mc = max_chroma(L, hh)
            for C in (0.05, 0.065, 0.08, 0.10, 0.12, 0.14, 0.16, 0.18, 0.20, 0.22, 0.25):
                if C > mc:   # 색역을 넘으면 그 명도·색상의 최대 채도로 한 번만
                    if mc < 0.05 or C > mc + 0.03: continue
                    C = mc
                A, _ = oklch_to_hex(L, C, hh)
                if A in seen: continue
                seen.add(A)
                B = derive_deep(A)
                if ok(A, B):
                    pool.append((A, B))
    return pool


# ───────────── 적용 방식 6개의 색 역할 (AI 원본 9~16페이지에서 읽은 구조) ─────────────
# P=기준 보라, A=보조색, B=보조색 진한 톤, M=연결색(③ 전용)
VARIANTS = {
    "1": dict(bg=None, base="P", hi="A", wordmark="P", accent="P"),
    "2": dict(bg="P",  base="P", hi="A", wordmark="A", accent="A"),
    "3": dict(bg="A",  base=None, hi="P", wordmark="P", accent="P"),   # 원본의 연결색 면(M)은 배경 아래에 깔려 보이지 않는다
    "4": dict(bg=None, base="P", hi="A", wordmark="B", accent="B"),
    "5": dict(bg=None, base="P", hi="A", wordmark="P", accent="B"),
    "6": dict(bg=None, base="B", hi=None, wordmark="B", accent="B"),
}
EX_KEY = {"1": "①", "2": "②", "3": "③", "4": "④", "5": "⑤", "6": "⑥"}

FAMILY = [  # (시작각, 끝각, 이름) OKLCH 색상각
    (345, 370, "핑크"), (10, 30, "코랄"), (30, 50, "주황"), (50, 70, "살구"), (70, 88, "황금"),
    (88, 104, "노랑"), (104, 118, "레몬"), (118, 135, "라임"), (135, 150, "연두"), (150, 166, "초록"),
    (166, 182, "민트"), (182, 200, "청록"), (200, 222, "하늘"), (222, 247, "파랑"), (327, 345, "자홍"),
]


def tone_name(L, C):
    if C < 0.085: return "연한"
    if C < 0.13: return "부드러운"
    if C < 0.17: return "맑은"
    return "선명한"


def family_name(h):
    hh = h if h >= 10 else h + 360
    for a, b, n in FAMILY:
        if a <= hh < b or a <= hh + 360 < b:
            return n
    return "자주"  # 보라 제외 구간 경계 안전장치


def roles(P, A, B, M):
    return {"P": P, "A": A, "B": B, "M": M}


def mapping_for(P, A, B, M):
    r = roles(P, A, B, M)
    return {k: {kk: (r[vv] if vv else None) for kk, vv in v.items()} for k, v in VARIANTS.items()}  # M은 어느 방식에서도 보이지 않아 쓰이지 않음


def finalize(ext, picks):
    main = ext["mainColors"]
    entries = []
    # ── 메인 8개 : 값은 전부 원본에서 읽은 그대로. 역할 규칙으로 다시 계산한 값과 일치하는지도 검사 ──
    frozen = []
    for i, m in enumerate(main):
        ex = m["examples"]
        A = ex["①"]["hi"]; B = ex["④"]["wordmark"]; M = ex["③"]["base"]; Pp = ex["①"]["base"]
        assert Pp == PURPLE and M == BRIDGE
        raw_map = {k: {kk: vv for kk, vv in ex[EX_KEY[k]].items() if kk != "occluded"} for k in VARIANTS}
        # 화면에 보이는 색 = 원본 색에서 '배경 아래에 깔린 층'을 뺀 것
        orig_map = {k: {kk: (None if kk in ex[EX_KEY[k]]["occluded"] else vv) for kk, vv in raw_map[k].items()} for k in VARIANTS}
        rebuilt = mapping_for(Pp, A, B, M)
        assert rebuilt == orig_map, ("역할 규칙이 원본과 다름", m["page"], rebuilt, orig_map)
        frozen.append(dict(no=i + 1, page=m["page"], name=m["name"], stripColor=m["strip"], rawMapping=raw_map,
                           occludedLayers={k: ex[EX_KEY[k]]["occluded"] for k in VARIANTS if ex[EX_KEY[k]]["occluded"]},
                           visibleMapping=orig_map))
        entries.append(dict(
            id=f"{i + 1:03d}", no=i + 1, name=m["name"], origin="main", badge="메인 컬러",
            purple=Pp, aux=A, auxDeep=B, mapping=orig_map,
            source=dict(file="N-FUD 2026_Logo_261012.ai", page=m["page"], colorMode="RGB(DeviceRGB)", valuesAreSourceExact=True,
                        note="원본 AI 문서가 RGB 모드라 CMYK·별색 정보가 없고, 웹 HEX는 원본 RGB 값과 같다"),
        ))
    # ── 확장 92개 : 색상각(→명도) 순으로 정렬, 번호 009~100 ──
    ext_sorted = sorted(picks, key=lambda ab: (round(hex_to_oklch(ab[0])[2] % 360), -hex_to_oklch(ab[0])[0], ab[0]))
    # 핑크(345~360)는 0도 근처에서 시작되도록 정렬 기준을 이동
    ext_sorted = sorted(picks, key=lambda ab: (((hex_to_oklch(ab[0])[2] + 15) % 360), -hex_to_oklch(ab[0])[0], ab[0]))
    used = {e["name"] for e in entries}
    for j, (A, B) in enumerate(ext_sorted):
        n = 9 + j
        L, C, h = hex_to_oklch(A)
        base = f"{tone_name(L, C)} {family_name(h)}"
        name, k = base, 2
        while name in used:
            name = f"{base} {k}"; k += 1
        used.add(name)
        entries.append(dict(
            id=f"{n:03d}", no=n, name=name, origin="extended", badge="확장 컬러",
            purple=PURPLE, aux=A, auxDeep=B, mapping=mapping_for(PURPLE, A, B, BRIDGE),
            source=None,
        ))
    # ── 지표 ──
    for e in entries:
        e["metrics"] = dict(
            contrastPurpleAux=round(contrast(e["purple"], e["aux"]), 2),
            contrastAuxWhite=round(contrast(e["aux"], WHITE), 2),
            contrastDeepWhite=round(contrast(e["auxDeep"], WHITE), 2),
            contrastDeepPurple=round(contrast(e["auxDeep"], e["purple"]), 2),
            oklch=[round(x, 3) for x in hex_to_oklch(e["aux"])],
        )
    assert len(entries) == 100 and len({e["id"] for e in entries}) == 100
    assert len({e["aux"] for e in entries}) == 100 and len({e["name"] for e in entries}) == 100
    out = ROOT / "src" / "data"
    out.mkdir(parents=True, exist_ok=True)
    (out / "colorways.json").write_text(json.dumps(entries, ensure_ascii=False, indent=1))
    (out / "originalMain.frozen.json").write_text(json.dumps(
        dict(_comment="원본 AI(PDF) 9~16페이지에서 읽은 메인 8개의 색 매핑. 수정하지 않는다. 검증 스크립트가 colorways.json의 앞 8개와 대조한다.",
             items=frozen), ensure_ascii=False, indent=1))
    (out / "logoAssets.json").write_text(json.dumps(ext["formats"], ensure_ascii=False))
    print("colorways", len(entries), file=sys.stderr)


def main():
    ext = json.loads((OUT / "extracted.json").read_text())
    orig = [(m["examples"]["①"]["hi"], m["examples"]["④"]["wordmark"]) for m in ext["mainColors"]]
    chosen = [a for a, _ in orig]
    pool = candidates()
    print("후보 수", len(pool), file=sys.stderr)
    # 원본과 너무 가까운 후보 제거
    pool = [(a, b) for a, b in pool if all(delta_e(a, o) >= MIN_DIST for o in chosen)]
    print("원본과 겹치지 않는 후보", len(pool), file=sys.stderr)
    # ── 선택 : 색상 구간별 할당(쏠림 방지) + 구간 안에서 '이미 있는 색과 가장 먼' 순서 ──
    # 구간 안에서는 선명/연한/중간 톤을 번갈아 고르고, 탁한 갈색·카키 계열은 후보에서 제외한다.
    # 동률은 색 코드 순으로 고정 → 결과는 항상 같다
    SECTORS = [  # (이름, 시작각, 끝각, 할당 수)  — OKLCH 색상각, 보라 계열(247~327°)은 제외 구간
        ("핑크", 345, 370, 8), ("코랄·빨강", 10, 30, 6), ("주황", 30, 50, 7), ("살구·황금", 50, 85, 6),
        ("노랑", 85, 105, 6), ("레몬·라임", 105, 130, 5), ("연두", 130, 148, 5), ("초록", 148, 166, 7),
        ("민트", 166, 185, 7), ("청록", 185, 200, 6), ("하늘", 200, 225, 8), ("파랑", 225, 247, 8),
        ("자홍", 327, 345, 7),
    ]
    def sector_of(a):
        h = hex_to_oklch(a)[2]
        for k, (_, lo, hi, _) in enumerate(SECTORS):
            if lo <= h < hi or lo <= h + 360 < hi: return k
        return None
    def muddy(a):
        """탁한 색 제거: ① 회색기 도는 중간 명도(채도<0.10이면서 명도<0.86 등) ② 갈색·카키·올리브·겨자 (따뜻한 색상대 35~125°)"""
        L, C, h = hex_to_oklch(a)
        dusty = (C < 0.10 and L < 0.86) or (C < 0.06 and L < 0.90)   # 회색기 도는 탁한 중간 명도 (파스텔은 밝아야 함)
        return dusty or (35 <= h <= 125 and L < 0.88 and C < 0.13) or (80 <= h <= 128 and L < 0.84)
    def tone_class(a):
        C = hex_to_oklch(a)[1]
        return "P" if C < 0.10 else ("M" if C < 0.15 else "V")
    CYCLE = ["V", "P", "M", "V", "P", "M", "V", "P", "M"]

    pool = [(a, b) for a, b in pool if not muddy(a) and sector_of(a) is not None]
    labs = {a: srgb_to_oklab(a) for a, _ in pool}
    labsB = {b: srgb_to_oklab(b) for _, b in pool}
    deep0 = [m["examples"]["④"]["wordmark"] for m in ext["mainColors"]]
    mind = {a: min(delta_e(a, o) for o in chosen) for a, _ in pool}
    mindB = {b: min(delta_e(b, o) for o in deep0) for _, b in pool}
    picks, taken = [], [0] * len(SECTORS)
    alive = list(pool)

    def pick(best):
        picks.append(best); chosen.append(best[0])
        taken[sector_of(best[0])] += 1
        for a, b in alive:
            mind[a] = min(mind[a], math.dist(labs[a], labs[best[0]]))
            mindB[b] = min(mindB[b], math.dist(labsB[b], labsB[best[1]]))

    def feasible(da, db):
        return [ab for ab in alive if mind[ab[0]] >= da and mindB[ab[1]] >= db and ab[0] not in chosen]

    def round_robin(quotas, da, db):
        progress = True
        while progress and len(picks) < 92:
            progress = False
            for k in range(len(SECTORS)):
                if taken[k] >= quotas[k] or len(picks) >= 92: continue
                cands = [ab for ab in feasible(da, db) if sector_of(ab[0]) == k]
                if not cands: continue
                want = CYCLE[taken[k] % len(CYCLE)]
                pref = [ab for ab in cands if tone_class(ab[0]) == want] or cands
                pick(max(pref, key=lambda ab: (round(mind[ab[0]], 6), ab[0])))
                progress = True

    quotas = [q for *_, q in SECTORS]
    # 거리 기준을 단계적으로 낮추며(0.038 → 0.034 → 0.031) 구간 할당을 채운다. 최저 기준 0.031도 눈으로 구분되는 수준.
    for da, db in ((MIN_DIST, MIN_DIST_B), (0.034, 0.024), (0.031, 0.022)):
        round_robin(quotas, da, db)
    # 그래도 모자라면 여유 있는 구간의 할당을 1씩 늘려 가며 채운다
    while len(picks) < 92:
        before = len(picks)
        quotas = [max(q, t + 1) for q, t in zip(quotas, taken)]
        round_robin(quotas, 0.031, 0.022)
        if len(picks) == before:
            raise SystemExit(f"조건을 만족하는 후보가 {len(picks)}개에서 끝남 → 기준을 낮추세요")
    print("구간별 선택 수", {SECTORS[k][0]: (taken[k], SECTORS[k][3]) for k in range(len(SECTORS))}, file=sys.stderr)
    print("선택 완료", len(picks), file=sys.stderr)
    (OUT / "picks_raw.json").write_text(json.dumps(picks))
    finalize(ext, picks)
    return picks


if __name__ == "__main__":
    main()
