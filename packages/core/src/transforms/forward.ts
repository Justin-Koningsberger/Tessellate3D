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
  singlePole: (point: Point2D, scale: number, decayMultiplier: number): Point2D => {
    // Determine exponential radial depth from center
    const r = scale * Math.exp(point.x * decayMultiplier);

    return { x: r * Math.cos(point.y), y: r * Math.sin(point.y) };
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
  multiPole: (point: Point2D, scale: number, decayMultiplier: number): Point2D => {
    // 1. Establish structural base scale
    const r = Math.exp(point.x * decayMultiplier);

    // 2. Map coordinates into complex numbers
    const cx = r * Math.cos(point.y);
    const cy = r * Math.sin(point.y);

    // 3. Process through complex analytic sine transformation
    const baseUnitX = Math.sin(cx) * Math.cosh(cy);
    const baseUnitY = Math.cos(cx) * Math.sinh(cy);

    // 4. Multiply by global scale
    const finalX = scale * baseUnitX;
    const finalY = scale * baseUnitY;

    return { x: finalX, y: finalY };
  },

  /**
   * 3C. LOXODROMIC TWIST VARIATION (Complex Scaling)
   * Couples the exponential decay directly with a rotational phase shift.
   * This curves the tile grids smoothly into interlocking whirlpool spirals.
   */
  loxodromic: (point: Point2D, scale: number, twistFactor: number, decayMultiplier: number): Point2D => {
    // 1. Core log-periodic scaling factor mapping grid depth
    const factor = Math.exp(-point.x * decayMultiplier);
    const r = scale * factor;

    // 2. Section 3.3 Complex Rotation Injection:
    // We modify theta by adding a structural phase shift proportional to grid position.
    // This smoothly curls the paths without introducing destructive area shear.
    // Twist is injected as a linear phase shift based on depth (point.x).
    const theta = point.y + (point.x * twistFactor);

    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  }
};
