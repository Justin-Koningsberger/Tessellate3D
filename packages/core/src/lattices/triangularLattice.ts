import { LatticeStrategy, Point2D, LatticeContext } from './types.ts';
import { rotateAroundPivot } from '@tessellate3d/frontend/src/tileSymmetry.ts';

export class TriangularLattice implements LatticeStrategy {
  private symmetryGroup: string;

  constructor(symmetryGroup: string) {
    this.symmetryGroup = symmetryGroup;
  }

  getOrientations(): string[] {
    // Both p3 and p6 must return all 6 structural orientation slices to assemble the complete rosette flower
    return ['0', '-60', '-120', '-180', '-240', '-300'];
  }

  transformLocal(pt: Point2D, orientation: string, cellHeight: number): Point2D {
    // p3 and p6 spin locally around the vertex corner to generate rosettes, while p1 stays flat
    if (this.symmetryGroup === 'p3' || this.symmetryGroup === 'p6') {
      const angleDegrees = parseInt(orientation, 10);
      const trueV2 = { x: (Math.sqrt(3) / 2) * cellHeight, y: cellHeight * 0.5 };
      return rotateAroundPivot(pt, trueV2, angleDegrees);
    }
    return pt;
  }

  finalizeGridSpace(gridSpace: Point2D, shearedPoint: Point2D, orientation: string, ctx: LatticeContext): Point2D {
    const triWidth = ctx.triWidth;

    // Reverse the shear transform to isolate the exact local track positions
    const localY = shearedPoint.y;
    const localX = shearedPoint.x - (localY / ctx.cellHeight) * ctx.shearSlope;

    let intersection: number;
    let multiplier: number;
    let phase: number;
    let isVariant = ctx.variantMode !== 'none';

    if (ctx.useAutoAlignment) {
      intersection = isVariant ? 0.2222 : 1.0;
      multiplier = isVariant ? 1/3 : 1.5;
      phase = isVariant ? 0.50 : 2.0;
    } else {
      intersection = ctx.sliders.intersection;
      multiplier = ctx.sliders.distanceMultiplier;
      phase = ctx.sliders.phaseOffset;
    }

    let gridX = 0;
    let gridY = 0;

    // Compute grid coordinates mapped directly by layout structures
    if (isVariant) {
      // Scales the rosettes down and spaces out the center tracks
      gridX = localX * multiplier + (ctx.ring * triWidth * 1.5 * intersection);
      gridY = localY * multiplier + (ctx.branch * ctx.cellHeight) + (ctx.ring * ctx.cellHeight * (phase - 1.0));
    } else {
      // Standard linear lattice spacing
      gridX = localX + (ctx.branch * triWidth * intersection) + (ctx.ring * triWidth * phase);
      gridY = localY + (ctx.branch * ctx.cellHeight * multiplier) - (ctx.ring * ctx.cellHeight * (phase * 0.5 - 1.0));
    }

    return { x: gridX, y: gridY };
  }
}
