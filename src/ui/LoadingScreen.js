import { el } from '../utils/dom.js';

const STEPS = ['Renderer', '3D environment', 'Spacecraft', 'Game systems'];

/**
 * Loading overlay shown while the Three.js scene is built. Driven by the
 * game's onLoadProgress(fraction, label) hook.
 */
export class LoadingScreen {
  constructor() {
    this.fill = el('div', { className: 'loader__fill' });
    this.items = STEPS.map((label) => el('li', { text: label }));
    const panel = el('div', {
      className: 'panel',
      children: [
        el('p', { className: 'panel__kicker', text: 'Initialising' }),
        el('h2', { className: 'panel__title', text: 'Nebula Runner' }),
        el('div', { className: 'loader__bar', children: [this.fill] }),
        el('ul', { className: 'loader__list', children: this.items }),
      ],
    });
    this.el = el('div', {
      className: 'overlay',
      attrs: { role: 'status', 'aria-live': 'polite' },
      children: [panel],
    });
    this.el.hidden = true;
  }

  mount(parent) { parent.append(this.el); }
  show() { this.el.hidden = false; }
  hide() { this.el.hidden = true; }

  setProgress(fraction, label) {
    const clamped = Math.max(0, Math.min(1, fraction || 0));
    this.fill.style.width = `${Math.round(clamped * 100)}%`;
    const done = Math.round(STEPS.length * clamped);
    this.items.forEach((li, i) => li.classList.toggle('is-done', i < done));
    if (label) this.el.setAttribute('aria-label', `Loading: ${label}`);
  }

  dispose() { this.el.remove(); }
}
