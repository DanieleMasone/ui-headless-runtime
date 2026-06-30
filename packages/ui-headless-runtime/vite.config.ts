import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'es2022',
    sourcemap: true,
    minify: false,
    lib: {
      entry: 'src/index.ts',
      name: 'UIHeadlessRuntime',
      formats: ['es', 'cjs', 'iife'],
      fileName: (format) =>
        format === 'es'
          ? 'ui-headless-runtime.js'
          : format === 'cjs'
            ? 'ui-headless-runtime.cjs'
            : 'ui-headless-runtime.iife.js',
    },
  },
});
