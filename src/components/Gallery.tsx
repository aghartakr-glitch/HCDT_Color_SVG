import { memo } from 'react';
import { Logo } from './Logo';
import { AccessMini, useAccessText } from './Access';
import { colorName, useLang } from '../lib/i18n';
import type { Colorway, FormatKey } from '../types';

interface CardProps {
  cw: Colorway;
  format: FormatKey;
  selected: boolean;
  starred: boolean;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
}

const Card = memo(function Card({ cw, format, selected, starred, onSelect, onToggleStar }: CardProps) {
  const { lang, t } = useLang();
  const name = colorName(cw.name, lang);
  const badge = cw.origin === 'main' ? t('메인 컬러', 'Main color') : t('확장 컬러', 'Extended color');
  const { level, kindName } = useAccessText();
  const m = cw.metrics;
  const risks = (['protan', 'deutan', 'tritan'] as const).map((k) => `${kindName(k)} ${level(m.cvd[k].level)}`).join(', ');
  const label = t(`${cw.id} ${cw.name}, ${cw.badge}. 기준 보라 ${cw.purple}, 보조색 ${cw.aux}. 가시성 ${m.visibility}점, 색각 이상 위험도: ${risks}`, `${cw.id} ${name}, ${badge}. Base purple ${cw.purple}, accent ${cw.aux}. Visibility ${m.visibility}, color-vision risk: ${risks}`);
  return (
    <li className="card-item">
      <button
        type="button"
        className={`star-btn${starred ? ' is-on' : ''}`}
        aria-pressed={starred}
        aria-label={starred ? t(`${cw.id} 별표 해제`, `Remove star from ${cw.id}`) : t(`${cw.id} 별표 추가`, `Add star to ${cw.id}`)}
        title={starred ? t('별표 해제', 'Remove star') : t('별표로 모아두기', 'Star to keep')}
        onClick={() => onToggleStar(cw.id)}
      >{starred ? '★' : '☆'}</button>
      <button
        type="button"
        className={`card${selected ? ' is-selected' : ''}`}
        aria-pressed={selected}
        aria-label={label}
        data-card={cw.id}
        onClick={() => onSelect(cw.id)}
      >
        <span className="card-logo">
          <Logo cw={cw} format={format} variant={1} />
          <span className={`badge card-badge ${cw.origin === 'main' ? 'badge-main' : 'badge-ext'}`}>{badge}</span>
        </span>
        <span className="card-title">
          <span className="card-no">{cw.id}</span>
          <span className="card-name">{name}</span>
        </span>
        <span className="card-chips" aria-hidden="true">
          <span className="chip"><i style={{ background: cw.purple }} />{t('보라', 'Purple')} {cw.purple}</span>
          <span className="chip"><i style={{ background: cw.aux }} />{t('보조', 'Accent')} {cw.aux}</span>
        </span>
        <AccessMini cw={cw} />
        {selected && <span className="card-selected" aria-hidden="true">{t('선택됨', 'Selected')}</span>}
      </button>
    </li>
  );
});

interface Props {
  items: Colorway[];
  format: FormatKey;
  selectedId: string;
  stars: Set<string>;
  onSelect: (id: string) => void;
  onToggleStar: (id: string) => void;
}

export function Gallery({ items, format, selectedId, stars, onSelect, onToggleStar }: Props) {
  const { t } = useLang();
  return (
    <ul className="grid" aria-label={t('컬러 시안 목록', 'Colorway list')}>
      {items.map((cw) => (
        <Card key={cw.id} cw={cw} format={format} selected={cw.id === selectedId} starred={stars.has(cw.id)} onSelect={onSelect} onToggleStar={onToggleStar} />
      ))}
    </ul>
  );
}
