import { EngineConfig, Point2D } from './tessellationEngine.ts';
import { rotateAroundPivot } from '@tessellate3d/frontend/src/tileSymmetry.ts';

/**
 * Wallpaper Symmetry Engine.
 * Responsibilities: Pure structural symmetry replication.
 */
export function applyWallpaperSymmetry(
  p: Point2D,
  ring: number,
  branch: number,
  cellHeight: number,
  totalBranches: number,
  symmetryGroup: EngineConfig['symmetryGroup'] = 'p1',
  latticeType: EngineConfig['latticeType'] = 'square'
): Point2D {
  switch (symmetryGroup) {
    // Because the triangular lattice strategy explicitly returns all 6 orientation
    // slices upfront, the resulting 6-fold rosettes are structural hexagons.
    // This allows them to be mapped using the same hexagonal packing
    // symmetry transformations as the p3 group.
    // Until I implement more symmetries...
    case 'p6':
    case 'p3': {
      // --- Hexagonal 3-Fold Flat Hexagon Packing Base ---
      if (latticeType === 'hexagonal') {
        const r = cellHeight / 2;
        const h = r * (Math.sqrt(3) / 2);
        const localCenter = { x: 0, y: r };

        // Handle pure rotational transformations for hexagonal patterns
        const baseAngle = (360 - (120 * ring)) % 360;
        const rotationAngle = branch % 2 === 1 ? (baseAngle + 120) % 360 : baseAngle;
        const rotated = rotateAroundPivot(p, localCenter, rotationAngle);

        let flatX = -ring * (2 * h);
        const flatY = branch * (1.5 * r);
        if (branch % 2 === 1) {
          flatX -= h;
        }
        return { x: rotated.x + flatX, y: rotated.y + flatY };
      }

      // Triangular grids pass raw points directly to strategy for grid processing
      return p;
    }

    case 'p1':
    default: {
      // Base linear geometries drop their points directly down to layout strategies
      return p;
    }
  }
}
