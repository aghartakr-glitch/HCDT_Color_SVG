import type { VariantDef, VariantId } from '../types';

/**
 * 컬러 적용 방식 6개. AI 원본 9~16페이지의 배치(왼쪽 위부터 ①②③, 오른쪽 위부터 ④⑤⑥)를 그대로 따른다.
 * 실제 색 배정은 colorways.json 의 mapping 에 저장되어 있고, 여기에는 이름과 설명만 둔다.
 */
export const VARIANTS: VariantDef[] = [
  { id: 1, circled: '①', slug: 'duotone-purple', label: '흰 배경 · 두 색 심볼 · 보라 워드마크',
    detail: '심볼은 보라+보조색 두 면, 워드마크는 기준 보라', useOn: 'white', transparentToken: 'transparent' },
  { id: 2, circled: '②', slug: 'reverse-on-purple', label: '보라 배경 · 보조색 심볼 · 보조색 워드마크',
    detail: '보라 바탕에서 보조색 면과 워드마크만 보임 (보라 면은 배경과 같은 색)', useOn: 'purple', transparentToken: 'transparent-for-purple-bg' },
  { id: 3, circled: '③', slug: 'purple-on-aux', label: '보조색 배경 · 보라 심볼 · 보라 워드마크',
    detail: '보조색 바탕에서 보라 면과 워드마크만 보임 (보조색 면은 배경과 같은 색)', useOn: 'aux', transparentToken: 'transparent-for-aux-bg' },
  { id: 4, circled: '④', slug: 'duotone-aux-text', label: '흰 배경 · 두 색 심볼 · 보조색 워드마크',
    detail: '심볼은 보라+보조색, 워드마크는 보조색 진한 톤', useOn: 'white', transparentToken: 'transparent' },
  { id: 5, circled: '⑤', slug: 'duotone-purple-accent', label: '흰 배경 · 두 색 심볼 · 보라 워드마크 · 보조색 기호',
    detail: '워드마크는 보라, 가운데 ‘–’ ‘+’ 기호만 보조색 진한 톤', useOn: 'white', transparentToken: 'transparent' },
  { id: 6, circled: '⑥', slug: 'mono-aux', label: '흰 배경 · 보조색 단색 심볼·워드마크',
    detail: '심볼과 워드마크 모두 보조색 진한 톤 한 가지', useOn: 'white', transparentToken: 'transparent' },
];

export const VARIANT_BY_ID: Record<VariantId, VariantDef> = Object.fromEntries(
  VARIANTS.map((v) => [v.id, v]),
) as Record<VariantId, VariantDef>;
