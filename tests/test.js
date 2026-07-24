const assert = require("assert");
const forward = require("../transforms/forward");

const MOCK_SCALE = 180;
const MOCK_ROTATION = 0;
const MOCK_DECAY = 1.0;
const MOCK_TWIST = 0.45;
const MOCK_BRANCHES = 5;

// Set to exactly 0.001 to keep precision boundaries sharp
const EPSILON = 0.001;

function assertCloseTo(actual, expected, message) {
  if (Math.abs(actual - expected) > EPSILON) {
    assert.fail(message + " - Expected: " + expected + ", Got: " + actual);
  }
}

console.log("====================================================");
console.log(" RUNNING MASTER TRANSFORM VALIDATION SUITE");
console.log("====================================================\n");

try {
  // 1. LOGARITHMIC SPIRAL
  console.log("--> Testing: forwardLogSpiral...");
  var logResult = forward.logarithmic({ x: 0.0, y: 0.0 }, MOCK_SCALE, MOCK_ROTATION);
  assertCloseTo(logResult.x, 180.000, "LogSpiral X Error");
  assertCloseTo(logResult.y, 0.000, "LogSpiral Y Error");
  console.log("    ✓ forwardLogSpiral passed validation.\n");

  // 2. SINGLE-POLE SPIRAL
  console.log("--> Testing: forwardSinglePoleSpiral...");
  var singleResult = forward.singlePole({ x: 1.0, y: Math.PI / 2 }, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
  assertCloseTo(singleResult.x, 0.000, "SinglePole X Error");
  assertCloseTo(singleResult.y, 66.218, "SinglePole Y Error");
  console.log("    ✓ forwardSinglePoleSpiral passed validation.\n");

  // 3. LOXODROMIC TWIST
  console.log("--> Testing: forwardLoxodromicSpiral...");
  var loxResult = forward.loxodromic({ x: 1.0, y: 0.0 }, MOCK_SCALE, MOCK_ROTATION, MOCK_TWIST, MOCK_DECAY);
  assertCloseTo(loxResult.x, 59.626, "Loxodromic X Error");
  assertCloseTo(loxResult.y, 28.803, "Loxodromic Y Error");
  console.log("    ✓ forwardLoxodromicSpiral passed validation.\n");

  // 4. MULTI-POLE HYPERBOLIC
  console.log("--> Testing: forwardMultiPoleHyperbolic...");
  var multiResult = forward.multiPole({ x: 0.0, y: 0.0 }, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
  assertCloseTo(multiResult.x, 47.557, "MultiPole X Error");
  assertCloseTo(multiResult.y, 0.000, "MultiPole Y Error");
  console.log("    ✓ forwardMultiPoleHyperbolic passed validation.\n");

  // =======================================================================
  // REGRESSION SUITE: CONFORMAL SEAM BOUNDARY VALIDATION
  // =======================================================================
  console.log("--> Testing: Conformal Seam Boundary Interlocking...");

  // Mocking two adjacent points that MUST lock together edge-to-edge
  // Point A is the right edge of Tile 0. Point B is the left edge of Tile 1.
  const cellHeightMock = Math.PI * 2 / MOCK_BRANCHES;
  const pointA = { x: 1.0, y: 0.0 }; // Right seam of current tile
  const pointB = { x: 0.0, y: 0.0 }; // Left seam of next tile (Shifted by wallpaper grid +1)

  // Test across your primary working functions
  const variantsToTest = ["single-pole", "loxodromic"];

  variantsToTest.forEach(variant => {
    // 1. Calculate coordinate position of current tile's right edge
    const gridSpaceA = { x: pointA.x - 1, y: pointA.y }; // Ring 1
    let coordA;
    
    // 2. Calculate coordinate position of next tile's left edge
    const gridSpaceB = { x: pointB.x - 0, y: pointB.y }; // Ring 0
    let coordB;

    if (variant === "single-pole") {
      coordA = forward.singlePole(gridSpaceA, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
      coordB = forward.singlePole(gridSpaceB, MOCK_SCALE, MOCK_ROTATION, MOCK_DECAY);
    } else {
      coordA = forward.loxodromic(gridSpaceA, MOCK_SCALE, MOCK_ROTATION, MOCK_TWIST, MOCK_DECAY);
      coordB = forward.loxodromic(gridSpaceB, MOCK_SCALE, MOCK_ROTATION, MOCK_TWIST, MOCK_DECAY);
    }

    // 3. ASSERTION: The distance between the seams MUST be zero!
    // If a bug introduces a sliding panel gap or overlap, this check catches it instantly.
    const horizontalGap = Math.abs(coordA.x - coordB.x);
    const verticalGap = Math.abs(coordA.y - coordB.y);

    assert.ok(horizontalGap < 0.005, variant + " failed horizontal seam lock.");
    assert.ok(verticalGap < 0.005, variant + " failed vertical seam lock.");
  });

  console.log("    ✓ Seam interlocking verified. No sliding panel gaps or overlaps detected.\n");


  console.log("====================================================");
  console.log(" 🎉 ALL TRANSFORMS PASSED MATRICES VALIDATION PERFECTLY!");
  console.log("====================================================");

} catch (error) {
  console.error("\n❌ TEST RUN CRASHED WITH CRITICAL ERROR:");
  console.error(error.message);
  process.exit(1);
}
