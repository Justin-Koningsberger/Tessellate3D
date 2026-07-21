/**
 * SECTION 4: INVERSE MULTI-POLE HYPERBOLIC SOLVER
 * Reverses trigonometric folding and normalization to calculate backward
 * from final screen coordinates (X, Y) to the original flat wallpaper grid space.
 */
function inverseMultiPoleHyperbolic(screenPoint, scale, angleOffset, decayMultiplier) {
  // Prevent division by zero if scale is unconfigured
  if (scale === 0) return { x: 0, y: 0 };

  // 1. Undo the external camera rotation alignment
  const cosRot = Math.cos(-angleOffset);
  const sinRot = Math.sin(-angleOffset);
  const rx = screenPoint.x * cosRot - screenPoint.y * sinRot;
  const ry = screenPoint.x * sinRot + screenPoint.y * cosRot;

  // 2. Solve for the core radius to reconstruct the forward compression factor
  const screenRadius = Math.hypot(rx, ry);
  if (screenRadius < 0.0001) return { x: 0, y: 0 };

  // Using a numerical approximation loop to solve the transcendental equation:
  // screenRadius = scale * compression * Math.hypot(Math.sin(mx), Math.sinh(my))
  let approxFactor = screenRadius / scale;
  for (let i = 0; i < 4; i++) {
    const compression = 0.25 + (approxFactor * 0.5);
    approxFactor = (screenRadius / scale) / compression;
  }

  // 3. Invert the Multi-Pole Trigonometric Folding Layer
  const scalingFactor = 0.002;
  const targetX = rx / (scale * (0.25 + approxFactor * 0.5));
  const targetY = ry / (scale * (0.25 + approxFactor * 0.5));

  // Utilize inverse Gudermannian properties to decouple mx and my components
  const u = targetX;
  const v = targetY;
  const expMy = Math.sqrt((u * u + Math.pow(v + 1, 2)) / (u * u + Math.pow(v - 1, 2)));
  const my = Math.log(expMy) / scalingFactor;
  const mx = Math.asin(u / Math.cosh(my * scalingFactor)) / scalingFactor;

  // 4. Convert Cartesian components back to standard logarithmic variables
  const flatX = -Math.log(Math.hypot(mx, my) / scale) / decayMultiplier;
  let flatY = Math.atan2(my, mx);

  // Normalize final angular data cleanly within standard boundaries
  while (flatY < 0) flatY += Math.PI * 2;
  while (flatY >= Math.PI * 2) flatY -= Math.PI * 2;

  return {
    x: flatX,
    y: flatY
  };
}

/**
 * DYNAMIC INVERSE ROUTER ENGINE
 * Automatically maps a screen coordinate backward using the active variant mode.
 */
function inverseWarp(screenPoint, CONFIG) {
  const scale = CONFIG.layout.globalScale;
  const angleOffset = CONFIG.layout.globalRotation;
  const decayMultiplier = CONFIG.layout.decayMultiplier;
  const twistFactor = CONFIG.layout.twistFactor;

  switch (CONFIG.variantMode) {
    case "multi-pole":
      return inverseMultiPoleHyperbolic(screenPoint, scale, angleOffset, decayMultiplier, totalBranches);
    default:
      // Fallback safe state
      return { x: 0, y: 0 };
  }
}

module.exports = inverseWarp;
