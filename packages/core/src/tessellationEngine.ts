import * as fs from 'fs';
import { baseMotifs } from './baseMotifs.ts';
import { forward } from './transforms/forward.ts';
import { normalizeSpiralLayout, generateSvgPath } from './helpers/svgPathUtils.ts';
import { rotateAroundPivot } from './tileSymmetry.ts'

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
  symmetryGroup: 'p1' | 'p3';
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
 * Supports standard translation configurations (p1) and 3-fold rotations (p3).
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
  const continuousHelicalOffset = branch * (tileWidth / totalBranches) * shearSlope;
  const translationX = (ring * tileWidth) + continuousHelicalOffset;
  const translationY = branch * tileHeight;

  return {
    x: point.x + translationX,
    y: point.y + translationY
  };
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

  const rawMotifData = baseMotifs[config.baseMotif]?.({
    cellHeight: cellHeight,
    symmetryGroup: config.symmetryGroup ?? 'p1',
    latticeType: config.latticeType
  }) || [];

  const motifComponents = Array.isArray(rawMotifData[0])
    ? (rawMotifData as Point2D[][])
    : [rawMotifData as Point2D[]];

  const globalScale = config.layout.globalScale ?? 100;
  const twistFactor = config.layout.twistFactor ?? 0.45;
  const decayMultiplier = config.layout.decayMultiplier ?? 0.35;

  let phaseOffset = config.layout.latticePhaseOffset ?? 1.0;
  let ringDistanceMultiplier = config.layout.ringDistanceMultiplier ?? 1.0;
  let ringIntersection = config.layout.ringIntersectionFactor ?? 1.0;

  if (config.latticeType === 'square' && config.useAutoAlignment) {
    ringIntersection = cellHeight;
    ringDistanceMultiplier = 1.0;
    phaseOffset = 1.5;
  }

  if (config.symmetryGroup === "p3" && config.latticeType === 'hexagonal' && config.useAutoAlignment) {
    ringIntersection = 1.0 + (2.10 / totalBranches);
    ringDistanceMultiplier = 1.30;
    // With 6 branches, 1.50 is rotated CCW, 2.50 is rotated CW, 3.50 is more random looking
    phaseOffset = 3.50;
  }

  if (config.symmetryGroup === "p1" && config.latticeType === 'hexagonal' && config.useAutoAlignment) {
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

  const continuousStagger = config.layout.staggerFactor ?? 0.0;
  const shearSlope = (1.0 / totalBranches) * continuousStagger;

  const r = cellHeight / 2;
  const h = r * (Math.sqrt(3) / 2);
  const localCenter = { x: 0, y: r }; // y is exactly cellHeight / 2

  const rawPathObjects: PathObject[] = [];
  const debugTextElements: string[] = [];

  for (let ring = 0; ring < config.layout.maxRings; ring++) {
    for (let branch = 0; branch < totalBranches; branch++) {
      let colorIndex = (branch + ring) % activeColors.length;

      if (config.latticeType === 'triangular') {
        const structuralOffset = Math.floor(ring / 2);
        colorIndex = (branch + ring - structuralOffset) % activeColors.length;
      }

      const currentFill = activeColors[colorIndex] || "#000000";

      smoothComponents.forEach((componentPoints, compIndex) => {
        // Triangles in p6m3 require 6 rotational copies around the v2 corner
        const orientations = config.latticeType === 'triangular'
          ? ['0', '-60', '-120', '-180', '-240', '-300']
          : ['standard'];

        orientations.forEach((orientation) => {
          const transformedPoints = componentPoints.map(p => {
            let gridSpace: Point2D;

            // Check for p3 hexagonal mode first
            if (config.symmetryGroup === 'p3' && config.latticeType === 'hexagonal') {
              // 1. Calculate continuous rotational wave progression
              const baseAngle = (360 - (120 * ring)) % 360;
              const rotationAngle = branch % 2 === 1 ? (baseAngle + 120) % 360 : baseAngle;

              const rotated = rotateAroundPivot(p, localCenter, rotationAngle);

              if (config.variantMode === 'none') {
                let flatX = -ring * (2 * h);
                const flatY = branch * (1.5 * r);
                if (branch % 2 === 1) {
                  flatX -= h;
                }
                gridSpace = { x: rotated.x + flatX, y: rotated.y + flatY };
              } else {
                // Automated Conformal Phase Alignment Rotation Formula
                let base = 240 - (120 * ring);
                if (branch % 2 === 1) {
                  base -= 120;
                }
                const phaseAdjustment = ((base % 360) + 360) % 360;

                // Re-calculate the local rotation combining the flat p3 rule with the active phase adjustment
                const conformalAngle = (rotationAngle + phaseAdjustment) % 360;
                const conformalRotated = rotateAroundPivot(p, localCenter, conformalAngle);

                const tileScaleFactor = 1.0 / ringDistanceMultiplier;

                let normalizedY = branch * cellHeight;
                normalizedY += ring * (phaseOffset - 1.0) * cellHeight;

                const normalizedX = (conformalRotated.x - localCenter.x) * tileScaleFactor;
                const adjustedRotatedY = (conformalRotated.y - localCenter.y) * (Math.sqrt(3) / 2) * tileScaleFactor;

                const shearedPoint: Point2D = {
                  x: normalizedX + (normalizedY / cellHeight) * shearSlope,
                  y: normalizedY + adjustedRotatedY
                };

                gridSpace = { ...shearedPoint };
                const absoluteRingTranslationX = -ring * 1.0;
                gridSpace.x = gridSpace.x - absoluteRingTranslationX + (absoluteRingTranslationX * ringIntersection);
              }
            } else {
              // --- Fallback Pipeline for All Other Base Engine Modes ---
              let localX = p.x;
              let localY = p.y;

              if (config.latticeType === 'triangular') {
                // 1. Convert the orientation string back to a numeric degree angle
                const angleDegrees = parseInt(orientation, 10);

                // 2. Rotate the path directly around the true geometric vertex position v2
                const trueV2 = { x: (Math.sqrt(3) / 2) * cellHeight, y: cellHeight * 0.5 };
                const rotated = rotateAroundPivot({ x: localX, y: localY }, trueV2, angleDegrees);
                localX = rotated.x;
                localY = rotated.y;
              }

              if (config.latticeType === 'hexagonal') {
                localY *= Math.sqrt(3) / 2;
                const tileScaleFactor = 1.0 / ringDistanceMultiplier;
                localX *= tileScaleFactor;
                localY *= tileScaleFactor;
                localY += ring * (phaseOffset - 1.0) * cellHeight;
              }

              const shearedPoint: Point2D = {
                x: localX + (localY / cellHeight) * shearSlope,
                y: localY
              };

              gridSpace = applyWallpaperSymmetry(shearedPoint, -ring, branch, totalBranches, shearSlope);

              if (config.latticeType === 'square') {
                gridSpace.x = (gridSpace.x - (-ring * 1.0)) + (-ring * ringIntersection);
                gridSpace.y = (gridSpace.y - (branch * cellHeight)) + (branch * cellHeight * ringDistanceMultiplier);
                gridSpace.y += ring * cellHeight * (phaseOffset - 1.5);
              }

              if (config.latticeType === 'triangular') {
                const absoluteRingTranslationX = -ring * 1.0;
                const triWidth = (Math.sqrt(3) / 2) * cellHeight;

                // 1. Absolute geometric offsets to drop ring layers into the honeycomb side pockets
                const perfectRingX = -ring * triWidth * 1.5;
                const perfectRingY = ring * cellHeight * 0.5;

                // 2. Map coordinates cleanly when Auto-Align is active
                if (config.useAutoAlignment) {
                  const autoIntersection = 1.0;
                  const autoGap = 1.5;
                  const autoPhase = 2.0;
                  gridSpace.x = localX + (branch * triWidth * autoIntersection) + (ring * triWidth * autoPhase);
                  gridSpace.y = localY + (branch * cellHeight * autoGap) - (ring * cellHeight * (autoPhase * 0.5 - 1.0));
                } else {
                  // Keep manual slider tracking control mapping clean and responsive
                  gridSpace.x = localX + (branch * triWidth * ringIntersection) + (ring * triWidth * phaseOffset);
                  gridSpace.y = localY + (branch * cellHeight * ringDistanceMultiplier) - (ring * cellHeight * (phaseOffset * 0.5 - 1.0));
                }
              }

              if (config.latticeType === 'hexagonal') {
                const absoluteRingTranslationX = -ring * 1.0;
                gridSpace.x = gridSpace.x - absoluteRingTranslationX + (absoluteRingTranslationX * ringIntersection);
              }
            }

            // --- Unified Conformal Warp Processing ---
            let finalPoint: Point2D;
            switch (config.variantMode) {
              case "none": return gridSpace;
              case "logarithmic": finalPoint = forward.logarithmic(gridSpace, config.layout.globalScale); break;
              case "single-pole": finalPoint = forward.singlePole(gridSpace, config.layout.globalScale, config.layout.decayMultiplier); break;
              case "multi-pole": finalPoint = forward.multiPole(gridSpace, config.layout.globalScale, config.layout.decayMultiplier); break;
              case "loxodromic":
              default: finalPoint = forward.loxodromic(gridSpace, config.layout.globalScale, config.layout.twistFactor, config.layout.decayMultiplier); break;
            }

            return finalPoint;
          });

          const segmentStr = generateSvgPath(transformedPoints, compIndex);

          rawPathObjects.push({
            d: segmentStr,
            compIndex: compIndex,
            color: currentFill,
            ring: ring,
            branch: branch
          });

          // Generate text labels for each shape
          if (compIndex === 0 && transformedPoints.length > 0) {
            let labelX = 0;
            let labelY = 0;
            const vertexCount = transformedPoints.length - 1;

            for (let i = 0; i < vertexCount; i++) {
              labelX += transformedPoints[i]!.x;
              labelY += transformedPoints[i]!.y;
            }
            labelX /= vertexCount;
            labelY /= vertexCount;

            // Save the raw text element using local tile space coordinates
            debugTextElements.push(
              `<text x="${labelX.toFixed(2)}" y="${labelY.toFixed(2)}">R${ring} B${branch}</text>`
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
