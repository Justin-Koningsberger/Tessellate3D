// packages/core/src/helpers/canvasUtils.ts
import type { Point2D, PathObject } from '../tessellationEngine.ts';

/**
 * Global Coordinate Normalization Module.
 * Scales and centers a raw array of spiral path string definitions.
 */
export function normalizeSpiralLayout(
  compiledPathObjects: PathObject[],
  targetDimensions: number = 500
): PathObject[] {
  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;

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
 * Enforces geometric precision closure to prevent slicing self-intersections.
 */
export function generateSvgPath(points: Point2D[], compIndex: number): string {
  if (points.length < 2) return "";
  if (compIndex === 0 && points.length < 3) return "";

  const startPoint = points[0]!;
  const endPoint = points[points.length - 1]!;
  const gapDistance = Math.hypot(endPoint.x - startPoint.x, endPoint.y - startPoint.y);

  if (compIndex === 0 && gapDistance > 0 && gapDistance < 0.005) {
    points[points.length - 1] = { x: startPoint.x, y: startPoint.y };
  }

  let skippedCount = 0;
  let d = `M ${points[0]!.x.toFixed(4)} ${points[0]!.y.toFixed(4)}`;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i]!;

    // Catch coordinate breakdowns immediately
    if (isNaN(pt.x) || isNaN(pt.y) || !isFinite(pt.x) || !isFinite(pt.y)) {
      skippedCount++;
      continue;
    }

    d += ` L ${pt.x.toFixed(4)} ${pt.y.toFixed(4)}`;
  }

  if (compIndex === 0) {
    d += " Z";
  }

  if (skippedCount > 0) {
    console.error(`⚠️ [Vector Utility] Skipped ${skippedCount} degenerate/NaN coordinates out of ${points.length} total path nodes!`);
  }

  return d;
}
