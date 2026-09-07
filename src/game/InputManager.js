/**
 * Unified keyboard + touch input.
 *
 * The manager translates raw events into a tiny set of intents and forwards
 * them to handlers registered by the game:
 *   - 'lane'  (dir: -1 | +1)  discrete lane change (edge-triggered)
 *   - 'use'                   activate the ready power-up
 *   - 'pause'                 toggle pause
 * Vertical movement is a *held* axis exposed via `.vertical` (+1 up, -1 down).
 *
 * Listeners are only attached while the game screen is active, so the hub page
 * keeps normal keyboard scrolling. All listeners are removed on dispose().
 */
export class InputManager {
  constructor() {
    this.handlers = {};
    this.vert = { up: false, down: false };
    this._down = new Set(); // keys currently held (to ignore auto-repeat)
    this._active = false; // gates gameplay intents (lane/use/vertical)
    this._touchCleanup = [];

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
    this._attached = false;
  }

  on(name, fn) {
    this.handlers[name] = fn;
    return this;
  }

  _emit(name, arg) {
    this.handlers[name]?.(arg);
  }

  /** +1 up, -1 down, 0 idle. Only meaningful while active. */
  get vertical() {
    if (!this._active) return 0;
    return (this.vert.up ? 1 : 0) - (this.vert.down ? 1 : 0);
  }

  /** Enable/disable gameplay intents (kept off during loading/menus). */
  setActive(active) {
    this._active = active;
    if (!active) {
      this.vert.up = this.vert.down = false;
      this._down.clear();
    }
  }

  /** Start listening for keyboard input (called when the game opens). */
  attach() {
    if (this._attached) return;
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this._attached = true;
  }

  detach() {
    if (!this._attached) return;
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup', this._onKeyUp);
    this._attached = false;
    this.setActive(false);
  }

  _onKeyDown(e) {
    const k = e.key.toLowerCase();
    const gameKeys = ['arrowleft', 'arrowright', 'arrowup', 'arrowdown', 'a', 'd', 'w', 's', ' '];
    if (gameKeys.includes(k)) e.preventDefault();

    // Pause works regardless of the active flag so you can always pause/resume.
    if (k === 'p' || k === 'escape') {
      if (!this._down.has(k)) this._emit('pause');
      this._down.add(k);
      return;
    }
    if (!this._active) return;
    if (this._down.has(k)) return; // ignore OS auto-repeat for edge actions
    this._down.add(k);

    if (k === 'arrowleft' || k === 'a') this._emit('lane', -1);
    else if (k === 'arrowright' || k === 'd') this._emit('lane', 1);
    else if (k === 'arrowup' || k === 'w') this.vert.up = true;
    else if (k === 'arrowdown' || k === 's') this.vert.down = true;
    else if (k === ' ') this._emit('use');
  }

  _onKeyUp(e) {
    const k = e.key.toLowerCase();
    this._down.delete(k);
    if (k === 'arrowup' || k === 'w') this.vert.up = false;
    else if (k === 'arrowdown' || k === 's') this.vert.down = false;
  }

  /**
   * Wire on-screen touch buttons. `map` holds button elements keyed by role:
   * { left, right, up, down, use, pause }. All are optional.
   */
  attachTouch(map) {
    const press = (el, onDown, onUp) => {
      if (!el) return;
      const down = (e) => {
        e.preventDefault();
        el.classList.add('is-pressed');
        onDown?.();
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('is-pressed');
        onUp?.();
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointerleave', up);
      el.addEventListener('pointercancel', up);
      this._touchCleanup.push(() => {
        el.removeEventListener('pointerdown', down);
        el.removeEventListener('pointerup', up);
        el.removeEventListener('pointerleave', up);
        el.removeEventListener('pointercancel', up);
      });
    };

    // Discrete: fire once per tap. Held: drive the vertical axis.
    press(map.left, () => this._active && this._emit('lane', -1));
    press(map.right, () => this._active && this._emit('lane', 1));
    press(map.up, () => { if (this._active) this.vert.up = true; }, () => (this.vert.up = false));
    press(map.down, () => { if (this._active) this.vert.down = true; }, () => (this.vert.down = false));
    press(map.use, () => this._active && this._emit('use'));
    press(map.pause, () => this._emit('pause'));
  }

  dispose() {
    this.detach();
    for (const fn of this._touchCleanup) fn();
    this._touchCleanup.length = 0;
    this.handlers = {};
  }
}
