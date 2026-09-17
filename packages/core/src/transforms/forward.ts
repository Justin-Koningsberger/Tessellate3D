import type { Point2D } from '../tessellationEngine.ts';

export const forward = {
  /**
   * Conformal Warp Function: Logarithmic Spiral (w = e^z)
   *
   * This mapping uses standard w = e^z (radiating uniform grid layout paths
   * directly into an organic outer spiral space) rather than compressing down
   * via a traditional complex natural log w = ln(z).
   */
  logarithmic: (point: Point2D, scale: number): Point2D => {
    const r = Math.exp(point.x) * scale;

    return {
      x: r * Math.cos(point.y),
      y: r * Math.sin(point.y)
    };
  },

  /**
   * 3A. SINGLE-POLE LOG-PERIODIC SPIRAL VARIANT
   * Core math adapted from Section 3 of the paper. This keeps tiles structurally
   * identical while cleanly scaling them down toward a central focal pole.
   *
   * Input coordinates act as dedicated structural grid rings. Map depths
   * are controlled via an e^(-x) decay multiplication layer, preventing
   * catastrophic mathematical singularity collapses.
   */

  // treating coordinates strictly after computing the log-radial coordinate.
  singlePole: (point: Point2D, scale: number, decayMultiplier: number, poleOffset: { x: number; y: number }): Point2D => {
    // Shift the grid inputs before the transcendental projection runs
    const targetX = point.x - poleOffset.x;
    const targetY = point.y - poleOffset.y;
    // Determine exponential radial depth from center
    const r = scale * Math.exp(targetX * decayMultiplier);

    return { x: r * Math.cos(targetY), y: r * Math.sin(targetY) };
  },

  /**
   * 3B. MULTI-POLE HYPERBOLIC TRANSFORMER VARIANT (Normalized)
   * Uses trigonometric folding with an added normalization pass to scale tiles down
   * perfectly, preventing shapes from expanding too fast and overlapping.
   */

  /**
   * COMPONENT-ISOLATED TRANSCENDENTAL MAP
   * Maps tile coordinates to complex sine space to prevent boundary tearing,
   */
  multiPole: (point: Point2D, scale: number, decayMultiplier: number, poleOffset: { x: number; y: number }): Point2D => {
    // 1. Shift the grid inputs
    const targetX = point.x - poleOffset.x;
    const targetY = point.y - poleOffset.y;

    // 2. Establish structural base scale using shifted space
    const r = Math.exp(targetX * decayMultiplier);

    // 3. Map shifted coordinates into complex number
    const cx = r * Math.cos(targetY);
    const cy = r * Math.sin(targetY);

    // 4. Process through complex analytic sine transformation
    const baseUnitX = Math.sin(cx) * Math.cosh(cy);
    const baseUnitY = Math.cos(cx) * Math.sinh(cy);

    // 5. Multiply by global scale
    const finalX = scale * baseUnitX;
    const finalY = scale * baseUnitY;

    return { x: finalX, y: finalY };
  },

  /**
   * 3C. LOXODROMIC TWIST VARIATION (Complex Scaling)
   * Couples the exponential decay directly with a rotational phase shift.
   * This curves the tile grids smoothly into interlocking whirlpool spirals.
   */
  loxodromic: (point: Point2D, scale: number, twistFactor: number, decayMultiplier: number, poleOffset: { x: number; y: number }): Point2D => {
    // 0. Apply pre-image grid offset shift
    const targetX = point.x - poleOffset.x;
    const targetY = point.y - poleOffset.y;

    // 1. Log-periodic scaling factor
    const factor = Math.exp(-targetX * decayMultiplier);

    const r = scale * factor;

    // 2. Section 3.3 Complex Rotation Injection:
    // We modify theta by adding a structural phase shift proportional to grid position.
    // This smoothly curls the paths without introducing destructive area shear.
    // Twist is injected as a linear phase shift based on depth (targetX).
    const theta = targetY + (targetX * twistFactor);

    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  }
};
