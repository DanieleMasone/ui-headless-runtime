# Vanilla JavaScript

```js
import { createDisclosure } from 'ui-headless-runtime';

const trigger = document.querySelector('#trigger');
const panel = document.querySelector('#panel');
const disclosure = createDisclosure({ id: 'filters' });

const render = (snapshot) => {
  trigger.setAttribute('aria-expanded', String(snapshot.expanded));
  trigger.setAttribute('aria-controls', snapshot.trigger.ariaControls);
  panel.hidden = !snapshot.expanded;
};

render(disclosure.getSnapshot());
const unsubscribe = disclosure.subscribe(render);
trigger.addEventListener('click', disclosure.handleTriggerClick);

// Unmount
trigger.removeEventListener('click', disclosure.handleTriggerClick);
unsubscribe();
disclosure.destroy();
```

The application owns DOM structure and styles. Prefer native buttons, explicit labels, and the binding functions documented for overlays.
