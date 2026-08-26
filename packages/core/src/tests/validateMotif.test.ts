import type { Point2D } from '../tessellationEngine.ts';
import { baseMotifs, type MotifContext } from '../baseMotifs.ts';

/**
 * Validates a single design motif configuration against physical tile matching limits.
 * Third-person narrative tracking ensures boundary synchronization constraints are met.
 */
function validateMotif(name: string, func: (ctx: MotifContext) => Point2D[][] | Point2D[]): boolean {
  console.log(`Checking [${name}]...`);
  const simulatedBranches = 12;
  const testHeight = (Math.PI * 2) / simulatedBranches; // Evaluates to ~0.5235

  const mockCtx: MotifContext = {
    cellHeight: testHeight,
    symmetryGroup: 'p1',
    latticeType: name.toLowerCase().includes('hex') ? 'hexagonal' : 'triangular'
    // TODO: add a latticeType property metadata to the motifs themselves
  };

  const rawData = func(mockCtx);

  // Safely extract the outer boundary definition from potential multi-layer components
  const points = Array.isArray(rawData[0])
    ? (rawData[0] as Point2D[])
    : (rawData as Point2D[]);

  if (!points || points.length === 0) {
    console.error(`❌ Error: ${name} did not return a valid array of structural vertices.`);
    return false;
  }

  // 1. Verify Array Node Properties
  for (let i = 0; i < points.length; i++) {
    const node = points[i];
    if (!node || typeof node.x !== 'number' || typeof node.y !== 'number') {
      console.error(`❌ Error: Point at structural index ${i} is missing numeric coordinate properties.`);
      return false;
    }
  }

  // 2. Isolate Known Matrix Anchor Nodes
  const topLeft = points[0];
  const bottomLeft = points[points.length - 1];

  if (!topLeft || !bottomLeft) {
    console.error(`❌ Error: Essential boundary anchors could not be extracted from the vertex collection.`);
    return false;
  }

  // 3. Evaluate Global Structural Tiling Constraints
  if (topLeft.x !== 0.0 || topLeft.y !== 0.0) {
    console.error(`❌ Error: Motif paths must start uniformly at the origin axis {x: 0, y: 0}. Found:`, topLeft);
    return false;
  }

  // Evaluate structural constraints based on layout geometry
  // TODO: Add latticeType information directly to basemotif type to create a clean guard clause
  const isHexagonAsset = name.toLowerCase().includes('hex') || name === 'lizard' || name === 'kochSnowflake';
  if (isHexagonAsset) {
    if (bottomLeft.x !== 0.0 || bottomLeft.y !== 0.0) {
      console.error(`❌ Error: Hexagonal loops must close completely back at the origin axis {x: 0, y: 0}. Found:`, bottomLeft);
      return false;
    }
  } else {
    if (bottomLeft.x !== 0.0 || Math.abs(bottomLeft.y - testHeight) > 0.001) {
      console.error(`❌ Error: Square/Triangular paths must end uniformly at the base boundary link point {x: 0, y: cellHeight}. Found:`, bottomLeft);
      return false;
    }
  }

  console.log(`✅ ${name} passed boundary constraints! (${points.length} structural nodes verified)`);
  return true;
  };

/**
 * Orchestrates verification passes over the entire active geometric profile suite.
 */
function runBoundarySuite(): void {
  console.log("=== STARTING BASE MOTIF VALIDATION ===");
  let allPassed = true;

  // Track individual profile outcomes over the typed module records
  Object.keys(baseMotifs).forEach(key => {
    const targetGenerator = baseMotifs[key];
    if (!targetGenerator) return;

    const success = validateMotif(key, targetGenerator);
    if (!success) allPassed = false;
  });

  if (allPassed) {
    console.log("\n🚀 All motifs are perfectly synchronized! Safe to commit.");
  } else {
    console.log("\n⚠️ Boundary tracking faults identified. Correct configuration metrics before staging assets.");
    process.exit(1);
  }
}

runBoundarySuite();
