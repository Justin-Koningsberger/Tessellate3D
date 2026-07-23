const fs = require('fs');
const CONFIG = require('./config');
const baseMotifs = require('./baseMotifs');
const forward = require('./transforms/forward');
const inverseWarp =require('./transforms/inverse')

/**
 * 1. Linear subdivision function
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
 * 2. Wallpaper Symmetry Engine (With Helical Spiral Shift Support)
 */
function applyWallpaperSymmetry(point, ring, branch, totalBranches) {
  const tileWidth = 1.0;
  const tileHeight = (Math.PI * 2) / totalBranches; 

  // Safely look up configuration property parameters
  const stagger = CONFIG.layout.staggerFactor !== undefined ? CONFIG.layout.staggerFactor : 0.0;

  // SNAP FILTER: Force layout calculations to use clean, stable 0 or 1 grids
  const cleanStagger = stagger >= 0.5 ? 1.0 : 0.0;

  // Calculate continuous displacement offset across active branch counts
  const helicalOffset = branch * (tileWidth / totalBranches) * cleanStagger;

  return {
    x: point.x + (ring * tileWidth) - helicalOffset,
    y: point.y + (branch * tileHeight)
  };
}

/**
 * Generates an SVG path string from an array of coordinates,
 * enforcing geometric precision closure to prevent slicing self-intersections.
 * @param {Array<object>} points - Array of {x, y} coordinate objects
 * @returns {string} Fully sanitized and snapped SVG path tag
 */
function generateSvgPath(points) {
  if (!points || points.length < 3) return "";

  // 1. Adaptive Micro-Snapping: Detect and eliminate microscopic structural drift
  const startPoint = points[0];
  const endPoint = points[points.length - 1];
  const gapDistance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);

  // If the path loops back near its origin, force-weld the anchors to form a perfect manifold
  if (gapDistance > 0 && gapDistance < 0.005) {
    points[points.length - 1] = { x: startPoint.x, y: startPoint.y };
  }

  // 2. Build standard SVG string tokens
  let d = `M ${points[0].x.toFixed(4)} ${points[0].y.toFixed(4)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x.toFixed(4)} ${points[i].y.toFixed(4)}`;
  }

  // Close the loop explicitly
  d += " Z";

  // 3. Inject explicit EvenOdd winding rules directly into the path definition
  return `<path fill-rule="evenodd" clip-rule="evenodd" d="${d}" />`;
}


/**
 * Master Generator Function
 */
