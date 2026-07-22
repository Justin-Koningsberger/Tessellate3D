module.exports = {

  /**
   * Conformal Warp Function: Logarithmic Spiral (w = e^z)
   */
  logarithmic: (point, scale, angleOffset) => {
    const r = Math.exp(point.x) * scale;
    const theta = point.y + angleOffset;

    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  },

  /**
   * 3A. SINGLE-POLE LOG-PERIODIC SPIRAL VARIANT
   * Core math adapted from Section 3 of the paper. This keeps tiles structurally
   * identical while cleanly scaling them down toward a central focal pole.
   */
  singlePole: (point, scale, angleOffset, decayMultiplier) => {
    // 1. Calculate an inverted exponential decay radius based on the grid ring
    // This scales the tiles down smoothly toward the center without shearing them into arcs
    const factor = Math.exp(-point.x * decayMultiplier);
    const r = scale * factor;

    // 2. Wrap the branch translations linearly around the rotational theta path
    const theta = point.y + angleOffset;

    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  },

  /**
   * 3B. MULTI-POLE HYPERBOLIC TRANSFORMER VARIANT (Normalized)
   * Uses trigonometric folding with an added normalization pass to scale tiles down
   * perfectly, preventing shapes from expanding too fast and overlapping.
   */
   multiPole: (point, scale, angleOffset, decayMultiplier) => {
    // 1. Core log-periodic scaling factor
    const factor = Math.exp(-point.x * decayMultiplier);
    const r = scale * factor;
    const theta = point.y + angleOffset;

    // 2. Convert to standard Cartesian coordinates
    const mx = r * Math.cos(theta);
    const my = r * Math.sin(theta);

    // 3. Self-normalizing scaling factor based on input magnitude
    // Automatically drops below 0.002 if coordinate expansion explodes
    const normalizationThreshold = scale * 1.5;
    const scalingFactor = 0.002 * (normalizationThreshold / Math.max(normalizationThreshold, r));

    // 4. Multi-Pole Trigonometric Folding Layer
    let finalX = scale * Math.sin(mx * scalingFactor) * Math.cosh(my * scalingFactor);
    let finalY = scale * Math.cos(mx * scalingFactor) * Math.sinh(my * scalingFactor);

    // 5. Normalization Factor
    const compression = 0.25 + (factor * 0.5);
    finalX *= compression;
    finalY *= compression;

    return {
      x: finalX,
      y: finalY
    };
  },

  /**
   * 3C. LOXODROMIC TWIST VARIATION (Complex Scaling)
   * Couples the exponential decay directly with a rotational phase shift.
   * This curves the tile grids smoothly into interlocking whirlpool spirals.
   */
  loxodromic: (point, scale, angleOffset, twistFactor, decayMultiplier) => {
    // 1. Core log-periodic scaling factor mapping grid depth
    const factor = Math.exp(-point.x * decayMultiplier);
    const r = scale * factor;

    // 2. Section 3.3 Complex Rotation Injection:
    // We modify theta by adding a structural phase shift proportional to grid position.
    // This smoothly curls the paths without introducing destructive area shear.
    const theta = point.y + angleOffset + (point.x * twistFactor);

    return {
      x: r * Math.cos(theta),
      y: r * Math.sin(theta)
    };
  }
};
