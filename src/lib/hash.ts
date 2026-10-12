import type { FormatKey, VariantId } from '../types';

export interface UrlState {
  id: string;
  format: FormatKey;
  variant: VariantId;
  bg: boolean;
  lang: 'ko' | 'en';
  fam: string;   // 'all' 또는 색 계열 키
  sort: string;  // id | spectrum | visibility | risk
}

/** 주소 뒤 #c=003&f=long&v=2&bg=1 형태로 선택 상태를 저장해 링크로 공유할 수 있다 */
export function readHash(validIds: Set<string>): Partial<UrlState> {
  const out: Partial<UrlState> = {};
  const p = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const c = p.get('c');
  if (c && validIds.has(c)) out.id = c;
  const f = p.get('f');
  if (f === 'longest' || f === 'long' || f === 'short') out.format = f;
  const v = Number(p.get('v'));
  if (v >= 1 && v <= 6) out.variant = v as VariantId;
  if (p.get('bg') === '1') out.bg = true;
  const fam = p.get('fam');
  if (fam) out.fam = fam;
  const so = p.get('s');
  if (so === 'id' || so === 'spectrum' || so === 'visibility' || so === 'risk') out.sort = so;
  const l = p.get('l');
  if (l === 'ko' || l === 'en') out.lang = l;
  return out;
}

export function writeHash(s: UrlState) {
  const p = new URLSearchParams({ c: s.id, f: s.format, v: String(s.variant), bg: s.bg ? '1' : '0' });
  if (s.lang === 'en') p.set('l', 'en');
  if (s.fam !== 'all') p.set('fam', s.fam);
  if (s.sort !== 'id') p.set('s', s.sort);
  try {
    window.history.replaceState(null, '', `#${p.toString()}`);
  } catch {
    /* 일부 환경에서는 주소 변경이 막혀 있을 수 있음 — 무시 */
  }
}
