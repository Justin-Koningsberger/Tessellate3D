import { describe, it } from 'node:test';
import assert from 'node:assert';
import { compileSymmetricTile, rotateAroundPivot } from '../tileSymmetry.ts';

import type { ModularEditorState } from '../tileSymmetry.ts';
import type { Point2D } from '../tessellationEngine.ts';

// Helper function to handle floating point tolerance assertions
function assertCloseTo(actual: number, expected: number, precision: number = 4) {
  const tolerance = Math.pow(10, -precision);
  assert.ok(
    Math.abs(actual - expected) < tolerance,
    `Expected ${actual} to be close to ${expected} within tolerance ${tolerance}`
  );
}

describe('Custom Symmetry Matrix Engine', () => {
  it('should accurately rotate 2D vector coordinates 120 degrees around a fixed vertex pivot', () => {
    const pivot: Point2D = { x: 0.0, y: 0.0 };
    const point: Point2D = { x: 1.0, y: 0.0 };

    const rotated = rotateAroundPivot(point, pivot, 120);

    // 120 degrees CCW from (1, 0) lands at (-0.5, sqrt(3)/2)
    assertCloseTo(rotated.x, -0.5);
    assertCloseTo(rotated.y, Math.sqrt(3) / 2);
  });

  it('should cleanly compile raw components into a nested multidimensional array with structural closure', () => {
    const cellHeight = 2.0;
    const r = cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);

    const mockState: ModularEditorState = {
      latticeType: 'hexagonal', // FIX 1: Satisfy the strict type contract parameter
      v1: { x: 0.0, y: 0.0 },
      v2: { x: h,   y: r * 0.5 },
      v3: { x: h,   y: cellHeight - r * 0.5 },
      v4: { x: 0.0, y: cellHeight },
      v5: { x: -h,  y: cellHeight - r * 0.5 },
      v6: { x: -h,  y: r * 0.5 },

      edgeA: [{ x: h * 0.5, y: r * 0.25 }],
      edgeB: [{ x: h,       y: cellHeight * 0.5 }],
      edgeC: [{ x: 0.0,     y: cellHeight * 0.75 }]
    };

    const compiledComponents = compileSymmetricTile(mockState);

    // Verify it outputs a multidimensional array structure
    assert.strictEqual(Array.isArray(compiledComponents), true);
    assert.strictEqual(Array.isArray(compiledComponents[0]), true);

    const perimeterPath = compiledComponents[0]!;

    // 1. Manifold Welded Check (First and last element must match perfectly)
    const firstPoint = perimeterPath[0]!;
    const lastPoint = perimeterPath[perimeterPath.length - 1]!;
    const gapDistance = Math.hypot(lastPoint.x - firstPoint.x, lastPoint.y - firstPoint.y);

    assert.strictEqual(gapDistance, 0);
    // Use safe optional chaining since v1 is optional in the interface
    assert.strictEqual(firstPoint.x, mockState.v1?.x);
    assert.strictEqual(firstPoint.y, mockState.v1?.y);

    const expectedPointsCount =
      1 + (mockState.edgeA?.length || 0) +
      1 + (mockState.edgeB?.length || 0) +
      1 + (mockState.edgeB?.length || 0) + // rotatedB matches edgeB size
      1 + (mockState.edgeC?.length || 0) +
      1 + (mockState.edgeC?.length || 0) + // rotatedC matches edgeC size
      1 + (mockState.edgeA?.length || 0) + // rotatedA matches edgeA size
      1;

    assert.strictEqual(perimeterPath.length, expectedPointsCount);
  });
});
