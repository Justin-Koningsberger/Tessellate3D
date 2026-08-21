import * as fs from 'fs';
import { baseMotifs } from './baseMotifs.ts';
import { forward } from './transforms/forward.ts';
import { inverseWarp } from './transforms/inverse.ts';

export interface Point2D {
  x: number;
  y: number;
}

export interface PathObject {
  d: string;
  compIndex: number;
  color: string;
}

export interface EngineConfig {
  variantMode: "logarithmic" | "single-pole" | "multi-pole" | "loxodromic";
  baseMotif: "square" | "triangle" | "hexagon" | "chevron" | "sinewave" | "squarewave" | "squarePuzzle" | "detailedSquare" | "detailedTriangle" | "detailedHexagon" | "hexPuzzle";
  useInverseDebugging: boolean;
  latticeType: 'square' | 'triangular' | 'hexagonal';
  useAutoAlignment: boolean;
  layout: {
    totalBranches: number;
    maxRings: number;
    globalScale: number;
    globalRotation: number;
    subdivisionLimit: number;
    decayMultiplier: number;
    twistFactor: number;
    staggerFactor: number;
    ringDistanceMultiplier: number;
    ringIntersectionFactor: number;
    latticePhaseOffset: number;
  };
  applyStroke: boolean;
  colorPalette: string[];
  canvas: {
    width: string;
    height: string;
    viewBox: string;
  };
}

type WarpProjectionFn = (point: Point2D) => Point2D;

/**
 * Advanced Warped-Space Adaptive Subdivision Engine.
 * Evaluates true physical distances post-transformation to guarantee
 * perfectly smooth lines, zero geometric edge gaps, and fine-nozzle FDM culling.
 */
export function subdividePath(
  points: Point2D[],
  config: EngineConfig,
  compIndex: number,
  warpProjection: WarpProjectionFn,
  isInitialTemplatePass: boolean = false
): Point2D[] {
  if (points.length < 2) return [...points];

  const subdivided: Point2D[] = [];
  const subdivisionLimit = config.layout.subdivisionLimit;
  // Minimum feature size for most 3D printers
  const minThresholdMm = 0.2;

  // Tie the engine coordinates directly to global physical millimeter scales
  const physicalScaleFactor = config.layout.globalScale ?? 1.0;

  const isClosedLoop = compIndex === 0;
  const iterations = isClosedLoop ? points.length : points.length - 1;

  for (let i = 0; i < iterations; i++) {

    const current = points[i]!;
    const next = points[(i + 1) % points.length]!;

    // 1. Run the forward transformation projection on both endpoints
    const warpedCurrent = warpProjection(current);
    const warpedNext = warpProjection(next);

    // 2. Compute absolute Euclidean distance post-transformation
    const dxWarped = warpedNext.x - warpedCurrent.x;
    const dyWarped = warpedNext.y - warpedCurrent.y;
    const physicalDistanceMm = Math.hypot(dxWarped, dyWarped) * physicalScaleFactor;

    // 3. FDM Feature Culling Filter
    // Automatically skip decorative sub-features (compIndex > 0) that compress below 0.2mm
    if (compIndex > 0 && !isInitialTemplatePass && physicalDistanceMm < minThresholdMm) {
      continue;
    }

    subdivided.push(current);

    // 4. True Post-Warp Segment Subdivision Execution
    // If the actual physical segment exceeds visual fidelity limit,
    // inject points natively in flat space to bridge the curved warp seamlessly.
    if (physicalDistanceMm > subdivisionLimit) {
      const segmentsCount = Math.ceil(physicalDistanceMm / subdivisionLimit);
      for (let j = 1; j < segmentsCount; j++) {
        const t = j / segmentsCount;
        subdivided.push({
          x: current.x + (next.x - current.x) * t,
          y: current.y + (next.y - current.y) * t
        });
      }
    }
  }

  // For structural details running as open strokes, preserve the final terminal node explicitly
  if (!isClosedLoop && points.length > 0) {
    subdivided.push(points[points.length - 1]!);
  }

  return subdivided;
}

/**
 * Wallpaper Symmetry Engine (With Helical Spiral Shift Support).
 */
export function applyWallpaperSymmetry(
  point: Point2D,
  ring: number,
  branch: number,
  totalBranches: number,
  shearSlope: number,
): Point2D {
  const tileWidth = 1.0;
  const tileHeight = (Math.PI * 2) / totalBranches;

  // Calculate continuous displacement offset across active branch counts
  const continuousHelicalOffset = branch * (tileWidth / totalBranches) * shearSlope;

  return {
    x: point.x + (ring * tileWidth) + continuousHelicalOffset,
    y: point.y + (branch * tileHeight)
  };
}

