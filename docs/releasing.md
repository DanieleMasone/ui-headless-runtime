# Release operations

Publishing is triggered only by a published GitHub Release whose tag is `vX.Y.Z`. The package version must be exactly `X.Y.Z`. Stable releases publish with `latest`; prereleases use `next`.

## npm Trusted Publishing setup

This external configuration is not performed by repository code:

1. Check `npm view ui-headless-runtime version`. npm exposes Trusted Publisher settings only after a package exists.
2. If the package does not exist, its owner must perform a separately authorized one-time bootstrap publish. Reserve `0.1.0` for the verified OIDC workflow: use a distinct lower prerelease version and a non-default bootstrap dist-tag, then inspect that bootstrap tarball before publishing it. This repository does not automate or authorize that operation.
3. In npm package settings, configure a GitHub Actions trusted publisher.
4. Owner/user: `DanieleMasone`.
5. Repository: `ui-headless-runtime`.
6. Workflow filename: `release.yml`.
7. GitHub environment: `npm`.
8. Select `npm publish` as an allowed action (required for trusted publishers created after May 20, 2026).
9. Under publishing access, require 2FA and disallow token-based publishing after OIDC has been proven.
10. Revoke the bootstrap credential, remove any local npm authentication, and protect the `npm` environment with required reviewers where repository policy requires approval.

Do not add `NPM_TOKEN`. Trusted publishing requires Node 22.14+ and npm 11.5.1+; this workflow uses Node 24 and the npm version declared by the repository. Provenance is automatic for a public package published through OIDC, so no provenance flag is required.

### One-time name bootstrap

The bootstrap is an owner operation, not a CI fallback. Use a disposable clean checkout, synchronize every workspace and lockfile version to a prerelease lower than `0.1.0`, and keep that change off the release branch. Run `npm ci`, `npm run release:quality`, `npm run package:check`, create one real tarball, and inspect its complete file list. Publish that exact bootstrap tarball interactively with 2FA under a non-default tag such as `bootstrap`; never publish `0.1.0` manually and never place the credential in repository or GitHub secrets.

After npm creates the package settings, configure the trusted publisher above, revoke the bootstrap credential or end the interactive session, and confirm that `ui-headless-runtime@0.1.0` is still absent. The normal GitHub Release workflow can then publish the verified stable tarball through OIDC.

## Release procedure

1. Update the root, demo, publishable package, and lockfile versions together; finalize the matching `CHANGELOG.md` entry.
2. Run `npm ci`, `npm run release:verify`, and inspect `npm pack --dry-run`.
3. Commit the API report if the public surface intentionally changed.
4. Tag the verified commit `vX.Y.Z` and push it.
5. Publish the GitHub Release for that exact tag.
6. The workflow checks synchronized versions, the finalized changelog, tag/version/commit, quality gates, docs, tarball, and registry availability before OIDC publish.
7. Verify npm contents, dist-tag, provenance, ESM/CJS install, and GitHub Release notes.

Versions cannot be overwritten. If publication fails after npm accepts it, fix forward with a new version. If validation fails before publish, correct the same release commit/tag according to repository policy before republishing the GitHub Release.
