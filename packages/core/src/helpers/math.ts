import type { Point2D } from "../tessellationEngine.ts";

/**
 * 2D Vector Rotation around an arbitrary anchor pivot point.
 */
export function rotateAroundPivot(point: Point2D, pivot: Point2D, angleDegrees: number): Point2D {
  const radians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;

  return {
    x: dx * cos - dy * sin + pivot.x,
    y: dx * sin + dy * cos + pivot.y
  };
}
