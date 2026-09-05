import { LatticeStrategy, Point2D, LatticeContext } from './types.ts';

export class SquareLattice implements LatticeStrategy {
  private symmetryGroup: string;

  constructor(symmetryGroup: string) {
    this.symmetryGroup = symmetryGroup;
  }

  getOrientations(): string[] {
    return ['standard'];
  }

  transformLocal(pt: Point2D, orientation: string, cellHeight: number): Point2D {
    return pt;
  }

  finalizeGridSpace(gridSpace: Point2D, shearedPoint: Point2D, orientation: string, ctx: LatticeContext): Point2D {
    // Compute local translation grid coordinates
    const tileWidth = 1.0;
    const continuousHelicalOffset = ctx.branch * (tileWidth / ctx.totalBranches) * ctx.shearSlope;
    let gridX = shearedPoint.x + continuousHelicalOffset;
    let gridY = shearedPoint.y + (ctx.branch * ctx.cellHeight);

    if (ctx.useAutoAlignment) {
      // Tie the X axis progression step dynamically to the cylindrical sector profile height
      gridX = gridX + ctx.ring * ctx.cellHeight;
      // gridY remains unscaled and aligned in auto mode
    } 
    else {
      const ringIntersection = ctx.sliders.intersection;
      const ringDistanceMultiplier = ctx.sliders.distanceMultiplier;
      const phaseOffset = ctx.sliders.phaseOffset;

      if (ctx.variantMode === 'none') {
        gridX = gridX + ctx.ring - (ctx.ring * ringIntersection);
        gridY = shearedPoint.y + (ctx.branch * ctx.cellHeight * ringDistanceMultiplier);
        gridY += ctx.ring * ctx.cellHeight * (phaseOffset - 1.5);
      } else {
        gridX = gridX + ctx.ring - (ctx.ring * ringIntersection);

        // 1. Calculate the raw localized offset component of this shape *within* its branch track
        const localComponentOffset = shearedPoint.y;

        // 2. Compute the evenly distributed macro base anchor for the branch around the full circle
        const macroBranchAnchor = ctx.branch * ctx.cellHeight;

        // 3. Scale the internal coordinate position tracking via the distance multiplier, 
        // but clamp the absolute step anchor so the total ring keeps its perfect 360-degree closure.
        gridY = macroBranchAnchor + (localComponentOffset * ringDistanceMultiplier);
        
        // 4. Add the spiral phase offset factor
        gridY += ctx.ring * ctx.cellHeight * (phaseOffset - 1.5);
      }
    }

    return { x: gridX, y: gridY };
  }
}
