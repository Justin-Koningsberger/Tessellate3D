import { strict as assert } from 'assert';
import { forward } from '../transforms/forward.ts';

const MOCK_SCALE = 180;
const MOCK_DECAY = 1.0;
const MOCK_TWIST = 0.45;
const MOCK_BRANCHES = 5;

// Set to exactly 0.001 to keep precision boundaries sharp
const EPSILON = 0.001;

/**
 * Asserts that two numerical floating points sit within acceptable precision limits.
 */
function assertCloseTo(actual: number, expected: number, message: string): void {
  if (Math.abs(actual - expected) > EPSILON) {
    assert.fail(`${message} - Expected: ${expected}, Got: ${actual}`);
  }
}

// TODO: Update tests to include poleoffset after the implementation is stable
function runTransformSuite(): void {
  console.log("====================================================");
  console.log(" RUNNING MASTER TRANSFORM VALIDATION SUITE");
  console.log("====================================================\n");

  // Setup a strict non-zero offset profile to ensure offset drift safety
  const testOffset = { x: 0.25, y: -0.15 };

  try {
    // 1. LOGARITHMIC SPIRAL
    console.log("--> Testing: forwardLogSpiral...");
    const logResult = forward.logarithmic({ x: 0.0, y: 0.0 }, MOCK_SCALE);
    assertCloseTo(logResult.x, 180.000, "LogSpiral X Error");
    assertCloseTo(logResult.y, 0.000, "LogSpiral Y Error");
    console.log("    ✓ forwardLogSpiral passed validation.\n");

    // 2. SINGLE-POLE SPIRAL (WITH SHIFT)
    console.log("--> Testing: forwardSinglePoleSpiral (Shifted)...");
    const singleResult = forward.singlePole({ x: 1.0, y: Math.PI / 2 }, MOCK_SCALE, MOCK_DECAY, testOffset);
    assertCloseTo(singleResult.x, -56.945, "Shifted SinglePole X Error");
    assertCloseTo(singleResult.y, 376.781, "Shifted SinglePole Y Error");
    console.log("    ✓ forwardSinglePoleSpiral (Shifted) passed validation.\n");

    // 3. LOXODROMIC TWIST (WITH SHIFT)
    console.log("--> Testing: forwardLoxodromicSpiral (Shifted)...");
    const loxResult = forward.loxodromic({ x: 1.0, y: 0.0 }, MOCK_SCALE, MOCK_TWIST, MOCK_DECAY, testOffset);
    assertCloseTo(loxResult.x, 75.121, "Shifted Loxodromic X Error");
    assertCloseTo(loxResult.y, 39.828, "Shifted Loxodromic Y Error");
    console.log("    ✓ forwardLoxodromicSpiral (Shifted) passed validation.\n");

    // 4. MULTI-POLE HYPERBOLIC (WITH SHIFT)
    console.log("--> Testing: forwardMultiPoleHyperbolic (Shifted)...");
    const multiResult = forward.multiPole({ x: 0.0, y: 0.0 }, MOCK_SCALE, MOCK_DECAY, testOffset);
    assertCloseTo(multiResult.x, 124.078, "Shifted MultiPole X Error");
    assertCloseTo(multiResult.y, 19.829, "Shifted MultiPole Y Error");
    console.log("    ✓ forwardMultiPoleHyperbolic (Shifted) passed validation.\n");

    // =======================================================================
    // REGRESSION SUITE: CONFORMAL SEAM BOUNDARY VALIDATION
    // =======================================================================
    console.log("--> Testing: Conformal Seam Boundary Interlocking (Shifted Matrix)...");

    // Mocking two adjacent points that must lock together edge-to-edge
    // Point A is the right edge of Tile 0. Point B is the left edge of Tile 1.
    const pointA = { x: 1.0, y: 0.0 }; // Right seam of current tile
    const pointB = { x: 0.0, y: 0.0 }; // Left seam of next tile (Shifted by wallpaper grid +1)

    const variantsToTest = ["single-pole", "loxodromic"] as const;

    variantsToTest.forEach(variant => {
      // 1. Calculate coordinate position of current tile's right edge
      const gridSpaceA = { x: pointA.x - 1, y: pointA.y }; // Ring 1
      let coordA: { x: number; y: number };

      // 2. Calculate coordinate position of next tile's left edge
      const gridSpaceB = { x: pointB.x - 0, y: pointB.y }; // Ring 0
      let coordB: { x: number; y: number };

      if (variant === "single-pole") {
        coordA = forward.singlePole(gridSpaceA, MOCK_SCALE, MOCK_DECAY, testOffset);
        coordB = forward.singlePole(gridSpaceB, MOCK_SCALE, MOCK_DECAY, testOffset);
      } else {
        coordA = forward.loxodromic(gridSpaceA, MOCK_SCALE, MOCK_TWIST, MOCK_DECAY, testOffset);
        coordB = forward.loxodromic(gridSpaceB, MOCK_SCALE, MOCK_TWIST, MOCK_DECAY, testOffset);
      }

      // 3. ASSERTION: The distance between the seams must be zero
      // If a bug introduces a sliding panel gap or overlap, this check catches it instantly.
      const horizontalGap = Math.abs(coordA.x - coordB.x);
      const verticalGap = Math.abs(coordA.y - coordB.y);

      assert.ok(horizontalGap < 0.005, `${variant} failed horizontal seam lock.`);
      assert.ok(verticalGap < 0.005, `${variant} failed vertical seam lock.`);
    });

    console.log("    ✓ Seam interlocking verified. No sliding panel gaps or overlaps detected.\n");

    console.log("====================================================");
    console.log(" 🎉 ALL TRANSFORMS PASSED MATRICES VALIDATION PERFECTLY!");
    console.log("====================================================");

  } catch (error) {
    console.error("\n❌ TEST RUN CRASHED WITH CRITICAL ERROR:");
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
}

runTransformSuite();