/**
 * Enforces geometric precision closure to prevent slicing self-intersections.
 */
export function generateSvgPath(points: Point2D[], compIndex: number): string {
  // Open paths need a minimum of two points, closed path need a minimum of three points
  if (points.length < 2) return "";
  if (compIndex === 0 && points.length < 3) return "";

  const startPoint = points[0]!;
  const endPoint = points[points.length - 1]!;
  const gapDistance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);

  // If the path loops back near its origin, force-weld the anchors to form a perfect manifold
  if (compIndex === 0 && gapDistance > 0 && gapDistance < 0.005) {
    points[points.length - 1] = { x: startPoint.x, y: startPoint.y };
  }

  let d = `M ${points[0]!.x.toFixed(4)} ${points[0]!.y.toFixed(4)}`;
  for (let i = 1; i < points.length; i++) {
    // Guard against non-linear transform coordinate breakdown corruption
    if (isNaN(points[i]!.x) || isNaN(points[i]!.y) || !isFinite(points[i]!.x) || !isFinite(points[i]!.y)) {
      continue;
    }

    d += ` L ${points[i]!.x.toFixed(4)} ${points[i]!.y.toFixed(4)}`;
  }

  if (compIndex === 0) {
    d += " Z";
  }

  return d;
}

/**
 * Global Coordinate Normalization Module.
 * Scales and centers a raw array of spiral path string definitions.
 */
