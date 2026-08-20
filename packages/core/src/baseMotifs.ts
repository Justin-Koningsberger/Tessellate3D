import type { Point2D } from './tessellationEngine.ts';

export const baseMotifs: Record<string, (cellHeight: number) => Point2D[][] | Point2D[]> = {
  // Square motif
  square: (cellHeight: number): Point2D[] => [
    { x: 0.0, y: 0.0 },
    { x: 1.0, y: 0.0 },
    { x: 1.0, y: cellHeight },
    { x: 0.0, y: cellHeight }
  ],

  // Pure Equilateral Triangle Motif
  triangle: (cellHeight: number): Point2D[] => {
    const triWidth = (Math.sqrt(3) / 2) * cellHeight;
    return [
      { x: 0.0,      y: 0.0 },
      { x: triWidth, y: cellHeight * 0.5 },
      { x: 0.0,      y: cellHeight }
    ];
  },

  // Point-topped hexagon
  hexagon: (cellHeight) => {
    const r = cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);

    return [
      { x: 0.0, y: 0.0 },              // Node 1: Origin Anchor Apex
      { x: h,   y: r * 0.5 },          // Node 2: Top Right Vertex
      { x: h,   y: cellHeight - r * 0.5 }, // Node 3: Bottom Right Vertex
      { x: 0.0, y: cellHeight },       // Node 4: Base Anchor Link
      { x: -h,  y: cellHeight - r * 0.5 }, // Node 5: Bottom Left Vertex
      { x: -h,  y: r * 0.5 },          // Node 6: Top Left Vertex
      { x: 0.0, y: 0.0 }               // Node 7: Close back to Origin
    ];
  },

  // Detailed hexagon with lizzard details
  detailedHexagon: (cellHeight: number): Point2D[][] => {
    const components: Point2D[][] = [];
    const r = cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);

    // Regular hexagon vertices
    const corners: Point2D[] = [
      { x: 0.0, y: 0.0 },                  // Corner 0: Top Apex
      { x: h,   y: r * 0.5 },              // Corner 1: Top Right
      { x: h,   y: cellHeight - r * 0.5 }, // Corner 2: Bottom Right
      { x: 0.0, y: cellHeight },           // Corner 3: Bottom Apex
      { x: -h,  y: cellHeight - r * 0.5 }, // Corner 4: Bottom Left
      { x: -h,  y: r * 0.5 },              // Corner 5: Top Left
      { x: 0.0, y: 0.0 }                   // Close the path
    ];

    // compIndex === 0: Outer perimeter
    components.push(corners);

    // 1. Decorative Component: Symmetrical Head / Eye Bulbs
    components.push([
      { x: -h * 0.15, y: cellHeight * 0.22 },
      { x: -h * 0.20, y: cellHeight * 0.15 },
      { x: -h * 0.05, y: cellHeight * 0.12 },
      { x: 0.0,       y: cellHeight * 0.18 },
      { x: h * 0.05,  y: cellHeight * 0.12 },
      { x: h * 0.20,  y: cellHeight * 0.15 },
      { x: h * 0.15,  y: cellHeight * 0.22 }
    ]);

    // 2. Decorative Component: Main Spinal Column & Tail Ridge
    components.push([
      { x: 0.0,       y: cellHeight * 0.18 },
      { x: -h * 0.05, y: cellHeight * 0.30 },
      { x: h * 0.10,  y: cellHeight * 0.45 },
      { x: -h * 0.12, y: cellHeight * 0.65 },
      { x: h * 0.05,  y: cellHeight * 0.82 },
      { x: 0.0,       y: cellHeight }
    ]);

    // 3. Decorative Component: Right Arm & Detailed 3-Toed Claw
    components.push([
      { x: 0.0,       y: cellHeight * 0.35 },
      { x: h * 0.30,  y: cellHeight * 0.38 },
      { x: h * 0.44,  y: cellHeight * 0.32 },
      { x: h * 0.42,  y: cellHeight * 0.36 },
      { x: h * 0.48,  y: cellHeight * 0.37 },
      { x: h * 0.41,  y: cellHeight * 0.38 },
      { x: h * 0.44,  y: cellHeight * 0.43 },
      { x: h * 0.32,  y: cellHeight * 0.41 }
    ]);

    // 4. Decorative Component: Left Arm & Detailed 3-Toed Claw
    components.push([
      { x: 0.0,       y: cellHeight * 0.35 },
      { x: -h * 0.30, y: cellHeight * 0.38 },
      { x: -h * 0.44, y: cellHeight * 0.32 },
      { x: -h * 0.42, y: cellHeight * 0.36 },
      { x: -h * 0.48, y: cellHeight * 0.37 },
      { x: -h * 0.41, y: cellHeight * 0.38 },
      { x: -h * 0.44, y: cellHeight * 0.43 },
      { x: -h * 0.32, y: cellHeight * 0.41 }
    ]);

    // 5. Decorative Component: Detailed Left Hind Leg & 3-Toed Claw
    components.push([
      { x: -h * 0.12, y: cellHeight * 0.65 },
      { x: -h * 0.35, y: cellHeight * 0.70 },
      { x: -h * 0.56, y: cellHeight * 0.75 },
      { x: -h * 0.50, y: cellHeight * 0.78 },
      { x: -h * 0.58, y: cellHeight * 0.81 },
      { x: -h * 0.49, y: cellHeight * 0.82 },
      { x: -h * 0.52, y: cellHeight * 0.86 }
    ]);

    // 6. Decorative Component: Detailed Right Hind Leg & 3-Toed Claw
    components.push([
      { x: -h * 0.12,  y: cellHeight * 0.65 },
      { x: h * 0.35,  y: cellHeight * 0.70 },
      { x: h * 0.56,  y: cellHeight * 0.75 },
      { x: h * 0.50,  y: cellHeight * 0.78 },
      { x: h * 0.58,  y: cellHeight * 0.81 },
      { x: h * 0.49,  y: cellHeight * 0.82 },
      { x: h * 0.52,  y: cellHeight * 0.86 }
    ]);

    return components;
  },

  /**
   * 4. Interlocking Puzzle-Notch Hexagon Motif
   * Uses a point-topped regular hexagon framework with alternating
   * inward and outward rectangular interlocking tabs on its edges.
   */
  hexPuzzle: (cellHeight: number): Point2D[][] => {
    const components: Point2D[][] = [];
    const r = cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);

    // Six core vertices of the POINT-TOPPED regular hexagon base
    const v: Point2D[] = [
      { x: 0.0, y: 0.0 },                        // Vertex 0: Top Apex
      { x: h,   y: r * 0.5 },                    // Vertex 1: Top Right
      { x: h,   y: cellHeight - r * 0.5 },       // Vertex 2: Bottom Right
      { x: 0.0, y: cellHeight },                 // Vertex 3: Bottom Apex
      { x: -h,  y: cellHeight - r * 0.5 },       // Vertex 4: Bottom Left
      { x: -h,  y: r * 0.5 }                     // Vertex 5: Top Left
    ];

    // Helper to interpolate between two points
    const lerp = (p1: Point2D, p2: Point2D, t: number): Point2D => ({
      x: p1.x + (p2.x - p1.x) * t,
      y: p1.y + (p2.y - p1.y) * t
    });

    // Helper to calculate a perpendicular outward normal vector for an edge segment
    const getNormal = (p1: Point2D, p2: Point2D, magnitude: number): Point2D => {
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const len = Math.sqrt(dx * dx + dy * dy);
      return {
        x: (dy / len) * magnitude,
        y: (-dx / len) * magnitude
      };
    };

    /**
     * Generates a modified interlocking edge segment between two points.
     */
    const makeInterlockingEdge = (p1: Point2D, p2: Point2D, isInward: boolean): Point2D[] => {
      const t1 = 0.35;
      const t2 = 0.65;

      const segA = lerp(p1, p2, t1);
      const segB = lerp(p1, p2, t2);

      const edgeLen = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
      const tabDepth = edgeLen * 0.15;

      const normal = getNormal(p1, p2, isInward ? -tabDepth : tabDepth);

      const tabCorner1 = { x: segA.x + normal.x, y: segA.y + normal.y };
      const tabCorner2 = { x: segB.x + normal.x, y: segB.y + normal.y };

      return [p1, segA, tabCorner1, tabCorner2, segB, p2];
    };

    // Construct the outer interlocking path loop
    // Added '!' to tell TS these indexes are guaranteed to exist in this array length
    const outerBoundary: Point2D[] = [
      ...makeInterlockingEdge(v[0]!, v[1]!, true),  // Top-Right edge (Inward recess)
      ...makeInterlockingEdge(v[1]!, v[2]!, false), // Right edge (Outward tab)
      ...makeInterlockingEdge(v[2]!, v[3]!, true),  // Bottom-Right edge (Inward recess)
      ...makeInterlockingEdge(v[3]!, v[4]!, false), // Bottom-Left edge (Outward tab)
      ...makeInterlockingEdge(v[4]!, v[5]!, true),  // Left edge (Inward recess)
      ...makeInterlockingEdge(v[5]!, v[0]!, false)  // Top-Left edge (Outward tab)
    ];

    components.push(outerBoundary);

    // Add an internal visual ring accent line that mirrors the central point
    const center = { x: 0.0, y: cellHeight * 0.5 };
    const innerRing: Point2D[] = v.map(vertex => lerp(vertex, center, 0.4));

    // Safely pull the first element out into a known variable context before pushing
    const firstRingPoint = innerRing[0];
    if (firstRingPoint) {
      innerRing.push({ ...firstRingPoint });
    }

    components.push(innerRing);

    return components;
  },

  // Interlocking Triforce / Clover Triangle Motif
  detailedTriangle: (cellHeight: number): Point2D[][] => {
    const components: Point2D[][] = [];
    const triWidth = (Math.sqrt(3) / 2) * cellHeight;
    const h = cellHeight;

    // Base structural perimeter
    components.push([
      { x: 0.0,      y: 0.0 },
      { x: triWidth, y: h * 0.5 },
      { x: 0.0,      y: h }
    ]);

    // Internal geometric negative space lines
    components.push([
      { x: triWidth * 0.5, y: h * 0.25 },
      { x: 0.0,            y: h * 0.5 },
      { x: triWidth * 0.5, y: h * 0.75 },
      { x: triWidth * 0.5, y: h * 0.25 }
    ]);
    return components;
  },

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
  squarePuzzle: (cellHeight: number): Point2D[] => [
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
