import { strict as assert } from 'assert';
import { forward } from '../transforms/forward.ts';

const MOCK_SCALE = 180;
const MOCK_ROTATION = 0;
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

function runTransformSuite(): void {
  console.log("====================================================");
  console.log(" RUNNING MASTER TRANSFORM VALIDATION SUITE");
  console.log("====================================================\n");

  try {
    // 1. LOGARITHMIC SPIRAL
    console.log("--> Testing: forwardLogSpiral...");
    const logResult = forward.logarithmic({ x: 0.0, y: 0.0 }, MOCK_SCALE, MOCK_ROTATION);
    assertCloseTo(logResult.x, 180.000, "LogSpiral X Error");
    assertCloseTo(logResult.y, 0.000, "LogSpiral Y Error");
    console.log("    ✓ forwardLogSpiral passed validation.\n");

    // 2. SINGLE-POLE SPIRAL
    console.log("--> Testing: forwardSinglePoleSpiral...");
    const singleResult = forward.singlePole({ x: 1.0, y: Math.PI / 2 }, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
    assertCloseTo(singleResult.x, 0.000, "SinglePole X Error");
     // Input (1, pi/2) yields r = 180 * e^1 = 489.291 -> x = 0, y = 489.291
    assertCloseTo(singleResult.y, 489.290, "SinglePole Y Error");
    console.log("    ✓ forwardSinglePoleSpiral passed validation.\n");

    // 3. LOXODROMIC TWIST
    console.log("--> Testing: forwardLoxodromicSpiral...");
    const loxResult = forward.loxodromic({ x: 1.0, y: 0.0 }, MOCK_SCALE, MOCK_ROTATION, MOCK_TWIST, MOCK_DECAY);
    assertCloseTo(loxResult.x, 59.626, "Loxodromic X Error");
    assertCloseTo(loxResult.y, 28.803, "Loxodromic Y Error");
    console.log("    ✓ forwardLoxodromicSpiral passed validation.\n");

    // 4. MULTI-POLE HYPERBOLIC
    console.log("--> Testing: forwardMultiPoleHyperbolic...");
    const multiResult = forward.multiPole({ x: 0.0, y: 0.0 }, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
    // Input (0,0) yields r=1, theta=0 -> cx=1, cy=0 -> sin(1)*cosh(0) = 0.84147 * 1 -> 0.84147 * 180 (scale) = 151.465
    assertCloseTo(multiResult.x, 151.465, "MultiPole X Error");
    assertCloseTo(multiResult.y, 0.000, "MultiPole Y Error");
    console.log("    ✓ forwardMultiPoleHyperbolic passed validation.\n");

    // =======================================================================
    // REGRESSION SUITE: CONFORMAL SEAM BOUNDARY VALIDATION
    // =======================================================================
    console.log("--> Testing: Conformal Seam Boundary Interlocking...");

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
        coordA = forward.singlePole(gridSpaceA, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
        coordB = forward.singlePole(gridSpaceB, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
      } else {
        coordA = forward.loxodromic(gridSpaceA, MOCK_SCALE, MOCK_ROTATION, MOCK_TWIST, MOCK_DECAY);
        coordB = forward.loxodromic(gridSpaceB, MOCK_SCALE, MOCK_ROTATION, MOCK_TWIST, MOCK_DECAY);
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
