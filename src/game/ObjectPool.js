/**
 * A minimal object pool.
 *
 * Endless runners spawn and discard a lot of objects. Allocating fresh meshes
 * every frame would thrash the garbage collector and cause hitches, so instead
 * we recycle a fixed set of entities: `acquire()` hands back an idle one (or
 * creates a new one up to `max`), and `release()` returns it to the free list.
 *
 * Pooled entities are expected to expose an optional `deactivate()` (to hide
 * themselves) and `dispose()` (to free GPU resources on teardown).
 */
export class ObjectPool {
  /**
   * @param {() => object} factory  Creates a brand-new pooled entity.
   * @param {number} max            Hard cap on simultaneously active entities.
   */
  constructor(factory, max = Infinity) {
    this.factory = factory;
    this.max = max;
    this.free = [];
    this.active = [];
  }

  /** Get an idle entity, or null if the active cap has been reached. */
  acquire() {
    let obj = this.free.pop();
    if (!obj) {
      if (this.active.length >= this.max) return null;
      obj = this.factory();
    }
    this.active.push(obj);
    return obj;
  }

  /** Return an entity to the pool and hide it. */
  release(obj) {
    const i = this.active.indexOf(obj);
    if (i === -1) return;
    this.active.splice(i, 1);
    if (typeof obj.deactivate === 'function') obj.deactivate();
    this.free.push(obj);
  }

  /** Recycle everything currently active (used on restart). */
  releaseAll() {
    for (let i = this.active.length - 1; i >= 0; i--) this.release(this.active[i]);
  }

  /** Iterate active entities. Safe to release the current item from within. */
  forEach(fn) {
    for (let i = this.active.length - 1; i >= 0; i--) fn(this.active[i], i);
  }

  get activeCount() {
    return this.active.length;
  }

  /** Permanently dispose every entity (GPU cleanup on full teardown). */
  dispose() {
    for (const obj of [...this.active, ...this.free]) {
      if (typeof obj.dispose === 'function') obj.dispose();
    }
    this.free.length = 0;
    this.active.length = 0;
  }
}
