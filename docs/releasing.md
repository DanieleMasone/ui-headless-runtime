# Release operations

Publishing is triggered only by a published GitHub Release whose tag is `vX.Y.Z`. The package version must be exactly `X.Y.Z`. Stable releases publish with `latest`; prereleases use `next`.

## npm Trusted Publishing setup

This external configuration is not performed by repository code:

1. Ensure `ui-headless-runtime` exists on npm; the initial bootstrap may require an authorized manual publish.
2. In npm package settings, configure a GitHub Actions trusted publisher.
3. Owner/user: `DanieleMasone`.
4. Repository: `ui-headless-runtime`.
5. Workflow filename: `release.yml`.
6. GitHub environment: `npm`.
7. Select `npm publish` as an allowed action (required for trusted publishers created after May 20, 2026).
8. Under publishing access, require 2FA and disallow token-based publishing after OIDC has been proven.
9. Protect the `npm` environment with required reviewers where repository policy requires approval.

Do not add `NPM_TOKEN`. Trusted publishing requires Node 22.14+ and npm 11.5.1+; this workflow uses Node 24 and the npm version declared by the repository. Provenance is automatic for a public package published through OIDC, so no provenance flag is required.

## Release procedure

1. Update package/workspace version and `CHANGELOG.md`.
2. Run `npm ci`, `npm run release:verify`, and inspect `npm pack --dry-run`.
3. Commit the API report if the public surface intentionally changed.
4. Tag the verified commit `vX.Y.Z` and push it.
5. Publish the GitHub Release for that exact tag.
6. The workflow checks tag/version/commit, quality gates, docs, tarball, and registry availability before OIDC publish.
7. Verify npm contents, dist-tag, provenance, ESM/CJS install, and GitHub Release notes.

Versions cannot be overwritten. If publication fails after npm accepts it, fix forward with a new version. If validation fails before publish, correct the same release commit/tag according to repository policy before republishing the GitHub Release.
