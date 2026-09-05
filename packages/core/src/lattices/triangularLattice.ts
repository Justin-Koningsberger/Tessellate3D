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

    let gridX = 0;
    let gridY = 0;

    if (ctx.useAutoAlignment) {
      const autoIntersection = 1.0;
      const autoGap = 1.5;
      const autoPhase = 2.0;

      if (ctx.variantMode === 'none') {
        gridX = localX + (ctx.branch * triWidth * autoIntersection) + (ctx.ring * triWidth * autoPhase);
        gridY = localY + (ctx.branch * ctx.cellHeight * autoGap) - (ctx.ring * ctx.cellHeight * (autoPhase * 0.5 - 1.0));
      } else {
        const scale = 1/3;
        gridX = localX * scale + (ctx.ring * triWidth * 1.5 * 0.22);
        gridY = localY * scale + (ctx.branch * ctx.cellHeight) + (ctx.ring * ctx.cellHeight * (0.50 - 1.0));
      }
    }
    else {
      const ringIntersection = ctx.sliders.intersection;
      const ringDistanceMultiplier = ctx.sliders.distanceMultiplier;
      const phaseOffset = ctx.sliders.phaseOffset;

      if (ctx.variantMode !== 'none') {
        // Controls the scale of triangles or rosettes
        const scale = ringDistanceMultiplier;

        // Controls the distance between rings
        gridX = localX * scale + (ctx.ring * triWidth * 1.5 * ringIntersection);

        // Controls the alignment offset between rings
        gridY = localY * scale + (ctx.branch * ctx.cellHeight) + (ctx.ring * ctx.cellHeight * (phaseOffset - 1.0));
      } else {
        gridX = localX + (ctx.branch * triWidth * ringIntersection) + (ctx.ring * triWidth * phaseOffset);
        gridY = localY + (ctx.branch * ctx.cellHeight * ringDistanceMultiplier) - (ctx.ring * ctx.cellHeight * (phaseOffset * 0.5 - 1.0));
      }
    }

    return { x: gridX, y: gridY };
  }
}
