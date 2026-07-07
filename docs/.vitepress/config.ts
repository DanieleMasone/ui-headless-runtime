import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DefaultTheme } from 'vitepress';

const documentationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pages = (directory: string): DefaultTheme.SidebarItem[] =>
  readdirSync(resolve(documentationRoot, directory))
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => left.localeCompare(right))
    .map((file) => {
      const markdown = readFileSync(resolve(documentationRoot, directory, file), 'utf8');
      const title = /^#\s+(.+)$/mu.exec(markdown)?.[1] ?? file.replace(/\.md$/u, '');
      return { text: title, link: `/${directory}/${file.replace(/\.md$/u, '')}` };
    });

const sidebar: DefaultTheme.SidebarItem[] = [
  { text: 'Components', collapsed: false, items: pages('components') },
  { text: 'Architecture', collapsed: false, items: pages('architecture') },
  { text: 'Guides', collapsed: false, items: pages('guides') },
  { text: 'Accessibility', items: pages('accessibility') },
  { text: 'Decisions', items: pages('adr') },
  { text: 'Operations', items: [{ text: 'Release operations', link: '/releasing' }] },
];

export default defineConfig({
  title: 'UI Headless Runtime',
  description: 'Architecture, component contracts, integration guides, and release operations.',
  base: '/ui-headless-runtime/docs/',
  outDir: '../docs-dist/site',
  cleanUrls: false,
  lastUpdated: true,
  sitemap: { hostname: 'https://danielemasone.github.io/ui-headless-runtime/docs/' },
  themeConfig: {
    nav: [
      { text: 'Documentation', link: '/' },
      { text: 'Interactive demo', link: 'https://danielemasone.github.io/ui-headless-runtime/' },
      { text: 'API', link: 'https://danielemasone.github.io/ui-headless-runtime/api/' },
      { text: 'Coverage', link: 'https://danielemasone.github.io/ui-headless-runtime/coverage/' },
    ],
    sidebar,
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/DanieleMasone/ui-headless-runtime' }],
    footer: {
      message: 'Headless behavior; consumer-owned rendering and styling.',
      copyright: 'Released under the MIT License.',
    },
  },
});
