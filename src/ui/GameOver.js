import { el, padScore, formatMetres, sanitizeCallsign } from '../utils/dom.js';
import { Leaderboard } from './Leaderboard.js';

/**
 * Game-over overlay: run summary, a validated callsign field, and Submit /
 * Run again / Return-to-hub actions. Submitting swaps the field for an inline
 * leaderboard. onSubmit({name,score,distance}) resolves to {entries, mode}.
 */
export class GameOver {
  constructor({ onRestart, onExit, onSubmit } = {}) {
    this.onRestart = onRestart;
    this.onExit = onExit;
    this.onSubmit = onSubmit;
    this._submitted = false;
    this._build();
  }

  _build() {
    this.scoreVal = el('div', { className: 'summary__value', text: '000000' });
    this.distVal = el('div', { className: 'summary__value', text: '0 m' });
    this.bestVal = el('div', { className: 'summary__value summary__value--best', text: '000000' });
    const summary = el('div', {
      className: 'summary',
      children: [
        this._item('Score', this.scoreVal),
        this._item('Distance', this.distVal),
        this._item('Best', this.bestVal, true),
      ],
    });

    this.input = el('input', {
      className: 'field__input',
      attrs: { type: 'text', maxlength: '16', placeholder: 'Callsign', 'aria-label': 'Pilot callsign', autocomplete: 'off' },
    });
    this.error = el('div', { className: 'field__error', attrs: { 'aria-live': 'polite' } });
    this.field = el('div', {
      className: 'field',
      children: [el('label', { className: 'field__label', text: 'Pilot callsign' }), this.input, this.error],
    });

    this.submitBtn = el('button', {
      className: 'btn btn--primary', text: 'Submit score',
      attrs: { type: 'button' }, on: { click: () => this._submit() },
    });
    const againBtn = el('button', {
      className: 'btn btn--ghost', text: 'Run again',
      attrs: { type: 'button' }, on: { click: () => this.onRestart?.() },
    });
    const exitBtn = el('button', {
      className: 'btn btn--danger', text: 'Return to hub',
      attrs: { type: 'button' }, on: { click: () => this.onExit?.() },
    });
    this.actions = el('div', { className: 'panel__actions', children: [this.submitBtn, againBtn, exitBtn] });

    this.kicker = el('p', { className: 'panel__kicker', text: 'Signal lost' });
    this.lbHolder = el('div');
    const panel = el('div', {
      className: 'panel',
      children: [
        this.kicker,
        el('h2', { className: 'panel__title panel__title--fail', text: 'Mission Failed' }),
        summary, this.field, this.lbHolder, this.actions,
      ],
    });
    this.el = el('div', { className: 'overlay', children: [panel] });
    this.el.hidden = true;

    this.input.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._submit(); });
  }

  _item(label, valueEl, wide) {
    return el('div', {
      className: wide ? 'summary__item summary__item--wide' : 'summary__item',
      children: [el('div', { className: 'summary__label', text: label }), valueEl],
    });
  }

  setResult({ score, metres, best, isNewBest } = {}, lastName) {
    this._submitted = false;
    this._score = Math.floor(score || 0);
    this._metres = Math.floor(metres || 0);
    this.scoreVal.textContent = padScore(this._score);
    this.distVal.textContent = `${formatMetres(this._metres)} m`;
    this.bestVal.textContent = padScore(best || 0);
    this.kicker.textContent = isNewBest ? 'New personal best!' : 'Signal lost';
    this.error.textContent = '';
    this.error.classList.remove('field__ok');
    this.input.value = lastName || '';
    this.field.hidden = false;
    this.submitBtn.hidden = false;
    this.submitBtn.disabled = false;
    this.submitBtn.textContent = 'Submit score';
    this.lbHolder.replaceChildren();
  }

  async _submit() {
    if (this._submitted) return;
    const { ok, value, error } = sanitizeCallsign(this.input.value);
    if (!ok) {
      this.error.textContent = error;
      this.error.classList.remove('field__ok');
      this.input.focus();
      return;
    }
    this._submitted = true;
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Submitting…';
    try {
      const { entries, mode } = (await this.onSubmit?.({ name: value, score: this._score, distance: this._metres })) || {};
      const lb = new Leaderboard();
      lb.setMode(mode || 'LOCAL');
      lb.render(entries || [], value);
      this.lbHolder.replaceChildren(lb.el);
      this.field.hidden = true;
      this.submitBtn.hidden = true;
    } catch {
      this.error.textContent = 'Could not submit — your score is still saved locally.';
      this._submitted = false;
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Submit score';
    }
  }

  mount(parent) { parent.append(this.el); }
  show() { this.el.hidden = false; }
  hide() { this.el.hidden = true; }
  dispose() { this.el.remove(); }
}
