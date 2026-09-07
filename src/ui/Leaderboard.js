import { el, padScore, formatMetres } from '../utils/dom.js';

/**
 * Renders a leaderboard table (rank / pilot / score / distance) into its own
 * root element. Reused by the hub modal and the game-over panel; the caller
 * fetches rows from LeaderboardService and passes them in. Player names arrive
 * pre-sanitised, but are still set via textContent (never innerHTML).
 */
export class Leaderboard {
  constructor() {
    this.mode = el('span', { className: 'lb__mode', text: 'LOCAL' });
    this.note = el('p', { className: 'lb__note', text: 'Local rankings — saved in this browser.' });
    this.body = el('tbody');
    const table = el('table', {
      className: 'lb__table',
      children: [
        el('thead', {
          children: [
            el('tr', {
              children: [
                el('th', { text: '#' }),
                el('th', { text: 'Pilot' }),
                el('th', { className: 'num', text: 'Score' }),
                el('th', { className: 'num', text: 'Distance' }),
              ],
            }),
          ],
        }),
        this.body,
      ],
    });
    const head = el('div', {
      className: 'lb__head',
      children: [el('h3', { text: 'Leaderboard' }), this.mode],
    });
    this.el = el('div', { className: 'lb', children: [head, this.note, table] });
  }

  setMode(mode) {
    const global = mode === 'GLOBAL';
    this.mode.textContent = global ? 'GLOBAL' : 'LOCAL';
    this.mode.classList.toggle('lb__mode--global', global);
    this.note.textContent = global
      ? 'Global rankings — top pilots across the network.'
      : 'Local rankings — saved in this browser.';
  }

  renderLoading() {
    this.body.replaceChildren(
      el('tr', { children: [el('td', { className: 'lb__empty', text: 'Loading…', attrs: { colspan: '4' } })] }),
    );
  }

  render(entries, highlightName) {
    this.body.replaceChildren();
    if (!entries || entries.length === 0) {
      this.body.append(
        el('tr', {
          children: [el('td', { className: 'lb__empty', text: 'No runs logged yet. Be the first.', attrs: { colspan: '4' } })],
        }),
      );
      return;
    }
    entries.forEach((e, i) => {
      const isYou = highlightName && e.name === highlightName;
      this.body.append(
        el('tr', {
          className: isYou ? 'lb__row--you' : '',
          children: [
            el('td', { className: 'lb__rank', text: String(i + 1) }),
            el('td', { text: e.name || 'Pilot' }),
            el('td', { className: 'num', text: padScore(e.score) }),
            el('td', { className: 'num', text: `${formatMetres(e.distance)} m` }),
          ],
        }),
      );
    });
  }
}
