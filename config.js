const CONFIG = {
  // "logarithmic, loxodromic", single-pole" or "multi-pole"
  variantMode: "loxodromic",
  baseMotif: "chevron2",
  useInverseDebugging: false,  // True enables absolute canvas tracking via inverse math

  // Grid and Symmetry Layout Configuration
  layout: {
    totalBranches: 5,         // Total spiral arms / structural symmetry axis
    maxRings: 5,              // Depth layers (How many rings wrap inward)
    globalScale: 180,         // Overall design magnification size
    globalRotation: 0,        // Camera spin orientation angle (0 = base alignment)
    subdivisionLimit: 0.05,   // Precision length step for linear smoothing
    decayMultiplier: 0.35,    // Controls how fast tiles shrink as they descend inward.
    // Set to 1.0 to close up the wide center hole completely!
    twistFactor: 0.45         // 0.0 = straight rays (pure single-pole). Positive/Negative values
    // introduce clockwise or counter-clockwise logarithmic nautilus twists.
  },

  // Target Print Palette Hex Array
  colorPalette: [
    "#e62b12", // Layer 1: Red
    "#f5c107", // Layer 2: Gold
    "#2aa10d", // Layer 3: Green
    "#000000", // Layer 4: Black
    "#0000FF", // Layer 5: Blue
    "#FFFFFF" // Layer 6: White
  ],

  // Artboard Panel Sizing Constraints
  canvas: {
    width: "1200px",
    height: "1200px",
    viewBox: "-600 -600 1200 1200"
  }
};

module.exports = CONFIG;
