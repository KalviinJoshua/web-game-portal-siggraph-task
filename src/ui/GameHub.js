import { prefersReducedMotion } from '../utils/Performance.js';

/**
 * Wires the statically-authored Game Hub: responsive nav, in-page link
 * behaviour, hero stats, and the lightweight 2D animated star background
 * (a plain canvas, not Three.js). PLAY / LEADERBOARD actions are delegated
 * back to the AppController via the provided callbacks.
 */
export class GameHub {
  constructor({ onPlay, onLeaderboard } = {}) {
    this.onPlay = onPlay;
    this.onLeaderboard = onLeaderboard;
    this._raf = 0;
    this._stars = [];
    this._reduced = prefersReducedMotion();

    this.root = document.getElementById('hub');
    this.nav = document.getElementById('nav');
    this.toggle = document.getElementById('nav-toggle');
    this.links = document.getElementById('nav-links');
    this.canvas = document.getElementById('hub-stars');

    this._bind();
    this._initStars();
    this._setYear();
  }

  _bind() {
    this.toggle?.addEventListener('click', () => {
      const open = this.nav.classList.toggle('is-open');
      this.toggle.setAttribute('aria-expanded', String(open));
    });
    // Close the mobile menu after following an in-page anchor.
    this.links?.querySelectorAll('[data-nav]').forEach((a) =>
      a.addEventListener('click', () => this._closeNav()));
    // There are several PLAY buttons (hero + card); wire them all.
    document.querySelectorAll('[data-action="play"]').forEach((b) =>
      b.addEventListener('click', () => { this._closeNav(); this.onPlay?.(); }));
    document.querySelectorAll('[data-action="leaderboard"]').forEach((b) =>
      b.addEventListener('click', () => { this._closeNav(); this.onLeaderboard?.(); }));
  }

  _closeNav() {
    this.nav?.classList.remove('is-open');
    this.toggle?.setAttribute('aria-expanded', 'false');
  }

  _setYear() {
    const y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  setBest(score) {
    const b = document.getElementById('hero-best');
    if (b) b.textContent = String(Math.max(0, Math.floor(score || 0))).padStart(6, '0');
  }

  show() { this.root.hidden = false; this._start(); }
  hide() { this.root.hidden = true; this._stop(); }

  // ---------- Animated star canvas ----------
  _initStars() {
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) return;
    this._resize = () => this._sizeCanvas();
    window.addEventListener('resize', this._resize);
    this._sizeCanvas();
    this._start();
  }

  _sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._w = w;
    this._h = h;
    const count = Math.max(40, Math.min(160, Math.floor((w * h) / 9000)));
    this._stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      z: Math.random() * 0.8 + 0.2,
      r: Math.random() * 1.4 + 0.3,
    }));
  }

  _start() {
    if (this._raf || !this.ctx) return;
    const loop = () => {
      this._draw();
      // Under reduced-motion we draw a single static field and stop.
      this._raf = this._reduced ? 0 : requestAnimationFrame(loop);
    };
    loop();
  }

  _stop() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _draw() {
    const { ctx, _w: w, _h: h } = this;
    if (!ctx) return;
    ctx.clearRect(0, 0, w, h);
    for (const s of this._stars) {
      if (!this._reduced) {
        s.y += s.z * 0.25;
        if (s.y > h) { s.y = 0; s.x = Math.random() * w; }
      }
      ctx.globalAlpha = 0.25 + s.z * 0.6;
      ctx.fillStyle = '#bcd4ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  dispose() {
    this._stop();
    if (this._resize) window.removeEventListener('resize', this._resize);
  }
}
