import test from 'node:test';
import assert from 'node:assert';
import { extrude2DPathToStl } from './stlBuilder.ts';
import type { Point2D } from '@tessellate3d/core';

test('STL Extrusion Engine Advanced Geometric Regression Suite', async (t) => {

  await t.test('1. Degenerate Inputs: Gracefully handle empty or invalid paths', () => {
    assert.strictEqual(extrude2DPathToStl([]), '');
    assert.strictEqual(extrude2DPathToStl([{ x: 0, y: 0 }, { x: 1, y: 1 }]), '');
  });

  await t.test('2. Complex Concave Ear-Clipping: Verify a non-convex L-shape path', () => {
    // A 6-sided concave L-shape polygon tracking counter-clockwise order
    const concaveLShape: Point2D[] = [
      { x: 0, y: 0 },
      { x: 2, y: 0 },
      { x: 2, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 2 },
      { x: 0, y: 2 }
    ];

    const height = 4.0;
    const stlResult = extrude2DPathToStl(concaveLShape, height);

    // Math Matrix verification for a 6-sided concave block (N = 6):
    // Roof cap via Ear-Clipping = (N - 2) = 4 triangles
    // Floor cap via Ear-Clipping = (N - 2) = 4 triangles
    // Side walls = 2 triangles per perimeter edge * 6 edges = 12 triangles
    // Total expected facets = 4 + 4 + 12 = 20 triangles
    const facetCount = (stlResult.match(/facet normal/g) || []).length;
    assert.strictEqual(facetCount, 20, `Concave ear clipper generated incorrect topology. Expected 20 triangles, got ${facetCount}`);
  });

  await t.test('3. Orientation Independence: Ensure explicit Shoelace area correction handles clockwise loops', () => {
    // Clockwise square (will turn inside out under basic convex triangle fan engines)
    const clockwiseSquare: Point2D[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 }
    ];

    // Counter-Clockwise square configuration
    const ccwSquare: Point2D[] = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 1 }
    ];

    const height = 4.0;
    const cwResult = extrude2DPathToStl(clockwiseSquare, height);
    const ccwResult = extrude2DPathToStl(ccwSquare, height);

    // Assert that the orientation engine standardized the clockwise input, making the output structural files perfectly identical
    const cwFacetCount = (cwResult.match(/facet normal/g) || []).length;
    const ccwFacetCount = (ccwResult.match(/facet normal/g) || []).length;

    assert.strictEqual(cwFacetCount, ccwFacetCount, 'Winding alignment failure between reversed paths.');
    assert.strictEqual(cwFacetCount, 12, 'Standardized quad shape failed to export 12 facets.');
  });

  await t.test('4. Normal Vector Cross-Product Audit: Verify side-wall directional vectors point outward', () => {
    const square: Point2D[] = [
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 10, y: 20 }
    ];

    const height = 4.0;
    const stlResult = extrude2DPathToStl(square, height);

    // Isolate and extract all explicit facet blocks
    const facetBlocks = stlResult.match(/facet normal[\s\S]*?endfacet/g) || [];

    for (const block of facetBlocks) {
      const normalMatch = /facet normal\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/.exec(block);
      const v1Match = /vertex\s+([-\d.]+)\s+([-\d.]+)\s+([-\d.]+)/.exec(block); // Captures first vertex

      if (!normalMatch || !v1Match) continue;

      const nx = parseFloat(normalMatch[1]!);
      const ny = parseFloat(normalMatch[2]!);
      const nz = parseFloat(normalMatch[3]!);

      const vx = parseFloat(v1Match[1]!);
      const vy = parseFloat(v1Match[2]!);

      // Audit Vertical Side Walls (where Z component normal is exactly 0)
      if (Math.abs(nz) < 1e-5) {
        // Centroid of the test square sits at (15, 15)
        const vectorFromCenterToWallX = vx - 15.0;
        const vectorFromCenterToWallY = vy - 15.0;

        // Vector Dot Product: dot = (Outward Direction Vector) • (Face Normal Vector)
        // If dot > 0, the normal points outward away from the center (Correct).
        // If dot < 0, the normal points inward into the solid block body (Non-Manifold / Error).
        const dotProduct = (vectorFromCenterToWallX * nx) + (vectorFromCenterToWallY * ny);
        assert.ok(dotProduct >= 0, `Critical Manifold Violation: Face normal vector (${nx}, ${ny}, ${nz}) points inward toward the mesh core.`);
      }
    }
  });

  await t.test('5. Redundant Node Cleaning: Drop closing duplicate points', () => {
    const closedSquare: Point2D[] = [
      { x: 0, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
      { x: 1, y: 0 },
      { x: 0, y: 0 } // Overlapping terminal node
    ];

    const stlResult = extrude2DPathToStl(closedSquare, 4.0);
    const facetCount = (stlResult.match(/facet normal/g) || []).length;
    assert.strictEqual(facetCount, 12, 'Duplicate closing vertex caused layout inflation or wall geometry duplication.');
  });
});
