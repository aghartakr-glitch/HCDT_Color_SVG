import type { CvdKind } from '../types';

/** 색각 이상 시뮬레이션: Machado, Oliveira, Fernandes (2009) 완전 이상(severity 1.0), 선형 RGB에 적용. 데이터 생성 스크립트(Python)와 같은 값 */
const M: Record<CvdKind, number[][]> = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.01182, 0.04294, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.3039]],
};

const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const delin = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function hexToRgb(h: string): [number, number, number] {
  const v = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export function simulateCvd(hex: string, kind: CvdKind): string {
  const rgb = hexToRgb(hex).map(lin);
  const out = M[kind].map((row) => Math.max(0, Math.min(1, row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])));
  return '#' + out.map((c) => Math.round(Math.max(0, Math.min(1, delin(c))) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function contrastRatio(a: string, b: string): number {
  const L = (h: string) => {
    const [r, g, bl] = hexToRgb(h).map(lin);
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [L(a), L(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const PTS: [number, number][] = [[1, 0], [3, 60], [4.5, 85], [7, 100]];
/** 명암비 → 점수: 1:1=0, 3:1=60, 4.5:1=85, 7:1 이상=100 (사이는 직선) */
export function ratioScore(r: number): number {
  if (r >= 7) return 100;
  for (let i = 0; i < PTS.length - 1; i++) {
    const [x0, y0] = PTS[i], [x1, y1] = PTS[i + 1];
    if (r <= x1) return y0 + ((y1 - y0) * (r - x0)) / (x1 - x0);
  }
  return 0;
}

/** 가시성 점수: 적용 방식 ①~⑥ 각각에서 맞닿는 색 쌍 중 가장 약한 쌍의 점수 6개를 평균 */
export function visibilityScore(purple: string, aux: string, deep: string): number {
  const pa = ratioScore(contrastRatio(purple, aux));
  const dw = ratioScore(contrastRatio(deep, '#FFFFFF'));
  const dp = ratioScore(contrastRatio(deep, purple));
  return (pa + pa + pa + Math.min(pa, dw) + Math.min(pa, dp, dw) + dw) / 6;
}
