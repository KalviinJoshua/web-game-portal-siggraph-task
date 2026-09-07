/**
 * Collision detection.
 *
 * All game objects expose a simple bounding sphere via `getCollider()`, so a
 * hit is just a squared-distance test — no per-triangle math. We also early-out
 * on the Z axis: because obstacles stream toward the player along Z, anything
 * not roughly level with the ship can be skipped before the full 3D test.
 *
 * Only active, pooled objects are ever tested, keeping the per-frame cost flat.
 */
export class CollisionManager {
  /** True when two bounding spheres overlap. */
  static hit(a, b) {
    const dz = a.position.z - b.position.z;
    const reach = a.radius + b.radius;
    if (dz > reach || dz < -reach) return false; // cheap Z cull first
    const dx = a.position.x - b.position.x;
    const dy = a.position.y - b.position.y;
    return dx * dx + dy * dy + dz * dz <= reach * reach;
  }

  /**
   * Test the player against every active obstacle / pickup and invoke the
   * matching handler. Handlers decide what happens (damage, score, power-up).
   *
   * @param {{position, radius}} player  Player bounding sphere.
   * @param {{asteroids, crystals, powerups}} pools  Object pools.
   * @param {{onAsteroid, onCrystal, onPowerUp}} handlers
   */
  check(player, pools, handlers) {
    pools.asteroids.forEach((a) => {
      if (a.active && CollisionManager.hit(player, a.getCollider())) handlers.onAsteroid(a);
    });
    pools.crystals.forEach((c) => {
      if (c.active && CollisionManager.hit(player, c.getCollider())) handlers.onCrystal(c);
    });
    pools.powerups.forEach((p) => {
      if (p.active && CollisionManager.hit(player, p.getCollider())) handlers.onPowerUp(p);
    });
  }
}
