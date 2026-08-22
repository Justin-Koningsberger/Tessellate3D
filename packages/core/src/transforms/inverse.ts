import type { Point2D, EngineConfig } from '../tessellationEngine.ts';

/**
 * SECTION 4: INVERSE SINGLE-POLE SOLVER
 * Reverses exponential polar coordinate expansion to resolve original flat
 * wallpaper positions backward from mapped target plane dimensions.
 */
export function inverseSinglePole(
  screenPoint: Point2D,
  scale: number,
  decayMultiplier: number,
): Point2D {
  if (scale === 0) return { x: 0, y: 0 };

  const screenRadius = Math.hypot(screenPoint.x, screenPoint.y);
  if (screenRadius < 0.0001) return { x: 0, y: 0 };

  const thetaM = Math.atan2(screenPoint.y, screenPoint.x);

  // Reverse the exponential step: scale * Math.exp(r)
  const logScale = Math.log(screenRadius / scale);

  // 3. Keep angle uncompressed to match the true layout span
  let flatY = thetaM;
  while (flatY < 0) flatY += Math.PI * 2;
  while (flatY >= Math.PI * 2) flatY -= Math.PI * 2;

  // 4. Extract flat radial distance from the clean logScale base
  const flatX = logScale / decayMultiplier;
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
  decayMultiplier: number,
): Point2D {
  // Prevent division by zero if scale is unconfigured
  if (scale === 0) return { x: 0, y: 0 };

  const screenRadius = Math.hypot(screenPoint.x, screenPoint.y);
  if (screenRadius < 0.0001) return { x: 0, y: 0 };

  // 2. Map coordinates down directly to uncompressed base scale units
  const u = screenPoint.x / scale;
  const v = screenPoint.y / scale;

  // 3. Invert Multi-Pole Trigonometric System via complex algebraic mapping
  const a = (u + 1) * (u + 1) + v * v;
  const b = (u - 1) * (u - 1) + v * v;
  const sqrtA = Math.sqrt(a);
  const sqrtB = Math.sqrt(b);

  const absX = 0.5 * (sqrtA + sqrtB);
  const absY = 0.5 * (sqrtA - sqrtB);
  const clampY = Math.max(-1, Math.min(1, absY));

  const argX = Math.asin(clampY);
  const argY = Math.log(absX + Math.sqrt(Math.max(0, absX * absX - 1)));

  // 4. Compute intermediate components natively without scaling factor dividers
  const r = Math.hypot(argX, argY);
  let flatY = Math.atan2(argY, argX);
  while (flatY < 0) flatY += Math.PI * 2;

  // 5. Map the final variables cleanly back to the base domain
  const flatX = Math.log(r) / decayMultiplier;

  return {
    x: flatX,
    y: flatY
  };
}

/**
 * SECTION 4: INVERSE LOXODROMIC TWIST SOLVER
 * Un-spirals coupled loxodromic coordinates by solving the underlying
 * linear matrix system using log-polar spatial components.
 */
export function inverseLoxodromic(
  screenPoint: Point2D,
  scale: number,
  twistFactor: number,
  decayMultiplier: number
): Point2D {
  if (scale === 0) return { x: 0, y: 0 };

  // 1. Extract screen radius directly without canvas rotation alignment
  const screenRadius = Math.hypot(screenPoint.x, screenPoint.y);
  if (screenRadius < 0.0001) return { x: 0, y: 0 };

  const thetaM = Math.atan2(screenPoint.y, screenPoint.x);

  // 2. Convert radius to logarithmic space relative to base scale
  const logR = Math.log(screenRadius / scale);

  // 3. Solve the decoupled loxodromic system
  // Reverses the forward logic where: radius depends purely on x, and theta depends on x + y
  const flatX = -logR / decayMultiplier;
  let flatY = thetaM - twistFactor * flatX;

  // 4. Align the angular output with the active wallpaper branch quadrant
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
  const decayMultiplier = config.layout.decayMultiplier;
  const twistFactor = config.layout.twistFactor;

  switch (config.variantMode) {
    case "single-pole":
      return inverseSinglePole(screenPoint, scale, decayMultiplier);
    case "multi-pole":
      return inverseMultiPoleHyperbolic(screenPoint, scale, decayMultiplier);
    case "loxodromic":
      return inverseLoxodromic(screenPoint, scale, twistFactor, decayMultiplier);
    default:
      // Fallback safe state
      return { x: 0, y: 0 };
  }
}
