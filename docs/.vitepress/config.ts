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
const architectureOrder = [
  'overview',
  'state-model',
  'events',
  'dom-and-ssr',
  'focus-management',
  'overlay-stack',
  'collections',
  'positioning',
  'cleanup-and-ownership',
  'public-api',
  'testing-strategy',
  'demo-architecture',
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
  { text: 'User Guide', link: '/guide/', collapsed: false, items: pages('guide', guideOrder) },
  { text: 'Components', link: '/components/dialog', collapsed: true, items: pages('components') },
  {
    text: 'Architecture',
    link: '/architecture/overview',
    collapsed: true,
    items: pages('architecture', architectureOrder),
  },
  { text: 'Guides', link: '/guides/typescript', collapsed: true, items: pages('guides') },
  {
    text: 'Accessibility',
    link: '/accessibility/demo-conformance',
    items: pages('accessibility'),
  },
  { text: 'Decisions', link: '/adr/0001-internal-positioning', items: pages('adr') },
  {
    text: 'Operations',
    link: '/releasing',
    items: [{ text: 'Release operations', link: '/releasing' }],
  },
];

export default defineConfig({
  title: 'UI Headless Runtime',
  description: 'Architecture, component contracts, integration guides, and release operations.',
  base: docsBasePath,
  outDir: '../docs-dist/site',
  cleanUrls: false,
  lastUpdated: true,
  sitemap: { hostname: docsUrl },
  markdown: {
    theme: {
      light: 'github-light-high-contrast',
      dark: 'github-dark-high-contrast',
    },
  },
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
