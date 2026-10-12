import { FORMATS, FORMAT_LABEL } from '../data';
import { VARIANT_BY_ID } from './variants';
import type { Colorway, FormatKey, LogoFormat, VariantId } from '../types';

/**
 * SVG 생성 — 화면 미리보기와 다운로드가 모두 이 함수를 쓴다.
 * - 로고 글자는 원본에서 추출한 아웃라인 패스. 폰트·이미지·외부 주소·스타일시트를 쓰지 않는다.
 * - 그라데이션·clipPath가 원본에 없으므로 defs와 id 도 없다 (여러 SVG를 한 페이지에 놓아도 충돌하지 않는다).
 */
export interface SvgOptions {
  /** true 이면 배경 사각형(②보라, ③보조색)을 SVG 안에 넣는다. 기본값 false = 투명 */
  includeBackground?: boolean;
  /** true 이면 화면 미리보기용: 크기 속성 대신 CSS로 크기를 맞추고 보조기기에서는 숨김 */
  preview?: boolean;
}

const joined = new Map<string, { base: string; hi: string; wordmark: string; accent: string }>();
function merged(format: FormatKey, f: LogoFormat) {
  let m = joined.get(format);
  if (!m) {
    m = { base: f.base.join(' '), hi: f.hi.join(' '), wordmark: f.wordmark.join(' '), accent: f.accent.join(' ') };
    joined.set(format, m);
  }
  return m;
}

const num = (n: number) => String(Math.round(n * 1000) / 1000);

export interface LogoSvgInfo {
  /** 배경과 같은 색이라 보이지 않는 면을 그리지 않았는지 */
  skippedKnockout: boolean;
  hasBackgroundRect: boolean;
}

export function buildLogoSvg(cw: Colorway, format: FormatKey, variant: VariantId, opts: SvgOptions = {}): string {
  const f = FORMATS[format];
  const map = cw.mapping[String(variant)];
  const m = merged(format, f);
  const [, , W, H] = f.viewBox;
  const title = `HCDT 로고 ${FORMAT_LABEL[format]} · ${cw.id} ${cw.name}`;

  const parts: string[] = [];
  if (opts.includeBackground && map.bg) {
    parts.push(`<rect width="${num(W)}" height="${num(H)}" fill="${map.bg}"/>`);
  }
  // 배경과 같은 색인 면은 그려도 보이지 않으므로 생략 (②의 보라 면)
  if (map.base && map.base !== map.bg) parts.push(`<path fill="${map.base}" d="${m.base}"/>`);
  if (map.hi) parts.push(`<path fill="${map.hi}" d="${m.hi}"/>`);
  if (map.wordmark && map.accent && map.wordmark === map.accent) {
    parts.push(`<path fill="${map.wordmark}" d="${m.wordmark} ${m.accent}"/>`);
  } else {
    if (map.wordmark) parts.push(`<path fill="${map.wordmark}" d="${m.wordmark}"/>`);
    if (map.accent) parts.push(`<path fill="${map.accent}" d="${m.accent}"/>`);
  }

  const head = opts.preview
    ? `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(W)} ${num(H)}" aria-hidden="true" focusable="false">`
    : `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${num(W)} ${num(H)}" width="${num(W)}" height="${num(H)}" role="img" aria-label="${title}"><title>${title}</title>`;
  return `${head}${parts.join('')}</svg>`;
}

/** 확대 심볼 미리보기: 두 색 심볼만 (기준 보라 + 보조색), 흰 바탕용 */
export function buildSymbolSvg(cw: Colorway, format: FormatKey = 'long'): string {
  const f = FORMATS[format];
  const m = merged(format, f);
  const [x0, y0, x1, y1] = f.symbolBox;
  const map = cw.mapping['1'];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${num(x0)} ${num(y0)} ${num(x1 - x0)} ${num(y1 - y0)}" aria-hidden="true" focusable="false">` +
    `<path fill="${map.base}" d="${m.base}"/><path fill="${map.hi}" d="${m.hi}"/></svg>`;
}

export function previewBackground(cw: Colorway, variant: VariantId): string {
  return cw.mapping[String(variant)].bg ?? '#FFFFFF';
}

export function fileName(cw: Colorway, format: FormatKey, variant: VariantId, includeBackground: boolean): string {
  const v = VARIANT_BY_ID[variant];
  const hasBg = !!cw.mapping[String(variant)].bg;
  const token = includeBackground && hasBg ? 'background' : v.transparentToken;
  return `HCDT_${cw.id}_${cw.origin === 'main' ? 'main' : 'extended'}_${format}_${v.slug}_${token}.svg`;
}

export function zipName(cw: Colorway, variant: VariantId): string {
  return `HCDT_${cw.id}_${cw.origin === 'main' ? 'main' : 'extended'}_three-variants_${VARIANT_BY_ID[variant].slug}.zip`;
}
