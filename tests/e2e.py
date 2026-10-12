#!/usr/bin/env python3
"""
브라우저 동작 점검(자동) — 실제 사이트(기본 http://127.0.0.1:4173)를 Chromium으로 열어 확인한다.
  필터·배지·형식 전환·상세·적용 방식·배경 포함·SVG/ZIP 다운로드 내용·HEX 복사·키보드·모바일 잘림·새로고침 고정
"""
import io, json, os, re, sys, zipfile
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = os.environ.get("SITE_URL", "http://127.0.0.1:4173/")
SHOTS = Path(os.environ.get("SHOT_DIR", "/tmp/hcdt_shots")); SHOTS.mkdir(parents=True, exist_ok=True)
CW = json.loads((ROOT / "src/data/colorways.json").read_text())
AS = json.loads((ROOT / "src/data/logoAssets.json").read_text())
SLUG = {1: "duotone-purple", 2: "reverse-on-purple", 3: "purple-on-aux", 4: "duotone-aux-text", 5: "duotone-purple-accent", 6: "mono-aux"}
TOK = {1: "transparent", 2: "transparent-for-purple-bg", 3: "transparent-for-aux-bg", 4: "transparent", 5: "transparent", 6: "transparent"}
results = []

def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  — {detail}" if detail else ""))

def fills(svg):
    return re.findall(r'<path fill="(#[0-9A-Fa-f]{6})"', svg)

def vb(svg):
    return re.search(r'viewBox="([^"]+)"', svg).group(1)

def read_download(dl):
    path = dl.path()
    return dl.suggested_filename, Path(path).read_bytes()

