import { defineConfig } from 'vite';

const normalizeBase = (value: string | undefined): string => {
  if (!value) return '/';
  return `/${value.replace(/^\/+|\/+$/gu, '')}/`;
};

export default defineConfig({
  base: normalizeBase(process.env.BASE_PATH),
  build: { outDir: 'dist', target: 'es2022', sourcemap: true },
});
