// @vitest-environment node

import { describe, expect, it } from 'vitest';

describe('SSR-safe module evaluation', () => {
  it('imports without browser globals and creates DOM-free controllers', async () => {
    expect(globalThis.window).toBeUndefined();
    const runtime = await import('../../packages/ui-headless-runtime/src/index');
    expect(runtime.hasDOM()).toBe(false);
    expect('getOwnerDocument' in runtime).toBe(false);
    expect('createDisposableScope' in runtime).toBe(false);
    expect('trapFocus' in runtime).toBe(false);
    const disclosure = runtime.createDisclosure();
    disclosure.expand();
    expect(disclosure.getSnapshot().expanded).toBe(true);
    disclosure.destroy();
    expect(
      runtime.calculatePosition(
        { x: 0, y: 0, width: 10, height: 10 },
        { width: 5, height: 5 },
        { placement: 'bottom', flip: false, shift: false },
      ),
    ).toMatchObject({ x: 2.5, y: 14 });
  });
});
