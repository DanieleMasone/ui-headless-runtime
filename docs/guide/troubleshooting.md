# Troubleshooting

## Nothing updates

Confirm that you subscribed before expecting render updates and that your render function reads the latest snapshot.

## Controlled state seems ignored

The controller requests changes; it does not commit controlled values by itself. Update the external store, then notify through `subscribeValue` when that option is used.

## Focus does not restore

Check that the trigger is still connected when the overlay closes. The runtime avoids focusing removed nodes.

## A parent overlay closes when a child opens

Register child overlays through the provided controller behavior and avoid custom outside-click handlers that ignore composed paths.

## Docs or demo links fail

Run `npm run build`, `npm run docs:check`, `npm run build:site`, and `npm run site:check`. Public documentation links should point to generated HTML routes, not raw Markdown files.
