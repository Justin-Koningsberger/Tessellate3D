import type { EngineConfig } from './tessellationEngine.ts';

export const CONFIG: EngineConfig = {
  variantMode: "loxodromic",
  baseMotif: "squarewave",
  latticeType: 'square',
  symmetryGroup: 'p1',        // Default to standard translation symmetry
  motifScaleFactor: 1.0,      // Default to fully interlocking size
  useAutoAlignment: true,
  showDebugLabels: true,      // True enables absolute canvas tracking via inverse math

  // Grid and Symmetry Layout Configuration
  layout: {
    totalBranches: 4,         // Total spiral arms / structural symmetry axis
    maxRings: 6,              // Depth layers (How many rings wrap inward)
    globalScale: 180,         // Overall design magnification size
    subdivisionLimit: 0.05,   // Precision length step for linear smoothing
    decayMultiplier: 0.35,    // Controls how fast tiles shrink as they descend inward. Set to 1.0 to close up the wide center hole completely!
    twistFactor: 0.45,        // With Loxodromic mode: 0.0 = straight rays (pure single-pole). Positive/Negative values introduce clockwise or counter-clockwise logarithmic nautilus twists.
    staggerFactor: 0.0,       // Set to 0.0 for classic side-by-side concentric tiling
    ringDistanceMultiplier: 1.0, // Adjusts the gap between the upright and inverted triangles within each ring
    ringIntersectionFactor: 1.0, // Adjusts the distance between rings with triangles.
    latticePhaseOffset: 1.0,  // Whole numbers make triangles snap edge to edge, half numbers make triangles overlap halfway
  },

  applyStroke: false,
  // Target Print Palette Hex Array
  colorPalette: [
    "#e62b12", // Layer 1: Red
    "#f5c107", // Layer 2: Gold
    "#2aa10d", // Layer 3: Green
    "#919191", // Layer 4: Grey
    "#0000FF", // Layer 5: Blue
    "#F97316", // layer 6: Orange
    "#B6FFBB", // layer 7: Mint
    "#7C3AED", // layer 8: Violet
    "#EC4899", // layer 9: Magenta
    "#6FD2EA", // Layer 10: Ice blue
  ],

  // Artboard Panel Sizing Constraints
  canvas: {
    width: "1200px",
    height: "1200px",
    viewBox: "-600 -600 1200 1200"
  }
};
