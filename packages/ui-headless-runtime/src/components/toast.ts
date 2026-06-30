import { createRuntimeId } from '../accessibility/ids';
import { createControllerHost } from '../core/host';
import type { ChangeDetails, EventSource, RuntimeController, Unsubscribe } from '../core/types';
import { createControllableValue } from '../state/controllable';

/** Toast visual/announcement lifecycle state. @public */
export type ToastStatus = 'loading' | 'success' | 'error' | 'info';

/** Toast announcement politeness. @public */
export type ToastPoliteness = 'polite' | 'assertive';

/** Causes of toast queue mutations. @public */
export type ToastChangeReason = 'programmatic' | 'timeout' | 'dismiss' | 'promise' | 'update';

/** Public Toast record rendered by consumers. @public */
export interface ToastRecord {
  /** Stable deduplication ID. */
  readonly id: string;
  /** Human-readable announcement and visible message. */
  readonly message: string;
  /** Semantic lifecycle status. */
  readonly status: ToastStatus;
  /** Higher priorities sort before lower priorities. */
  readonly priority: number;
  /** Live-region politeness. */
  readonly politeness: ToastPoliteness;
  /** Auto-dismiss duration; `null` disables timeout. */
  readonly duration: number | null;
  /** Monotonic insertion sequence used as deterministic tie-breaker. */
  readonly sequence: number;
  /** Whether hover/focus has paused the timeout. */
  readonly paused: boolean;
}

/** Input used to show or update a Toast. @public */
export interface ToastInput {
  /** Optional deduplication ID; generated when omitted. */
  readonly id?: string;
  /** Human-readable message. */
  readonly message: string;
  /** Semantic status. @defaultValue `info` */
  readonly status?: ToastStatus;
  /** Sort priority. @defaultValue `0` */
  readonly priority?: number;
  /** Live-region politeness. @defaultValue `polite` */
  readonly politeness?: ToastPoliteness;
  /** Auto-dismiss duration in milliseconds. @defaultValue `5000` */
  readonly duration?: number | null;
}

/** Toast queue snapshot. @public */
export interface ToastSnapshot {
  /** Visible priority-ordered records. */
  readonly visible: readonly ToastRecord[];
  /** Waiting priority-ordered records. */
  readonly queued: readonly ToastRecord[];
  /** Complete deterministic queue. */
  readonly all: readonly ToastRecord[];
  /** Whether queue state is consumer-owned. */
  readonly controlled: boolean;
}

/** Toast mutation event payload. @public */
export interface ToastEvent {
  /** Affected record. */
  readonly toast: Readonly<ToastRecord>;
  /** Typed mutation cause. */
  readonly details: ChangeDetails<ToastChangeReason>;
}

/** Toast queue event map. @public */
export interface ToastEvents {
  /** Cancellable event emitted before insertion. */
  readonly beforeShow: ToastEvent;
  /** Event emitted after insertion. */
  readonly show: ToastEvent;
  /** Event emitted after a record update. */
  readonly update: ToastEvent;
  /** Event emitted after removal. */
  readonly dismiss: ToastEvent;
  /** Event emitted for every accepted queue mutation. */
  readonly stateChange: ToastEvent;
}

/** Message mapping for promise-backed toasts. @public */
export interface ToastPromiseMessages<TValue> {
  /** Message while the promise is pending. */
  readonly loading: string;
  /** Success message or value-aware formatter. */
  readonly success: string | ((value: TValue) => string);
  /** Error message or unknown-error formatter. */
  readonly error: string | ((error: unknown) => string);
}

/** Toast queue ownership and capacity options. @public */
export interface ToastOptions {
  /** Maximum concurrently visible records. @defaultValue `3` */
  readonly maxVisible?: number;
  /** Consumer-owned record reader. */
  readonly getToasts?: () => readonly ToastRecord[];
  /** Receives queue mutation requests in controlled mode. */
  readonly onToastsChange?: (
    toasts: readonly ToastRecord[],
    details: ChangeDetails<ToastChangeReason>,
  ) => void;
  /** Subscribes to consumer-owned queue changes. */
  readonly subscribeToasts?: (listener: () => void) => Unsubscribe;
}

