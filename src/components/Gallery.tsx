import { memo } from 'react';
import { Logo } from './Logo';
import { colorName, useLang } from '../lib/i18n';
import type { Colorway, FormatKey } from '../types';

interface CardProps {
  cw: Colorway;
  format: FormatKey;
  selected: boolean;
  onSelect: (id: string) => void;
}

const Card = memo(function Card({ cw, format, selected, onSelect }: CardProps) {
  const { lang, t } = useLang();
  const name = colorName(cw.name, lang);
  const badge = cw.origin === 'main' ? t('메인 컬러', 'Main color') : t('확장 컬러', 'Extended color');
  const label = t(`${cw.id} ${cw.name}, ${cw.badge}. 기준 보라 ${cw.purple}, 보조색 ${cw.aux}`, `${cw.id} ${name}, ${badge}. Base purple ${cw.purple}, accent ${cw.aux}`);
  return (
    <li className="card-item">
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
        {selected && <span className="card-selected" aria-hidden="true">{t('선택됨', 'Selected')}</span>}
      </button>
    </li>
  );
});

interface Props {
  items: Colorway[];
  format: FormatKey;
  selectedId: string;
  onSelect: (id: string) => void;
}

export function Gallery({ items, format, selectedId, onSelect }: Props) {
  const { t } = useLang();
  return (
    <ul className="grid" aria-label={t('컬러 시안 목록', 'Colorway list')}>
      {items.map((cw) => (
        <Card key={cw.id} cw={cw} format={format} selected={cw.id === selectedId} onSelect={onSelect} />
      ))}
    </ul>
  );
}
