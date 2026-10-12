import type { Colorway, FormatKey, LogoFormat } from '../types';
import colorwaysJson from './colorways.json';
import logoAssetsJson from './logoAssets.json';

/** 컬러 시안 100개 (고정 데이터: 001~008 = 원본 메인, 009~100 = 확장). 새로고침해도 바뀌지 않는다. */
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

export const MAIN_COUNT = COLORWAYS.filter((c) => c.origin === 'main').length;
export const EXTENDED_COUNT = COLORWAYS.filter((c) => c.origin === 'extended').length;
