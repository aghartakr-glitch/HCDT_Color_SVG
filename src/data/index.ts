import type { Colorway, FamilyKey, FormatKey, LogoFormat } from '../types';
import colorwaysJson from './colorways.json';
import logoAssetsJson from './logoAssets.json';

/** 컬러 시안 308개 (고정 데이터: 001~008 = 원본 메인, 009~308 = 확장). 새로고침해도 바뀌지 않는다. */
export const COLORWAYS = colorwaysJson as unknown as Colorway[];

/** AI 원본에서 추출한 로고 3종 벡터 */
export const FORMATS = logoAssetsJson as unknown as Record<FormatKey, LogoFormat>;

export const FORMAT_KEYS: FormatKey[] = ['longest', 'long', 'short'];

export const FORMAT_LABEL: Record<FormatKey, string> = {
  longest: 'The Longest',
  long: 'Long',
  short: 'Short',
};

export const FORMAT_DESC: Record<FormatKey, string> = {
  longest: '심볼 오른쪽에 전체 학과명 (3줄)',
  long: '심볼 오른쪽에 축약 학과명 (2줄)',
  short: '심볼 아래에 H–C / D+T',
};

export const FORMAT_DESC_EN: Record<FormatKey, string> = {
  longest: 'Full department name to the right of the symbol (3 lines)',
  long: 'Short department name to the right of the symbol (2 lines)',
  short: 'H–C / D+T below the symbol',
};

/** 색 계열 9종 (표시 순서 = 색상환 순서). sample 은 버튼 옆 점 색(대표색 느낌용) */
export const FAMILIES: { key: FamilyKey; ko: string; en: string; sample: string }[] = [
  { key: 'pink', ko: '핑크·자홍', en: 'Pink · Magenta', sample: '#F9A8D4' },
  { key: 'red', ko: '빨강·코랄', en: 'Red · Coral', sample: '#FF9A8A' },
  { key: 'orange', ko: '주황·살구', en: 'Orange · Apricot', sample: '#FFB874' },
  { key: 'yellow', ko: '노랑·황금', en: 'Yellow · Gold', sample: '#FFE45E' },
  { key: 'lime', ko: '라임·연두', en: 'Lime · Yellow-green', sample: '#C8F25C' },
  { key: 'green', ko: '초록', en: 'Green', sample: '#6FE08E' },
  { key: 'teal', ko: '민트·청록', en: 'Mint · Teal', sample: '#5FE6D2' },
  { key: 'sky', ko: '하늘', en: 'Sky', sample: '#8ED8FF' },
  { key: 'blue', ko: '파랑', en: 'Blue', sample: '#86A8FF' },
];

export const MAIN_COUNT = COLORWAYS.filter((c) => c.origin === 'main').length;
export const EXTENDED_COUNT = COLORWAYS.filter((c) => c.origin === 'extended').length;
