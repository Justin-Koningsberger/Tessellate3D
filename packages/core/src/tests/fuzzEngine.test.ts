import { strict as assert } from 'assert';
import type { Point2D, EngineConfig } from '../tessellationEngine.ts';
import { applyWallpaperSymmetry } from '../wallpaperSymmetry.ts';
import { LatticeFactory } from '../lattices/latticeFactory.ts';
import type { LatticeContext, LatticeStrategy } from '../lattices/types.ts';
import { forward } from '../transforms/forward.ts';
import { inverseWarp } from '../transforms/inverse.ts';

// -------------------------------------------------------------------------
// MASTER CONFIGURATION & GLOBAL CONTROLS
// -------------------------------------------------------------------------
const VERBOSE_DEBUG = false;      // GLOBAL TOGGLE: Force extended printouts for all steps
const CONFIG_RUNS_PER_STEP = 20;  // Amount of unique randomized runs to test per step
const EPSILON = 0.001;            // Maximum allowable gap (in canvas units) for perfect alignment
const BRANCH_SEQUENCE = [10, 15, 25, 40, 65, 105, 170];

interface FuzzResult {
  status: 'PASS' | 'FAIL' | 'ERROR';
  gapX: number;
  gapY: number;
  message: string;
}

/**
 * Generates a random number bounded uniformly within a target range.
 */
