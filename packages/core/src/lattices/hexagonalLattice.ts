import { LatticeStrategy, Point2D, LatticeContext } from './types.ts';
import { rotateAroundPivot } from '@tessellate3d/frontend/src/tileSymmetry.ts';

export class HexagonalLattice implements LatticeStrategy {
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
    // --- Step 1: Handle Slider Context Variables ---
    let ringIntersection = ctx.sliders.intersection;
    let ringDistanceMultiplier = ctx.sliders.distanceMultiplier;
    let phaseOffset = ctx.sliders.phaseOffset;

    // --- Step 2: Inject Auto-Alignment Constants if Enabled ---
    if (ctx.useAutoAlignment) {
      const isNone = ctx.variantMode === 'none';
      if (this.symmetryGroup === 'p1') {
        ringIntersection = isNone ? 1.0 : 2.10 / ctx.totalBranches;
        ringDistanceMultiplier = isNone ? 1.0 : 1.298;
        phaseOffset = isNone ? 1.0 : 1.50;
      } else if (this.symmetryGroup === 'p3') {
        ringIntersection = isNone ? 1.0 : 1.0 + (2.10 / ctx.totalBranches);
        ringDistanceMultiplier = isNone ? 1.0 : 1.30;
        phaseOffset = isNone ? 1.00 : 3.50;
      }
    }

    // =========================================================
    // BRANCH 1: P3 HEXAGONAL MODE
    // =========================================================
    if (this.symmetryGroup === 'p3') {
      // FIX: Instead of completely exiting via 'return gridSpace',
      // let the 'none' variant path pass down into standard slider spacing
      if (ctx.variantMode !== 'none') {
        // --- Conformal Transformations Active for p3 ---
        const r = ctx.cellHeight / 2;
        const localCenter = { x: 0, y: r };

        // 1. Calculate continuous rotational wave progression cleanly
        const isOddBranch = ctx.branch % 2 === 1;
        const baseAngle = (360 - (120 * ctx.ring)) % 360;
        const rotationAngle = isOddBranch ? (baseAngle + 120) % 360 : baseAngle;

        let base = 240 - (120 * ctx.ring);
        if (isOddBranch) base -= 120;
        const phaseAdjustment = ((base % 360) + 360) % 360;

        // 2. Combine the rotation with the active phase adjustment
        const conformalAngle = (rotationAngle + phaseAdjustment) % 360;
        const conformalRotated = rotateAroundPivot(shearedPoint, localCenter, conformalAngle);

        // 3. Apply the scaling factor contracts
        const tileScaleFactor = 1.0 / ringDistanceMultiplier;

        // 4. Resolve angular progression formulas
        const normalizedY = (ctx.branch + ctx.ring * (phaseOffset - 1.0)) * ctx.cellHeight;
        const normalizedX = (conformalRotated.x - localCenter.x) * tileScaleFactor;
        const adjustedRotatedY = (conformalRotated.y - localCenter.y) * (Math.sqrt(3) / 2) * tileScaleFactor;

        const outX = normalizedX + (normalizedY / ctx.cellHeight) * ctx.shearSlope + ctx.ring - (ctx.ring * ringIntersection);
        const outY = normalizedY + adjustedRotatedY;

        return { x: outX, y: outY };
      }
    }

    // =========================================================
    // FALLTHROUGH: STANDARD LINEAR SPACING (p1 AND p3 'none' MODE)
    // =========================================================
    // Both p1 and the base untransformed p3 grid process their sliders identically here
    const outX = gridSpace.x + ctx.ring - (ctx.ring * ringIntersection);

    // If you want distance multiplier / phase offsets to tweak the linear spacing as well:
    const outY = gridSpace.y + (ctx.branch * ctx.cellHeight * (ringDistanceMultiplier - 1.0)) + (ctx.ring * ctx.cellHeight * (phaseOffset - 1.0));

    return { x: outX, y: outY };
  }
}
