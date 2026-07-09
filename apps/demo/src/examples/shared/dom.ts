export const element = <TName extends keyof HTMLElementTagNameMap>(
  name: TName,
  text?: string,
): HTMLElementTagNameMap[TName] => {
  const node = document.createElement(name);
  if (text) node.textContent = text;
  return node;
};

export const button = (label: string, onClick: () => void): HTMLButtonElement => {
  const node = element('button', label);
  node.type = 'button';
  node.addEventListener('click', onClick);
  return node;
};

export const createStage = (mount: HTMLElement, scenario: string): HTMLElement => {
  mount.replaceChildren();
  const stage = element('div');
  stage.className = 'example-stage';
  stage.dataset.scenario = scenario;
  mount.append(stage);
  return stage;
};
