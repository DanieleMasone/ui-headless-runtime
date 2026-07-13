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

`ui-headless-runtime@0.1.0` is published on npm under the `latest` dist-tag. It was published manually as the one-time package creation release. Do not rerun `v0.1.0` to publish it again; npm versions are immutable. Future versions publish from the verified GitHub Release workflow through npm Trusted Publishing OIDC.

## Verification

`npm run release:verify` runs release quality gates, package smoke tests, synchronized-version and changelog checks, and the npm registry version check without publishing. `npm run package:check` inspects the tarball and installs it into an isolated consumer.

The tarball must contain only `package.json`, `README.md`, `LICENSE`, and `dist/**`.
