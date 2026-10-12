import { simulateCvd } from '../lib/cvd';
import { useLang } from '../lib/i18n';
import type { Colorway, CvdKind, RiskLevel } from '../types';

export const CVD_ORDER: CvdKind[] = ['protan', 'deutan', 'tritan'];

export function useAccessText() {
  const { t } = useLang();
  const level = (l: RiskLevel) => (l === 'low' ? t('낮음', 'Low') : l === 'mid' ? t('보통', 'Medium') : t('높음', 'High'));
  const levelShort = (l: RiskLevel) => (l === 'low' ? t('낮', 'low') : l === 'mid' ? t('중', 'mid') : t('높', 'high'));
  const kindShort = (k: CvdKind) => (k === 'protan' ? t('적', 'P') : k === 'deutan' ? t('녹', 'D') : t('청', 'T'));
  const kindName = (k: CvdKind) =>
    k === 'protan' ? t('적색약 (1형)', 'Protan (red-weak)') : k === 'deutan' ? t('녹색약 (2형)', 'Deutan (green-weak)') : t('청황색약 (3형)', 'Tritan (blue-yellow)');
  return { level, levelShort, kindShort, kindName };
}

/** 카드용 작은 표시: 가시성 점수 + 색각 이상 3종 위험도 */
export function AccessMini({ cw }: { cw: Colorway }) {
  const { t } = useLang();
  const { level, levelShort, kindShort, kindName } = useAccessText();
  const m = cw.metrics;
  return (
    <span className="card-access" aria-hidden="true">
      <span className="vis-score" title={t('가시성 점수 (100점 만점)', 'Visibility score (out of 100)')}>
        {t('가시성', 'Vis.')} <b>{m.visibility}</b>
      </span>
      {CVD_ORDER.map((k) => (
        <span key={k} className={`risk risk-${m.cvd[k].level}`} title={`${kindName(k)}: ${t('위험도', 'risk')} ${level(m.cvd[k].level)}`}>
          {kindShort(k)} {levelShort(m.cvd[k].level)}
        </span>
      ))}
    </span>
  );
}

/** 상세 패널용: 정상 시각·색각 이상 3종의 점수, 감소폭, 위험도, 시뮬레이션 색 */
export function AccessDetail({ cw }: { cw: Colorway }) {
  const { t } = useLang();
  const { level, kindName } = useAccessText();
  const m = cw.metrics;
  const sw = (kind: CvdKind | null) => {
    const f = (h: string) => (kind ? simulateCvd(h, kind) : h);
    return [f(cw.purple), f(cw.aux), f(cw.auxDeep)];
  };
  return (
    <div className="access">
      <p className="access-head">
        <span className="access-big">{m.visibility}<small> / 100</small></span>
        <span>
          {t('가시성 점수', 'Visibility score')}
          <small className="sub-line">{t('정상 시각 기준, 적용 방식 ①~⑥ 평균', 'Normal vision, average of applications ①–⑥')}</small>
        </span>
        <span className={`risk risk-${m.cvdLevel} risk-lg`}>{t('종합 위험도', 'Overall risk')} {level(m.cvdLevel)}</span>
      </p>
      <div className="table-wrap">
        <table className="access-table">
          <thead>
            <tr>
              <th scope="col">{t('시각 유형', 'Vision type')}</th>
              <th scope="col">{t('이렇게 보임', 'Simulated')}</th>
              <th scope="col">{t('점수', 'Score')}</th>
              <th scope="col">{t('정상 대비', 'vs normal')}</th>
              <th scope="col">{t('위험도', 'Risk')}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">{t('정상 시각', 'Normal vision')}</th>
              <td><Swatches colors={sw(null)} /></td>
              <td>{m.visibility}</td>
              <td>—</td>
              <td>—</td>
            </tr>
            {CVD_ORDER.map((k) => (
              <tr key={k}>
                <th scope="row">{kindName(k)}</th>
                <td><Swatches colors={sw(k)} /></td>
                <td>{m.cvd[k].score}</td>
                <td>−{m.cvd[k].drop.toFixed(1)}</td>
                <td><span className={`risk risk-${m.cvd[k].level}`}>{level(m.cvd[k].level)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note">
        {t(
          '점수 계산: 맞닿는 색 쌍의 명암비를 점수로 바꿉니다 (1:1=0점, 3:1=60점, 4.5:1=85점, 7:1 이상=100점). ①②③은 보라–보조색, ④는 여기에 흰 배경 위 진한 톤 글자, ⑤는 진한 기호–보라 글자까지, ⑥은 진한 톤–흰색에서 가장 약한 쌍을 잡아 6개를 평균합니다. 위험도는 색각 이상 시뮬레이션에서 점수가 정상보다 6점 미만 떨어지면 낮음, 6~12점이면 보통, 12점 이상이면 높음입니다.',
          'How it is computed: contrast ratios of touching color pairs become points (1:1 = 0, 3:1 = 60, 4.5:1 = 85, 7:1+ = 100). ①②③ use purple–accent; ④ adds the deep-tone wordmark on white; ⑤ also the deep marks next to the purple wordmark; ⑥ deep tone on white. The weakest pair in each is taken and the six are averaged. Risk is "low" if the simulated score falls less than 6 points below normal vision, "medium" for 6–12, "high" for 12 or more.',
        )}
      </p>
      <p className="note">
        {t(
          '명도 대비 기준의 시뮬레이션(Machado 2009, 완전 이상형)이며 참고용입니다. 색상 차이만으로 구분되는 경우는 점수에 반영하지 않았고, 의학적 진단이나 접근성 인증이 아닙니다. 실제 사용 전 대상 환경에서 확인하세요.',
          'A contrast-based simulation (Machado 2009, full dichromacy) for reference only. Differences carried by hue alone are not counted, and this is neither a medical diagnosis nor an accessibility certification. Check in the real context before use.',
        )}
      </p>
    </div>
  );
}

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="swatches" aria-hidden="true">
      {colors.map((c, i) => (
        <i key={i} style={{ background: c }} />
      ))}
    </span>
  );
}
