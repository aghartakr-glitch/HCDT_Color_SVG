import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// base './' : 어느 주소(루트, 하위 폴더, GitHub Pages)에 올려도 파일을 찾도록 상대 경로로 빌드
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
