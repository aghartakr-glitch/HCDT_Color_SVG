import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COLORWAYS, FAMILIES, FORMATS, FORMAT_KEYS } from '../src/data';
import { simulateCvd, visibilityScore } from '../src/lib/cvd';
import { VARIANTS } from '../src/lib/variants';

const frozen = JSON.parse(readFileSync(new URL('../src/data/originalMain.frozen.json', import.meta.url), 'utf8')).items as any[];
const HEX = /^#[0-9A-F]{6}$/;
const seed92 = JSON.parse(readFileSync(new URL('../scripts/seed_ext92.json', import.meta.url), 'utf8'));

// ── 색 계산 (scripts/colorlib.py 와 같은 식) ──
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255);
const lum = (h: string) => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
function oklab(h: string) {
  const [r, g, b] = rgb(h).map(lin);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s, 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s];
}
const dE = (a: string, b: string) => Math.hypot(...oklab(a).map((v, i) => v - oklab(b)[i]));

describe('컬러 데이터 308개', () => {
  it('정확히 308개, 번호 001~308, 중복 없음', () => {
    expect(COLORWAYS).toHaveLength(308);
    expect(COLORWAYS.map((c) => c.id)).toEqual(Array.from({ length: 308 }, (_, i) => String(i + 1).padStart(3, '0')));
    expect(new Set(COLORWAYS.map((c) => c.name)).size).toBe(308);
    expect(new Set(COLORWAYS.map((c) => c.aux)).size).toBe(308);
    expect(new Set(COLORWAYS.map((c) => c.auxDeep)).size).toBe(308);
  });

  it('원본 8개 + 신규 300개, 배지 문구', () => {
    expect(COLORWAYS.filter((c) => c.origin === 'main')).toHaveLength(8);
    expect(COLORWAYS.filter((c) => c.origin === 'extended')).toHaveLength(300);
    expect(COLORWAYS.slice(0, 8).every((c) => c.origin === 'main' && c.badge === '메인 컬러')).toBe(true);
    expect(COLORWAYS.slice(8).every((c) => c.origin === 'extended' && c.badge === '확장 컬러')).toBe(true);
    expect(COLORWAYS.slice(0, 8).map((c) => c.name)).toEqual(['라임', '오렌지', '민트그린', '옐로', '피치', '핑크', '라이트블루', '아쿠아']);
  });

  it('원본 8개의 색 매핑이 원본에서 읽어 둔 값과 정확히 같다', () => {
    expect(frozen).toHaveLength(8);
    frozen.forEach((f, i) => {
      const c = COLORWAYS[i];
      expect(c.mapping).toEqual(f.visibleMapping);
      expect(c.aux).toBe(f.rawMapping['1'].hi);
      expect(c.auxDeep).toBe(f.rawMapping['4'].wordmark);
      expect(c.purple).toBe(f.rawMapping['1'].base);
      expect(c.source?.page).toBe(f.page);
    });
  });

  it('원본 8개의 보라는 모두 같고 신규 300개도 그 보라를 유지한다', () => {
    expect(new Set(COLORWAYS.map((c) => c.purple))).toEqual(new Set(['#6B00FF']));
  });

  it('모든 시안에 6개 적용 방식 매핑이 있고 색은 HEX 형식', () => {
    for (const c of COLORWAYS) {
      expect(Object.keys(c.mapping).sort()).toEqual(['1', '2', '3', '4', '5', '6']);
      for (const m of Object.values(c.mapping)) for (const v of Object.values(m)) if (v) expect(v).toMatch(HEX);
    }
  });

  it('적용 방식 규칙(①~⑥)이 308개 모두에 같은 구조로 적용됨', () => {
    for (const c of COLORWAYS) {
      const P = c.purple, A = c.aux, B = c.auxDeep;
      expect(c.mapping['1']).toEqual({ bg: null, base: P, hi: A, wordmark: P, accent: P });
      expect(c.mapping['2']).toEqual({ bg: P, base: P, hi: A, wordmark: A, accent: A });
      expect(c.mapping['3']).toEqual({ bg: A, base: null, hi: P, wordmark: P, accent: P });
      expect(c.mapping['4']).toEqual({ bg: null, base: P, hi: A, wordmark: B, accent: B });
      expect(c.mapping['5']).toEqual({ bg: null, base: P, hi: A, wordmark: P, accent: B });
      expect(c.mapping['6']).toEqual({ bg: null, base: B, hi: null, wordmark: B, accent: B });
    }
  });

  it('신규 300개: 보라와 구분, 흰 배경 가독성 기준을 만족', () => {
    for (const c of COLORWAYS.filter((x) => x.origin === 'extended')) {
      expect(contrast(c.purple, c.aux)).toBeGreaterThanOrEqual(2.75);
      expect(contrast(c.aux, '#FFFFFF')).toBeGreaterThanOrEqual(1.22);
      expect(contrast(c.auxDeep, '#FFFFFF')).toBeGreaterThanOrEqual(1.6);
      expect(contrast(c.auxDeep, c.purple)).toBeGreaterThanOrEqual(2.0);
    }
  });

  it('서로 비슷한 색이 없다 (OKLab 거리: 보조색 ≥ 0.0165, 진한 톤 ≥ 0.0115)', () => {
    let minA = 9, minB = 9;
    for (let i = 0; i < COLORWAYS.length; i++) for (let j = 0; j < i; j++) {
      minA = Math.min(minA, dE(COLORWAYS[i].aux, COLORWAYS[j].aux));
      minB = Math.min(minB, dE(COLORWAYS[i].auxDeep, COLORWAYS[j].auxDeep));
    }
    expect(minA).toBeGreaterThanOrEqual(0.0165);
    expect(minB).toBeGreaterThanOrEqual(0.0115);
  });

  it('신규 보조색은 보라 계열이 아니다 (색상각 287°±40°, 채도 0.05 이상 제외)', () => {
    for (const c of COLORWAYS.filter((x) => x.origin === 'extended')) {
      const [, a, b] = oklab(c.aux);
      const chroma = Math.hypot(a, b);
      const h = ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360;
      const d = Math.min(Math.abs(h - 287), 360 - Math.abs(h - 287));
      if (chroma >= 0.05) expect(d).toBeGreaterThanOrEqual(40);
    }
  });
});

