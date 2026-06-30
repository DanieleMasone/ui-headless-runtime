import type { DemoEvent } from '../examples/create-example';
import { serializeForInspector } from '../accessibility/serialize';

export class EventLog {
  readonly #limit: number;
  readonly #events: DemoEvent[] = [];
  readonly #container: HTMLElement;

  constructor(container: HTMLElement, limit = 40) {
    this.#container = container;
    this.#limit = limit;
  }

  push(event: DemoEvent): void {
    this.#events.unshift(event);
    if (this.#events.length > this.#limit) this.#events.length = this.#limit;
    this.render();
  }

  clear(): void {
    this.#events.length = 0;
    this.render();
  }

  render(): void {
    if (this.#events.length === 0) {
      this.#container.textContent = 'No events yet. Interact with the example.';
      return;
    }
    this.#container.replaceChildren(
      ...this.#events.map((event) => {
        const row = document.createElement('div');
        row.className = 'event-row';
        const name = document.createElement('strong');
        name.textContent = event.name;
        const time = document.createElement('time');
        time.textContent = `+${event.timestamp.toFixed(0)} ms`;
        const payload = document.createElement('code');
        payload.textContent = serializeForInspector(event.payload);
        row.append(name, time, payload);
        return row;
      }),
    );
  }
}
