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

`ui-headless-runtime@0.1.0` was published manually as the one-time package creation release. Version
`0.1.1` validated the GitHub Release workflow through npm Trusted Publishing OIDC, and `1.0.0` was
published through that path as the current stable `latest`. Do not rerun these releases; npm
versions are immutable. Future versions publish through the same verified GitHub Release and OIDC
path.

Consumers upgrading from `0.1.x` should review the [1.0 migration guide](./migrating-to-1.0) before adopting the stable package-root API.

## Verification

`npm run release:verify` runs release quality gates, package smoke tests, synchronized-version and changelog checks, and the npm registry version check without publishing. `npm run package:check` inspects the tarball and installs it into an isolated consumer.

The tarball must contain only `package.json`, `README.md`, `LICENSE`, and `dist/**`.

Standalone framework consumers under `examples/consumers/` use the published `^1.0.0` package and
have their own verification command and lockfiles. They are separate from the tarball smoke test,
outside root workspaces and core CI, and never enter the published package.