function generateEscherTessellation() {
  const totalBranches = CONFIG.layout.totalBranches;
  // This is the square's height, don't set it manually. Calculate it automatically
  const cellHeight = (Math.PI * 2) / CONFIG.layout.totalBranches;

  // DYNAMIC SLICING LAYER: Extract exactly enough colors to # of structural lanes.
  // If the palette pool runs out, it wraps around safely using remainder logic
  const activeColors = [];
  for (let i = 0; i < totalBranches; i++) {
    activeColors.push(CONFIG.colorPalette[i % CONFIG.colorPalette.length]);
  }

  // --- UPDATED SUBDIVISION LAYER HANDLING ---
  // Support multi-component motifs (e.g. boundary plus internal eyes, scales, wings)
  // by normalizing everything to a nested array format so details are processed independently.
  const rawMotifData = baseMotifs[CONFIG.baseMotif](cellHeight);
  const motifComponents = Array.isArray(rawMotifData[0]) ? rawMotifData : [rawMotifData];

  // Subdivide each vector component independently
  const smoothComponents = motifComponents.map(comp =>
    subdividePath(comp, CONFIG.layout.subdivisionLimit)
  );

  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svgContent += `<svg\n  width="${CONFIG.canvas.width}"\n  height="${CONFIG.canvas.height}"\n  viewBox="${CONFIG.canvas.viewBox}"\n  version="1.1"\n  xmlns="http://w3.org/2000/svg">\n`;

  // Inject a visual target reticle grid behind everything if inverse debugging is toggled on
  if (CONFIG.useInverseDebugging) {
    svgContent += `  <!-- INVERSE CALIBRATION MESH LINES -->\n`;
    svgContent += `  <circle cx="0" cy="0" r="${CONFIG.layout.globalScale}" fill="none" stroke="#ccc" stroke-dasharray="5,5" stroke-width="2" />\n`;
  };

  // Instantiate clean color grouping registers
  const groupedPaths = {};
  activeColors.forEach(color => {
    groupedPaths[color] = [];
  });

  // INTERNAL DETAIL TRACKER: Stores decorative paths to layer them separately on top
  const detailPaths = [];

  // Render wallpaper grid across rings and structural arms
  for (let ring = 0; ring < CONFIG.layout.maxRings; ring++) {
    for (let branch = 0; branch < totalBranches; branch++) {
      const colorIndex = (branch + ring) % activeColors.length;
      const currentFill = activeColors[colorIndex];

      const stagger = CONFIG.layout.staggerFactor !== undefined ? CONFIG.layout.staggerFactor : 0.0;
      const cleanStagger = stagger >= 0.5 ? 1.0 : 0.0;
      // AUTOMATIC AFFINE SHEAR MATRIX GENERATION
      const shearSlope = (1.0 / totalBranches) * cleanStagger;

      // Track all separate path fragments for this specific tile
      let continuousTilePathString = "";

      // Loop through each sub-path component inside the motif (Boundary, Eyes, Scales, etc.)
      smoothComponents.forEach((componentPoints, compIndex) => {
        const transformedPoints = componentPoints.map(p => {
          const shearedPoint = {
            x: p.x + (p.y / cellHeight) * shearSlope,
            y: p.y
          };

          const gridSpace = applyWallpaperSymmetry(shearedPoint, -ring, branch, totalBranches);
          let finalPoint;

          switch (CONFIG.variantMode) {
            case "logarithmic":
              finalPoint = forward.logarithmic(gridSpace, CONFIG.layout.globalScale, CONFIG.layout.globalRotation);
              break;
            case "single-pole":
              finalPoint = forward.singlePole(gridSpace, CONFIG.layout.globalScale, CONFIG.layout.globalRotation, CONFIG.layout.decayMultiplier);
              break;
            case "multi-pole":
              finalPoint = forward.multiPole(gridSpace, CONFIG.layout.globalScale, CONFIG.layout.globalRotation, CONFIG.layout.decayMultiplier);
              break;
            case "loxodromic":
            default:
              finalPoint = forward.loxodromic(gridSpace, CONFIG.layout.globalScale, CONFIG.layout.globalRotation, CONFIG.layout.twistFactor, CONFIG.layout.decayMultiplier);
              break;
          }

          if (CONFIG.useInverseDebugging && p.x === 0 && p.y === 0) {
            inverseWarp(finalPoint, CONFIG);
          }

          return finalPoint;
        });

        // Generate the SVG segment out of this transformed sub-path fragment
        const segmentStr = generateSvgPath(transformedPoints);
        if (compIndex === 0) {
          continuousTilePathString += segmentStr; // Comp 0 is always the main solid background tile
        } else {
          // Comp > 0 are decorations; isolate them from base fills to colorize later
          detailPaths.push(segmentStr);
        }
      });

      // Push the unified structural tile (Boundary + Internal details combined) into the color group
      groupedPaths[currentFill].push(continuousTilePathString);
    }
  }

  // SERIALIZE DYNAMIC ACTIVE LAYER GROUPS ONLY
  activeColors.forEach((color, index) => {
    if (!groupedPaths[color] || groupedPaths[color].length === 0) return;
    const cleanId = color.replace('#', '');
    svgContent += `  <g id="color_${index + 1}_${cleanId}" fill="${color}">\n`;
    svgContent += groupedPaths[color].join('');
    svgContent += `  </g>\n`;
  });

  // SERIALIZE DECORATIVE LAYERS: Render all internal details using a neutral grey stroke overlay
  if (detailPaths.length > 0) {
    svgContent += `  <g id="escher_internal_details" fill="none" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n`;
    svgContent += detailPaths.join('');
    svgContent += `  </g>\n`;
  }

  svgContent += `</svg>\n`;
  return svgContent;
}

if (typeof require !== 'undefined' && require.main === module) {
  const resultSvg = generateEscherTessellation();
  fs.writeFileSync('escher_output.svg', resultSvg, 'utf8');
  console.log('Successfully written colored file: escher_output.svg');
}

// Expose core functions for automated test verification
module.exports = {
  subdividePath,
  applyWallpaperSymmetry,
  generateSvgPath,
  generateEscherTessellation
};
