<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  shallowRef,
  watch,
  type ComponentPublicInstance,
  type CSSProperties,
} from 'vue';
import {
  createCombobox,
  createToast,
  type ComboboxOption,
  type ToastRecord,
} from 'ui-headless-runtime';

const people: readonly ComboboxOption[] = Object.freeze([
  { id: 'person-ada', value: 'ada', text: 'Ada Lovelace' },
  { id: 'person-grace', value: 'grace', text: 'Grace Hopper' },
  { id: 'person-margaret', value: 'margaret', text: 'Margaret Hamilton' },
  { id: 'person-katherine', value: 'katherine', text: 'Katherine Johnson' },
  { id: 'person-annie', value: 'annie', text: 'Annie Easley', disabled: true },
  { id: 'person-radia', value: 'radia', text: 'Radia Perlman' },
]);

const selectedValue = ref<string | null>(null);
const selectionLocked = ref(false);
const selectionSubscribers = new Set<() => void>();
const operationOutcome = ref('No promise operation has completed yet.');
const inputElement = ref<HTMLInputElement | null>(null);
const listboxElement = ref<HTMLElement | null>(null);
const lifecycleReleases: (() => void)[] = [];
const toastPauseReleases = new Map<string, () => void>();
const pendingOperations = new Map<number, () => void>();
let mounted = false;

const toast = createToast({ maxVisible: 3 });
const toastSnapshot = shallowRef(toast.getSnapshot());

const stopSelectionWatch = watch(
  selectedValue,
  () => {
    for (const listener of [...selectionSubscribers]) listener();
  },
  { flush: 'sync' },
);

function loadPeople(query: string, signal: AbortSignal): Promise<readonly ComboboxOption[]> {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  // A one-character query is deliberately slower, so quick typing exercises stale-request safety.
  const delay = normalizedQuery.length <= 1 ? 700 : 180;

  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve(
        people.filter(
          (person) =>
            normalizedQuery.length === 0 ||
            person.text.toLocaleLowerCase().includes(normalizedQuery),
        ),
      );
    }, delay);

    function handleAbort(): void {
      window.clearTimeout(timer);
      signal.removeEventListener('abort', handleAbort);
      reject(new DOMException('Suggestion request aborted', 'AbortError'));
    }

    if (signal.aborted) handleAbort();
    else signal.addEventListener('abort', handleAbort, { once: true });
  });
}

const combobox = createCombobox({
  id: 'vue-people',
  loadOptions: loadPeople,
  positioning: { placement: 'bottom-start', offset: 8, collisionPadding: 12 },
  getSelectedValue: () => selectedValue.value,
  onSelectedValueChange(value, details) {
    if (selectionLocked.value) {
      toast.show({
        id: 'selection-rejected',
        message: `Selection rejected by Vue state (${details.reason}).`,
        status: 'info',
        duration: 3500,
      });
      return;
    }
    selectedValue.value = value;
  },
  subscribeSelectedValue(listener) {
    selectionSubscribers.add(listener);
    return () => selectionSubscribers.delete(listener);
  },
});
const comboboxSnapshot = shallowRef(combobox.getSnapshot());

const selectedLabel = computed(
  () => people.find((person) => person.value === selectedValue.value)?.text ?? 'None',
);
const comboboxStatus = computed(() => {
  const snapshot = comboboxSnapshot.value;
  if (snapshot.composing) return 'Composing text; suggestions are paused.';
  if (snapshot.loading) return `Loading suggestions for “${snapshot.query}”…`;
  if (snapshot.empty) return 'No matching people.';
  return `${snapshot.options.length} suggestion${snapshot.options.length === 1 ? '' : 's'} available.`;
});
const popupStyle = computed<CSSProperties>(() => {
  const position = comboboxSnapshot.value.position;
  return position
    ? { position: 'fixed', left: `${position.x}px`, top: `${position.y}px` }
    : { position: 'fixed' };
});
const latestTimedToastId = ref<string | null>(null);
const latestTimedToast = computed<ToastRecord | undefined>(() => {
  const id = latestTimedToastId.value;
  return id ? toastSnapshot.value.all.find((item) => item.id === id) : undefined;
});

function handleInput(event: Event): void {
  if (event instanceof InputEvent) combobox.handleInput(event);
}

function handleKeyDown(event: KeyboardEvent): void {
  combobox.handleKeyDown(event);
}

function handleCompositionStart(): void {
  combobox.handleCompositionStart();
}

