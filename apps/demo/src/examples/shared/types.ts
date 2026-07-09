export interface DemoEvent {
  readonly name: string;
  readonly timestamp: number;
  readonly payload: unknown;
}

export interface ExampleContext {
  readonly scenario: string;
  readonly mount: HTMLElement;
  readonly emit: (event: DemoEvent) => void;
}

export interface ExampleInstance {
  readonly getSnapshot: () => Readonly<object>;
  readonly destroy: () => void;
}

export type ExampleFactory = (
  context: ExampleContext,
) => ExampleInstance | Promise<ExampleInstance>;
