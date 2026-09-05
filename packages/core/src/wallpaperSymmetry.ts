import { EngineConfig, Point2D } from './tessellationEngine.ts';
import { rotateAroundPivot } from '@tessellate3d/frontend/src/tileSymmetry.ts';

/**
 * Wallpaper Symmetry Engine.
 * Supports standard translation configurations (p1), 3-fold rotations (p3), and 6-fold rosettes (p6).
 */
export function applyWallpaperSymmetry(
  p: Point2D,
  ring: number,
  branch: number,
  totalBranches: number,
  shearSlope: number,
  symmetryGroup: EngineConfig['symmetryGroup'] = 'p1',
  latticeType: EngineConfig['latticeType'] = 'square',
  ringDistanceMultiplier: number = 1.0,
  phaseOffset: number = 1.0,
  ringIntersection: number = 1.0
): Point2D {
  const tileWidth = 1.0;
  const tileHeight = (Math.PI * 2) / totalBranches;

  switch (symmetryGroup) {
    case 'p6': {
      // --- Hexagonal 6-Fold Triangular Rosette Mesh ---
      if (latticeType === 'triangular') {
        const r = tileHeight / 2;
        const h = r * (Math.sqrt(3) / 2);
        const triWidth = h * 2;

        // Apply true 2D Hexagonal lattice translation grid vector matrices
        let flatX = p.x + (branch * triWidth * ringIntersection);
        let flatY = p.y + (branch * tileHeight * ringDistanceMultiplier * 1.5);

        // Vector shift for rings branching out symmetrically across 2D space
        flatX += ring * triWidth * phaseOffset * 1.0;
        flatY -= ring * tileHeight * (phaseOffset * 1.5 - 1.0);

        return { x: flatX, y: flatY };
      }
      return p;
    }

    case 'p3': {
      // --- Flat Triangular Base handling for p3 ---
      if (latticeType === 'triangular') {
        const r = tileHeight / 2;
        const h = r * (Math.sqrt(3) / 2);
        const triWidth = h * 2;

        // p3 utilizes the same 2D hexagonal lattice translation steps as p6
        let flatX = p.x + (branch * triWidth * ringIntersection);
        let flatY = p.y + (branch * tileHeight * ringDistanceMultiplier * 1.5);

        flatX += ring * triWidth * phaseOffset * 1.0;
        flatY -= ring * tileHeight * (phaseOffset * 1.5 - 1.0);

        return { x: flatX, y: flatY };
      }

      // --- Hexagonal 3-Fold Flat Hexagon Packing ---
      if (latticeType === 'hexagonal') {
        const r = tileHeight / 2;
        const h = r * (Math.sqrt(3) / 2);
        const localCenter = { x: 0, y: r };

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
      return p;
    }

    case 'p1':
    default: {
      let localX = p.x;
      let localY = p.y;

      // --- Standard Linear Triangular Strip (p1) ---
      if (latticeType === 'triangular') {
        const r = tileHeight / 2;
        const h = r * (Math.sqrt(3) / 2);
        const triWidth = h * 2;
        
        const flatX = p.x + (branch * triWidth * ringIntersection) + (ring * triWidth * phaseOffset);
        const flatY = p.y + (branch * tileHeight * ringDistanceMultiplier) - (ring * tileHeight * (phaseOffset * 0.5 - 1.0));
        return { x: flatX, y: flatY };
      }

      // Handle hexagonal compression and slider multipliers locally before shearing
      if (latticeType === 'hexagonal') {
        localY *= Math.sqrt(3) / 2;
        const tileScaleFactor = 1.0 / ringDistanceMultiplier;
        localX *= tileScaleFactor;
        localY *= tileScaleFactor;
        localY += ring * (phaseOffset - 1.0) * tileHeight;
      }

      // Compute standard shear transformation
      const shearedX = localX + (localY / tileHeight) * shearSlope;
      const shearedY = localY;

      const continuousHelicalOffset = branch * (tileWidth / totalBranches) * shearSlope;
      const translationX = (ring * tileWidth) + continuousHelicalOffset;
      const translationY = branch * tileHeight;

      return {
        x: shearedX + translationX,
        y: shearedY + translationY
      };
    }
  }
}