function handleCompositionEnd(event: CompositionEvent): void {
  combobox.handleCompositionEnd(event);
}

function selectOption(option: Readonly<ComboboxOption>, event: MouseEvent): void {
  if (!option.disabled) combobox.select(option.id, { reason: 'pointer', event });
}

function clearControlledSelection(): void {
  selectedValue.value = null;
  toast.show({
    message: 'Vue cleared the consumer-owned selection.',
    duration: 3000,
  });
}

function showTimedToast(): void {
  latestTimedToastId.value = toast.show({
    message: 'This timer pauses on hover or focus.',
    status: 'info',
    duration: 6000,
  });
}

function pauseLatestToast(): void {
  if (latestTimedToastId.value) toast.pause(latestTimedToastId.value);
}

function resumeLatestToast(): void {
  if (latestTimedToastId.value) toast.resume(latestTimedToastId.value);
}

function delayedOperation(shouldReject: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      pendingOperations.delete(timer);
      if (shouldReject) reject(new Error('The simulated save was rejected.'));
      else resolve('Profile saved');
    }, 1200);
    pendingOperations.set(timer, () => {
      window.clearTimeout(timer);
      reject(new DOMException('Consumer unmounted', 'AbortError'));
    });
  });
}

function trackPromise(shouldReject: boolean): void {
  operationOutcome.value = 'Promise pending…';
  void toast
    .promise(
      delayedOperation(shouldReject),
      {
        loading: 'Saving profile…',
        success: (message) => message,
        error: (error) => (error instanceof Error ? error.message : 'Save failed'),
      },
      { priority: 2, duration: 4500 },
    )
    .then((value) => {
      operationOutcome.value = `Consumer received fulfillment: ${value}.`;
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      operationOutcome.value = `Consumer received the original rejection: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`;
    });
}

function bindToastPause(id: string, element: Element | ComponentPublicInstance | null): void {
  toastPauseReleases.get(id)?.();
  toastPauseReleases.delete(id);
  if (element instanceof HTMLElement) {
    toastPauseReleases.set(id, toast.bindPause(id, element));
  }
}

onMounted(async () => {
  mounted = true;
  lifecycleReleases.push(
    combobox.subscribe((snapshot) => {
      comboboxSnapshot.value = snapshot;
    }),
    toast.subscribe((snapshot) => {
      toastSnapshot.value = snapshot;
    }),
  );
  await nextTick();
  if (!mounted || !inputElement.value || !listboxElement.value) return;
  lifecycleReleases.push(
    combobox.bind({
      trigger: inputElement.value,
      anchor: inputElement.value,
      content: listboxElement.value,
    }),
  );
  void combobox.refresh();
});

onBeforeUnmount(() => {
  mounted = false;
  lifecycleReleases
    .splice(0)
    .reverse()
    .forEach((release) => release());
  toastPauseReleases.forEach((release) => release());
  toastPauseReleases.clear();
  stopSelectionWatch();
  combobox.destroy();
  toast.destroy();
  pendingOperations.forEach((cancel) => cancel());
  pendingOperations.clear();
  selectionSubscribers.clear();
});
</script>

