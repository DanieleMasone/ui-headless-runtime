# Navigation Menu

## Overview and use cases

Navigation Menu coordinates simple links or mega-menu content. The consumer—not a media query inside the runtime—chooses desktop or compact mode.

## Options, snapshot, and composition

Configure mode, desktop open/close delay, controlled open item, and positioning. It composes Menu for collection behavior, Disclosure for item content, and Positioning for floating coordinates. Snapshot exposes mode, open/active IDs, items, ownership, and position.

## Commands, events, keyboard, and focus

Register, bind, open/close, schedule pointer intent, forward keyboard, and set mode. beforeOpen/beforeClose may cancel. Arrow/Menu navigation and Escape are shared; the consumer renders links, buttons, nested content, and appropriate landmarks.

## Cleanup and limitations

Mode changes cancel pending intent timers. Registration and controller destruction release every composed resource. Mobile drawer layout and breakpoint selection remain outside the package.

Desktop intent, consumer-selected compact mode, and mega-menu examples execute from the component-specific [`navigation-menu.ts` example module](https://github.com/DanieleMasone/ui-headless-runtime/blob/main/apps/demo/src/examples/navigation-menu.ts).
