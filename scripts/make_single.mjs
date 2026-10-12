// dist/ 의 index.html 에 JS·CSS 를 직접 넣어 '파일 하나(dist-single/index.html)'로 만든다.
// 이 파일은 더블클릭만으로(인터넷·서버 없이) 열리고, 메일이나 USB로 전달해도 된다.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
let html = readFileSync(new URL('index.html', dist), 'utf8');

html = html.replace(/<link rel="stylesheet"[^>]*href="\.\/(assets\/[^"]+\.css)"[^>]*>/g, (_, p) =>
  `<style>${readFileSync(new URL(p, dist), 'utf8')}</style>`);
html = html.replace(/<script type="module"[^>]*src="\.\/(assets\/[^"]+\.js)"[^>]*><\/script>/g, (_, p) => {
  const js = readFileSync(new URL(p, dist), 'utf8').replace(/<\/script/gi, '<\\/script');
  return `<script type="module">${js}</script>`;
});
html = html.replace(/<link rel="modulepreload"[^>]*>/g, '');

mkdirSync(new URL('../dist-single/', import.meta.url), { recursive: true });
writeFileSync(new URL('../dist-single/index.html', import.meta.url), html);
console.log('dist-single/index.html', (html.length / 1024).toFixed(0) + ' KB');