<template>
  <main class="page-shell">
    <header class="hero">
      <p class="eyebrow">Vue 3 consumer</p>
      <h1>Runtime behavior, Vue-owned rendering</h1>
      <p>
        This standalone app consumes the published package directly. Vue renders immutable snapshots
        while the runtime coordinates async collection behavior and notification lifecycles.
      </p>
    </header>

    <div class="example-grid">
      <section class="card" aria-labelledby="combobox-heading">
        <div class="section-heading">
          <div>
            <p class="kicker">Async collection</p>
            <h2 id="combobox-heading">Assign a team member</h2>
          </div>
          <span class="mode-chip">Controlled selection</span>
        </div>

        <div class="field">
          <label for="people-search">Search people</label>
          <input
            id="people-search"
            ref="inputElement"
            :value="comboboxSnapshot.inputValue"
            role="combobox"
            aria-autocomplete="list"
            :aria-controls="comboboxSnapshot.listboxId"
            :aria-expanded="comboboxSnapshot.open"
            :aria-activedescendant="comboboxSnapshot.activeId ?? undefined"
            :aria-busy="comboboxSnapshot.loading"
            autocomplete="off"
            placeholder="Try “a”, then quickly “ad”"
            @input="handleInput"
            @keydown="handleKeyDown"
            @compositionstart="handleCompositionStart"
            @compositionend="handleCompositionEnd"
          />
          <p class="hint">Arrow keys navigate, Enter selects, and Escape closes the list.</p>
        </div>

        <ul
          v-show="comboboxSnapshot.open"
          :id="comboboxSnapshot.listboxId"
          ref="listboxElement"
          class="listbox"
          role="listbox"
          aria-label="People suggestions"
          :aria-busy="comboboxSnapshot.loading"
          :style="popupStyle"
        >
          <li v-if="comboboxSnapshot.loading" class="listbox-message" role="presentation">
            Loading suggestions…
          </li>
          <li v-else-if="comboboxSnapshot.empty" class="listbox-message" role="presentation">
            No matching people
          </li>
          <template v-else>
            <li
              v-for="option in comboboxSnapshot.options"
              :id="option.id"
              :key="option.id"
              class="option"
              :class="{
                'is-active': comboboxSnapshot.activeId === option.id,
                'is-disabled': option.disabled,
              }"
              role="option"
              :aria-selected="comboboxSnapshot.selectedValue === option.value"
              :aria-disabled="Boolean(option.disabled)"
              @pointerdown.prevent
              @click="selectOption(option, $event)"
            >
              <span>{{ option.text }}</span>
              <span v-if="option.disabled" class="option-note">Unavailable</span>
              <span v-else-if="comboboxSnapshot.selectedValue === option.value" class="option-note">
                Selected
              </span>
            </li>
          </template>
        </ul>

        <p class="sr-only" role="status" aria-live="polite">{{ comboboxStatus }}</p>

        <dl class="state-summary">
          <div>
            <dt>Vue selection</dt>
            <dd>{{ selectedLabel }}</dd>
          </div>
          <div>
            <dt>Query</dt>
            <dd>{{ comboboxSnapshot.query || 'Empty' }}</dd>
          </div>
          <div>
            <dt>Runtime state</dt>
            <dd>{{ comboboxStatus }}</dd>
          </div>
        </dl>

        <div class="control-row">
          <label class="check-control">
            <input v-model="selectionLocked" type="checkbox" />
            Reject selection changes in Vue
          </label>
          <button type="button" class="secondary" @click="clearControlledSelection">
            Clear externally
          </button>
        </div>
      </section>

      <section class="card" aria-labelledby="toast-heading">
        <div class="section-heading">
          <div>
            <p class="kicker">Dynamic lifecycle</p>
            <h2 id="toast-heading">Notification queue</h2>
          </div>
          <span class="mode-chip">{{ toastSnapshot.all.length }} total</span>
        </div>

        <div class="button-stack">
          <button type="button" @click="showTimedToast">Show timed toast</button>
          <button type="button" @click="trackPromise(false)">Track successful promise</button>
          <button type="button" class="danger" @click="trackPromise(true)">
            Track rejected promise
          </button>
        </div>

        <div class="control-row">
          <button
            type="button"
            class="secondary"
            :disabled="!latestTimedToast || latestTimedToast.paused"
            @click="pauseLatestToast"
          >
            Pause latest timer
          </button>
          <button
            type="button"
            class="secondary"
            :disabled="!latestTimedToast?.paused"
            @click="resumeLatestToast"
          >
            Resume latest timer
          </button>
        </div>

        <p class="outcome" role="status" aria-live="polite">{{ operationOutcome }}</p>
        <p class="hint">
          Hover or focus a notification to pause its remaining timeout. Priority controls visible
          queue order.
        </p>

        <div class="queue-summary" aria-live="polite">
          <span>{{ toastSnapshot.visible.length }} visible</span>
          <span>{{ toastSnapshot.queued.length }} queued</span>
        </div>
      </section>
    </div>

    <div class="toast-region" aria-label="Notifications">
      <article
        v-for="item in toastSnapshot.visible"
        :key="item.id"
        :ref="(element) => bindToastPause(item.id, element)"
        class="toast"
        :class="`is-${item.status}`"
        :role="item.politeness === 'assertive' ? 'alert' : 'status'"
      >
        <div>
          <strong>{{ item.status }}</strong>
          <p>{{ item.message }}</p>
          <small v-if="item.paused">Timer paused</small>
        </div>
        <button
          type="button"
          class="icon-button"
          :aria-label="`Dismiss: ${item.message}`"
          @click="toast.dismiss(item.id)"
        >
          ×
        </button>
      </article>
    </div>
  </main>
</template>
