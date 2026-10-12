// 시각 대조용: 사이트와 같은 SVG 생성 함수로 파일을 내보낸다. (FIXTURE_DIR 환경변수가 있을 때만 동작)
import { describe, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { COLORWAYS, FORMAT_KEYS } from '../src/data';
import { svgFileContent } from '../src/lib/download';
import { fileName } from '../src/lib/svg';
import type { VariantId } from '../src/types';

const dir = process.env.FIXTURE_DIR;
describe.skipIf(!dir)('fixtures', () => {
  it('export', () => {
    mkdirSync(dir!, { recursive: true });
    for (const cw of COLORWAYS.filter((c) => c.origin === 'main')) {
      for (const f of FORMAT_KEYS) {
        for (const v of [1, 2, 3, 4, 5, 6] as VariantId[]) {
          for (const bg of [false, true]) {
            if (bg && !cw.mapping[String(v)].bg) continue;
            writeFileSync(`${dir}/${fileName(cw, f, v, bg)}`, svgFileContent(cw, f, v, bg));
          }
        }
      }
    }
  });
});
