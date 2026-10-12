import { createContext, useContext } from 'react';

export type Lang = 'ko' | 'en';

export interface LangApi {
  lang: Lang;
  /** t('한국어 문구', 'English text') — 현재 언어에 맞는 쪽을 돌려준다 */
  t: <T = string>(ko: T, en: T) => T;
}

export const LangContext = createContext<LangApi>({ lang: 'ko', t: (ko) => ko });
export const useLang = () => useContext(LangContext);

const MOD: Record<string, string> = { '맑은': 'Clear', '부드러운': 'Soft', '연한': 'Pale', '선명한': 'Vivid' };
const HUE: Record<string, string> = {
  '라임': 'Lime', '오렌지': 'Orange', '민트그린': 'Mint Green', '옐로': 'Yellow', '피치': 'Peach', '핑크': 'Pink',
  '라이트블루': 'Light Blue', '아쿠아': 'Aqua', '코랄': 'Coral', '주황': 'Orange', '살구': 'Apricot', '황금': 'Golden',
  '노랑': 'Yellow', '레몬': 'Lemon', '연두': 'Yellow-green', '초록': 'Green', '민트': 'Mint', '청록': 'Teal',
  '하늘': 'Sky', '파랑': 'Blue', '자홍': 'Magenta',
};

/** 컬러 이름 영문 표기: "맑은 핑크 2" → "Clear Pink 2" (한국어 이름은 데이터 그대로) */
export function colorName(name: string, lang: Lang): string {
  if (lang === 'ko') return name;
  const parts = name.split(' ');
  const out: string[] = [];
  for (const p of parts) out.push(MOD[p] ?? HUE[p] ?? p);
  return out.join(' ');
}
