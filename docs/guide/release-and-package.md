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

`ui-headless-runtime@0.1.0` was published manually as the one-time package creation release. Version `0.1.1` was published successfully by the GitHub Release workflow through npm Trusted Publishing OIDC and is the current `latest` version. Do not rerun either release; npm versions are immutable. Future versions, including `1.0.0`, publish through the same verified GitHub Release and OIDC path.

Consumers upgrading from `0.1.x` should review the [1.0 migration guide](./migrating-to-1.0) before adopting the stable package-root API.

## Verification

`npm run release:verify` runs release quality gates, package smoke tests, synchronized-version and changelog checks, and the npm registry version check without publishing. `npm run package:check` inspects the tarball and installs it into an isolated consumer.

The tarball must contain only `package.json`, `README.md`, `LICENSE`, and `dist/**`.
