import { el } from '../utils/dom.js';
import { isTouchDevice } from '../utils/Performance.js';

/**
 * On-screen touch controls (shown on touch / coarse-pointer devices). Builds
 * the buttons and exposes a `map` of elements that the InputManager wires up.
 * Every button is a real <button> ≥ 48px for accessible tap targets.
 */
export class TouchControls {
  constructor() {
    this.map = {};
    const btn = (role, glyph, label, extra = '') => {
      const b = el('button', {
        className: `touch__btn ${extra}`.trim(),
        text: glyph,
        attrs: { type: 'button', 'aria-label': label },
      });
      this.map[role] = b;
      return b;
    };

    const move = el('div', {
      className: 'touch__cluster touch__cluster--move',
      children: [btn('left', '◄', 'Move left'), btn('right', '►', 'Move right')],
    });
    const vert = el('div', {
      className: 'touch__cluster touch__cluster--vert',
      children: [btn('up', '▲', 'Hover up'), btn('down', '▼', 'Hover down')],
    });
    const action = el('div', {
      className: 'touch__cluster touch__cluster--action',
      children: [
        vert,
        btn('use', 'Use', 'Use power-up', 'touch__btn--use'),
        btn('pause', '❚❚', 'Pause', 'touch__btn--pause'),
      ],
    });
    this.el = el('div', { className: 'touch', children: [move, action] });
  }

  mount(parent) { parent.append(this.el); }

  /** Reveal the controls when the device is touch-capable. */
  autoShow() {
    if (isTouchDevice()) this.el.classList.add('is-active');
  }

  dispose() { this.el.remove(); }
}
