import './style.css';
import { Game } from './game/Game.js';
import { STATE } from './game/GameState.js';
import { GameHub } from './ui/GameHub.js';
import { HUD } from './ui/HUD.js';
import { LoadingScreen } from './ui/LoadingScreen.js';
import { StartScreen } from './ui/StartScreen.js';
import { PauseMenu } from './ui/PauseMenu.js';
import { GameOver } from './ui/GameOver.js';
import { Leaderboard } from './ui/Leaderboard.js';
import { TouchControls } from './ui/TouchControls.js';
import { LeaderboardService } from './services/LeaderboardService.js';
import { Storage } from './utils/Storage.js';
import { el } from './utils/dom.js';
import { supportsWebGL } from './utils/Performance.js';

/**
 * Top-level application controller. Owns hub <-> game navigation, builds the
 * in-game UI layer once, creates a fresh Game per run and disposes it fully on
 * exit (no page reloads), and routes the Game's hooks to the right UI.
 */
class AppController {
  constructor() {
    this.screen = document.getElementById('game-screen');
    this.game = null;
    this._built = false;

    this.hub = new GameHub({
      onPlay: () => this.play(),
      onLeaderboard: () => this.openLeaderboard(),
    });
    this.hub.setBest(Storage.getHighScore());
  }

  /** Build the game screen's UI layer once and reuse it across runs. */
  _buildGameUi() {
    if (this._built) return;
    this.hud = new HUD();
    this.loading = new LoadingScreen();
    this.start = new StartScreen({ onStart: () => this.game?.start() });
    this.pause = new PauseMenu({
      onResume: () => this.game?.resume(),
      onRestart: () => this.game?.restart(),
      onExit: () => this.exitToHub(),
    });
    this.gameOver = new GameOver({
      onRestart: () => this.game?.restart(),
      onExit: () => this.exitToHub(),
      onSubmit: (payload) => this._submitScore(payload),
    });
    this.touch = new TouchControls();

    // Mount order: HUD + touch + overlays first; the WebGL canvas is appended
    // later by Game.init and sits behind them (overlays carry higher z-index).
    this.hud.mount(this.screen);
    this.touch.mount(this.screen);
    this.loading.mount(this.screen);
    this.start.mount(this.screen);
    this.pause.mount(this.screen);
    this.gameOver.mount(this.screen);
    this.touch.autoShow();
    this._built = true;
  }

  async play() {
    if (!supportsWebGL()) { this._showFatal(); return; }
    this._buildGameUi();
    this.hub.hide();
    this.screen.hidden = false;

    this.game = new Game(this.screen, {
      onStateChange: (s) => this._onState(s),
      onLoadProgress: (p, label) => this.loading.setProgress(p, label),
      onHud: (snap) => this.hud.update(snap),
      onDamage: () => this.hud.flashDamage(),
      onToast: (text, color) => this.hud.showToast(text, color),
      onGameOver: (result) => this._onGameOver(result),
    });

    try {
      await this.game.init();
      this.game.attachTouchControls(this.touch.map);
    } catch (err) {
      console.error('[nebula] game init failed', err);
      this.exitToHub();
      this._showFatal();
    }
  }
  /** Show only the overlay that matches the new state; toggle HUD visibility. */
  _onState(state) {
    for (const o of [this.loading, this.start, this.pause, this.gameOver]) o.hide();
    switch (state) {
      case STATE.LOADING: this.loading.show(); this.hud.setHidden(true); break;
      case STATE.READY: this.start.show(); this.hud.setHidden(true); break;
      case STATE.PLAYING: this.hud.setHidden(false); break;
      case STATE.PAUSED: this.pause.show(); break;
      case STATE.GAME_OVER: this.gameOver.show(); this.hud.setHidden(true); break;
      default: break;
    }
  }

  _onGameOver(result) {
    this.gameOver.setResult(result, Storage.getLastCallsign());
    this.hub.setBest(result?.best ?? Storage.getHighScore());
  }

  async _submitScore({ name, score, distance }) {
    await LeaderboardService.submit({ name, score, distance });
    this.hub.setBest(Storage.getHighScore());
    const entries = await LeaderboardService.getTop(10);
    return { entries, mode: LeaderboardService.mode };
  }

  exitToHub() {
    if (this.game) { this.game.dispose(); this.game = null; }
    this.screen.hidden = true;
    this.hub.setBest(Storage.getHighScore());
    this.hub.show();
  }
  // ---- Hub leaderboard modal ----
  async openLeaderboard() {
    if (!this.modal) this._buildModal();
    this.lb.setMode(LeaderboardService.mode);
    this.lb.renderLoading();
    this.modal.hidden = false;
    this.closeBtn.focus?.();
    const entries = await LeaderboardService.getTop(10);
    this.lb.render(entries, null);
  }

  _buildModal() {
    this.lb = new Leaderboard();
    this.closeBtn = el('button', {
      className: 'panel__close', text: '✕',
      attrs: { type: 'button', 'aria-label': 'Close leaderboard' },
      on: { click: () => this._closeModal() },
    });
    const panel = el('div', { className: 'panel panel--modal', children: [this.closeBtn, this.lb.el] });
    this.modal = el('div', {
      className: 'modal',
      attrs: { role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Leaderboard' },
      children: [panel],
    });
    this.modal.hidden = true;
    this.modal.addEventListener('click', (e) => { if (e.target === this.modal) this._closeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal && !this.modal.hidden) this._closeModal();
    });
    document.body.append(this.modal);
  }

  _closeModal() { if (this.modal) this.modal.hidden = true; }

  _showFatal() {
    const err = document.getElementById('webgl-error');
    if (err) err.hidden = false;
  }
}

// Boot once the DOM is parsed.
function boot() { new AppController(); }
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
