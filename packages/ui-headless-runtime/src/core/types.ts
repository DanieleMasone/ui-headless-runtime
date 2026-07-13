/** Removes a subscription or resource. Calling it more than once is safe. @public */
export type Unsubscribe = () => void;

/** Receives the latest immutable controller snapshot. @public */
export type SnapshotListener<TSnapshot> = (snapshot: Readonly<TSnapshot>) => void;

/**
 * Shared lifecycle implemented by every runtime controller.
 *
 * @remarks
 * `destroy()` is idempotent. After destruction, commands are no-ops, subscriptions return an
 * inert unsubscribe function, and `getSnapshot()` keeps returning the final snapshot.
 * @public
 */
export interface RuntimeController<TSnapshot> {
  /** Returns the current immutable snapshot, including after destruction. */
  getSnapshot(): Readonly<TSnapshot>;
  /** Subscribes to future distinct snapshots without synchronously invoking the listener. */
  subscribe(listener: SnapshotListener<TSnapshot>): Unsubscribe;
  /** Releases owned listeners, timers, observers, focus scopes, and subscriptions. */
  destroy(): void;
}

/** Describes why a controller state transition occurred. @public */
export interface ChangeDetails<TReason extends string> {
  /** Closed union member identifying the cause of the transition. */
  readonly reason: TReason;
  /** Original platform event when the transition came from user interaction. */
  readonly event?: Event;
}

/** Configuration shared by controlled and uncontrolled values. @public */
export interface ControllableValueOptions<TValue, TReason extends string> {
  /** Initial value used only in uncontrolled mode. */
  readonly defaultValue: TValue;
  /** Reads the consumer-owned value. Its presence enables controlled mode. */
  readonly getValue?: () => TValue;
  /** Receives every accepted value request and its typed cause. */
  readonly onValueChange?: (value: TValue, details: ChangeDetails<TReason>) => void;
  /** Subscribes to consumer-owned value changes in controlled mode. */
  readonly subscribeValue?: (listener: () => void) => Unsubscribe;
}

/** Function that may veto a cancellable runtime lifecycle event. @public */
export type RuntimeEventListener<TPayload> = (event: RuntimeEvent<TPayload>) => void;

/** Typed cancellable lifecycle event delivered by runtime controllers. @public */
export interface RuntimeEvent<TPayload> {
  /** Event payload supplied by the controller. */
  readonly detail: Readonly<TPayload>;
  /** Whether a listener cancelled the pending transition. */
  readonly defaultPrevented: boolean;
  /** Cancels a `before*` transition. Calling this for informational events is harmless. */
  preventDefault(): void;
}

/** Uniform typed event surface implemented by interactive controllers. @public */
export interface RuntimeEventSource<TEvents extends object> {
  /** Registers a listener and returns an idempotent unsubscribe function. */
  on<TKey extends keyof TEvents>(
    type: TKey,
    listener: RuntimeEventListener<TEvents[TKey]>,
  ): Unsubscribe;
  /** Removes a previously registered listener. */
  off<TKey extends keyof TEvents>(type: TKey, listener: RuntimeEventListener<TEvents[TKey]>): void;
  /** Registers a listener that is automatically removed after its first call. */
  once<TKey extends keyof TEvents>(
    type: TKey,
    listener: RuntimeEventListener<TEvents[TKey]>,
  ): Unsubscribe;
}
