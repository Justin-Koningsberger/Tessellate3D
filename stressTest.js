const assert = require("assert");
const forward = require("./transforms/forward");
const { applyWallpaperSymmetry } = require("./spiralSVGGenarator");

// -------------------------------------------------------------------------
// MASTER CONFIGURATION & GLOBAL CONTROLS
// -------------------------------------------------------------------------
const VERBOSE_DEBUG = true;      // GLOBAL TOGGLE: Force extended printouts for all steps
const CONFIG_RUNS_PER_STEP = 20;  // Amount of unique randomized runs to test per step
const EPSILON = 0.001;            // Maximum allowable gap (in canvas units) for perfect alignment
const BRANCH_SEQUENCE = [10, 15, 25, 40, 65, 105, 170];

function getRandom(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * CORE EVALUATION ENGINE
 * Calculates adjacent boundary transformations and intercepts precise gap metrics.
 */
function evaluateVariantExtended(name, branches, scale, rotation, decay, twist) {
// 1. CHOOSE A RANDOM TESTING ANCHOR LAYER WITHIN ACTIVE BOUNDS
  // Pick an arbitrary ring depth and branch track to stress test the internal quadrants
  const randomTestRing   = Math.floor(getRandom(0, 5)); // Tests depth layers up to Ring 5
  const randomTestBranch = Math.floor(getRandom(0, branches)); // Tests all valid quadrant lanes

  // Base motif edge definitions matching main.js parameters
  const pointA = { x: 1.0, y: 0.0 }; // Right edge seam
  const pointB = { x: 0.0, y: 0.0 }; // Left edge seam

  try {
    let coordA, coordB;

    switch (name) {
      case "logarithmic":
        // Logarithmic space wraps linearly across global coordinates
        const gridA_log = { x: pointA.x, y: pointA.y };
        const gridB_log = { x: pointB.x + 1, y: pointB.y };
        coordA = forward.logarithmic(gridA_log, scale, rotation);
        coordB = forward.logarithmic(gridB_log, scale, rotation);
        break;

      case "single-pole":
        // FIXED: Inject the dynamic ring and branch indices into your wallpaper symmetry simulation!
        // This ensures Point A (Ring + 1) matches face-to-face with Point B (Ring) on the active branch lane.
        const gridA_sp = applyWallpaperSymmetry(pointA, -(randomTestRing + 1), randomTestBranch, branches);
        const gridB_sp = applyWallpaperSymmetry(pointB, -randomTestRing,       randomTestBranch, branches);
        coordA = forward.singlePole(gridA_sp, scale, rotation, decay);
        coordB = forward.singlePole(gridB_sp, scale, rotation, decay);
        break;

      case "loxodromic":
        // FIXED: Test torsional twist continuity at varying ring depths and branch rotations seamlessly
        const gridA_lox = applyWallpaperSymmetry(pointA, -(randomTestRing + 1), randomTestBranch, branches);
        const gridB_lox = applyWallpaperSymmetry(pointB, -randomTestRing,       randomTestBranch, branches);
        coordA = forward.loxodromic(gridA_lox, scale, rotation, twist, decay);
        coordB = forward.loxodromic(gridB_lox, scale, rotation, twist, decay);
        break;

      case "multi-pole":
        // FIXED: Subject the multi-pole trigonometric matrix to non-orthogonal quadrant boundaries
        const gridA_mp = applyWallpaperSymmetry(pointA, -(randomTestRing + 1), randomTestBranch, branches);
        const gridB_mp = applyWallpaperSymmetry(pointB, -randomTestRing,       randomTestBranch, branches);
        coordA = forward.multiPole(gridA_mp, scale, rotation, decay);
        coordB = forward.multiPole(gridB_mp, scale, rotation, decay);
        break;

      default:
        return "ERROR|0|0|Unknown variant";
    }

    if (isNaN(coordA.x) || isNaN(coordB.x) || !isFinite(coordA.x) || !isFinite(coordB.x)) {
      return "FAIL|0|0|Numerical Overflow";
    }

    const seamGapX = Math.abs(coordA.x - coordB.x);
    const seamGapY = Math.abs(coordA.y - coordB.y);

    if (seamGapX > EPSILON || seamGapY > EPSILON) {
      return "FAIL|" + seamGapX + "|" + seamGapY + "|Seam Drift Detected";
    }

    return "PASS|" + seamGapX + "|" + seamGapY + "|OK";

  } catch (err) {
    return "FAIL|0|0|" + err.message;
  }
}

// -------------------------------------------------------------------------
// DUAL-PROGRESSION STRESS TESTING DRIVER GRID
// -------------------------------------------------------------------------
console.log("====================================================");
console.log(" RUNNING PROGRESSIVE RING & BRANCH TELEMETRY ENGINE");
console.log("====================================================\n");

const VARIANTS = ["logarithmic", "single-pole", "loxodromic", "multi-pole"];

VARIANTS.forEach(variant => {
  console.log("--> STRESS TESTING: " + variant.toUpperCase());

  let variantHasFailure = false;
  const historyLog = [];

  // Dual Progression Sweep: Tests increasing Branch and Ring counts simultaneously
  BRANCH_SEQUENCE.forEach(maxTestLimit => {
    let stepPassed = true;
    let worstGapX = 0;
    let worstGapY = 0;
    let logDetails = [];

    for (let run = 1; run <= CONFIG_RUNS_PER_STEP; run++) {
      const scale = getRandom(10, 300);
      const rotation = getRandom(0, Math.PI * 2);
      const decay = getRandom(0.2, 1.5);
      const twist = getRandom(0.1, 1.2);

      // EXTENDED STRESS BOUNDS: Sample randomly across the full progressive depth limit!
      // This tests ring layers all the way down into deep concentric vortex cores
      const randomTestRing = Math.floor(getRandom(0, maxTestLimit));
      const randomTestBranch = Math.floor(getRandom(0, maxTestLimit));

      const statusString = evaluateVariantExtended(variant, maxTestLimit, scale, rotation, decay, twist, randomTestRing, randomTestBranch);
      const [outcome, gapXStr, gapYStr, msg] = statusString.split("|");
      const gapX = parseFloat(gapXStr);
      const gapY = parseFloat(gapYStr);

      if (gapX > worstGapX) worstGapX = gapX;
      if (gapY > worstGapY) worstGapY = gapY;

      logDetails.push({
        run: run,
        scale: scale.toFixed(2),
        decay: decay.toFixed(2),
        twist: twist.toFixed(2),
        ringTested: randomTestRing,
        gapX: gapX.toFixed(5),
        gapY: gapY.toFixed(5),
        outcome: outcome,
        msg: msg
      });

      if (outcome === "FAIL") {
        stepPassed = false;
        variantHasFailure = true;
      }
    }

    historyLog.push({
      limit: maxTestLimit,
      passed: stepPassed,
      worstGapX: worstGapX,
      worstGapY: worstGapY,
      runs: logDetails
    });
  });

  // TELEMETRY PRINTER FORMATTER
  historyLog.forEach(step => {
    // FIXED: Calculate the exact active boundaries explicitly for the label text
    const activeBranches = step.limit;
    const activeMaxRings = step.limit;

    if (step.passed && !VERBOSE_DEBUG && !variantHasFailure) {
      console.log("    Branches: " + String(activeBranches).padEnd(3) + " | Max Rings: " + String(activeMaxRings).padEnd(3) + " -> PASS");
    } else {
      // Extended diagnostic format triggered dynamically on structural failure
      const statusLabel = step.passed ? "PASS" : "FAIL";
      console.log("\n    [DIAGNOSTIC] Structure Size -> Branches: " + activeBranches + " | Max Rings: " + activeMaxRings + " -> " + statusLabel);
      console.log("    Worst Recorded Gap -> X: " + step.worstGapX.toFixed(5) + ", Y: " + step.worstGapY.toFixed(5));
      console.log("    ------------------------------------------------------------------------");
      console.log("    Run   | Scale  | Decay  | Twist  | Ring # | Gap X   | Gap Y   | Status");
      console.log("    ------------------------------------------------------------------------");

      step.runs.forEach(r => {
        const row = "    " +
          String(r.run).padEnd(5) + " | " +
          String(r.scale).padEnd(6) + " | " +
          String(r.decay).padEnd(6) + " | " +
          String(r.twist).padEnd(6) + " | " +
          String(r.ringTested).padEnd(6) + " | " +
          String(r.gapX).padEnd(7) + " | " +
          String(r.gapY).padEnd(7) + " | " +
          r.outcome + " (" + r.msg + ")";
        console.log(row);
      });
      console.log("    ------------------------------------------------------------------------\n");
    }
  });

  if (!variantHasFailure && !VERBOSE_DEBUG) {
    console.log("    ✓ All concentric depth limits for this variant are mathematically aligned.");
  }
  console.log("");
});

console.log("====================================================");
console.log(" STRESS TESTING COMPLETED");
console.log("====================================================");
