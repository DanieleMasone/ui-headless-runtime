import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type DefaultTheme } from 'vitepress';
import {
  apiUrl,
  coverageUrl,
  docsBasePath,
  docsUrl,
  repositoryUrl,
  siteUrl,
} from '../../metadata/site';

const documentationRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const guideOrder = [
  'index',
  'getting-started',
  'core-concepts',
  'controllers',
  'rendering-contract',
  'state-management',
  'controlled-vs-uncontrolled',
  'events-and-reasons',
  'dom-binding',
  'accessibility',
  'focus-management',
  'overlays',
  'collections',
  'positioning',
  'ssr',
  'framework-integration',
  'testing',
  'troubleshooting',
  'release-and-package',
];
const pages = (directory: string, order: readonly string[] = []): DefaultTheme.SidebarItem[] =>
  readdirSync(resolve(documentationRoot, directory))
    .filter((file) => file.endsWith('.md'))
    .sort((left, right) => {
      const leftSlug = left.replace(/\.md$/u, '');
      const rightSlug = right.replace(/\.md$/u, '');
      const leftIndex = order.indexOf(leftSlug);
      const rightIndex = order.indexOf(rightSlug);
      if (leftIndex !== -1 || rightIndex !== -1) {
        return (
          (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex) -
          (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex)
        );
      }
      return left.localeCompare(right);
    })
    .map((file) => {
      const markdown = readFileSync(resolve(documentationRoot, directory, file), 'utf8');
      const title = /^#\s+(.+)$/mu.exec(markdown)?.[1] ?? file.replace(/\.md$/u, '');
      return { text: title, link: `/${directory}/${file.replace(/\.md$/u, '')}` };
    });

const sidebar: DefaultTheme.SidebarItem[] = [
  { text: 'User Guide', collapsed: false, items: pages('guide', guideOrder) },
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
  base: docsBasePath,
  outDir: '../docs-dist/site',
  cleanUrls: false,
  lastUpdated: true,
  sitemap: { hostname: docsUrl },
  themeConfig: {
    nav: [
      { text: 'Documentation', link: '/' },
      { text: 'User Guide', link: '/guide/' },
      { text: 'Interactive demo', link: siteUrl },
      { text: 'API', link: apiUrl },
      { text: 'Coverage', link: coverageUrl },
    ],
    sidebar,
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: repositoryUrl }],
    footer: {
      message: 'Headless behavior; consumer-owned rendering and styling.',
      copyright: 'Released under the MIT License.',
    },
  },
});
