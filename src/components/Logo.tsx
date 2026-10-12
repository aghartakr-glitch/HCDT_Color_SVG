import { memo } from 'react';
import { buildLogoSvg, buildSymbolSvg } from '../lib/svg';
import type { Colorway, FormatKey, VariantId } from '../types';

const cache = new Map<string, string>();

function html(cw: Colorway, format: FormatKey, variant: VariantId, bg: boolean): string {
  const key = `${cw.id}|${format}|${variant}|${bg ? 1 : 0}`;
  let s = cache.get(key);
  if (!s) {
    s = buildLogoSvg(cw, format, variant, { includeBackground: bg, preview: true });
    cache.set(key, s);
  }
  return s;
}

interface Props {
  cw: Colorway;
  format: FormatKey;
  variant: VariantId;
  /** 배경 사각형을 SVG 안에 넣을지 (다운로드 파일 미리보기에서만 사용) */
  includeBackground?: boolean;
  className?: string;
}

/** 다운로드와 같은 SVG 생성 함수(buildLogoSvg)로 만든 미리보기 */
export const Logo = memo(function Logo({ cw, format, variant, includeBackground = false, className }: Props) {
  return <div className={`logo logo-${format} ${className ?? ''}`} dangerouslySetInnerHTML={{ __html: html(cw, format, variant, includeBackground) }} />;
});

export const SymbolBig = memo(function SymbolBig({ cw }: { cw: Colorway }) {
  return <div className="symbol-big" dangerouslySetInnerHTML={{ __html: buildSymbolSvg(cw) }} />;
});
