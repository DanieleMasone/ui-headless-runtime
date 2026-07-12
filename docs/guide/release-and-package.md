# Release and package

The package is configured for npm Trusted Publishing through GitHub Releases.

## Package formats

- ESM.
- CommonJS.
- IIFE global: `UIHeadlessRuntime`.
- Source maps.
- Declaration rollup.
- TypeDoc API reference.

## Release status

The repository verifies the package locally, but `ui-headless-runtime` is not published on npm yet. npm Trusted Publisher settings are available only after the package exists, so an unregistered name requires a separately authorized bootstrap publication under a distinct prerelease version and non-default dist-tag. After that bootstrap, the owner configures OIDC and the verified `v0.1.0` GitHub Release drives the first stable publication. The repository does not automate or authorize the bootstrap operation.

## Verification

`npm run release:verify` runs release quality gates, package smoke tests, synchronized-version and changelog checks, and the npm registry version check without publishing. `npm run package:check` inspects the tarball and installs it into an isolated consumer.

The tarball must contain only `package.json`, `README.md`, `LICENSE`, and `dist/**`.
