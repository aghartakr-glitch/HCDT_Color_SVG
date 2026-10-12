import { useMemo } from 'react';
import { FORMAT_DESC, FORMAT_KEYS, FORMAT_LABEL, FORMATS } from '../data';
import { VARIANTS, VARIANT_BY_ID } from '../lib/variants';
import { fileName, previewBackground, zipName } from '../lib/svg';
import { copyText, downloadSvg, downloadZip } from '../lib/download';
import { Logo, SymbolBig } from './Logo';
import type { Colorway, FormatKey, VariantId } from '../types';

interface Props {
  cw: Colorway;
  format: FormatKey;
  setFormat: (f: FormatKey) => void;
  variant: VariantId;
  setVariant: (v: VariantId) => void;
  includeBg: boolean;
  setIncludeBg: (b: boolean) => void;
  notify: (msg: string) => void;
}

const USE_ON_LABEL = { white: '흰색 또는 밝은 배경', purple: '기준 보라 배경', aux: '보조색 배경' } as const;

export function Detail({ cw, format, setFormat, variant, setVariant, includeBg, setIncludeBg, notify }: Props) {
  const v = VARIANT_BY_ID[variant];
  const map = cw.mapping[String(variant)];
  const hasBg = !!map.bg;
  const bgOn = includeBg && hasBg;
  const useOnColor = v.useOn === 'purple' ? cw.purple : v.useOn === 'aux' ? cw.aux : '#FFFFFF';
  const useOnText = `${USE_ON_LABEL[v.useOn]}${v.useOn === 'white' ? '' : ` (${useOnColor})`}`;
  const [, , vbW, vbH] = FORMATS[format].viewBox;
  // 점선 테두리가 SVG의 실제 영역(viewBox 비율)에 딱 맞도록
  const frameStyle = vbW / vbH < 1 ? { height: 160, aspectRatio: `${vbW} / ${vbH}` } : { width: 'min(100%, 380px)', aspectRatio: `${vbW} / ${vbH}` };
  const name = useMemo(() => fileName(cw, format, variant, bgOn), [cw, format, variant, bgOn]);

  const copy = async (label: string, hex: string) => {
    const ok = await copyText(hex);
    notify(ok ? `${label} ${hex} 복사됨` : `복사하지 못했습니다. ${hex} 를 직접 선택해 복사하세요`);
  };

  const colors: { key: string; label: string; hex: string; note: string }[] = [
    { key: 'purple', label: '기준 보라', hex: cw.purple, note: '심볼 한 면과 워드마크의 기준색 (모든 시안 공통)' },
    { key: 'aux', label: '보조색', hex: cw.aux, note: '심볼의 두 번째 면, 보조색 배경' },
    { key: 'deep', label: '보조색 진한 톤', hex: cw.auxDeep, note: '흰 배경 위 워드마크·단색용 (④⑤⑥)' },
  ];

  return (
    <div className="detail">
      <header className="detail-head">
        <div>
          <p className="detail-no">No. {cw.id}</p>
          <h2 className="detail-name">{cw.name}</h2>
        </div>
        <span className={`badge badge-lg ${cw.origin === 'main' ? 'badge-main' : 'badge-ext'}`}>{cw.badge}</span>
      </header>

      <section aria-labelledby="sec-format" className="block">
        <h3 id="sec-format" className="block-title">로고 형식</h3>
        <div className="seg" role="group" aria-label="로고 형식 선택">
          {FORMAT_KEYS.map((k) => (
            <button key={k} type="button" className={`seg-btn${format === k ? ' is-on' : ''}`} aria-pressed={format === k} onClick={() => setFormat(k)}>
              <span className="seg-name">{FORMAT_LABEL[k]}</span>
              <span className="seg-desc">{FORMAT_DESC[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="sec-board" className="block">
        <h3 id="sec-board" className="block-title">컬러 적용 방식 <small>— 원본 시안의 6가지 구성</small></h3>
        <div className="board">
          <div className="board-strip" style={{ background: cw.aux }} aria-hidden="true" />
          <div className="board-body">
            <div className="board-symbol">
              <SymbolBig cw={cw} />
              <p className="cap">두 색 심볼 확대 (기준 보라 + 보조색)</p>
            </div>
            <div className="tiles" role="group" aria-label="컬러 적용 방식 선택">
              {VARIANTS.map((vd) => {
                const on = vd.id === variant;
                return (
                  <button
                    key={vd.id}
                    type="button"
                    className={`tile${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    aria-label={`적용 방식 ${vd.circled} ${vd.label}`}
                    onClick={() => setVariant(vd.id)}
                  >
                    <span className="tile-stage" style={{ background: previewBackground(cw, vd.id) }}>
                      <Logo cw={cw} format={format} variant={vd.id} />
                    </span>
                    <span className="tile-label"><b>{vd.circled}</b> {on && <em>선택됨 · </em>}{vd.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-compare" className="block">
        <h3 id="sec-compare" className="block-title">3가지 형식 비교 <small>— 적용 방식 {v.circled} 기준</small></h3>
        <div className="compare">
          {FORMAT_KEYS.map((k) => (
            <button key={k} type="button" className={`cmp${format === k ? ' is-on' : ''}`} aria-pressed={format === k} aria-label={`${FORMAT_LABEL[k]} 형식 선택`} onClick={() => setFormat(k)}>
              <span className="cmp-stage" style={{ background: previewBackground(cw, variant) }}>
                <Logo cw={cw} format={k} variant={variant} />
              </span>
              <span className="cmp-label">{format === k ? '✓ ' : ''}{FORMAT_LABEL[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="sec-dl" className="block">
        <h3 id="sec-dl" className="block-title">SVG 다운로드</h3>
        <div className="file-preview-wrap">
          <div className={`file-preview${v.useOn === 'white' && !bgOn ? ' checker' : ''}`} style={v.useOn !== 'white' && !bgOn ? { background: useOnColor } : undefined}>
            <div className="file-frame" style={frameStyle}>
              <Logo cw={cw} format={format} variant={variant} includeBackground={bgOn} />
            </div>
          </div>
          <p className="cap">내려받을 파일의 미리보기 · 점선 안쪽이 SVG 영역 · {bgOn ? '배경 포함' : '투명 배경'}</p>
        </div>

        <label className={`check${hasBg ? '' : ' is-disabled'}`}>
          <input type="checkbox" checked={bgOn} disabled={!hasBg} onChange={(e) => setIncludeBg(e.target.checked)} />
          <span>
            <b>배경 포함</b>
            <small>
              {hasBg
                ? bgOn
                  ? `켜짐 — ${map.bg} 배경 사각형이 SVG 안에 들어갑니다.`
                  : `꺼짐 — 투명 배경입니다. ${useOnText} 위에서 사용하세요.`
                : `이 적용 방식(${v.circled})은 배경이 없는 흰 바탕 예시라 항상 투명 배경입니다. ${useOnText} 위에서 사용하세요.`}
            </small>
          </span>
        </label>

        <p className="filename" aria-live="polite">파일명: <code>{name}</code></p>
        <div className="dl-row">
          <button type="button" className="btn btn-primary" onClick={() => { downloadSvg(cw, format, variant, bgOn); notify(`SVG 다운로드: ${name}`); }}>
            SVG 다운로드 <small>{FORMAT_LABEL[format]} · {v.circled}</small>
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => { await downloadZip(cw, variant, bgOn); notify(`ZIP 다운로드: ${zipName(cw, variant)}`); }}
          >
            3가지 형식 다운로드 (ZIP) <small>The Longest · Long · Short</small>
          </button>
        </div>
      </section>

      <section aria-labelledby="sec-hex" className="block">
        <h3 id="sec-hex" className="block-title">색상 HEX</h3>
        <ul className="hex-list">
          {colors.map((c) => (
            <li key={c.key} className="hex-row">
              <i className="hex-sw" style={{ background: c.hex }} aria-hidden="true" />
              <span className="hex-text"><b>{c.label}</b><small>{c.note}</small></span>
              <code className="hex-code">{c.hex}</code>
              <button type="button" className="btn btn-sm" aria-label={`${c.label} HEX ${c.hex} 복사`} onClick={() => copy(c.label, c.hex)}>복사</button>
            </li>
          ))}
        </ul>
        {cw.source ? (
          <p className="note">원본 AI(N-FUD 2026_Logo_261012) {cw.source.page}페이지의 색입니다. 원본이 RGB 문서라 위 HEX가 원본 값 그대로입니다.</p>
        ) : (
          <p className="note">확장 컬러: 보조색 대비 — 보라와 {cw.metrics.contrastPurpleAux}:1, 진한 톤과 흰색 {cw.metrics.contrastDeepWhite}:1 (명암비).</p>
        )}
      </section>
    </div>
  );
}
