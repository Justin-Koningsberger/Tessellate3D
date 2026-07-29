import { Point2D, EngineConfig } from '../tessellationEngine.js';

/**
 * SECTION 4: INVERSE SINGLE-POLE SOLVER
 * Reverses exponential polar coordinate expansion to resolve original flat
 * wallpaper positions backward from mapped target plane dimensions.
 */
export function inverseSinglePole(
  screenPoint: Point2D,
  scale: number,
  angleOffset: number,
  decayMultiplier: number,
  totalBranches?: number
): Point2D {
  if (scale === 0) return { x: 0, y: 0 };

  // 1. Undo global canvas camera rotation alignment
  const cosRot = Math.cos(-angleOffset);
  const sinRot = Math.sin(-angleOffset);
  const rx = screenPoint.x * cosRot - screenPoint.y * sinRot;
  const ry = screenPoint.x * sinRot + screenPoint.y * cosRot;

  const screenRadius = Math.hypot(rx, ry);
  if (screenRadius < 0.0001) return { x: 0, y: 0 };

  // 2. Extract outward polar mapping components
  const thetaM = Math.atan2(ry, rx);

  // Reverse the exponential step: scale * Math.exp(r)
  const logScale = Math.log(screenRadius / scale);

  // 3. Reverse the branch frequency scaling layer
  const flatY = thetaM / (totalBranches || 1);

  // 4. Reconstruct original uncompressed input radius tracking bounds
  // Estimates factor configurations using the active layout limits from forward.js
  const densityLimit = totalBranches || 6;
  const maxSafeScale = Math.min(1.0, 6.0 / densityLimit);
  const normalizationFactor = decayMultiplier * maxSafeScale;

  let flatX = logScale;
  if (densityLimit > 6 && logScale > 0) {
    // Reverse the exponential power scaling rule if the limiter triggered
    flatX = Math.pow(logScale, 1 / normalizationFactor);
  }

  return {
    x: flatX,
    y: flatY
  };
}

/**
 * SECTION 4: INVERSE MULTI-POLE HYPERBOLIC SOLVER
 * Reverses trigonometric folding and normalization to calculate backward
 * from final screen coordinates (X, Y) to the original flat wallpaper grid space.
 */
export function inverseMultiPoleHyperbolic(
  screenPoint: Point2D,
  scale: number,
  angleOffset: number,
  decayMultiplier: number,
  totalBranches?: number
): Point2D {
  // Prevent division by zero if scale is unconfigured
  if (scale === 0) return { x: 0, y: 0 };

  // 1. Undo the external camera rotation alignment
  const cosRot = Math.cos(-angleOffset);
  const sinRot = Math.sin(-angleOffset);
  const rx = screenPoint.x * cosRot - screenPoint.y * sinRot;
  const ry = screenPoint.x * sinRot + screenPoint.y * cosRot;

  const screenRadius = Math.hypot(rx, ry);
  if (screenRadius < 0.0001) return { x: 0, y: 0 };

  // 2. Exact Transcendental Factor Recovery Loop
  let approxFactor = screenRadius / scale;
  for (let i = 0; i < 6; i++) {
    const compression = 0.25 + (approxFactor * 0.5);
    approxFactor = (screenRadius / scale) / compression;
  }
  const finalCompression = 0.25 + (approxFactor * 0.5);

  // 3. Strip outer scale parameters to isolate raw trigonometric identities
  const u = rx / (scale * finalCompression);
  const v = ry / (scale * finalCompression);

  // 4. Invert Multi-Pole Trigonometric System via complex algebraic mapping
  const a = (u + 1) * (u + 1) + v * v;
  const b = (u - 1) * (u - 1) + v * v;
  const sqrtA = Math.sqrt(a);
  const sqrtB = Math.sqrt(b);

  const absX = 0.5 * (sqrtA + sqrtB);
  const absY = 0.5 * (sqrtA - sqrtB);
  const clampY = Math.max(-1, Math.min(1, absY));

  const argX = Math.asin(clampY);
  const argY = Math.log(absX + Math.sqrt(Math.max(0, absX * absX - 1)));

  // 5. Match the true fixed Scaling Factor used by forward.js
  const r = scale * approxFactor;
  const normalizationThreshold = scale * 1.5;
  const scalingFactor = 0.002 * (normalizationThreshold / Math.max(normalizationThreshold, r));

  // 6. Divide by the true active scalingFactor to recover intermediate Cartesian coordinates
  const mx = argX / scalingFactor;
  const my = argY / scalingFactor;

  // 7. Extract the intermediate phase angle directly from folded Cartesian space
  let intermediateTheta = Math.atan2(my, mx);

  // 8. Phase Quadrant Correction: Synchronize trig phase tracking signs with forward compression properties
  if (Math.sin(intermediateTheta) * ry < 0 && Math.cos(intermediateTheta) * rx < 0) {
    intermediateTheta += Math.PI;
  }

  /*
   * 9. FIXED: Unwind global layout rotation spin shift BEFORE mapping back to the log domain.
   * This matches the exact inverse step of forward.js, where theta = point.y + angleOffset.
   */
  const flatY = intermediateTheta - angleOffset;
  const flatX = -Math.log(Math.hypot(mx, my) / scale) / decayMultiplier;

  return {
    x: flatX,
    y: flatY
  };
}