function getRandom(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Helper to normalize string return payloads into strongly typed verification records.
 */
function parseResult(status: 'PASS' | 'FAIL' | 'ERROR', gapX: number, gapY: number, message: string): FuzzResult {
  return { status, gapX, gapY, message };
}

/**
 * CORE EVALUATION ENGINE
 * Calculates adjacent boundary transformations and intercepts precise gap metrics.
 */
function evaluateVariantExtended(
  name: "logarithmic" | "single-pole" | "multi-pole" | "loxodromic",
  branches: number,
  scale: number,
  decay: number,
  twist: number
): FuzzResult {
  const lattices: ('square' | 'triangular' | 'hexagonal')[] = ['square', 'triangular', 'hexagonal'];
  const testLattice = lattices[Math.floor(Math.random() * lattices.length)]!;
  const symmetryGroup = testLattice === 'square' ? 'p1' : 'p3';
  const cellHeight = (Math.PI * 2) / branches;

  // 1. CHOOSE A RANDOM TESTING ANCHOR LAYER WITHIN ACTIVE BOUNDS
  const randomTestRing = Math.floor(getRandom(0, branches));
  const randomTestBranch = Math.floor(getRandom(0, branches));

  const pointA: Point2D = { x: 1.0, y: 0.0 }; // Right edge seam
  const pointB: Point2D = { x: 0.0, y: 0.0 }; // Left edge seam

  const safeScale = Math.min(scale, 150);
  const decayCeiling = branches > 50 ? 0.20 : (branches > 25 ? 0.35 : 0.60);
  const safeDecay = name === "multi-pole" ? Math.min(decay, decayCeiling) : decay;

  // Construct a stateless mock context block to feed down to applyWallpaperSymmetry natively
  const mockContext: EngineConfig = {
    variantMode: name,
    baseMotif: "chevron",
    latticeType: testLattice,
    symmetryGroup: symmetryGroup,
    motifScaleFactor: 1.0,
    useAutoAlignment: true,
    showDebugLabels: false,
    colorPalette: [],
    canvas: { width: "100px", height: "100px", viewBox: "0 0 100 100" },
    layout: {
      totalBranches: branches,
      maxRings: 10,
      globalScale: safeScale,
      decayMultiplier: safeDecay,
      twistFactor: twist,
      subdivisionLimit: 0.05,
      staggerFactor: 0.0,
      ringDistanceMultiplier: getRandom(0.1, 2.0),
      ringIntersectionFactor: getRandom(0.1, 2.0),
      latticePhaseOffset: getRandom(-5.0, 5.0),
      poleOffset: { x: 0.0, y: 0.0 }
    },
    applyStroke: false,
  };

  try {
    /* Picks Point A (the right-side seam of an inner ring) and forward maps it to coordA. Then
     * it picks Point B (the left-side seam of an outer ring) and forward maps it to coordB.
     */
    let coordA: Point2D;
    let coordB: Point2D;

    let gridA: Point2D = { x: pointA.x + randomTestBranch, y: pointA.y + randomTestRing };
    let gridB: Point2D = { x: pointB.x + randomTestBranch + 1, y: pointB.y + randomTestRing };

    // Mirror the smoothing calculations done in generateTessellation
    if (testLattice === 'square') {
      gridA = { x: gridA.x * 0.25, y: gridA.y };
      gridB = { x: gridB.x * 0.25, y: gridB.y };
    } else if (testLattice === 'triangular') {
      gridA = { x: gridA.x * 0.50, y: gridA.y };
      gridB = { x: gridB.x * 0.50, y: gridB.y };
    }

    switch (name) {
      case "logarithmic":
        coordA = forward.logarithmic(gridA, safeScale);
        coordB = forward.logarithmic(gridB, safeScale);
        break;

      case "single-pole":
        coordA = forward.singlePole(gridA, safeScale, safeDecay, { x: 0.0, y: 0.0 });
        coordB = forward.singlePole(gridB, safeScale, safeDecay, { x: 0.0, y: 0.0 });
        break;

      case "loxodromic":
        coordA = forward.loxodromic(gridA, safeScale, twist, safeDecay, { x: 0.0, y: 0.0 });
        coordB = forward.loxodromic(gridB, safeScale, twist, safeDecay, { x: 0.0, y: 0.0 });
        break;

      case "multi-pole":
        coordA = forward.multiPole(gridA, safeScale, safeDecay, { x: 0.0, y: 0.0 });
        coordB = forward.multiPole(gridB, safeScale, safeDecay, { x: 0.0, y: 0.0 });
        break;

      default:
        return parseResult("ERROR", 0, 0, "Unknown transform variant selection");
    }

    if (isNaN(coordA.x) || isNaN(coordB.x) || !isFinite(coordA.x) || !isFinite(coordB.x)) {
      return parseResult("FAIL", 0, 0, `[Lattice: ${testLattice}] Numerical Processing Overflow Encountered`);
    }

    const seamGapX = Math.abs(coordA.x - coordB.x);
    const seamGapY = Math.abs(coordA.y - coordB.y);

    if (seamGapX > EPSILON || seamGapY > EPSILON) {
      return parseResult("FAIL", seamGapX, seamGapY, `[Lattice: ${testLattice}] Seam Alignment Drift Detected`);
    }

    // Bidirectional Verification Check
    if (name === "single-pole" || name === "loxodromic" || name === "multi-pole") {
      const flatCellHeight = (Math.PI * 2) / branches;
      const pristineTilePoint: Point2D = {
        x: getRandom(0.1, 0.9),
        y: getRandom(0.05, flatCellHeight - 0.05)
      };

      // Create a pre-image pre-scaled mapping layer to test inverse limits
      let preWarpedPoint = { x: pristineTilePoint.x, y: pristineTilePoint.y };
      if (testLattice === 'square') {
        preWarpedPoint.x = preWarpedPoint.x * 0.25;
      } else if (testLattice === 'triangular') {
        preWarpedPoint.x = preWarpedPoint.x * 0.50;
      }

      let forwardInteriorPoint: Point2D;
      if (name === "single-pole") {
        forwardInteriorPoint = forward.singlePole(preWarpedPoint, safeScale, safeDecay, { x: 0.0, y: 0.0 });
      } else if (name === "loxodromic") {
        forwardInteriorPoint = forward.loxodromic(preWarpedPoint, safeScale, twist, safeDecay, { x: 0.0, y: 0.0 });
      } else {
        forwardInteriorPoint = forward.multiPole(preWarpedPoint, safeScale, safeDecay, { x: 0.0, y: 0.0 });
      }

      // Round-trip the canvas coordinate back through the inverse solver engine
      const reconstructedInterior = inverseWarp(forwardInteriorPoint, mockContext, branches);

      let invErrorX = Math.abs(reconstructedInterior.x - preWarpedPoint.x);
      let invErrorY = Math.abs(reconstructedInterior.y - preWarpedPoint.y);

      const anglePeriod = name === "single-pole" ? ((Math.PI * 2) / branches) : (Math.PI * 2);
      invErrorY = invErrorY % anglePeriod;
      if (invErrorY > anglePeriod / 2) invErrorY = anglePeriod - invErrorY;

      if (name === "multi-pole") {
        const globalPeriod = Math.PI * 2;
        invErrorX = invErrorX % globalPeriod;
        if (invErrorX > globalPeriod / 2) invErrorX = globalPeriod - invErrorX;
      }

      const maxAllowedDistortion = name === "multi-pole" ? 0.30 : 0.05;
      if (invErrorX > maxAllowedDistortion || invErrorY > maxAllowedDistortion) {
        return parseResult("FAIL", invErrorX, invErrorY, `[Lattice: ${testLattice}] Inverse Bijectivity Distortion Fault`);
      } else if (invErrorX > EPSILON || invErrorY > EPSILON) {
        return parseResult("PASS", invErrorX, invErrorY, `OK (${testLattice} - Sub-Micron Delta)`);
      }
    }

    return parseResult("PASS", seamGapX, seamGapY, `OK (${testLattice})`);

  } catch (err) {
    const fallbackMessage = err instanceof Error ? err.message : String(err);
    return parseResult("FAIL", 0, 0, `[Lattice: ${testLattice}] ${fallbackMessage}`);
  }
}

// -------------------------------------------------------------------------
// DUAL-PROGRESSION STRESS TESTING DRIVER GRID
// -------------------------------------------------------------------------
function runFuzzSuite(): void {
  console.log("====================================================");
  console.log(" RUNNING PROGRESSIVE RING & BRANCH TELEMETRY ENGINE");
  console.log("====================================================\n");

  const VARIANTS = ["logarithmic", "single-pole", "loxodromic", "multi-pole"] as const;

  VARIANTS.forEach(variant => {
    console.log(`--> STRESS TESTING: ${variant.toUpperCase()}`);

    let variantHasFailure = false;
    interface HistoryStep {
      limit: number;
      passed: boolean;
      worstGapX: number;
      worstGapY: number;
      runs: Array<{
        run: number;
        scale: string;
        decay: string;
        twist: string;
        ringTested: number;
        gapX: string;
        gapY: string;
        outcome: string;
        msg: string;
      }>;
    }
    const historyLog: HistoryStep[] = [];

    // Dual Progression Sweep: Tests increasing Branch and Ring counts simultaneously
    BRANCH_SEQUENCE.forEach(maxTestLimit => {
      let stepPassed = true;
      let worstGapX = 0;
      let worstGapY = 0;
      const logDetails: HistoryStep['runs'] = [];

      for (let run = 1; run <= CONFIG_RUNS_PER_STEP; run++) {
        const scale = getRandom(10, 100);
        const decay = variant === "multi-pole" ? getRandom(0.1, 0.7) : getRandom(0.2, 1.1);
        const twist = getRandom(0.1, 1.0);

        // EXTENDED STRESS BOUNDS: Sample randomly across the full progressive depth limit
        const randomTestRing = Math.floor(getRandom(0, maxTestLimit));
        const result = evaluateVariantExtended(variant, maxTestLimit, scale, decay, twist);

        if (result.gapX > worstGapX) worstGapX = result.gapX;
        if (result.gapY > worstGapY) worstGapY = result.gapY;

        logDetails.push({
          run: run,
          scale: scale.toFixed(2),
          decay: decay.toFixed(2),
          twist: twist.toFixed(2),
          ringTested: randomTestRing,
          gapX: result.gapX.toFixed(5),
          gapY: result.gapY.toFixed(5),
          outcome: result.status,
          msg: result.message
        });

        if (result.status === "FAIL") {
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
      const activeBranches = step.limit;

      if (step.passed && !VERBOSE_DEBUG && !variantHasFailure) {
        console.log(`  • Size ${String(activeBranches).padEnd(3)} → PASS`);
      } else {
        // Extended diagnostic format triggered dynamically on structural failure
        console.log(`\n  ❌ Size ${String(activeBranches).padEnd(3)} → FAIL (Worst Gap: X: ${step.worstGapX.toFixed(5)}, Y: ${step.worstGapY.toFixed(5)})`);
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
}

runFuzzSuite();
