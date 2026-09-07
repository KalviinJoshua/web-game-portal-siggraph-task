import { el } from '../utils/dom.js';

/**
 * Pause overlay with Resume / Restart / Exit actions. Shown while the game is
 * in the PAUSED state; the HUD stays visible behind it.
 */
export class PauseMenu {
  constructor({ onResume, onRestart, onExit } = {}) {
    const mk = (label, cls, fn) =>
      el('button', { className: `btn ${cls}`, text: label, attrs: { type: 'button' }, on: { click: fn } });

    this.resumeBtn = mk('Resume', 'btn--primary', () => onResume?.());
    const panel = el('div', {
      className: 'panel',
      children: [
        el('p', { className: 'panel__kicker', text: 'Systems held' }),
        el('h2', { className: 'panel__title', text: 'Paused' }),
        el('div', {
          className: 'panel__actions',
          children: [
            this.resumeBtn,
            mk('Restart', 'btn--ghost', () => onRestart?.()),
            mk('Exit to hub', 'btn--danger', () => onExit?.()),
          ],
        }),
      ],
    });
    this.el = el('div', { className: 'overlay', children: [panel] });
    this.el.hidden = true;
  }

  mount(parent) { parent.append(this.el); }
  show() { this.el.hidden = false; this.resumeBtn.focus?.(); }
  hide() { this.el.hidden = true; }
  dispose() { this.el.remove(); }
}