/**
 * SECTION 4: INVERSE LOXODROMIC TWIST SOLVER
 * Un-spirals coupled loxodromic coordinates by solving the underlying
 * linear matrix system using log-polar spatial components.
 *
 * MATHEMATICAL ARCHITECTURE INSIGHT: THE INVERSE LOXODROMIC TWIST IDENTITY
 * Your solver utilizes a clean linear matrix mapping shortcut. Because flatX 
 * depends entirely on logR, you solve it first, then pull the exact x parameter 
 * out to decouple and un-twist the phase tracking bounds of flatY seamlessly.
 */
export function inverseLoxodromic(
  screenPoint: Point2D,
  scale: number,
  angleOffset: number,
  twistFactor: number,
  decayMultiplier: number
): Point2D {
  if (scale === 0) return { x: 0, y: 0 };

  // 1. Undo global canvas rotation alignment
  const cosRot = Math.cos(-angleOffset);
  const sinRot = Math.sin(-angleOffset);
  const rx = screenPoint.x * cosRot - screenPoint.y * sinRot;
  const ry = screenPoint.x * sinRot + screenPoint.y * cosRot;

  // 2. Extract screen radius and angle
  const screenRadius = Math.hypot(rx, ry);
  if (screenRadius < 0.0001) return { x: 0, y: 0 };

  const thetaM = Math.atan2(ry, rx);

  // 3. Convert radius to logarithmic space relative to base scale
  const logR = Math.log(screenRadius / scale);

  // 4. Solve the decoupled loxodromic system
  // Reverses the forward logic where: radius depends purely on x, and theta depends on x + y
  const flatX = -logR / decayMultiplier;
  let flatY = thetaM - twistFactor * flatX;

  // 5. Align the angular output with the active wallpaper branch quadrant
  const anglePeriod = Math.PI * 2;
  // Apply a clean modulo to map the value to a stable phase window
  flatY = ((flatY % anglePeriod) + anglePeriod) % anglePeriod;
  if (flatY > Math.PI) flatY -= anglePeriod;

  return {
    x: flatX,
    y: flatY
  };
}

/**
 * DYNAMIC INVERSE ROUTER ENGINE
 * Automatically maps a screen coordinate backward using the active variant mode.
 */
export function inverseWarp(screenPoint: Point2D, config: EngineConfig, totalBranches?: number): Point2D {
  const scale = config.layout.globalScale;
  const angleOffset = config.layout.globalRotation;
  const decayMultiplier = config.layout.decayMultiplier;
  const twistFactor = config.layout.twistFactor;
  const branches = totalBranches ?? config.layout.totalBranches;

  switch (config.variantMode) {
    case "single-pole":
      return inverseSinglePole(screenPoint, scale, angleOffset, decayMultiplier, branches);
    case "multi-pole":
      return inverseMultiPoleHyperbolic(screenPoint, scale, angleOffset, decayMultiplier, branches);
    case "loxodromic":
      return inverseLoxodromic(screenPoint, scale, angleOffset, twistFactor, decayMultiplier);
    default:
      // Fallback safe state
      return { x: 0, y: 0 };
  }
}
