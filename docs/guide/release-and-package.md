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

The repository verifies the package locally, but `ui-headless-runtime` is not published on npm yet. The first public release requires external npm Trusted Publisher setup and a published GitHub Release with a matching `vX.Y.Z` tag.

## Verification

`npm run release:verify` runs release quality gates and package smoke tests without publishing. `npm run package:check` inspects the tarball and installs it into an isolated consumer.

The tarball must contain only `package.json`, `README.md`, `LICENSE`, and `dist/**`.
