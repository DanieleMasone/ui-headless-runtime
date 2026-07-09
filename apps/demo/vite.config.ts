import { defineConfig } from 'vite';
import { normalizeBasePath } from '../../metadata/site';

const normalizeBase = (value: string | undefined): string => {
  if (!value) return '/';
  return normalizeBasePath(value);
};

export default defineConfig({
  base: normalizeBase(process.env.BASE_PATH),
  resolve: { tsconfigPaths: true },
  build: { outDir: 'dist', target: 'es2022', sourcemap: true },
});