with sync_playwright() as pw:
    br = pw.chromium.launch()
    ctx = br.new_context(viewport={"width": 1600, "height": 1000}, accept_downloads=True, permissions=["clipboard-read", "clipboard-write"])
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
    pg.goto(URL); pg.wait_for_selector("[data-card]")
    check("첫 화면 기본 필터 = 메인 컬러 8개", pg.locator("[data-card]").count() == 8 and pg.locator(".pill.is-on", has_text="메인 컬러").count() == 1)
    pg.get_by_role("button", name=re.compile(r"^전체 308")).click()

    # 1) 개수·배지·순서
    cards = pg.locator("[data-card]")
    check("카드 308개", cards.count() == 308, str(cards.count()))
    ids = [cards.nth(i).get_attribute("data-card") for i in range(308)]
    check("번호 001~308 순서", ids == [f"{i:03d}" for i in range(1, 309)])
    badges = pg.locator(".card-badge").evaluate_all("els => els.map(e => e.textContent)")
    check("메인 컬러 배지 정확히 8개, 앞 8개", badges[:8] == ["메인 컬러"] * 8 and badges.count("메인 컬러") == 8)
    check("확장 컬러 배지 300개", badges[8:] == ["확장 컬러"] * 300)
    names1 = pg.locator(".card-name").evaluate_all("els => els.map(e => e.textContent)")
    check("메인 8개 이름·순서", names1[:8] == ["라임", "오렌지", "민트그린", "옐로", "피치", "핑크", "라이트블루", "아쿠아"], str(names1[:8]))

    # 2) 필터
    pg.get_by_role("button", name=re.compile(r"^메인 컬러 8")).click()
    check("필터: 메인 8", pg.locator("[data-card]").count() == 8)
    pg.get_by_role("button", name=re.compile(r"^확장 컬러 300")).click()
    check("필터: 확장 300", pg.locator("[data-card]").count() == 300)
    pg.get_by_role("button", name=re.compile(r"^전체 308")).click()
    check("필터: 전체 308", pg.locator("[data-card]").count() == 308)

    # 2-1) 색 계열 버튼 · 정렬 · 접근성 표시
    fam_btns = pg.locator('.toolbar-row[role=group] .pill.fam')
    check("색 계열 버튼 9개", fam_btns.count() == 9)
    tot = 0
    for i in range(9):
        tot += int(fam_btns.nth(i).locator("b").inner_text())
    check("계열별 개수 합 = 현재 목록(308)", tot == 308, str(tot))
    fam_btns.nth(5).click()   # 초록
    n_green = pg.locator("[data-card]").count()
    ok_green = pg.locator("[data-card]").evaluate_all("els => els.map(e => e.getAttribute('data-card'))")
    check("초록 계열만 표시, 버튼 개수와 일치", n_green == int(fam_btns.nth(5).locator("b").inner_text()) and all(CW[int(i)-1]["family"] == "green" for i in ok_green))
    pg.get_by_role("button", name=re.compile(r"^모든 계열")).click()
    check("모든 계열 → 308 복귀", pg.locator("[data-card]").count() == 308)
    sort_row = pg.locator('.toolbar-row[aria-label="정렬"]')
    def order(): return pg.locator("[data-card]").evaluate_all("els => els.map(e => e.getAttribute('data-card'))")
    sort_row.get_by_role("button", name=re.compile("^가시성 점수")).click()
    o = order(); vis = [CW[int(i)-1]["metrics"]["visibility"] for i in o]
    check("정렬: 가시성 점수 높은 순", vis == sorted(vis, reverse=True))
    sort_row.get_by_role("button", name=re.compile("^가시성 점수")).click()
    vis = [CW[int(i)-1]["metrics"]["visibility"] for i in order()]
    check("같은 버튼 다시 누르면 낮은 순", vis == sorted(vis))
    sort_row.get_by_role("button", name=re.compile("^시각적 위험도")).click()
    rk = [CW[int(i)-1]["metrics"]["cvdRisk"] for i in order()]
    check("정렬: 시각적 위험도 낮은 순", rk == sorted(rk))
    sort_row.get_by_role("button", name=re.compile("^색채 스펙트럼")).click()
    hue = [(CW[int(i)-1]["metrics"]["oklch"][2] + 15) % 360 for i in order()]
    check("정렬: 색채 스펙트럼(색상각 순)", all(hue[k] <= hue[k+1] + 1e-9 for k in range(len(hue)-1)))
    sort_row.get_by_role("button", name=re.compile("^번호순")).click()
    check("정렬: 번호순 복귀", order() == [f"{i:03d}" for i in range(1, 309)])
    acc = pg.locator("[data-card='050'] .card-access").text_content()
    m50 = CW[49]["metrics"]
    check("카드에 가시성 점수·색각 3종 표시", str(m50["visibility"]) in acc and "적" in acc and "녹" in acc and "청" in acc, acc)
    pg.get_by_role("button", name=re.compile(r"^메인 컬러 8")).click()
    check("메인 컬러에서는 정렬 줄 숨김", pg.locator('.toolbar-row[aria-label="정렬"]').count() == 0)
    pg.get_by_role("button", name=re.compile(r"^전체 308")).click()

    # 3) 형식 전환 → 갤러리 대표 로고
    for key in ("longest", "short", "long"):
        label = {"longest": "The Longest", "long": "Long", "short": "Short"}[key]
        pg.locator(".toolbar").get_by_role("button", name=label, exact=True).click()
        svg = pg.locator("[data-card='001'] .card-logo svg").evaluate("e => e.outerHTML")
        exp = AS[key]["viewBox"]
        check(f"갤러리 형식 전환 → {label}", vb(svg) == f"0 0 {exp[2]} {exp[3]}", vb(svg))
    # 4) 새로고침 고정
    pg.reload(); pg.wait_for_selector("[data-card]")
    pg.get_by_role("button", name=re.compile(r"^전체 308")).click()
    check("새로고침 후 이름 목록 동일", pg.locator(".card-name").evaluate_all("els => els.map(e => e.textContent)") == names1)
    # 4-1) 한/영 전환
    pg.get_by_role("button", name="EN", exact=True).click()
    check("EN: 제목 영문", pg.locator("h1").inner_text() == "HCDT Logo Color Explorer")
    check("EN: 메인 8 이름 영문", pg.locator(".card-name").evaluate_all("els => els.slice(0,8).map(e => e.textContent)") == ["Lime", "Orange", "Mint Green", "Yellow", "Peach", "Pink", "Light Blue", "Aqua"])
    check("EN: 배지 영문", pg.locator(".card-badge").first.text_content() == "Main color" and pg.locator(".card-badge").last.text_content() == "Extended color")
    check("EN: 한글 잔존 없음(본문)", not re.search(r"[가-힣]", pg.locator(".app").inner_text().replace("한국어", "")), re.findall(r"[가-힣]+", pg.locator(".app").inner_text().replace("한국어", ""))[:5])
    pg.reload(); pg.wait_for_selector("[data-card]")
    check("EN: 새로고침 후 유지", pg.locator("h1").inner_text() == "HCDT Logo Color Explorer")
    pg.get_by_role("button", name="한국어", exact=True).click()
    check("KO: 복귀", pg.locator("h1").inner_text() == "HCDT 로고 컬러 탐색")
    pg.get_by_role("button", name=re.compile(r"^전체 308")).click()

    # 5) 308개 전부: 상세 이름/번호, 보드 6개 적용 방식의 색 확인
    bad = []
    for cw in CW:
        pg.locator(f"[data-card='{cw['id']}']").click()
        head = pg.locator(".panel .detail-name").inner_text()
        no = pg.locator(".panel .detail-no").inner_text()
        if head != cw["name"] or no != f"No. {cw['id']}": bad.append((cw["id"], "head"))
        tiles = pg.locator(".panel .tile .tile-stage svg")
        for v in range(1, 7):
            f = fills(tiles.nth(v - 1).evaluate("e => e.outerHTML"))
            m = cw["mapping"][str(v)]
            exp = [c for c in (m["base"] if m["base"] != m["bg"] else None, m["hi"]) if c]
            # 워드마크/기호 색
            if m["wordmark"] == m["accent"]: exp.append(m["wordmark"])
            else: exp += [m["wordmark"], m["accent"]]
            if [x.upper() for x in f] != [x.upper() for x in exp]: bad.append((cw["id"], v, f, exp))
        syms = fills(pg.locator(".panel .symbol-big svg").evaluate("e => e.outerHTML"))
        if [s.upper() for s in syms] != [cw["mapping"]["1"]["base"].upper(), cw["mapping"]["1"]["hi"].upper()]: bad.append((cw["id"], "sym"))
    check("308개 시안: 상세 제목 + 6개 적용 방식 색 + 확대 심볼 색", not bad, str(bad[:3]))

    # 6) 상세 조작 + 다운로드 (003 민트그린, Short, ③, 배경 포함)
    pg.locator("[data-card='003']").click()
    pg.locator(".panel .seg").get_by_role("button", name=re.compile("Short")).click()
    pg.locator(".panel .tile").nth(2).click()
    check("③ 선택 상태 표시(테두리+텍스트)", "선택됨" in pg.locator(".panel .tile.is-on .tile-label").inner_text() and pg.locator(".panel .tile.is-on").count() == 1)
    cb = pg.locator(".panel input[type=checkbox]")
    check("③은 배경 포함 체크 가능", cb.is_enabled())
    with pg.expect_download() as d1:
        pg.get_by_role("button", name=re.compile(r"^SVG 다운로드")).click()
    fn, data = read_download(d1.value); svg = data.decode()
    check("투명 SVG 파일명", fn == "HCDT_003_main_short_purple-on-aux_transparent-for-aux-bg.svg", fn)
    check("투명 SVG: 배경 사각형 없음", "<rect" not in svg)
    m3 = CW[2]["mapping"]["3"]
    check("투명 SVG 색 = 원본 ③ 매핑(전경은 보라 두 요소: 심볼 면, 워드마크)", [c.upper() for c in fills(svg)] == [m3["hi"].upper(), m3["wordmark"].upper()], str(fills(svg)))
    check("투명 SVG: viewBox = Short", vb(svg) == f"0 0 {AS['short']['viewBox'][2]} {AS['short']['viewBox'][3]}", vb(svg))
    cb.check()
    with pg.expect_download() as d2:
        pg.get_by_role("button", name=re.compile(r"^SVG 다운로드")).click()
    fn2, data2 = read_download(d2.value); svg2 = data2.decode()
    check("배경 포함 SVG 파일명", fn2 == "HCDT_003_main_short_purple-on-aux_background.svg", fn2)
    check("배경 포함 SVG: 첫 요소가 보조색 배경 사각형", re.search(r'<rect width="[\d.]+" height="[\d.]+" fill="#6FEF9A"/>', svg2) is not None)
    check("배경 포함 SVG: 전경 색은 동일", fills(svg2) == fills(svg))
    # ZIP
    with pg.expect_download() as d3:
        pg.get_by_role("button", name=re.compile(r"3가지 형식 다운로드")).click()
    fn3, zdata = read_download(d3.value)
    z = zipfile.ZipFile(io.BytesIO(zdata)); names = sorted(z.namelist())
    exp_names = sorted(f"HCDT_003_main_{f}_purple-on-aux_background.svg" for f in ("longest", "long", "short"))
    check("ZIP 파일명", fn3 == "HCDT_003_main_three-variants_purple-on-aux.zip", fn3)
    check("ZIP 안에 정확히 3개 SVG(형식별)", names == exp_names, str(names))
    okz = all(vb(z.read(n).decode()) == f"0 0 {AS[n.split('_')[3]]['viewBox'][2]} {AS[n.split('_')[3]]['viewBox'][3]}" for n in names)
    check("ZIP 각 SVG의 형식(viewBox) 일치", okz)
    check("ZIP: Short은 단독 다운로드 파일과 동일", z.read("HCDT_003_main_short_purple-on-aux_background.svg") == data2)
    cb.uncheck()

    # 7) 적용 방식 × 형식 조합 중 일부를 실제 다운로드해 색·형식 대조 (확장 컬러 포함)
    import itertools
    combos = [("001", "long", 1, False), ("002", "longest", 2, True), ("009", "short", 4, False), ("050", "long", 5, False), ("077", "longest", 6, False), ("100", "short", 3, True)]
    allok = True
    for cid, f, v, bg in combos:
        cw = CW[int(cid) - 1]
        pg.locator(f"[data-card='{cid}']").click()
        pg.locator(".panel .seg").get_by_role("button", name=re.compile({"longest": "The Longest", "long": "^✓?\\s?Long", "short": "Short"}[f])).first.click()
        pg.locator(".panel .tile").nth(v - 1).click()
        c = pg.locator(".panel input[type=checkbox]")
        if c.is_enabled(): (c.check() if bg else c.uncheck())
        with pg.expect_download() as dd:
            pg.get_by_role("button", name=re.compile(r"^SVG 다운로드")).click()
        fn, data = read_download(dd.value); s = data.decode()
        m = cw["mapping"][str(v)]
        hasbg = bool(m["bg"]) and bg
        exp_fn = f"HCDT_{cid}_{'main' if cw['origin']=='main' else 'extended'}_{f}_{SLUG[v]}_{'background' if hasbg else TOK[v]}.svg"
        exp_fills = [x for x in ([m["bg"]] if hasbg else []) + [m["base"] if m["base"] != m["bg"] else None, m["hi"]] if x]
        if m["wordmark"] == m["accent"]: exp_fills.append(m["wordmark"])
        else: exp_fills += [m["wordmark"], m["accent"]]
        got = re.findall(r'fill="(#[0-9A-Fa-f]{6})"', s)
        ok = fn == exp_fn and [g.upper() for g in got] == [e.upper() for e in exp_fills] and vb(s) == f"0 0 {AS[f]['viewBox'][2]} {AS[f]['viewBox'][3]}"
        allok &= ok
        if not ok: print("   mismatch", cid, f, v, bg, fn, exp_fn, got, exp_fills)
    check("확장 포함 6개 조합 다운로드 = 선택한 컬러·형식·적용 방식·배경", allok)

    # 8) HEX 복사
    pg.locator("[data-card='012']").click()
    pg.get_by_role("button", name=re.compile("^보조색 HEX .* 복사")).click()
    clip = pg.evaluate("navigator.clipboard.readText()")
    check("HEX 복사 → 클립보드", clip == CW[11]["aux"], f"{clip} vs {CW[11]['aux']}")
    check("복사 알림 표시", "복사됨" in pg.locator(".toast").inner_text())

    # 9) 키보드: 카드 포커스 + Enter → 선택, Tab 이동 후 Enter 로 다운로드
    pg.locator("[data-card='020']").focus(); pg.keyboard.press("Enter")
    check("키보드로 카드 선택", pg.locator(".panel .detail-no").inner_text() == "No. 020")
    pg.get_by_role("button", name=re.compile(r"^SVG 다운로드")).focus()
    with pg.expect_download() as dk:
        pg.keyboard.press("Enter")
    check("키보드로 SVG 다운로드", dk.value.suggested_filename.startswith("HCDT_020_extended_"), dk.value.suggested_filename)
    pg.screenshot(path=str(SHOTS / "desktop_top.png"))
    pg.locator(".panel").evaluate("e => e.scrollTo(0, e.scrollHeight)")
    pg.screenshot(path=str(SHOTS / "desktop_panel_bottom.png"))
    ctx.close()

    # 10) 모바일: 전체 화면 상세, 가로 스크롤/잘림 없음, 3형식
    for w, h in ((390, 844), (360, 740), (768, 1024)):
        mc = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=2, accept_downloads=True)
        m = mc.new_page(); m.goto(URL); m.wait_for_selector("[data-card]"); m.get_by_role("button", name=re.compile(r"^전체 308")).click()
        ov = m.evaluate("document.documentElement.scrollWidth <= window.innerWidth")
        check(f"모바일 {w}px: 갤러리 가로 넘침 없음", ov)
        m.locator("[data-card='008']").click()
        check(f"모바일 {w}px: 전체 화면 상세 열림", m.locator(".overlay[role=dialog]").count() == 1)
        for f in ("The Longest", "Long", "Short"):
            m.locator(".overlay .seg").get_by_role("button", name=re.compile(f)).first.click()
            bad = m.evaluate("""() => {
              const out=[]; const body=document.querySelector('.overlay-body');
              if (body.scrollWidth > body.clientWidth + 1) out.push('body-overflow');
              for (const s of document.querySelectorAll('.overlay svg')) {
                const r=s.getBoundingClientRect(), p=s.parentElement.getBoundingClientRect();
                const host=s.closest('.tile-stage, .cmp-stage, .file-frame, .board-symbol, .symbol-big');
                if (host) { const h=host.getBoundingClientRect(); if (r.left < h.left-0.5 || r.right > h.right+0.5 || r.top < h.top-0.5 || r.bottom > h.bottom+0.5) out.push('clip:'+host.className); }
              }
              for (const b of document.querySelectorAll('.overlay button, .overlay .btn')) { const r=b.getBoundingClientRect(); if (r.right > window.innerWidth+0.5 || r.left < -0.5) out.push('btn-out:'+b.textContent.slice(0,12)); }
              return out; }""")
            check(f"모바일 {w}px · {f}: 로고·버튼 잘림 없음", not bad, str(bad[:3]))
        if w == 390:
            m.locator(".overlay-body").evaluate("e => e.scrollTo(0,0)")
            m.screenshot(path=str(SHOTS / "mobile_detail_top.png"))
            m.locator(".overlay-body").evaluate("e => e.scrollTo(0, 900)")
            m.screenshot(path=str(SHOTS / "mobile_detail_mid.png"))
            m.locator(".overlay-body").evaluate("e => e.scrollTo(0, 99999)")
            m.screenshot(path=str(SHOTS / "mobile_detail_bottom.png"))
        m.keyboard.press("Escape")
        check(f"모바일 {w}px: Esc로 닫힘", m.locator(".overlay").count() == 0)
        m.screenshot(path=str(SHOTS / f"mobile_gallery_{w}.png"))
        mc.close()
    br.close()

check("콘솔 오류 없음", not errs, str(errs[:3]))
failed = [r for r in results if not r[1]]
print(f"\n{len(results) - len(failed)}/{len(results)} 통과")
sys.exit(1 if failed else 0)