export function normalizeSpiralCanvas(
  compiledPathObjects: PathObject[],
  targetDimensions: number = 500
): PathObject[] {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

  // Scan phase: Parse out raw coordinates to find absolute geometric bounds
  compiledPathObjects.forEach(path => {
    const coordPairs = path.d.match(/[-+]?[0-9]*\.?[0-9]+/g);
    if (!coordPairs) return;

    for (let i = 0; i < coordPairs.length; i += 2) {
      const xStr = coordPairs[i];
      const yStr = coordPairs[i + 1];
      if (!xStr || !yStr) continue;

      const x = parseFloat(xStr);
      const y = parseFloat(yStr);

      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  });

  const currentWidth = maxX - minX;
  const currentHeight = maxY - minY;

  if (currentWidth === 0 || currentHeight === 0 || minX === Infinity || minY === Infinity) {
    return compiledPathObjects;
  }

  const scaleFactor = targetDimensions / Math.max(currentWidth, currentHeight);
  const centerX = minX + (currentWidth / 2);
  const centerY = minY + (currentHeight / 2);

  // Transformation pass: Apply normalized matrices back to the SVG path tokens
  return compiledPathObjects.map(path => {
    const normalizedD = path.d.replace(/([-+]?[0-9]*\.?[0-9]+)\s+([-+]?[0-9]*\.?[0-9]+)/g, (_, xStr, yStr) => {
      const nx = ((parseFloat(xStr) - centerX) * scaleFactor).toFixed(4);
      const ny = ((parseFloat(yStr) - centerY) * scaleFactor).toFixed(4);
      return `${nx} ${ny}`;
    });

    return { ...path, d: normalizedD };
  });
}

/**
 * Master Generator Function
 */
export function generateTessellation(config: EngineConfig): string {
  const totalBranches = config.layout.totalBranches;
  const cellHeight = (Math.PI * 2) / totalBranches;

  const activeColors: string[] = [];
  for (let i = 0; i < totalBranches; i++) {
    activeColors.push(config.colorPalette[i % config.colorPalette.length] || "#000000");
  }

  const rawMotifData = baseMotifs[config.baseMotif]?.(cellHeight) || [];
  const motifComponents = Array.isArray(rawMotifData[0])
    ? (rawMotifData as Point2D[][])
    : [rawMotifData as Point2D[]];

  const globalScale = config.layout.globalScale ?? 100;
  const twistFactor = config.layout.twistFactor ?? 0.45;
  const decayMultiplier = config.layout.decayMultiplier ?? 0.35;
  const nominalAngleOffset = 0.0; // Anchored target reference layer

  let phaseOffset = config.layout.latticePhaseOffset ?? 1.0;
  let ringDistanceMultiplier = config.layout.ringDistanceMultiplier ?? 1.0;
  let ringIntersection = config.layout.ringIntersectionFactor ?? 1.0;

  if (config.latticeType === 'triangular' && config.useAutoAlignment) {
    ringIntersection = (Math.PI * Math.sqrt(3)) / totalBranches;
    ringDistanceMultiplier = 1.866025 - 0.159155 * totalBranches;

    // Compute structural phase offset mapping for triangular grids
    const isOdd = totalBranches % 2 !== 0;
    phaseOffset = (Math.round(-totalBranches) / 2) + Math.floor(totalBranches / 4) - (isOdd ? 0.5 : 0);
  }

  if (config.latticeType === 'hexagonal' && config.useAutoAlignment) {
    ringIntersection = 2.10 / totalBranches;
    ringDistanceMultiplier = 1.298;
    phaseOffset = 1.50;
  }

  const activeWarpProjection: WarpProjectionFn = (pt: Point2D): Point2D => {
    const adjustedPt = { ...pt };
    if (config.latticeType === 'triangular') {
      adjustedPt.x *= Math.sqrt(3) / 2;
    }
    switch (config.variantMode) {
      case 'logarithmic':
        return forward.logarithmic(adjustedPt, globalScale, nominalAngleOffset);
      case 'single-pole':
        return forward.singlePole(adjustedPt, globalScale, nominalAngleOffset, decayMultiplier);
      case 'multi-pole':
        return forward.multiPole(adjustedPt, globalScale, nominalAngleOffset, decayMultiplier);
      case 'loxodromic':
      default:
        return forward.loxodromic(adjustedPt, globalScale, nominalAngleOffset, twistFactor, decayMultiplier);
    }
  };

  // Dynamically increase vertex density to seal micro-gaps caused by non-linear distortion
  const baseLimit = config.layout.subdivisionLimit ?? 5.0;
  const adjustedConfig: EngineConfig = {
    ...config,
    layout: {
      ...config.layout,
      subdivisionLimit: config.variantMode === "multi-pole"
        ? baseLimit * Math.max(0.20, decayMultiplier * 0.65)
        : config.variantMode === "single-pole"
        ? baseLimit * Math.max(0.25, decayMultiplier * 0.85)
        : baseLimit
    }
  };

  const smoothComponents = motifComponents.map((comp, compIndex) =>
    subdividePath(comp, adjustedConfig, compIndex, activeWarpProjection, true)
  );

  let calibrationSvg = "";
  if (config.useInverseDebugging) {
    calibrationSvg += `  <!-- INVERSE CALIBRATION MESH LINES -->\n`;
    calibrationSvg += `  <circle cx="0" cy="0" r="${config.layout.globalScale}" fill="none" stroke="#ccc" stroke-dasharray="5,5" stroke-width="2" />\n`;
  }

  const rawPathObjects: PathObject[] = [];

  for (let ring = 0; ring < config.layout.maxRings; ring++) {
    for (let branch = 0; branch < totalBranches; branch++) {
      let colorIndex = (branch + ring) % activeColors.length;

      if (config.latticeType === 'triangular') {
        const structuralOffset = Math.floor(ring / 2);
        colorIndex = (branch + ring - structuralOffset) % activeColors.length;
      }

      const currentFill = activeColors[colorIndex] || "#000000";

      const continuousStagger = config.layout.staggerFactor ?? 0.0;
      const shearSlope = (1.0 / totalBranches) * continuousStagger;

      smoothComponents.forEach((componentPoints, compIndex) => {
        // Triangles require two orientations (upright and inverted) to fill a lattice slot
        const orientations = config.latticeType === 'triangular' ? ['upright', 'inverted'] : ['standard'];

        orientations.forEach((orientation) => {
          const transformedPoints = componentPoints.map(p => {
            // Create a local coordinate space clone for manipulation
            let localX = p.x;
            let localY = p.y;

            // If we are on a triangular lattice, shape the base motif bounding envelope
            if (config.latticeType === 'triangular') {
              // Squish the horizontal axis to match equilateral proportions (sqrt(3)/2)
              localX *= Math.sqrt(3) / 2;

              // If it's the second orientation, flip/invert the tile to plug the mesh gap
              if (orientation === 'inverted') {
                localX = ((Math.sqrt(3) / 2) - localX);
                localY = (cellHeight - localY);

                // 1. Adjust the localized radial spacing gap between triangle pairs
                localX += (ringDistanceMultiplier - 1.0) * (Math.sqrt(3) / 2) * cellHeight;

                // 2. Adjust the localized circumferential phase offset between triangle pairs
                localY += (phaseOffset - 0.5) * cellHeight;
              }

              // Apply a systematic offset to alternating rows so they slot into place like bricks
              if (ring % 2 === 1) {
                localY += cellHeight * 0.5;
              }
            }

            // If we are on a hexagonal lattice, implement an alternating branch grid layout
            if (config.latticeType === 'hexagonal') {
              // Compress the circumferential axis to pack flat side-edges together
              localY *= Math.sqrt(3) / 2;

              // Scale the inner motif dimensions to leave padding gaps between neighbors
              const tileScaleFactor = 1.0 / ringDistanceMultiplier;
              localX *= tileScaleFactor;
              localY *= tileScaleFactor;

              // Accumulate twist linearly across concentric ring layers
              localY += ring * (phaseOffset - 1.0) * cellHeight;
            }

            // Pass new local points through the structural symmetry engine
            const shearedPoint: Point2D = {
              x: localX + (localY / cellHeight) * shearSlope,
              y: localY
            };

            let gridSpace = applyWallpaperSymmetry(shearedPoint, -ring, branch, totalBranches, shearSlope);

            // Dynamically adjust ring-to-ring depth
            if (config.latticeType === 'triangular') {
              const absoluteRingTranslationX = -ring * 1.0; // The 1.0 tileWidth used inside the symmetry engine
              gridSpace.x = gridSpace.x - absoluteRingTranslationX + (absoluteRingTranslationX * (Math.sqrt(3) / 2) * ringIntersection);
            }

            if (config.latticeType === 'hexagonal') {
              const absoluteRingTranslationX = -ring * 1.0;
              // Step inward matching the 1.5x flat-packing cell thickness
              gridSpace.x = gridSpace.x - absoluteRingTranslationX + (absoluteRingTranslationX * ringIntersection);
            }

            let finalPoint: Point2D;
            switch (config.variantMode) {
              case "logarithmic":
                finalPoint = forward.logarithmic(gridSpace, config.layout.globalScale, config.layout.globalRotation);
                break;
              case "single-pole":
                finalPoint = forward.singlePole(gridSpace, config.layout.globalScale, config.layout.globalRotation, config.layout.decayMultiplier);
                break;
              case "multi-pole":
                finalPoint = forward.multiPole(gridSpace, config.layout.globalScale, config.layout.globalRotation, config.layout.decayMultiplier);
                break;
              case "loxodromic":
              default:
                finalPoint = forward.loxodromic(gridSpace, config.layout.globalScale, config.layout.globalRotation, config.layout.twistFactor, config.layout.decayMultiplier);
                break;
            }

            return finalPoint;
          });

          const segmentStr = generateSvgPath(transformedPoints, compIndex);

          rawPathObjects.push({
            d: segmentStr,
            compIndex: compIndex,
            color: currentFill
          });
        });
      });
    }
  }

  const normalizedPaths = normalizeSpiralCanvas(rawPathObjects, 1000);

  const groupedPaths: Record<string, string[]> = {};
  const detailPaths: string[] = [];

  normalizedPaths.forEach(path => {
    if (path.compIndex === 0) {
      const colorIdx = activeColors.indexOf(path.color);
      const layerKey = `${colorIdx}_${path.color.replace('#', '')}`;

      if (!groupedPaths[layerKey]) {
        groupedPaths[layerKey] = [];
      }
      groupedPaths[layerKey]!.push(`<path fill-rule="evenodd" clip-rule="evenodd" d="${path.d}" />`);
    } else {
      // Inject explicit stroke vector parameters straight onto the element tag
      detailPaths.push(`<path fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="${path.d}" />`);

    }
  });

  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svgContent += `<svg\n  width="${config.canvas.width}"\n  height="${config.canvas.height}"\n  viewBox="${config.canvas.viewBox}"\n  version="1.1"\n  xmlns="http://www.w3.org/2000/svg">\n`;
  svgContent += calibrationSvg;

  Object.keys(groupedPaths).forEach((layerKey) => {
    const structuralLayerGroup = groupedPaths[layerKey];
    if (!structuralLayerGroup || structuralLayerGroup.length === 0) return;

    const [indexStr, cleanId] = layerKey.split('_')
    const index = parseInt(indexStr!, 10);
    const colorHex = `#${cleanId}`;

    // Extract matching open line decorative details (compIndex > 0) that belong to the current color
    const matchingDetails = normalizedPaths
      .filter(path => path.compIndex > 0 && activeColors.indexOf(path.color) === index)
      .map(path => `<path d="${path.d}" />`)

    svgContent += `  <g id="color_${index + 1}_${cleanId}" fill="${colorHex}" stroke="${config.applyStroke ? '#000000' : 'none'}">\n`;
    svgContent += structuralLayerGroup.join('');
    svgContent += `  </g>\n`;

    if (matchingDetails.length > 0) {
      // Group layer details cleanly by dynamic color ID
      svgContent += `  <g id="color_${index + 1}_${cleanId}_details" fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="butt" stroke-linejoin="round">\n`;
      svgContent += `    ${matchingDetails.join('\n    ')}\n`;
      svgContent += `  </g>\n`;
    }
  });

  svgContent += `</svg>\n`;
  return svgContent;
}
