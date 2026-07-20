const fs = require('fs');

/**
 * Linear subdivision function
 */
function subdividePath(points, maxSegmentLength) {
  if (points.length < 2) return [...points];
  const subdivided = [];
  for (let i = 0; i < points.length; i++) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    subdivided.push(current);
    const dx = next.x - current.x;
    const dy = next.y - current.y;
    const distance = Math.hypot(dx, dy);
    if (distance > maxSegmentLength) {
      const segmentsCount = Math.ceil(distance / maxSegmentLength);
      for (let j = 1; j < segmentsCount; j++) {
        const t = j / segmentsCount;
        subdivided.push({ x: current.x + dx * t, y: current.y + dy * t });
      }
    }
  }
  return subdivided;
}

/**
 * Wallpaper Symmetry Engine
 */
function applyWallpaperSymmetry(point, ring, branch, totalBranches) {
  const tileWidth = 1.0;
  const tileHeight = (Math.PI * 2) / totalBranches; 
  return {
    x: point.x + (ring * tileWidth),
    y: point.y + (branch * tileHeight)
  };
}

/**
 * Conformal Warp Function: Logarithmic Spiral (w = e^z)
 */
function forwardLogSpiral(point, scale, angleOffset) {
  const r = Math.exp(point.x) * scale;
  const theta = point.y + angleOffset;
  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };
}

/**
 * 3A. SINGLE-POLE LOG-PERIODIC SPIRAL
 * Core math adapted from Section 3 of the paper. This keeps tiles structurally
 * identical while cleanly scaling them down toward a central focal pole.
 */
function forwardSinglePoleSpiral(point, scale, angleOffset) {
  // 1. Calculate an inverted exponential decay radius based on the grid ring
  // This scales the tiles down smoothly toward the center without shearing them into arcs
  const factor = Math.exp(-point.x * 0.35);
  const r = scale * factor;

  // 2. Wrap the branch translations linearly around the rotational theta path
  const theta = point.y + angleOffset;

  return {
    x: r * Math.cos(theta),
    y: r * Math.sin(theta)
  };
}


/**
 * 3B. MULTI-POLE HYPERBOLIC TRANSFORMER (Normalized)
 * Uses trigonometric folding with an added normalization pass to scale tiles down
 * perfectly, preventing shapes from expanding too fast and overlapping.
 */
function forwardMultiPoleHyperbolic(point, scale, angleOffset) {
  // 1. Core log-periodic scaling factor
  const factor = Math.exp(-point.x * 0.35);
  const r = scale * factor;
  const theta = point.y + angleOffset;

  // 2. Convert to standard Cartesian coordinates
  const mx = r * Math.cos(theta);
  const my = r * Math.sin(theta);

  // 3. Multi-Pole Trigonometric Folding Layer
  // Lowering the scalingFactor (from 0.005 to 0.002) keeps the tiles tightly grouped
  const scalingFactor = 0.002;
  let finalX = scale * Math.sin(mx * scalingFactor) * Math.cosh(my * scalingFactor);
  let finalY = scale * Math.cos(mx * scalingFactor) * Math.sinh(my * scalingFactor);

  // 4. Normalization Factor
  // Compress the expansion scale dynamically based on the current radius factor
  // This keeps the tiles small enough to pack edge-to-edge without colliding
  const compression = 0.25 + (factor * 0.5);
  finalX *= compression;
  finalY *= compression;

  return {
    x: finalX,
    y: finalY
  };
}

/**
 * SVG Path Assembly with Dynamic Color Fills
 */
function generateSvgPath(points, fillColor) {
  if (!points || points.length === 0) return '';

  let d = `M ${points[0].x.toFixed(3)} ${points[0].y.toFixed(3)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(3)} ${points[i].y.toFixed(3)}`;
  }
  d += ' Z';

  // Customizes the fill attribute dynamically while maintaining a clean black outline
  return `  <path d="${d}" fill="${fillColor}" stroke="black" stroke-width="1.0" />\n`;
}

