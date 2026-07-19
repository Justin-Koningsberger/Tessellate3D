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
  const totalBranches = 4; 
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

  const smoothMotif = subdividePath(baseMotifPoints, 0.05);

  // Amount of layers/rings
  const maxRings = 4;
  // Final image scale
  const globalScale = 180;
  // Rotates final generated SVG
  const globalRotation = Math.PI / 2; // Rotates final svg

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
      
      // Calculate color index based on current arm and ring, shifting by 1 each time
      const colorIndex = (branch + ring) % colorPalette.length;
      const currentFill = colorPalette[colorIndex];

      const transformedPoints = smoothMotif.map(p => {
        const gridSpace = applyWallpaperSymmetry(p, ring, branch, totalBranches);

        return forwardLogSpiral(gridSpace, globalScale, globalRotation);
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
