import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { COLORWAYS, EXTENDED_COUNT, FAMILIES, FORMAT_KEYS, FORMAT_LABEL, MAIN_COUNT } from './data';
import { LangContext, colorName, type Lang } from './lib/i18n';
import { Gallery } from './components/Gallery';
import { Detail } from './components/Detail';
import { useMediaQuery } from './lib/hooks';
import { readHash, writeHash } from './lib/hash';
import type { FormatKey, VariantId } from './types';

type Filter = 'all' | 'main' | 'extended';
type SortKey = 'id' | 'spectrum' | 'visibility' | 'risk';
const SORT_KEYS: SortKey[] = ['id', 'spectrum', 'visibility', 'risk'];
const FAM_KEYS = new Set<string>(FAMILIES.map((f) => f.key));
const IDS = new Set(COLORWAYS.map((c) => c.id));

export default function App() {
  const initial = useMemo(() => readHash(IDS), []);
  const [filter, setFilter] = useState<Filter>('main');
  const [format, setFormat] = useState<FormatKey>(initial.format ?? 'long');
  const [variant, setVariant] = useState<VariantId>(initial.variant ?? 1);
  const [includeBg, setIncludeBg] = useState<boolean>(initial.bg ?? false);
  const [family, setFamily] = useState<string>(initial.fam && FAM_KEYS.has(initial.fam) ? initial.fam : 'all');
  const [sort, setSort] = useState<SortKey>((initial.sort as SortKey) ?? 'id');
  const [sortRev, setSortRev] = useState(false);
  const [selectedId, setSelectedId] = useState<string>(initial.id ?? '001');
  const [lang, setLang] = useState<Lang>(() => {
    if (initial.lang) return initial.lang;
    try { const s = window.localStorage.getItem('hcdt-lang'); if (s === 'en' || s === 'ko') return s; } catch { /* 저장소 사용 불가 */ }
    return 'ko';
  });
  const t = useCallback(<T,>(ko: T, en: T): T => (lang === 'en' ? en : ko), [lang]);
  const langApi = useMemo(() => ({ lang, t }), [lang, t]);
  const [overlay, setOverlay] = useState(false);
  const [toast, setToast] = useState('');
  const desktop = useMediaQuery('(min-width: 1100px)');
  const closeRef = useRef<HTMLButtonElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const canSort = filter !== 'main';          // 정렬은 확장·전체에서만 (메인 8개는 원본 순서 고정)
  const byOrigin = useMemo(() => COLORWAYS.filter((c) => filter === 'all' || c.origin === filter), [filter]);
  const famCounts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const c of byOrigin) m[c.family] = (m[c.family] ?? 0) + 1;
    return m;
  }, [byOrigin]);
  const items = useMemo(() => {
    const list = byOrigin.filter((c) => family === 'all' || c.family === family);
    const eff: SortKey = canSort ? sort : 'id';
    // 번호순이 기본. 색채 스펙트럼 = 색상각(핑크→빨강→주황→노랑→초록→청록→하늘→파랑), 같은 색상각이면 밝은 순
    const hueKey = (c: (typeof list)[number]) => (c.metrics.oklch[2] + 15) % 360;
    const cmp: Record<SortKey, (a: (typeof list)[number], b: (typeof list)[number]) => number> = {
      id: (a, b) => a.no - b.no,
      spectrum: (a, b) => hueKey(a) - hueKey(b) || b.metrics.oklch[0] - a.metrics.oklch[0] || a.no - b.no,
      visibility: (a, b) => b.metrics.visibility - a.metrics.visibility || a.metrics.cvdRisk - b.metrics.cvdRisk || a.no - b.no,
      risk: (a, b) => a.metrics.cvdRisk - b.metrics.cvdRisk || b.metrics.visibility - a.metrics.visibility || a.no - b.no,
    };
    const out = [...list].sort(cmp[eff]);
    return sortRev && eff !== 'id' ? out.reverse() : out;
  }, [byOrigin, family, sort, sortRev, canSort]);
  const cw = COLORWAYS.find((c) => c.id === selectedId) ?? COLORWAYS[0];

  useEffect(() => {
    writeHash({ id: selectedId, format, variant, bg: includeBg, lang, fam: family, sort });
  }, [selectedId, format, variant, includeBg, lang, family, sort]);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.title = lang === 'en' ? 'HCDT Logo Color Explorer' : 'HCDT 로고 컬러 탐색';
    try { window.localStorage.setItem('hcdt-lang', lang); } catch { /* 무시 */ }
  }, [lang]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(''), 3200);
  }, []);

  const onSelect = useCallback((id: string) => {
    setSelectedId(id);
    setOverlay(true); // 모바일·태블릿에서는 전체 화면 상세, 데스크톱에서는 무시됨
  }, []);

  const closeOverlay = useCallback(() => {
    setOverlay(false);
    requestAnimationFrame(() => document.querySelector<HTMLElement>(`[data-card="${selectedId}"]`)?.focus());
  }, [selectedId]);

  const showOverlay = overlay && !desktop;
  useEffect(() => {
    if (!showOverlay) return;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeOverlay(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = ''; window.removeEventListener('keydown', onKey); };
  }, [showOverlay, closeOverlay]);

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: 'main', label: t('메인 컬러', 'Main color'), count: MAIN_COUNT },
    { key: 'extended', label: t('확장 컬러', 'Extended color'), count: EXTENDED_COUNT },
    { key: 'all', label: t('전체', 'All'), count: COLORWAYS.length },
  ];

  const detail = (
    <Detail cw={cw} format={format} setFormat={setFormat} variant={variant} setVariant={setVariant} includeBg={includeBg} setIncludeBg={setIncludeBg} notify={notify} />
  );

  return (
    <LangContext.Provider value={langApi}>
    <div className="app">
      <header className="hero">
        <div className="lang-switch" role="group" aria-label="Language / 언어">
          <button type="button" className={`lang-btn${lang === 'ko' ? ' is-on' : ''}`} aria-pressed={lang === 'ko'} onClick={() => setLang('ko')}>한국어</button>
          <button type="button" className={`lang-btn${lang === 'en' ? ' is-on' : ''}`} aria-pressed={lang === 'en'} onClick={() => setLang('en')}>EN</button>
        </div>
        <p className="eyebrow">Human–Centered Design+Technology</p>
        <h1>{t('HCDT 로고 컬러 탐색', 'HCDT Logo Color Explorer')}</h1>
        <p className="lead">
          {t(
            `인간중심디자인공학과 영문 로고의 컬러 시안 ${COLORWAYS.length}종을 비교하고, 원하는 형식과 적용 방식을 골라 SVG로 내려받는 곳입니다. 메인 컬러 ${MAIN_COUNT}개는 원본 시안 그대로, 확장 컬러 ${EXTENDED_COUNT}개는 같은 구조에 보조색을 넓힌 것입니다.`,
            `Compare ${COLORWAYS.length} colorways of the English logo of the Department of Human-Centered Design + Technology, pick a format and a color application, and download it as SVG. The ${MAIN_COUNT} main colors are the original designs as-is; the ${EXTENDED_COUNT} extended colors widen the accent color within the same structure.`,
          )}
        </p>
        <div className="toolbar">
          <div className="filters" role="group" aria-label={t('컬러 시안 필터', 'Colorway filter')}>
            {filters.map((f) => (
              <button key={f.key} type="button" className={`pill${filter === f.key ? ' is-on' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>
                {f.label} <b>{f.count}</b>
              </button>
            ))}
          </div>
          <div className="filters" role="group" aria-label={t('갤러리 로고 형식', 'Gallery logo format')}>
            <span className="toolbar-label">{t('로고 형식', 'Logo format')}</span>
            {FORMAT_KEYS.map((k) => (
              <button key={k} type="button" className={`pill${format === k ? ' is-on' : ''}`} aria-pressed={format === k} onClick={() => setFormat(k)}>
                {FORMAT_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar-row" role="group" aria-label={t('색 계열 필터', 'Color family filter')}>
          <span className="toolbar-label">{t('색 계열', 'Color family')}</span>
          <button type="button" className={`pill${family === 'all' ? ' is-on' : ''}`} aria-pressed={family === 'all'} onClick={() => setFamily('all')}>
            {t('모든 계열', 'All families')} <b>{byOrigin.length}</b>
          </button>
          {FAMILIES.map((f) => (
            <button key={f.key} type="button" className={`pill fam${family === f.key ? ' is-on' : ''}`} aria-pressed={family === f.key} onClick={() => setFamily(f.key)}>
              <i style={{ background: f.sample }} aria-hidden="true" />
              {t(f.ko, f.en)} <b>{famCounts[f.key] ?? 0}</b>
            </button>
          ))}
        </div>
        {canSort && (
          <div className="toolbar-row" role="group" aria-label={t('정렬', 'Sort')}>
            <span className="toolbar-label">{t('정렬', 'Sort by')}</span>
            {SORT_KEYS.map((k) => {
              const on = sort === k;
              const label = k === 'id' ? t('번호순', 'Number') : k === 'spectrum' ? t('색채 스펙트럼', 'Color spectrum') : k === 'visibility' ? t('가시성 점수', 'Visibility score') : t('시각적 위험도', 'Visual risk');
              const hint = k === 'spectrum' ? t('핑크→파랑', 'pink→blue') : k === 'visibility' ? t('높은 순', 'high first') : k === 'risk' ? t('낮은 순', 'low first') : '';
              const arrow = on && k !== 'id' ? (sortRev ? ' ↑' : ' ↓') : '';
              return (
                <button
                  key={k}
                  type="button"
                  className={`pill sort${on ? ' is-on' : ''}`}
                  aria-pressed={on}
                  onClick={() => { if (on && k !== 'id') setSortRev((r) => !r); else { setSort(k); setSortRev(false); } }}
                >
                  {label}{hint && <small> {hint}</small>}{arrow}
                </button>
              );
            })}
          </div>
        )}
      </header>

      <main className="layout">
        <section className="gallery" aria-label={t('컬러 갤러리', 'Color gallery')}>
          <p className="count" aria-live="polite">{t(`${items.length}개 시안 · 카드를 선택하면 상세가 열립니다`, `${items.length} colorways · select a card to open its details`)}</p>
          <Gallery items={items} format={format} selectedId={selectedId} onSelect={onSelect} />
          <details className="criteria">
            <summary>{t('시안 구성 기준 보기', 'How the colorways were chosen')}</summary>
            <ul>
              {lang === 'en' ? (<>
                <li><b>Main colors 001–008</b>: colors and layouts taken as-is from pages 9–16 of the original AI file (Lime, Orange, Mint Green, Yellow, Peach, Pink, Light Blue, Aqua, in that order).</li>
                <li><b>Extended colors 009–{MAIN_COUNT + EXTENDED_COUNT}</b>: the base purple (#6B00FF) is kept and only the accent color changes. Hues are split into sectors and spread evenly. The first 92 are the earlier set; the rest were added later, so the closest pair of accent colors differs by only 0.017 in OKLab — close to the just-noticeable difference.</li>
                <li>Extended colors were accepted only if the contrast between purple and the accent is at least 2.75:1 and between the deep tone and white at least 1.6:1. Grayish muddy colors, brown/olive tones and colors close to purple were excluded. (Lowest values among the 8 originals: 2.95, 1.41)</li>
                <li>In applications ②③, symbol faces that share the background color are invisible, so they are omitted from the SVG. The original is in the same state.</li>
              </>) : (<>
                <li><b>메인 컬러 001~008</b>: 원본 AI 9~16페이지의 색과 구성을 그대로 사용했습니다 (라임, 오렌지, 민트그린, 옐로, 피치, 핑크, 라이트블루, 아쿠아 순).</li>
                <li><b>확장 컬러 009~{MAIN_COUNT + EXTENDED_COUNT}</b>: 기준 보라(#6B00FF)를 그대로 두고 보조색만 바꿨습니다. 색상각으로 구간을 나눠 고르게 배분했습니다. 앞서 공개한 92개에 나머지를 더한 것이라, 가장 가까운 두 보조색의 차이는 OKLab 거리 0.017로 눈에 겨우 구분되는 수준입니다.</li>
                <li>확장 컬러는 보라와 보조색의 명암비 2.75:1 이상, 진한 톤과 흰색의 명암비 1.6:1 이상인 색만 채택했습니다. 회색기 도는 탁한 색과 갈색·올리브 계열, 보라와 비슷한 색은 제외했습니다. (원본 8개의 최저값: 2.95, 1.41)</li>
                <li>적용 방식 ②③에서 배경과 같은 색인 심볼 면은 눈에 보이지 않아 SVG에서 생략합니다. 원본에서도 같은 상태입니다.</li>
              </>)}
            </ul>
          </details>
        </section>

        {desktop ? (
          <aside className="panel" aria-label={t('선택한 컬러 상세', 'Selected color details')}>{detail}</aside>
        ) : (
          showOverlay && (
            <div className="overlay" role="dialog" aria-modal="true" aria-label={t(`${cw.id} ${cw.name} 상세`, `${cw.id} ${colorName(cw.name, lang)} details`)}>
              <div className="overlay-bar">
                <button ref={closeRef} type="button" className="btn btn-sm" onClick={closeOverlay}>{t('← 갤러리로 돌아가기', '← Back to gallery')}</button>
                <span className="overlay-title">{cw.id} {colorName(cw.name, lang)}</span>
              </div>
              <div className="overlay-body">{detail}</div>
            </div>
          )
        )}
      </main>

      <div className="toast" role="status" aria-live="polite">{toast}</div>
    </div>
    </LangContext.Provider>
  );
}
