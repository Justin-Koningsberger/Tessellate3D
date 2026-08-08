import type { Point2D } from './tessellationEngine.ts';

export const baseMotifs: Record<string, (cellHeight: number) => Point2D[][] | Point2D[]> = {
  // Square motif
  square: (cellHeight: number): Point2D[] => [
    { x: 0.0, y: 0.0 },
    { x: 1.0, y: 0.0 },
    { x: 1.0, y: cellHeight },
    { x: 0.0, y: cellHeight }
  ],

  // Circle-Junction Square Motif
  detailedSquare: (cellHeight: number): Point2D[][] => {
    const components: Point2D[][] = [];
    const r = 0.15 * cellHeight;
    const stepsPerArc = 16;

    // compIndex === 0: Main square boundary loop
    components.push([
      { x: 0.0, y: 0.0 },
      { x: 1.0, y: 0.0 },
      { x: 1.0, y: cellHeight },
      { x: 0.0, y: cellHeight }
    ]);

    const generateArcPoints = (cx: number, cy: number, startAngle: number, endAngle: number): Point2D[] => {
      const points: Point2D[] = [];
      for (let i = 0; i <= stepsPerArc; i++) {
        const phi = startAngle + (endAngle - startAngle) * (i / stepsPerArc);
        points.push({ x: cx + r * Math.cos(phi), y: cy + r * Math.sin(phi) });
      }
      return points;
    };

    components.push(generateArcPoints(0.0, 0.0, 0, Math.PI / 2));          // Top-Left
    components.push(generateArcPoints(1.0, 0.0, Math.PI / 2, Math.PI));     // Top-Right
    components.push(generateArcPoints(1.0, cellHeight, Math.PI, (3 * Math.PI) / 2)); // Bottom-Right
    components.push(generateArcPoints(0.0, cellHeight, (3 * Math.PI) / 2, 2 * Math.PI)); // Bottom-Left
    return components;
  },

  // Chevron base motif
  chevron: (cellHeight: number): Point2D[] => [
    { x: 0.0, y: 0.0 },                  // Bottom-Left
    { x: 0.5, y: 0.5 },                  // Bottom-Middle (pushed up)
    { x: 1.0, y: 0.0 },                  // Bottom-Right
    { x: 1.0, y: cellHeight },           // Top-Right
    { x: 0.5, y: cellHeight + 0.5 },     // Top-Middle (pushed up)
    { x: 0.0, y: cellHeight }            // Top-Left
  ],

  // Smooth Sine Wavelet
  sinewave: (cellHeight: number): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.25,  y: -0.2 },                 // Top dip down/up simulation
    { x: 0.75,  y: 0.2 },                  // Crest/peak of the top curve
    { x: 1.0,   y: 0.0 },                  // Top-Right End
    { x: 1.0,   y: cellHeight },           // Drop to Bottom-Right
    { x: 0.75,  y: cellHeight + 0.2 },     // Bottom curve (perfect complement)
    { x: 0.25,  y: cellHeight - 0.2 },     // Trough/dip of the bottom curve
    { x: 0.0,   y: cellHeight },           // Left side cavity entry
    { x: 0.0,   y: cellHeight }            // Explicit Bottom-Left path closer
  ],

  // Castle Battlement / Square Wave Motif
  squarewave: (cellHeight: number): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.4,   y: 0.0 },                   // Narrower base wall
    { x: 0.4,   y: -cellHeight * 0.4 },     // Taller step height
    { x: 0.6,   y: -cellHeight * 0.4 },     // Narrower tooth width
    { x: 0.6,   y: 0.0 },                   // Step down
    { x: 1.0,   y: 0.0 },                   // Top-Right
    { x: 1.0,   y: cellHeight },            // Right edge down
    { x: 0.6,   y: cellHeight },            // Right-side bottom flat wall
    { x: 0.6,   y: cellHeight - cellHeight * 0.4 }, // Matching compact cavity
    { x: 0.4,   y: cellHeight - cellHeight * 0.4 }, // Inside floor of the bottom cavity
    { x: 0.4,   y: cellHeight },            // Corner where cavity steps back down
    { x: 0.0,   y: cellHeight }             // Bottom-Left
  ],

  // Proportioned Jigsaw Puzzle Tab preventing Bijectivity Distortion Faults
  puzzle: (cellHeight: number): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.5,   y: -cellHeight * 0.3 },     // Top bubble scaled to height
    { x: 1.0,   y: 0.0 },                   // Top-Right corner
    { x: 1.0,   y: cellHeight * 0.25 },     // Keep X locked to 1.0 wall
    { x: 1.2,   y: cellHeight * 0.5 },      // Controlled rightward protrusion
    { x: 1.0,   y: cellHeight * 0.75 },     // Right side hook neck return
    { x: 1.0,   y: cellHeight },            // Bottom-Right corner
    { x: 0.5,   y: cellHeight - cellHeight * 0.3 }, // Matching bottom bubble cavity
    { x: 0.0,   y: cellHeight },            // Bottom-Left corner anchor point
    { x: 0.0,   y: cellHeight * 0.75 },     // Keep X locked to 0.0 wall
    { x: 0.2,   y: cellHeight * 0.5 },      // Matching internal left cavity
    { x: 0.0,   y: cellHeight * 0.25 },     // Left side cavity entry
    { x: 0.0,   y: cellHeight }             // Explicit Bottom-Left path closer
  ]
};
