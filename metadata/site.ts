export const repositoryOwner = 'DanieleMasone';
export const repositoryName = 'ui-headless-runtime';

export const normalizeBasePath = (value: string): string => `/${value.replace(/^\/+|\/+$/gu, '')}/`;

export const siteBasePath = normalizeBasePath(process.env.SITE_BASE_PATH ?? repositoryName);
export const siteOrigin = `https://${repositoryOwner}.github.io`;
export const siteUrl = `${siteOrigin}${siteBasePath}`;
export const docsBasePath = `${siteBasePath}docs/`;
export const docsUrl = `${siteUrl}docs/`;
export const apiUrl = `${siteUrl}api/`;
export const coverageUrl = `${siteUrl}coverage/`;
export const repositoryUrl = `https://github.com/${repositoryOwner}/${repositoryName}`;
