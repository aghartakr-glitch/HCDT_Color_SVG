import { useMemo } from 'react';
import { FORMAT_DESC, FORMAT_DESC_EN, FORMAT_KEYS, FORMAT_LABEL, FORMATS } from '../data';
import { colorName, useLang } from '../lib/i18n';
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


export function Detail({ cw, format, setFormat, variant, setVariant, includeBg, setIncludeBg, notify }: Props) {
  const { lang, t } = useLang();
  const USE_ON_LABEL = {
    white: t('흰색 또는 밝은 배경', 'a white or light background'),
    purple: t('기준 보라 배경', 'the base purple background'),
    aux: t('보조색 배경', 'the accent-color background'),
  } as const;
  const vLabel = (vd: { label: string; labelEn: string }) => t(vd.label, vd.labelEn);
  const cname = colorName(cw.name, lang);
  const badge = cw.origin === 'main' ? t('메인 컬러', 'Main color') : t('확장 컬러', 'Extended color');
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
    notify(ok ? t(`${label} ${hex} 복사됨`, `${label} ${hex} copied`) : t(`복사하지 못했습니다. ${hex} 를 직접 선택해 복사하세요`, `Could not copy. Select ${hex} and copy it manually`));
  };

  const colors: { key: string; label: string; hex: string; note: string }[] = [
    { key: 'purple', label: t('기준 보라', 'Base purple'), hex: cw.purple, note: t('심볼 한 면과 워드마크의 기준색 (모든 시안 공통)', 'One symbol face and the wordmark (shared by all colorways)') },
    { key: 'aux', label: t('보조색', 'Accent color'), hex: cw.aux, note: t('심볼의 두 번째 면, 보조색 배경', 'Second symbol face, accent background') },
    { key: 'deep', label: t('보조색 진한 톤', 'Deep accent tone'), hex: cw.auxDeep, note: t('흰 배경 위 워드마크·단색용 (④⑤⑥)', 'For wordmark / single-color use on white (④⑤⑥)') },
  ];

  return (
    <div className="detail">
      <header className="detail-head">
        <div>
          <p className="detail-no">No. {cw.id}</p>
          <h2 className="detail-name">{cname}</h2>
        </div>
        <span className={`badge badge-lg ${cw.origin === 'main' ? 'badge-main' : 'badge-ext'}`}>{badge}</span>
      </header>

      <section aria-labelledby="sec-format" className="block">
        <h3 id="sec-format" className="block-title">{t('로고 형식', 'Logo format')}</h3>
        <div className="seg" role="group" aria-label={t('로고 형식 선택', 'Choose logo format')}>
          {FORMAT_KEYS.map((k) => (
            <button key={k} type="button" className={`seg-btn${format === k ? ' is-on' : ''}`} aria-pressed={format === k} onClick={() => setFormat(k)}>
              <span className="seg-name">{FORMAT_LABEL[k]}</span>
              <span className="seg-desc">{lang === 'en' ? FORMAT_DESC_EN[k] : FORMAT_DESC[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="sec-board" className="block">
        <h3 id="sec-board" className="block-title">{t('컬러 적용 방식', 'Color application')} <small>— {t('원본 시안의 6가지 구성', 'the 6 layouts of the original design')}</small></h3>
        <div className="board">
          <div className="board-strip" style={{ background: cw.aux }} aria-hidden="true" />
          <div className="board-body">
            <div className="board-symbol">
              <SymbolBig cw={cw} />
              <p className="cap">{t('두 색 심볼 확대 (기준 보라 + 보조색)', 'Two-color symbol, enlarged (base purple + accent)')}</p>
            </div>
            <div className="tiles" role="group" aria-label={t('컬러 적용 방식 선택', 'Choose color application')}>
              {VARIANTS.map((vd) => {
                const on = vd.id === variant;
                return (
                  <button
                    key={vd.id}
                    type="button"
                    className={`tile${on ? ' is-on' : ''}`}
                    aria-pressed={on}
                    aria-label={t(`적용 방식 ${vd.circled} ${vd.label}`, `Application ${vd.circled} ${vd.labelEn}`)}
                    onClick={() => setVariant(vd.id)}
                  >
                    <span className="tile-stage" style={{ background: previewBackground(cw, vd.id) }}>
                      <Logo cw={cw} format={format} variant={vd.id} />
                    </span>
                    <span className="tile-label"><b>{vd.circled}</b> {on && <em>{t('선택됨', 'Selected')} · </em>}{vLabel(vd)}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="sec-compare" className="block">
        <h3 id="sec-compare" className="block-title">{t('3가지 형식 비교', 'Compare the 3 formats')} <small>— {t(`적용 방식 ${v.circled} 기준`, `application ${v.circled}`)}</small></h3>
        <div className="compare">
          {FORMAT_KEYS.map((k) => (
            <button key={k} type="button" className={`cmp${format === k ? ' is-on' : ''}`} aria-pressed={format === k} aria-label={t(`${FORMAT_LABEL[k]} 형식 선택`, `Select ${FORMAT_LABEL[k]} format`)} onClick={() => setFormat(k)}>
              <span className="cmp-stage" style={{ background: previewBackground(cw, variant) }}>
                <Logo cw={cw} format={k} variant={variant} />
              </span>
              <span className="cmp-label">{format === k ? '✓ ' : ''}{FORMAT_LABEL[k]}</span>
            </button>
          ))}
        </div>
      </section>

      <section aria-labelledby="sec-dl" className="block">
        <h3 id="sec-dl" className="block-title">{t('SVG 다운로드', 'SVG download')}</h3>
        <div className="file-preview-wrap">
          <div className={`file-preview${v.useOn === 'white' && !bgOn ? ' checker' : ''}`} style={v.useOn !== 'white' && !bgOn ? { background: useOnColor } : undefined}>
            <div className="file-frame" style={frameStyle}>
              <Logo cw={cw} format={format} variant={variant} includeBackground={bgOn} />
            </div>
          </div>
          <p className="cap">{t('내려받을 파일의 미리보기 · 점선 안쪽이 SVG 영역 · ', 'Preview of the file you will get · dashed line = SVG area · ')}{bgOn ? t('배경 포함', 'with background') : t('투명 배경', 'transparent background')}</p>
        </div>

        <label className={`check${hasBg ? '' : ' is-disabled'}`}>
          <input type="checkbox" checked={bgOn} disabled={!hasBg} onChange={(e) => setIncludeBg(e.target.checked)} />
          <span>
            <b>{t('배경 포함', 'Include background')}</b>
            <small>
              {hasBg
                ? bgOn
                  ? t(`켜짐 — ${map.bg} 배경 사각형이 SVG 안에 들어갑니다.`, `On — a ${map.bg} background rectangle is included in the SVG.`)
                  : t(`꺼짐 — 투명 배경입니다. ${useOnText} 위에서 사용하세요.`, `Off — transparent background. Use it on ${useOnText}.`)
                : t(`이 적용 방식(${v.circled})은 배경이 없는 흰 바탕 예시라 항상 투명 배경입니다. ${useOnText} 위에서 사용하세요.`, `Application ${v.circled} is the plain white-background example, so it is always transparent. Use it on ${useOnText}.`)}
            </small>
          </span>
        </label>

        <p className="filename" aria-live="polite">{t('파일명', 'File name')}: <code>{name}</code></p>
        <div className="dl-row">
          <button type="button" className="btn btn-primary" onClick={() => { downloadSvg(cw, format, variant, bgOn); notify(t(`SVG 다운로드: ${name}`, `SVG downloaded: ${name}`)); }}>
            {t('SVG 다운로드', 'Download SVG')} <small>{FORMAT_LABEL[format]} · {v.circled}</small>
          </button>
          <button
            type="button"
            className="btn"
            onClick={async () => { await downloadZip(cw, variant, bgOn); notify(t(`ZIP 다운로드: ${zipName(cw, variant)}`, `ZIP downloaded: ${zipName(cw, variant)}`)); }}
          >
            {t('3가지 형식 다운로드 (ZIP)', 'Download all 3 formats (ZIP)')} <small>The Longest · Long · Short</small>
          </button>
        </div>
      </section>

      <section aria-labelledby="sec-hex" className="block">
        <h3 id="sec-hex" className="block-title">{t('색상 HEX', 'Color HEX')}</h3>
        <ul className="hex-list">
          {colors.map((c) => (
            <li key={c.key} className="hex-row">
              <i className="hex-sw" style={{ background: c.hex }} aria-hidden="true" />
              <span className="hex-text"><b>{c.label}</b><small>{c.note}</small></span>
              <code className="hex-code">{c.hex}</code>
              <button type="button" className="btn btn-sm" aria-label={t(`${c.label} HEX ${c.hex} 복사`, `Copy ${c.label} HEX ${c.hex}`)} onClick={() => copy(c.label, c.hex)}>{t('복사', 'Copy')}</button>
            </li>
          ))}
        </ul>
        {cw.source ? (
          <p className="note">{t(`원본 AI(N-FUD 2026_Logo_261012) ${cw.source.page}페이지의 색입니다. 원본이 RGB 문서라 위 HEX가 원본 값 그대로입니다.`, `Colors from page ${cw.source.page} of the original AI file (N-FUD 2026_Logo_261012). The original is an RGB document, so the HEX values above are the original values.`)}</p>
        ) : (
          <p className="note">{t(`확장 컬러: 보조색 대비 — 보라와 ${cw.metrics.contrastPurpleAux}:1, 진한 톤과 흰색 ${cw.metrics.contrastDeepWhite}:1 (명암비).`, `Extended color: contrast — ${cw.metrics.contrastPurpleAux}:1 against purple, ${cw.metrics.contrastDeepWhite}:1 for the deep tone against white.`)}</p>
        )}
      </section>
    </div>
  );
}
