# Release operations

Publishing is triggered only by a published GitHub Release whose tag is `vX.Y.Z`. The package version must be exactly `X.Y.Z`. Stable releases publish with `latest`; prereleases use `next`.

## Published baseline

`ui-headless-runtime@0.1.0` was published manually as the one-time first public release that created
the npm package. `ui-headless-runtime@0.1.1` then validated the GitHub Release workflow through npm
Trusted Publishing OIDC. `ui-headless-runtime@1.0.0` was published through the same workflow as the
first stable release and is the current `latest` version.

Do not rerun `v0.1.0`, `v0.1.1`, or `v1.0.0` to publish. These npm versions already exist and npm
versions are immutable. Every future release must use the verified GitHub Release workflow and OIDC.

## npm Trusted Publishing setup

This external configuration is not performed by repository code:

1. In the npm package settings, configure a GitHub Actions trusted publisher.
2. Owner/user: `DanieleMasone`.
3. Repository: `ui-headless-runtime`.
4. Workflow filename: `release.yml`.
5. Environment name: leave blank; this repository does not use a GitHub environment for npm publishing.
6. Allowed action: `npm publish`.
7. Under publishing access, require 2FA and disallow token-based publishing after OIDC has been proven.

Do not add `NPM_TOKEN`, `NODE_AUTH_TOKEN`, or a GitHub environment named `npm` to the normal release workflow. Trusted publishing requires Node 22.14+ and npm 11.5.1+; this workflow uses Node 24 and the npm version declared by the repository. Provenance is automatic for a public package published through OIDC, so no provenance flag is required.

## Release procedure

The following procedure applies to versions after `1.0.0`:

1. Update the root, demo, publishable package, and lockfile versions together; finalize the matching `CHANGELOG.md` entry.
2. Run `npm ci`, `npm run release:verify`, and inspect `npm pack --dry-run`.
3. Commit the API report if the public surface intentionally changed.
4. Tag the verified commit `vX.Y.Z` and push it.
5. Publish the GitHub Release for that exact tag.
6. The workflow checks synchronized versions, the finalized changelog, tag/version/commit, quality gates, docs, tarball, and registry availability before OIDC publish.
7. Verify npm contents, dist-tag, provenance, ESM/CJS install, and GitHub Release notes.

Versions cannot be overwritten. If publication fails after npm accepts a version, fix forward with
a new version. If validation fails before npm accepts it, correct the release according to
repository policy before publishing. Never rerun an existing npm version, including `v0.1.0`,
`v0.1.1`, or `v1.0.0`.