describe('로고 벡터 자산', () => {
  it('3가지 형식 모두 심볼 90모듈 × 2면, 워드마크 아웃라인, 기호 3개', () => {
    for (const k of FORMAT_KEYS) {
      const f = FORMATS[k];
      expect(f.base).toHaveLength(90);
      expect(f.hi).toHaveLength(90);
      expect(f.accent).toHaveLength(3);
    }
    expect(FORMATS.longest.wordmark.length).toBe(44);
    expect(FORMATS.long.wordmark.length).toBe(29);
    expect(FORMATS.short.wordmark.length).toBe(4);
  });

  it('적용 방식 6개가 정의되어 있다', () => {
    expect(VARIANTS.map((v) => v.id)).toEqual([1, 2, 3, 4, 5, 6]);
  });
});


describe('가시성 점수 · 색각 이상 위험도 · 색 계열', () => {
  const KINDS = ['protan', 'deutan', 'tritan'] as const;
  it('가시성 점수와 색각 이상 점수를 다른 방식(TypeScript)으로 다시 계산해도 데이터와 같다', () => {
    for (const c of COLORWAYS) {
      expect(Math.abs(visibilityScore(c.purple, c.aux, c.auxDeep) - c.metrics.visibility)).toBeLessThanOrEqual(0.5);
      for (const k of KINDS) {
        const vs = visibilityScore(simulateCvd(c.purple, k), simulateCvd(c.aux, k), simulateCvd(c.auxDeep, k));
        expect(Math.abs(vs - c.metrics.cvd[k].score)).toBeLessThanOrEqual(1.01);
      }
    }
  });

  it('위험 단계 기준: 감소폭 6점 미만 낮음, 12점 미만 보통, 그 이상 높음 / 종합은 가장 큰 감소폭', () => {
    for (const c of COLORWAYS) {
      const lv = (d: number) => (d < 6 ? 'low' : d < 12 ? 'mid' : 'high');
      for (const k of KINDS) expect(c.metrics.cvd[k].level).toBe(lv(c.metrics.cvd[k].drop));
      expect(c.metrics.cvdRisk).toBeCloseTo(Math.max(...KINDS.map((k) => c.metrics.cvd[k].drop)), 1);
      expect(c.metrics.cvdLevel).toBe(lv(c.metrics.cvdRisk));
      expect(c.metrics.visibility).toBeGreaterThanOrEqual(0);
      expect(c.metrics.visibility).toBeLessThanOrEqual(100);
    }
  });

  it('색 계열 9종: 모든 시안이 하나의 계열에 속하고, 계열별 개수 합 = 308', () => {
    const keys = new Set(FAMILIES.map((f) => f.key));
    expect(keys.size).toBe(9);
    for (const c of COLORWAYS) expect(keys.has(c.family)).toBe(true);
    const total = FAMILIES.reduce((n, f) => n + COLORWAYS.filter((c) => c.family === f.key).length, 0);
    expect(total).toBe(308);
    for (const f of FAMILIES) expect(COLORWAYS.some((c) => c.family === f.key)).toBe(true);
  });

  it('공개했던 확장 92개는 그대로 유지된다 (색 값 기준)', () => {
    const seed = new Set((seed92 as string[][]).map(([a]) => a));
    const have = new Set(COLORWAYS.map((c) => c.aux));
    for (const a of seed) expect(have.has(a)).toBe(true);
  });
});
