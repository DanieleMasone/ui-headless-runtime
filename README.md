# ui-headless-runtime

A framework-agnostic TypeScript library providing accessible, customizable, headless UI primitives for modern web applications.

The library focuses on behavior, accessibility and state management, leaving rendering and styling entirely to the consumer.

No CSS framework.

No design system.

No UI opinions.

Only reusable interaction logic.

---

## Goals

UI Headless Runtime is designed for developers who need complete control over rendering while avoiding reimplementing complex interaction logic.

The project targets:

- enterprise applications
- design systems
- internal platforms
- frontend frameworks
- legacy modernization
- framework-agnostic web applications

---

# Philosophy

Rendering belongs to the application.

Behavior belongs to the library.

The library should never dictate:

- HTML structure
- CSS
- design language
- animations
- branding

Instead it provides:

- accessibility
- keyboard interactions
- focus management
- state management
- event lifecycle
- interaction logic

---

# Design Principles

- Framework agnostic
- TypeScript first
- Accessibility first
- Tree shakeable
- Zero runtime dependencies whenever possible
- Small public API
- Stable API contracts
- Production ready
- Fully documented
- Fully tested

---

# Target Environment

The core library must work in:

- Vanilla JavaScript
- TypeScript
- React
- Angular
- Vue
- Svelte
- Lit
- Web Components
- Micro Frontends

without requiring adapters inside the core.

---

# Supported Components

## Dialog

Features:

- modal
- non-modal
- nested dialogs
- escape handling
- focus trap
- restore focus
- backdrop management
- scroll lock

---

## Popover

Features:

- positioning
- outside click
- keyboard support
- focus management

---

## Dropdown Menu

Features:

- nested menus
- disabled items
- separators
- keyboard navigation
- typeahead search

---

## Context Menu

Features:

- right click
- keyboard open
- nested items
- positioning

---

## Tooltip

Features:

- hover
- focus
- delay
- touch support

---

## Accordion

Features:

- single
- multiple
- collapsible
- keyboard navigation

---

## Tabs

Features:

- manual activation
- automatic activation
- keyboard navigation
- vertical
- horizontal

---

## Disclosure

Features:

- expandable panels
- controlled
- uncontrolled

---

## Toast

Features:

- queue
- priorities
- dismiss
- timeout
- promise support

---

## Command Palette

Features:

- keyboard shortcut
- fuzzy search
- grouping
- custom renderer

---

## Menu

Features:

- nested items
- separators
- disabled state

---

## Listbox

Features:

- single select
- multi select
- keyboard support

---

## Combobox

Features:

- autocomplete
- async suggestions
- filtering

---

## Tree View

Features:

- expand collapse
- keyboard navigation
- selection

---

## Navigation Menu

Features:

- mega menu support
- responsive state

---

## Collapsible

Features:

- simple expandable sections

---

# Accessibility

Accessibility is a primary design goal.

Every component must implement:

- correct ARIA roles
- keyboard navigation
- focus management
- screen reader support
- accessible announcements where appropriate

Target:

WCAG 2.2 AA

---

# Browser Support

Modern evergreen browsers.

Graceful degradation where appropriate.

---

# Public API Principles

Every component exposes only behavior.

Example:

```ts
const dialog = createDialog();

dialog.open();

dialog.close();

dialog.toggle();
```

Rendering remains the responsibility of the application.

---

# Custom Rendering

Developers are free to use:

- HTML
- JSX
- Angular templates
- Vue templates
- Web Components

without restrictions.

---

# Styling

No CSS shipped.

Consumers may use:

- CSS
- SCSS
- Tailwind
- CSS Modules
- Styled Components
- Emotion
- UnoCSS

---

# State Management

Components support:

- controlled mode
- uncontrolled mode

Example:

```ts
dialog.open();

dialog.close();

dialog.isOpen();
```

---

# Event Lifecycle

Components expose typed events.

Example:

```ts
dialog.on("open");

dialog.on("close");

dialog.on("beforeClose");

dialog.on("afterClose");
```

---

# Focus Management

Provide utilities for:

- focus trap
- restore focus
- roving tabindex
- active descendant
- keyboard navigation

---

# Utilities

The project also provides reusable utilities.

Examples:

- focus manager
- keyboard manager
- outside click detector
- portal manager
- scroll lock
- id generator
- aria helpers
- event manager

---

# Architecture

```
src/

core/

accessibility/

events/

focus/

utils/

components/

dialog/

tooltip/

popover/

accordion/

tabs/

menu/

toast/

tree/

command/

types/

index.ts
```

---

# Build

- Vite Library Mode
- TypeScript
- ESM
- CJS
- IIFE

---

# Testing

Unit Tests

- Vitest

Integration Tests

- Vitest DOM

E2E

- Playwright

Accessibility

- axe-core

Coverage target

95%+

---

# Documentation

Every component must include:

- overview
- API
- examples
- accessibility notes
- keyboard support
- browser compatibility

---

# Playground

A demo application must showcase every component.

Features:

- light mode
- dark mode
- live examples
- source snippets
- accessibility panel

Deploy on GitHub Pages.

---

# CI/CD

GitHub Actions

Pipeline:

- install
- lint
- typecheck
- unit tests
- accessibility tests
- Playwright
- build
- documentation
- deploy GitHub Pages

---

# Performance Goals

- Tree shakeable
- Lazy load friendly
- No unnecessary allocations
- Minimal DOM operations

---

# Code Quality

- ESLint
- Prettier
- Strict TypeScript
- API Extractor
- Typedoc

---

# Non Goals

This project intentionally does NOT provide:

- CSS framework
- component styling
- design tokens
- animations
- visual themes
- icons
- framework-specific wrappers
- drag and drop
- layout systems

---

# Future Packages

This library is part of a larger ecosystem.

Planned packages:

- validation-runtime
- permissions-runtime
- workflow-runtime
- table-runtime
- feature-flags-runtime
- search-runtime

All packages will share:

- consistent API
- documentation standards
- testing strategy
- CI pipeline
- coding conventions

---

# License

MIT
