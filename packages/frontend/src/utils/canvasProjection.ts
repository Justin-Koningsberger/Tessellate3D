import type { Point2D } from '@tessellate3d/core';

// A class makes sense here to cache scale calculations.
// Prevents recalculating zoom offsets hundreds of times per second
// while dragging handles, keeping the canvas interactions snappy.
export class CanvasProjection {
  private width: number;
  private height: number;
  private scale: number; // Pixels per normalized unit

  constructor(width: number, height: number, scale: number = 150) {
    this.width = width;
    this.height = height;
    this.scale = scale;
  }

  /**
   * Updates base width, height, and recalculates the pixel scale ratio dynamically
   */
  public updateDimensions(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.scale = Math.min(width, height) / 3.0;
  }

  /**
   * Translates an HTML5 Canvas screen coordinate (pixels) into a normalized vector point
   */
  public screenToVector(screenX: number, screenY: number): Point2D {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    return {
      x: (screenX - centerX) / this.scale,
      y: (screenY - centerY) / this.scale
    };
  }

  /**
   * Translates a normalized vector point back into an HTML5 Canvas screen coordinate (pixels)
   */
  public vectorToScreen(vectorPt: Point2D): Point2D {
    const centerX = this.width / 2;
    const centerY = this.height / 2;

    return {
      x: centerX + (vectorPt.x * this.scale),
      y: centerY + (vectorPt.y * this.scale)
    };
  }

  /**
   * Snaps a click point to the closest existing node within a pixel threshold
   */
  public findClosestNode(
    clickPos: Point2D,
    nodes: Point2D[],
    pixelThreshold: number = 8
  ): number | null {
    let closestIndex: number | null = null;
    let minDistance = Infinity;

    for (let i = 0; i < nodes.length; i++) {
      const nodeScreen = this.vectorToScreen(nodes[i]!);
      const distance = Math.hypot(clickPos.x - nodeScreen.x, clickPos.y - nodeScreen.y);

      if (distance < pixelThreshold && distance < minDistance) {
        minDistance = distance;
        closestIndex = i;
      }
    }

    return closestIndex;
  }
}
