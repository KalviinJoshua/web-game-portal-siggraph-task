import { el } from '../utils/dom.js';

/**
 * Start ("ready") screen shown before a run begins. Lists the controls and
 * begins the run through the provided onStart callback.
 */
export class StartScreen {
  constructor({ onStart } = {}) {
    this.onStart = onStart;
    const hint = el('div', {
      className: 'controls-hint',
      children: [
        this._row(['A', 'D'], 'Switch lanes'),
        this._row(['W', 'S'], 'Hover up / down'),
        this._row(['Space'], 'Use ready power-up'),
        this._row(['P', 'Esc'], 'Pause'),
      ],
    });
    this.startBtn = el('button', {
      className: 'btn btn--primary btn--lg',
      text: 'Start Run',
      attrs: { type: 'button' },
      on: { click: () => this.onStart?.() },
    });
    const panel = el('div', {
      className: 'panel',
      children: [
        el('p', { className: 'panel__kicker', text: 'The void is waiting' }),
        el('h2', { className: 'panel__title', text: 'Ready to Fly?' }),
        el('p', { className: 'panel__sub', text: 'Dodge asteroids, gather energy crystals, survive.' }),
        hint,
        el('div', { className: 'panel__actions', children: [this.startBtn] }),
      ],
    });
    this.el = el('div', { className: 'overlay', children: [panel] });
    this.el.hidden = true;
  }

  _row(keys, label) {
    const keyEls = keys.map((k) => el('span', { className: 'key', text: k }));
    return el('div', { className: 'controls-hint__row', children: [...keyEls, el('span', { text: label })] });
  }

  mount(parent) { parent.append(this.el); }
  show() { this.el.hidden = false; this.startBtn.focus?.(); }
  hide() { this.el.hidden = true; }
  dispose() { this.el.remove(); }
}
