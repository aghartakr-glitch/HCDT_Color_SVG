# HCDT 로고 컬러 탐색 · SVG 다운로드 사이트

컬러 100개(메인 8 + 확장 92) × 로고 3종(The Longest / Long / Short) × 적용 시안 6종을 보고,
SVG(투명 / 배경 포함)와 3종 ZIP을 내려받는 사이트입니다.

## 1. 바로 열어보기 (설치 없음)
`dist-single/index.html` 을 더블클릭하면 브라우저에서 열립니다. (인터넷 불필요, 파일 1개)

## 2. 개발용 실행 (Node.js 설치 필요: https://nodejs.org 의 LTS)
터미널(Windows는 PowerShell)에서 이 폴더로 이동한 뒤:

| 하고 싶은 일 | 명령어 |
|---|---|
| 처음 1회 설치 | `npm install` |
| 개발 서버 실행 (주소: http://localhost:5173) | `npm run dev` |
| 배포용 빌드 (`dist` 폴더 생성) | `npm run build` |
| 빌드 결과 미리보기 | `npm run preview` |
| 자동 테스트 | `npm test` |

## 3. 인터넷 주소로 배포하기

### 방법 A. Netlify Drop (가장 쉬움, 코딩 불필요)
1. `npm run build` 로 `dist` 폴더를 만든다. (이미 들어 있는 `dist` 를 써도 됨)
2. https://app.netlify.com/drop 접속
3. `dist` 폴더를 화면에 끌어다 놓는다.
4. 몇 초 뒤 `https://무작위이름.netlify.app` 주소가 생긴다. (계정을 만들면 주소 변경·유지 가능)
주의: `dist` 폴더 **안의** index.html 이 최상위에 있어야 합니다. 상위 폴더째 올리지 마세요.

### 방법 B. GitHub Pages (자동 배포)
1. GitHub에 새 저장소를 만들고 이 폴더 내용을 올린다. (`node_modules`, `dist` 는 `.gitignore` 로 제외됨)
2. 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 선택
3. `main` 브랜치에 올리면 `.github/workflows/deploy.yml` 이 자동으로 테스트·빌드·게시
4. 주소: `https://계정이름.github.io/저장소이름/`
(`vite.config.ts` 의 `base: './'` 덕분에 하위 경로에서도 동작합니다.)

### 방법 C. Vercel / Netlify 저장소 연동
GitHub 저장소를 연결하면 빌드 명령 `npm run build`, 출력 폴더 `dist` 로 자동 인식됩니다. (`netlify.toml` 포함)

## 4. 폴더 구조
| 경로 | 내용 |
|---|---|
| `source/` | 원본 PDF, 지시서, 참고 이미지 |
| `scripts/extract_assets.py` | PDF에서 로고 벡터 윤곽 추출 (재그리기·트레이싱 없음) |
| `scripts/generate_palettes.py` | 컬러 100개 생성 (고정 결과, 무작위 아님) |
| `src/data/colorways.json` | 컬러 100개 데이터 (ID 001–100) |
| `src/data/originalMain.frozen.json` | 원본 메인 컬러 8개 고정값 |
| `tests/` | 자동 검증 (데이터·SVG·PDF 대조·다른 렌더러 대조·화면 e2e) |

데이터 재생성: `npm run data` (Python 3 + PyMuPDF/poppler 필요). 평소엔 필요 없습니다.

## 5. 알려둘 점
- 지시서의 시안 설명과 AI 원본이 다른 부분은 **원본을 따랐습니다** (②, ③, ⑤, ⑥ — 최종 보고 참고).
- 원본 색은 RGB 기준이며 CMYK/별색 정보는 없습니다.
- 일러스트레이터에서 직접 열어보는 검증은 하지 못했습니다. (CairoSVG·Chromium으로 대체 검증)
