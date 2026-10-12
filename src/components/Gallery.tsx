import { memo } from 'react';
import { Logo } from './Logo';
import type { Colorway, FormatKey } from '../types';

interface CardProps {
  cw: Colorway;
  format: FormatKey;
  selected: boolean;
  onSelect: (id: string) => void;
}

const Card = memo(function Card({ cw, format, selected, onSelect }: CardProps) {
  const label = `${cw.id} ${cw.name}, ${cw.badge}. 기준 보라 ${cw.purple}, 보조색 ${cw.aux}`;
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
          <span className={`badge card-badge ${cw.origin === 'main' ? 'badge-main' : 'badge-ext'}`}>{cw.badge}</span>
        </span>
        <span className="card-title">
          <span className="card-no">{cw.id}</span>
          <span className="card-name">{cw.name}</span>
        </span>
        <span className="card-chips" aria-hidden="true">
          <span className="chip"><i style={{ background: cw.purple }} />보라 {cw.purple}</span>
          <span className="chip"><i style={{ background: cw.aux }} />보조 {cw.aux}</span>
        </span>
        {selected && <span className="card-selected" aria-hidden="true">선택됨</span>}
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
  return (
    <ul className="grid" aria-label="컬러 시안 목록">
      {items.map((cw) => (
        <Card key={cw.id} cw={cw} format={format} selected={cw.id === selectedId} onSelect={onSelect} />
      ))}
    </ul>
  );
}
