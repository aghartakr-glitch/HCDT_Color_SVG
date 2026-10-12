export type FormatKey = 'longest' | 'long' | 'short';
export type VariantId = 1 | 2 | 3 | 4 | 5 | 6;
export type OriginKind = 'main' | 'extended';

/** 로고 형식 하나의 벡터 자산 (AI 원본 PDF에서 추출한 패스를 좌상단 기준 좌표로 옮긴 것) */
export interface LogoFormat {
  viewBox: [number, number, number, number];
  padding: number;
  symbolHeight: number;
  symbolBox: [number, number, number, number];
  /** 심볼의 큰 면 90모듈 */
  base: string[];
  /** 심볼의 보조 면 90모듈 */
  hi: string[];
  /** 영문 워드마크(아웃라인) — '–' '+' 기호 제외 */
  wordmark: string[];
  /** 워드마크의 '–' '+' 기호 막대 3개 */
  accent: string[];
  source: Record<string, unknown>;
}

/** 한 적용 방식에서 각 요소가 갖는 색. null = 그리지 않음 */
export interface ColorMapping {
  bg: string | null;
  base: string | null;
  hi: string | null;
  wordmark: string | null;
  accent: string | null;
}

export type FamilyKey = 'pink' | 'red' | 'orange' | 'yellow' | 'lime' | 'green' | 'teal' | 'sky' | 'blue';
export type CvdKind = 'protan' | 'deutan' | 'tritan';
export type RiskLevel = 'low' | 'mid' | 'high';

export interface Colorway {
  id: string;            // '001' ~ '308'
  no: number;
  name: string;
  origin: OriginKind;
  badge: '메인 컬러' | '확장 컬러';
  family: FamilyKey;     // 색 계열(9종) — 계열 버튼 필터용
  purple: string;        // 기준 보라
  aux: string;           // 보조색
  auxDeep: string;       // 보조색 진한 톤
  mapping: Record<string, ColorMapping>;
  source: null | { file: string; page: number; colorMode: string; valuesAreSourceExact: boolean; note: string };
  metrics: {
    contrastPurpleAux: number;
    contrastAuxWhite: number;
    contrastDeepWhite: number;
    contrastDeepPurple: number;
    oklch: [number, number, number];
    /** 가시성 점수 0~100 (정상 시각) */
    visibility: number;
    /** 색각 이상별 점수·정상 대비 감소폭(점)·위험 단계 */
    cvd: Record<CvdKind, { score: number; drop: number; level: RiskLevel }>;
    /** 세 유형 중 가장 큰 감소폭 (정렬·종합 단계용) */
    cvdRisk: number;
    cvdLevel: RiskLevel;
  };
}

export interface VariantDef {
  id: VariantId;
  circled: string;
  slug: string;          // 파일명에 쓰는 이름
  label: string;         // 화면 표기
  detail: string;        // 구성 설명
  labelEn: string;
  detailEn: string;
  /** 투명 SVG를 올려 쓰기 좋은 바탕 */
  useOn: 'white' | 'purple' | 'aux';
  /** 투명 배경 파일 이름에 붙는 꼬리표 */
  transparentToken: string;
}