/**
 * Master Generator Function
 */
function generateEscherTessellation() {
  const variantMode   = "single-pole";  // TOGGLE: Choose "single-pole" or "multi-pole"
  const totalBranches = 4
  // This is the square's height, don't set it manually. Calculate it automatically
  const cellHeight = (Math.PI * 2) / totalBranches;

  // Square motif
  // const baseMotifPoints = [
  //   { x: 0.0, y: 0.0 },
  //   { x: 1.0, y: 0.0 },
  //   { x: 1.0, y: cellHeight },
  //   { x: 0.0, y: cellHeight }
  // ];

  // Chevron base motif
  const baseMotifPoints = [
    { x: 0.0, y: 0.0 },                  // Bottom-Left
    { x: 0.5, y: 0.5 },                  // Bottom-Middle (pushed up)
    { x: 1.0, y: 0.0 },                  // Bottom-Right
    { x: 1.0, y: cellHeight },           // Top-Right
    { x: 0.5, y: cellHeight + 0.5 },     // Top-Middle (pushed up)
    { x: 0.0, y: cellHeight }            // Top-Left
  ];

  // Chevron base motif with sharp, deep interlocking features
  // Keeps your deep wave depth fixed while adapting the vertical position perfectly
  // const baseMotifPoints = [
  //   { x: 0.0, y: 0.0 },                        // Bottom-Left
  //   { x: 0.5, y: 0.5 },                        // Bottom-Middle (pushed up)
  //   { x: 1.0, y: 0.0 },                        // Bottom-Right
  //   { x: 1.55, y: cellHeight / 2 },            // Right-Middle Wave (Deep horizontal offset restored!)
  //   { x: 1.0, y: cellHeight },                 // Top-Right
  //   { x: 0.5, y: cellHeight + 0.5 },           // Top-Middle (pushed up)
  //   { x: 0.0, y: cellHeight },                 // Top-Left
  //   { x: 0.55, y: cellHeight / 2 }             // Left-Middle Wave (Deep horizontal pocket restored!)
  // ];


  const smoothMotif = subdividePath(baseMotifPoints, 0.05);

  // Amount of layers/rings
  const maxRings = 4;
  // Final image scale
  const globalScale = 180;
   // Set to 0 to keep the base alignment clear for editing
  const globalRotation = 0;


  // Color palette
  const colorPalette = [
    "#e62b12", // Red
    "#f5c107", // Gold
    "#2aa10d", // Green
    "#000000"  // Black
  ];

  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svgContent += `<svg\n  width="1200px"\n  height="1200px"\n  viewBox="-600 -600 1200 1200"\n  version="1.1"\n  xmlns="http://www.w3.org/2000/svg">\n`;

  // Render wallpaper grid across rings and structural arms
  for (let ring = 0; ring < maxRings; ring++) {
    for (let branch = 0; branch < totalBranches; branch++) {
      const colorIndex = (branch + ring) % colorPalette.length;
      const currentFill = colorPalette[colorIndex];

      const transformedPoints = smoothMotif.map(p => {
        const gridSpace = applyWallpaperSymmetry(p, -ring, branch, totalBranches);

        // Map space based on selected function variant
        if (variantMode === "single-pole") {
          return forwardSinglePoleSpiral(gridSpace, globalScale, globalRotation);
        } else {
          return forwardMultiPoleHyperbolic(gridSpace, globalScale, globalRotation);
        }
      });

      svgContent += generateSvgPath(transformedPoints, currentFill);
    }
  }

  svgContent += `</svg>\n`;
  return svgContent;
}

if (typeof require !== 'undefined' && require.main === module) {
  const resultSvg = generateEscherTessellation();
  fs.writeFileSync('escher_output.svg', resultSvg, 'utf8');
  console.log('Successfully written colored file: escher_output.svg');
}
