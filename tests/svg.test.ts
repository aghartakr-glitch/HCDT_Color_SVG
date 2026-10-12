import { describe, expect, it } from 'vitest';
import { DOMParser } from '@xmldom/xmldom';
import JSZip from 'jszip';
import { COLORWAYS, FORMATS, FORMAT_KEYS } from '../src/data';
import { buildLogoSvg, fileName, zipName } from '../src/lib/svg';
import { buildZip, svgFileContent } from '../src/lib/download';
import type { VariantId } from '../src/types';

const VARS: VariantId[] = [1, 2, 3, 4, 5, 6];
const NAME_RE = /^HCDT_\d{3}_(main|extended)_(longest|long|short)_[a-z-]+_(transparent|transparent-for-purple-bg|transparent-for-aux-bg|background)\.svg$/;

function expectedFills(cw: (typeof COLORWAYS)[number], v: VariantId, bg: boolean) {
  const m = cw.mapping[String(v)];
  const out: string[] = [];
  if (bg && m.bg) out.push(m.bg);
  if (m.base && m.base !== m.bg) out.push(m.base);
  if (m.hi) out.push(m.hi);
  if (m.wordmark && m.accent && m.wordmark === m.accent) out.push(m.wordmark);
  else { if (m.wordmark) out.push(m.wordmark); if (m.accent) out.push(m.accent); }
  return out;
}

describe('SVG 생성: 100 × 3 × 6 = 1,800가지 (배경 포함 옵션까지)', () => {
  it('모든 조합이 생성되고 구조·색·여백·외부 참조 조건을 만족한다', () => {
    let count = 0;
    const names = new Set<string>();
    const parser = new DOMParser({ onError: (lvl, msg) => { throw new Error(`${lvl}: ${msg}`); } });
    for (const cw of COLORWAYS) for (const f of FORMAT_KEYS) for (const v of VARS) {
      const m = cw.mapping[String(v)];
      for (const bg of [false, true]) {
        if (bg && !m.bg) continue; // 배경이 없는 적용 방식은 '배경 포함' 옵션이 없다
        const content = svgFileContent(cw, f, v, bg);
        count += bg ? 0 : 1;
        // 올바른 XML
        const doc = parser.parseFromString(content, 'image/svg+xml');
        const root = doc.documentElement!;
        expect(root.nodeName).toBe('svg');
        expect(root.getAttribute('xmlns')).toBe('http://www.w3.org/2000/svg');
        const [x, y, W, H] = FORMATS[f].viewBox;
        expect(root.getAttribute('viewBox')).toBe(`${x} ${y} ${W} ${H}`.replace(/\.0+(?= )/g, ''));
        expect(Number(root.getAttribute('width')) / Number(root.getAttribute('height'))).toBeCloseTo(W / H, 3); // 비율 유지
        // 폰트·래스터·외부 참조·스타일·id 없음
        expect(content).not.toMatch(/<image|<text|<tspan|<style|<script|<use|<foreignObject|<filter|<mask|<clipPath|<linearGradient|<radialGradient|<pattern/i);
        expect(content).not.toMatch(/data:|font-family|@import|url\(|xlink|href=|\sid=/i);
        expect((content.match(/https?:\/\//g) ?? []).length).toBe(1); // xmlns 한 번뿐
        // 색
        const paths = [...content.matchAll(/<path fill="(#[0-9A-F]{6})" d="([^"]+)"/g)];
        const rect = content.match(/<rect width="([\d.]+)" height="([\d.]+)" fill="(#[0-9A-F]{6})"\/>/);
        const fills = [...(rect ? [rect[3]] : []), ...paths.map((p) => p[1])];
        expect(fills).toEqual(expectedFills(cw, v, bg));
        expect(!!rect).toBe(bg && !!m.bg);
        if (rect) { expect(Number(rect[1])).toBe(W); expect(Number(rect[2])).toBe(H); }
        // 패스: 허용 명령만, 좌표가 viewBox 안 + 최소 여백
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        for (const p of paths) {
          expect(p[2]).toMatch(/^[MLCZ0-9.\- ]+$/);
          const n = p[2].match(/-?\d+\.?\d*/g)!.map(Number);
          for (let i = 0; i < n.length; i += 2) { minX = Math.min(minX, n[i]); maxX = Math.max(maxX, n[i]); minY = Math.min(minY, n[i + 1]); maxY = Math.max(maxY, n[i + 1]); }
        }
        const pad = FORMATS[f].padding;
        expect(minX).toBeGreaterThanOrEqual(pad - 0.01); expect(minY).toBeGreaterThanOrEqual(pad - 0.01);
        expect(maxX).toBeLessThanOrEqual(W - pad + 0.01); expect(maxY).toBeLessThanOrEqual(H - pad + 0.01);
        // 파일명
        const name = fileName(cw, f, v, bg);
        expect(name).toMatch(NAME_RE);
        expect(names.has(name)).toBe(false); names.add(name);
        // 같은 입력이면 같은 출력 (미리보기와 다운로드가 같은 생성 함수)
        expect(buildLogoSvg(cw, f, v, { includeBackground: bg })).toBe(buildLogoSvg(cw, f, v, { includeBackground: bg }));
      }
    }
    expect(count).toBe(1800);
  });

  it('미리보기 SVG는 다운로드 SVG와 같은 도형·색을 쓴다 (크기 속성만 다름)', () => {
    for (const cw of COLORWAYS.slice(0, 20)) for (const f of FORMAT_KEYS) for (const v of VARS) {
      const dl = buildLogoSvg(cw, f, v);
      const pv = buildLogoSvg(cw, f, v, { preview: true });
      const body = (s: string) => s.slice(s.indexOf('<path'));
      expect(body(pv)).toBe(body(dl));
    }
  });

  it('ZIP: 정확히 3개(The Longest·Long·Short), 내용이 단독 파일과 같다 — 100 × 6', async () => {
    for (const cw of COLORWAYS) for (const v of VARS) {
      for (const bg of [false, true]) {
        if (bg && !cw.mapping[String(v)].bg) continue;
        const zip = await JSZip.loadAsync(await (await buildZip(cw, v, bg)).arrayBuffer());
        const names = Object.keys(zip.files).sort();
        expect(names).toEqual(FORMAT_KEYS.map((f) => fileName(cw, f, v, bg)).sort());
        for (const f of FORMAT_KEYS) expect(await zip.file(fileName(cw, f, v, bg))!.async('string')).toBe(svgFileContent(cw, f, v, bg));
      }
    }
    expect(zipName(COLORWAYS[0], 1)).toBe('HCDT_001_main_three-variants_duotone-purple.zip');
  }, 120000);
});
