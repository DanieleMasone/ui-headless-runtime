import { componentCatalog } from '../metadata/components.ts';

export const requiredPublicSitePaths = Object.freeze([
  'index.html',
  '404.html',
  '.nojekyll',
  'api/index.html',
  'coverage/index.html',
  'docs/index.html',
  'docs/guide/index.html',
  'docs/guide/getting-started.html',
  'docs/guide/accessibility.html',
  'docs/guide/framework-integration.html',
  'docs/guide/consumer-examples.html',
  'docs/guide/frameworks/react.html',
  'docs/guide/frameworks/vue.html',
  'docs/guide/frameworks/angular.html',
  'docs/accessibility/demo-conformance.html',
  'docs/architecture/overview.html',
  'docs/releasing.html',
  ...componentCatalog.map((component) => `docs/components/${component.id}.html`),
]);

export const forbiddenPublicSiteRoots = Object.freeze(['examples']);
