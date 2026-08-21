// src/geometryTransforms.ts
import type { Point2D, EngineConfig } from './tessellationEngine.ts';

interface TransformationContext {
  orientation: string;
  cellHeight: number;
  ring: number;
  ringDistanceMultiplier: number;
  phaseOffset: number;
}

/**
 * Pure transformation layer to offload calculations from the master loop.
 */
export function transformLocalMotifPoint(
  p: Point2D,
  config: EngineConfig
  ctx: TransformationContext
): Point2D {
  const scaleFactor = config.motifScaleFactor ?? 1.0;

  // Calculate tile centers to scale uniformly inward or outward
  const centerX = 0.5;
  const centerY = ctx.cellHeight * 0.5;

  // Apply Sprint 3 independent scale layer first
  let localX = centerX + (p.x - centerX) * scaleFactor;
  let localY = centerY + (p.y - centerY) * scaleFactor;

  // Handle standard triangular mesh deformation layout packing rules
  if (config.latticeType === 'triangular') {
    // Only compress horizontally if we aren't using p3 rotational groups
    if (config.symmetryGroup !== 'p3') {
      localX *= Math.sqrt(3) / 2;
    }

    if (ctx.orientation === 'inverted') {
      if (config.symmetryGroup === 'p3') {
        localX = 1.0 - localX;
      } else {
        localX = ((Math.sqrt(3) / 2) - localX);
      }
      localY = (ctx.cellHeight - localY);

      const horizontalShiftScale = config.symmetryGroup === 'p3' ? 1.0 : (Math.sqrt(3) / 2);
      localX += (ctx.ringDistanceMultiplier - 1.0) * horizontalShiftScale * ctx.cellHeight;
      localY += (ctx.phaseOffset - 0.5) * ctx.cellHeight;
    }

    if (ctx.ring % 2 === 1) {
      localY += ctx.cellHeight * 0.5;
    }
  }

  // Handle traditional hexagonal packing rules
  if (config.latticeType === 'hexagonal') {
    localY *= Math.sqrt(3) / 2;
    const tileScaleFactor = 1.0 / ctx.ringDistanceMultiplier;
    localX *= tileScaleFactor;
    localY *= tileScaleFactor;
    localY += ctx.ring * (ctx.phaseOffset - 1.0) * ctx.cellHeight;
  }

  return { x: localX, y: localY };
}
