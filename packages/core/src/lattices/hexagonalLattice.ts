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
      if (this.symmetryGroup === 'p1') {
        if (ctx.variantMode === 'none') {
          ringIntersection = 1.0;
          ringDistanceMultiplier = 1.0;
          phaseOffset = 1.0;
        } else {
          ringIntersection = 2.10 / ctx.totalBranches;
          ringDistanceMultiplier = 1.298;
          phaseOffset = 1.50;
        }
      } else if (this.symmetryGroup === 'p3') {
        if (ctx.variantMode === 'none') {
          ringIntersection = 1.0;
          ringDistanceMultiplier = 1.0;
          phaseOffset = 1.50;
        } else {
          ringIntersection = 1.0 + (2.10 / ctx.totalBranches);
          ringDistanceMultiplier = 1.30;
          phaseOffset = 3.50;
        }
      }
    }

    // =========================================================
    // BRANCH 1: THE COMPLEX P3 HEXAGONAL MODE
    // =========================================================
    if (this.symmetryGroup === 'p3') {
      if (ctx.variantMode === 'none') {
        return gridSpace;
      }

      // --- Conformal Transformations Active for p3 ---
      const r = ctx.cellHeight / 2;
      const localCenter = { x: 0, y: r };

      // 1. Calculate continuous rotational wave progression using your legacy logic
      const baseAngle = (360 - (120 * ctx.ring)) % 360;
      const rotationAngle = ctx.branch % 2 === 1 ? (baseAngle + 120) % 360 : baseAngle;

      let base = 240 - (120 * ctx.ring);
      if (ctx.branch % 2 === 1) {
        base -= 120;
      }
      const phaseAdjustment = ((base % 360) + 360) % 360;

      // 2. Combine the rotation with the active phase adjustment
      const conformalAngle = (rotationAngle + phaseAdjustment) % 360;
      const conformalRotated = rotateAroundPivot(shearedPoint, localCenter, conformalAngle);

      // 3. Restore your exact original legacy scaling factor contract
      const tileScaleFactor = 1.0 / ringDistanceMultiplier;

      // 4. Restore your exact original linear angular progression formulas
      let normalizedY = ctx.branch * ctx.cellHeight;
      normalizedY += ctx.ring * (phaseOffset - 1.0) * ctx.cellHeight;

      const normalizedX = (conformalRotated.x - localCenter.x) * tileScaleFactor;
      const adjustedRotatedY = (conformalRotated.y - localCenter.y) * (Math.sqrt(3) / 2) * tileScaleFactor;

      const outPoint: Point2D = {
        x: normalizedX + (normalizedY / ctx.cellHeight) * ctx.shearSlope,
        y: normalizedY + adjustedRotatedY
      };

      const absoluteRingTranslationX = -ctx.ring * 1.0;
      outPoint.x = outPoint.x - absoluteRingTranslationX + (absoluteRingTranslationX * ringIntersection);
      
      return outPoint;
    }

    // =========================================================
    // BRANCH 2: THE STANDARD P1 HEXAGONAL MODE
    // =========================================================
    if (this.symmetryGroup === 'p1') {
      let outX = gridSpace.x;
      let outY = gridSpace.y;

      const absoluteRingTranslationX = -ctx.ring * 1.0;
      outX = outX - absoluteRingTranslationX + (absoluteRingTranslationX * ringIntersection);

      return { x: outX, y: outY };
    }

    return gridSpace;
  }
}