/** Headless Toast queue controller. @public */
export interface ToastController
  extends RuntimeController<ToastSnapshot>, EventSource<ToastEvents> {
  /** Inserts or updates by ID and returns the stable record ID. */
  show(input: ToastInput): string;
  /** Partially updates an existing record. */
  update(id: string, input: Partial<Omit<ToastInput, 'id'>>): void;
  /** Removes a record immediately. */
  dismiss(id: string, details?: ChangeDetails<ToastChangeReason>): void;
  /** Pauses an auto-dismiss timeout while preserving remaining duration. */
  pause(id: string): void;
  /** Resumes an auto-dismiss timeout from its preserved remaining duration. */
  resume(id: string): void;
  /** Tracks a promise while preserving its original fulfillment or rejection. */
  promise<TValue>(
    promise: Promise<TValue>,
    messages: ToastPromiseMessages<TValue>,
    input?: Omit<ToastInput, 'message' | 'status'>,
  ): Promise<TValue>;
}

/** Creates a priority queue with deterministic ordering, pausable timers, and promise lifecycle. @public */
export function createToast(options: ToastOptions = {}): ToastController {
  const maxVisible = Math.max(1, options.maxVisible ?? 3);
  let sequence = 0;
  const timers = new Map<
    string,
    {
      readonly timer?: ReturnType<typeof setTimeout>;
      readonly started: number;
      readonly remaining: number;
    }
  >();
  const sort = (records: readonly ToastRecord[]): readonly ToastRecord[] =>
    Object.freeze([...records].sort((a, b) => b.priority - a.priority || a.sequence - b.sequence));
  const build = (records: readonly ToastRecord[], controlled: boolean): ToastSnapshot => {
    const all = sort(records);
    return { visible: all.slice(0, maxVisible), queued: all.slice(maxVisible), all, controlled };
  };
  const host = createControllerHost<ToastSnapshot, ToastEvents>(
    build([], options.getToasts !== undefined),
  );
  let reconcileTimers = (): void => undefined;
  const sync = (): void => {
    host.update(build(state.get(), state.controlled));
    reconcileTimers();
  };
  const state = createControllableValue<readonly ToastRecord[], ToastChangeReason>(
    {
      defaultValue: [],
      ...(options.getToasts ? { getValue: options.getToasts } : {}),
      ...(options.onToastsChange ? { onValueChange: options.onToastsChange } : {}),
      ...(options.subscribeToasts ? { subscribeValue: options.subscribeToasts } : {}),
    },
    sync,
  );
  const clearTimer = (id: string): void => {
    const active = timers.get(id);
    if (active?.timer) clearTimeout(active.timer);
    timers.delete(id);
  };
  const dismiss = (
    id: string,
    changeDetails: ChangeDetails<ToastChangeReason> = { reason: 'dismiss' },
  ): void => {
    if (!host.alive()) return;
    const record = state.get().find((toast) => toast.id === id);
    if (!record) return;
    clearTimer(id);
    state.set(
      state.get().filter((toast) => toast.id !== id),
      changeDetails,
    );
    sync();
    const payload = { toast: record, details: changeDetails };
    host.emit('dismiss', payload);
    host.emit('stateChange', payload);
  };
  const startTimer = (record: ToastRecord, remaining = record.duration): void => {
    clearTimer(record.id);
    if (remaining === null || remaining <= 0 || record.paused) return;
    const started = Date.now();
    const timer = setTimeout(() => dismiss(record.id, { reason: 'timeout' }), remaining);
    timers.set(record.id, { timer, started, remaining });
  };
  const stopTimer = (id: string): number | null | undefined => {
    const active = timers.get(id);
    if (!active) return undefined;
    if (active.timer) clearTimeout(active.timer);
    const remaining = Math.max(0, active.remaining - (Date.now() - active.started));
    timers.set(id, { started: Date.now(), remaining });
    return remaining;
  };
  reconcileTimers = (): void => {
    if (!host.alive()) return;
    const records = state.get();
    const byId = new Map(records.map((record) => [record.id, record]));
    for (const id of [...timers.keys()]) {
      const record = byId.get(id);
      if (!record) clearTimer(id);
      else if (record.paused) stopTimer(id);
    }
    for (const record of records) {
      if (record.paused) continue;
      const active = timers.get(record.id);
      if (!active?.timer) startTimer(record, active?.remaining ?? record.duration);
    }
  };
  const show = (input: ToastInput): string => {
    if (!host.alive()) return input.id ?? createRuntimeId('toast');
    const existing = input.id ? state.get().find((toast) => toast.id === input.id) : undefined;
    if (existing) {
      updateRecord(existing.id, input, { reason: 'update' });
      return existing.id;
    }
    sequence += 1;
    const record: ToastRecord = Object.freeze({
      id: input.id ?? createRuntimeId('toast'),
      message: input.message,
      status: input.status ?? 'info',
      priority: input.priority ?? 0,
      politeness: input.politeness ?? 'polite',
      duration: input.duration === undefined ? 5000 : input.duration,
      sequence,
      paused: false,
    });
    const payload = { toast: record, details: { reason: 'programmatic' as const } };
    if (!host.emit('beforeShow', payload)) return record.id;
    state.set([...state.get(), record], payload.details);
    sync();
    host.emit('show', payload);
    host.emit('stateChange', payload);
    return record.id;
  };
  const updateRecord = (
    id: string,
    input: Partial<Omit<ToastInput, 'id'>>,
    changeDetails: ChangeDetails<ToastChangeReason>,
  ): void => {
    if (!host.alive()) return;
    const previous = state.get().find((toast) => toast.id === id);
    if (!previous) return;
    clearTimer(id);
    const record: ToastRecord = Object.freeze({
      ...previous,
      ...input,
      duration: input.duration === undefined ? previous.duration : input.duration,
    });
    state.set(
      state.get().map((toast) => (toast.id === id ? record : toast)),
      changeDetails,
    );
    sync();
    const payload = { toast: record, details: changeDetails };
    host.emit('update', payload);
    host.emit('stateChange', payload);
  };
  host.resources.add(() => state.destroy());
  host.resources.add(() => [...timers.keys()].forEach(clearTimer));
  return {
    getSnapshot: host.getSnapshot,
    subscribe: host.subscribe,
    on: host.on,
    off: host.off,
    once: host.once,
    show,
    update: (id, input) => updateRecord(id, input, { reason: 'update' }),
    dismiss,
    pause(id) {
      if (!host.alive()) return;
      const record = state.get().find((toast) => toast.id === id);
      if (!record || record.paused) return;
      const remaining = stopTimer(id) ?? record.duration;
      const paused = Object.freeze({ ...record, paused: true });
      state.set(
        state.get().map((toast) => (toast.id === id ? paused : toast)),
        { reason: 'update' },
      );
      if (remaining !== null) timers.set(id, { started: Date.now(), remaining });
      sync();
      const payload = { toast: paused, details: { reason: 'update' as const } };
      host.emit('update', payload);
      host.emit('stateChange', payload);
    },
    resume(id) {
      if (!host.alive()) return;
      const record = state.get().find((toast) => toast.id === id);
      if (!record?.paused) return;
      const remaining = timers.get(id)?.remaining ?? record.duration;
      clearTimer(id);
      if (remaining !== null) timers.set(id, { started: Date.now(), remaining });
      const resumed = Object.freeze({ ...record, paused: false });
      state.set(
        state.get().map((toast) => (toast.id === id ? resumed : toast)),
        { reason: 'update' },
      );
      sync();
      const payload = { toast: resumed, details: { reason: 'update' as const } };
      host.emit('update', payload);
      host.emit('stateChange', payload);
    },
    async promise<TValue>(
      promise: Promise<TValue>,
      messages: ToastPromiseMessages<TValue>,
      input: Omit<ToastInput, 'message' | 'status'> = {},
    ) {
      const id = show({ ...input, message: messages.loading, status: 'loading', duration: null });
      try {
        const value = await promise;
        updateRecord(
          id,
          {
            message:
              typeof messages.success === 'function' ? messages.success(value) : messages.success,
            status: 'success',
            duration: input.duration === undefined ? 5000 : input.duration,
          },
          { reason: 'promise' },
        );
        return value;
      } catch (error) {
        updateRecord(
          id,
          {
            message: typeof messages.error === 'function' ? messages.error(error) : messages.error,
            status: 'error',
            politeness: 'assertive',
            duration: input.duration === undefined ? 5000 : input.duration,
          },
          { reason: 'promise' },
        );
        throw error;
      }
    },
    destroy: host.destroy,
  };
}
