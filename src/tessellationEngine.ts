import * as fs from 'fs';
import { baseMotifs } from './baseMotifs.js';
import { forward } from './transforms/forward.js';
import { inverseWarp } from './transforms/inverse.js';

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
  baseMotif: "square" | "chevron" | "chevron2" | "sinewave" | "squarewave" | "puzzle" | "detailedSquare";
  useInverseDebugging: boolean;
  layout: {
    totalBranches: number;
    maxRings: number;
    globalScale: number;
    globalRotation: number;
    subdivisionLimit: number;
    decayMultiplier: number;
    twistFactor: number;
    staggerFactor: number;
  };
  colorPalette: string[];
  canvas: {
    width: string;
    height: string;
    viewBox: string;
  };
}

/**
 * Linear path subdivision engine.
 * Ensures flat paths smoothly flex under conformal warping equations.
 */
export function subdividePath(points: Point2D[], maxSegmentLength: number): Point2D[] {
  if (points.length < 2) return [...points];
  const subdivided: Point2D[] = [];

  for (let i = 0; i < points.length; i++) {
    const current = points[i]!;
    const next = points[(i + 1) % points.length]!;
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
 * Wallpaper Symmetry Engine (With Helical Spiral Shift Support).
 * Accepting the config parameter ensures decoupled, stateless execution.
 */
export function applyWallpaperSymmetry(
  point: Point2D,
  ring: number,
  branch: number,
  config: EngineConfig
): Point2D {
  const tileWidth = 1.0;
  const totalBranches = config.layout.totalBranches;
  const tileHeight = (Math.PI * 2) / totalBranches;

  const stagger = config.layout.staggerFactor;
  const cleanStagger = stagger >= 0.5 ? 1.0 : 0.0;

  // Calculate continuous displacement offset across active branch counts
  const helicalOffset = branch * (tileWidth / totalBranches) * cleanStagger;

  return {
    x: point.x + (ring * tileWidth) - helicalOffset,
    y: point.y + (branch * tileHeight)
  };
}

/**
 * Enforces geometric precision closure to prevent slicing self-intersections.
 * Generates valid standalone SVG path tags containing evenodd slicing rules.
 */
export function generateSvgPath(points: Point2D[]): string {
  if (points.length < 3) return "";

  const startPoint = points[0]!;
  const endPoint = points[points.length - 1]!;
  const gapDistance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);

  // If the path loops back near its origin, force-weld the anchors to form a perfect manifold
  if (gapDistance > 0 && gapDistance < 0.005) {
    points[points.length - 1] = { x: startPoint.x, y: startPoint.y };
  }

  let d = `M ${points[0]!.x.toFixed(4)} ${points[0]!.y.toFixed(4)}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i]!.x.toFixed(4)} ${points[i]!.y.toFixed(4)}`;
  }

  d += " Z";

  return `<path fill-rule="evenodd" clip-rule="evenodd" d="${d}" />`;
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
export function generateEscherTessellation(config: EngineConfig): string {
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

  const smoothComponents = motifComponents.map(comp =>
    subdividePath(comp, config.layout.subdivisionLimit)
  );

  let calibrationSvg = "";
  if (config.useInverseDebugging) {
    calibrationSvg += `  <!-- INVERSE CALIBRATION MESH LINES -->\n`;
    calibrationSvg += `  <circle cx="0" cy="0" r="${config.layout.globalScale}" fill="none" stroke="#ccc" stroke-dasharray="5,5" stroke-width="2" />\n`;
  }

  const rawPathObjects: PathObject[] = [];

  for (let ring = 0; ring < config.layout.maxRings; ring++) {
    for (let branch = 0; branch < totalBranches; branch++) {
      const colorIndex = (branch + ring) % activeColors.length;
      const currentFill = activeColors[colorIndex] || "#000000";

      const cleanStagger = config.layout.staggerFactor >= 0.5 ? 1.0 : 0.0;
      const shearSlope = (1.0 / totalBranches) * cleanStagger;

      smoothComponents.forEach((componentPoints, compIndex) => {
        const transformedPoints = componentPoints.map(p => {
          const shearedPoint: Point2D = {
            x: p.x + (p.y / cellHeight) * shearSlope,
            y: p.y
          };

          const gridSpace = applyWallpaperSymmetry(shearedPoint, -ring, branch, config);
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

          // Run inverse debugging on anchor nodes when active to check mapping accuracy.
          // The loxodromic solver pulls flatX from logR first to decouple and un-twist flatY.
          if (config.useInverseDebugging && p.x === 0 && p.y === 0) {
            inverseWarp(finalPoint, config);
          }

          return finalPoint;
        });

        const segmentStr = generateSvgPath(transformedPoints);
        rawPathObjects.push({
          d: segmentStr,
          compIndex: compIndex,
          color: currentFill
        });
      });
    }
  }

  const normalizedPaths = normalizeSpiralCanvas(rawPathObjects, 1000);

  const groupedPaths: Record<string, string[]> = {};
  activeColors.forEach(color => { groupedPaths[color] = []; });
  const detailPaths: string[] = [];

  normalizedPaths.forEach(path => {
    if (path.compIndex === 0) {
      if (!groupedPaths[path.color]) groupedPaths[path.color] = [];
      groupedPaths[path.color]!.push(path.d);
    } else {
      detailPaths.push(path.d);
    }
  });

  let svgContent = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
  svgContent += `<svg\n  width="${config.canvas.width}"\n  height="${config.canvas.height}"\n  viewBox="${config.canvas.viewBox}"\n  version="1.1"\n  xmlns="http://www.w3.org/2000/svg">\n`;
  svgContent += calibrationSvg;

  activeColors.forEach((color, index) => {
    const structuralLayerGroup = groupedPaths[color];
    if (!structuralLayerGroup || structuralLayerGroup.length === 0) return;
    const cleanId = color.replace('#', '');
    svgContent += `  <g id="color_${index + 1}_${cleanId}" fill="${color}">\n`;
    svgContent += structuralLayerGroup.join('');
    svgContent += `  </g>\n`;
  });

  if (detailPaths.length > 0) {
    svgContent += `  <g id="escher_internal_details" fill="none" stroke="#808080" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">\n`;
    svgContent += detailPaths.join('');
    svgContent += `  </g>\n`;
  }

  svgContent += `</svg>\n`;
  return svgContent;
}
