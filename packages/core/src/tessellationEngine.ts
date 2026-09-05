import * as fs from 'fs';
import { baseMotifs } from './baseMotifs.ts';
import { forward } from './transforms/forward.ts';
import { normalizeSpiralLayout, generateSvgPath } from './helpers/svgPathUtils.ts';
import { rotateAroundPivot } from '@tessellate3d/frontend/src/tileSymmetry.ts'
import { LatticeFactory } from './lattices/latticeFactory.ts';
import { LatticeContext } from './lattices/types.ts';
import { applyWallpaperSymmetry } from './wallpaperSymmetry.ts'

export interface Point2D {
  x: number;
  y: number;
}

export interface PathObject {
  d: string;
  compIndex: number;
  color: string;
  ring?: number;
  branch?: number;
}

export interface EngineConfig {
  variantMode: "logarithmic" | "single-pole" | "multi-pole" | "loxodromic" | "none";
  baseMotif: "square" | "triangle" | "hexagon" | "chevron" | "sinewave" | "squarewave" | "detailedSquare" | "detailedTriangle" | "detailedHexagon" | "hexPuzzle" | "customTileCompiler" | "lizard" | "kochSnowflake" | "cat" | "letters";
  latticeType: 'square' | 'triangular' | 'hexagonal';
  symmetryGroup: 'p1' | 'p3' | 'p6';
  motifScaleFactor: number;
  useAutoAlignment: boolean;
  showDebugLabels: boolean;
  layout: {
    totalBranches: number;
    maxRings: number;
    globalScale: number;
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
  adjustedConf: EngineConfig,
  compIndex: number,
  warpProjection: WarpProjectionFn,
  isInitialTemplatePass: boolean = false
): Point2D[] {
  if (points.length < 2) return [...points];

  const subdivided: Point2D[] = [];
  const subdivisionLimit = adjustedConf.layout.subdivisionLimit;
  // Minimum feature size for most 3D printers
  const minThresholdMm = 0.2;

  // Tie the engine coordinates directly to global physical millimeter scales
  const physicalScaleFactor = adjustedConf.layout.globalScale ?? 1.0;

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

    // TODO: Do some testing at different extremes with isInitialTemplatePass false
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

function getSmoothComponents(
  motifComponents: Point2D[][],
  adjustedConfig: EngineConfig,
  globalScale: number,
  decayMultiplier: number,
  twistFactor: number,
): Point2D[][] {
  const activeWarpProjection: WarpProjectionFn = (pt: Point2D): Point2D => {
    const adjustedPt = { ...pt };
    if (adjustedConfig.latticeType === 'triangular') {
      adjustedPt.x *= Math.sqrt(3) / 2;
    }

    switch (adjustedConfig.variantMode) {
      case 'none':
        return adjustedPt;
      case 'logarithmic':
        return forward.logarithmic(adjustedPt, globalScale);
      case 'single-pole':
        return forward.singlePole(adjustedPt, globalScale, decayMultiplier);
      case 'multi-pole':
        return forward.multiPole(adjustedPt, globalScale, decayMultiplier);
      case 'loxodromic':
      default:
        return forward.loxodromic(adjustedPt, globalScale, twistFactor, decayMultiplier);
    }
  };

  return motifComponents.map((comp, compIndex) =>
    subdividePath(comp, adjustedConfig, compIndex, activeWarpProjection, true)
  );
}

/**
 * Master Generator Function
 */
export function generateTessellation(config: EngineConfig): string {
  const totalBranches = config.layout.totalBranches;
  const globalScale = config.layout.globalScale;
  const twistFactor = config.layout.twistFactor;
  const decayMultiplier = config.layout.decayMultiplier;
  const phaseOffset = config.layout.latticePhaseOffset;
  const ringDistanceMultiplier = config.layout.ringDistanceMultiplier;
  const ringIntersection = config.layout.ringIntersectionFactor;
  const continuousStagger = config.layout.staggerFactor;
  const baseLimit = config.layout.subdivisionLimit;
  const symmetryGroup = config.symmetryGroup;
  const latticeType = config.latticeType;

  const shearSlope = (1.0 / totalBranches) * continuousStagger;
  const cellHeight = (Math.PI * 2) / totalBranches;
  const r = cellHeight / 2;
  const h = r * (Math.sqrt(3) / 2);
  const localCenter = { x: 0, y: r };

  const activeColors: string[] = [];
  for (let i = 0; i < totalBranches; i++) {
    activeColors.push(config.colorPalette[i % config.colorPalette.length] || "#000000");
  }

  const rawMotifData = baseMotifs[config.baseMotif]?.({
    cellHeight: cellHeight,
    symmetryGroup: symmetryGroup,
    latticeType: latticeType
  }) || [];

  const motifComponents = Array.isArray(rawMotifData[0])
    ? (rawMotifData as Point2D[][])
    : [rawMotifData as Point2D[]];

  const smoothComponents = getSmoothComponents(motifComponents, config, globalScale, decayMultiplier, twistFactor);

  const rawPathObjects: PathObject[] = [];
  const debugTextElements: string[] = [];

  const strategy = LatticeFactory.getStrategy(latticeType, symmetryGroup);

  for (let ring = 0; ring < config.layout.maxRings; ring++) {
    for (let branch = 0; branch < totalBranches; branch++) {
      const colorIndex = (branch + ring) % activeColors.length;
      const currentFill = activeColors[colorIndex] || "#000000";

      smoothComponents.forEach((componentPoints, compIndex) => {
        const orientations = strategy.getOrientations();

        orientations.forEach((orientation) => {
          const warpedPoints = componentPoints.map(p => {
            // 1. Orient the motif variant according to local tile symmetry requirements
            const orientedPoint = strategy.transformLocal({ x: p.x, y: p.y }, orientation, cellHeight);

            // 2. Project the oriented coordinates onto the uniform continuous helical shear track
            const shearedPoint: Point2D = {
              x: orientedPoint.x + (orientedPoint.y / cellHeight) * shearSlope,
              y: orientedPoint.y
            };

            // 3. Clone and replicate point positions structurally matching the wallpaper group constraints
            const symmetryMappedPoint = applyWallpaperSymmetry(
              orientedPoint,
              -ring,
              branch,
              cellHeight,
              totalBranches,
              symmetryGroup,
              latticeType
            );

            // Pack runtime execution variables to execute layout spacing computations
            const ctx: LatticeContext = {
              branch,
              ring,
              totalBranches,
              cellHeight,
              triWidth: (Math.sqrt(3) / 2) * cellHeight,
              shearSlope,
              variantMode: config.variantMode ?? 'none',
              useAutoAlignment: config.useAutoAlignment,
              sliders: {
                intersection: ringIntersection,
                distanceMultiplier: ringDistanceMultiplier,
                phaseOffset: phaseOffset
              }
            };

            // 4. Translate, scale, and adjust the finalized grid spaces inside the chosen strategy module
            const gridSpace = strategy.finalizeGridSpace(symmetryMappedPoint, shearedPoint, orientation, ctx);

            // 5. Warp flat coordinates into non-Euclidean spaces using conformal mappings
            let finalPoint: Point2D;
            switch (config.variantMode) {
              case "none": return gridSpace;
              case "logarithmic": finalPoint = forward.logarithmic(gridSpace, globalScale); break;
              case "single-pole": finalPoint = forward.singlePole(gridSpace, globalScale, decayMultiplier); break;
              case "multi-pole": finalPoint = forward.multiPole(gridSpace, globalScale, decayMultiplier); break;
              case "loxodromic":
              default: finalPoint = forward.loxodromic(gridSpace, globalScale, twistFactor, decayMultiplier); break;
            }

            return finalPoint;
          });

          // Compile coordinates into a valid SVG path definition string
          const pathData = generateSvgPath(warpedPoints, compIndex);

          rawPathObjects.push({
            d: pathData,
            compIndex: compIndex,
            color: currentFill,
            ring: ring,
            branch: branch
          });

          // Process canvas tracking labels if debug visualization overlays are enabled
          if (compIndex === 0 && warpedPoints.length > 0) {
            let centroidX = 0;
            let centroidY = 0;
            const vertexCount = warpedPoints.length - 1;

            for (let i = 0; i < vertexCount; i++) {
              centroidX += warpedPoints[i]!.x;
              centroidY += warpedPoints[i]!.y;
            }
            centroidX /= vertexCount;
            centroidY /= vertexCount;

            // Save text tags targeting the calculated visual centroids of the elements
            debugTextElements.push(
              `<text x="${centroidX.toFixed(2)}" y="${centroidY.toFixed(2)}">R${ring} B${branch}</text>`
            );
          }
        });
      });
    }
  }

  const normalizedPaths = normalizeSpiralLayout(rawPathObjects, 1000);

  const groupedPaths: Record<string, string[]> = {};
  const detailPaths: string[] = [];
  const finalDebugTextElements: string[] = [];

  // TODO: Move svg generation to ./helpers
  normalizedPaths.forEach(path => {
    if (path.compIndex === 0) {
      const colorIdx = activeColors.indexOf(path.color);
      const layerKey = `${colorIdx}_${path.color.replace('#', '')}`;

      if (!groupedPaths[layerKey]) {
        groupedPaths[layerKey] = [];
      }
      groupedPaths[layerKey]!.push(`<path fill-rule="evenodd" clip-rule="evenodd" d="${path.d}" />`);

      if (config.showDebugLabels && path.compIndex === 0 && path.d) {
        const coords = path.d.match(/[-.\d]+/g);
        if (coords && coords.length >= 4) {
          let sumX = 0;
          let sumY = 0;
          let count = 0;

          for (let i = 0; i < coords.length - 1; i += 2) {
            const xVal = parseFloat(coords[i]!);
            const yVal = parseFloat(coords[i+1]!);
            if (!isNaN(xVal) && !isNaN(yVal)) {
              sumX += xVal;
              sumY += yVal;
              count++;
            }
          }

          if (count > 0) {
            finalDebugTextElements.push(
              `<text x="${(sumX / count).toFixed(2)}" y="${(sumY / count).toFixed(2)}" text-anchor="middle" dominant-baseline="central">R${path.ring}B${path.branch}</text>`
            );
          }
        }
      }
    } else {
      // Inject explicit stroke vector parameters straight onto the element tag
      detailPaths.push(`<path fill="none" stroke="#000000" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" d="${path.d}" />`);
    }
  });

  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svgContent += `<svg\n  width="${config.canvas.width}"\n  height="${config.canvas.height}"\n  viewBox="${config.canvas.viewBox}"\n  version="1.1"\n  xmlns="http://www.w3.org/2000/svg"\n xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd">\n`;

  Object.keys(groupedPaths).forEach((layerKey) => {
    const structuralLayerGroup = groupedPaths[layerKey];
    if (!structuralLayerGroup || structuralLayerGroup.length === 0) return;

    const [indexStr, cleanId] = layerKey.split('_');
    const index = parseInt(indexStr!, 10);
    const colorHex = `#${cleanId}`;

    // Extract matching open line decorative details (compIndex > 0) that belong to the current color
    const matchingDetails = normalizedPaths
      .filter(path => path.compIndex > 0 && activeColors.indexOf(path.color) === index)
      .map(path => `<path d="${path.d}" />`);

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

  // Overlay for debug text
  if ((config.showDebugLabels ?? true) && finalDebugTextElements.length > 0) {
    svgContent += `  <g id="lattice_debug_labels" fill="#000000" font-family="sans-serif" font-size="14" font-weight="bold" pointer-events="none" sodipodi:insensitive="true">\n`;
    svgContent += `    ${finalDebugTextElements.join('\n    ')}\n`;
    svgContent += `  </g>\n`;
  }

  svgContent += `</svg>\n`;
  return svgContent;
}
