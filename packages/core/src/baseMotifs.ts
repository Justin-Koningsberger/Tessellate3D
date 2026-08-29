import type { Point2D } from './tessellationEngine.ts';

import {
  liveEditorState,
  compileSymmetricTile,
  type ModularEditorState
} from './tileSymmetry.ts';

/**
 * Universally normalizes custom shape workspace paths relative to their true structural origin.
 * Maps coordinates safely across squares, triangles, and hexagons to prevent nested property crashes.
 */
export function normalizeWorkspaceTile(components: Point2D[][], state: ModularEditorState, cellHeight: number): Point2D[][] {
  if (components.length === 0 || components[0]!.length === 0) return components;

  const originX = state.v1?.x ?? 0.0;
  const originY = state.v1?.y ?? 0.0;
  const workspaceHeight = state.v4.y - originY;
  if (workspaceHeight === 0) return components;

  const scale = cellHeight / workspaceHeight;

  return components.map(component => {
    const total = component.length;
    return component.map((pt, idx) => {
      if (idx === 0 || idx === total - 1) return { x: 0.0, y: 0.0 };
      return { x: (pt.x - originX) * scale, y: (pt.y - originY) * scale };
    });
  });
}

export interface MotifContext {
  cellHeight: number;
  symmetryGroup: 'p1' | 'p3';
  latticeType: 'triangular' | 'hexagonal' | 'square';
}

export const baseMotifs: Record<string, (ctx: MotifContext) => Point2D[][] | Point2D[]> = {
  customTileCompiler: (ctx: MotifContext): Point2D[][] => {
    if (!liveEditorState) {
      console.warn(`⚠️ [Motif Engine] No liveEditorState found. Falling back to default static ${ctx.latticeType} asset.`);

      let fallbackKey = ctx.latticeType as string;
      if (ctx.latticeType === 'hexagonal') fallbackKey = 'hexagon';
      if (ctx.latticeType === 'triangular') fallbackKey = 'triangle';

      const fallbackFn = baseMotifs[fallbackKey];
      if (!fallbackFn) {
        console.error(`❌ [Motif Engine Fail] Could not find static asset key matching: "${fallbackKey}"`);
        return [[]];
      }

      const result = fallbackFn(ctx);
      if (!result || result.length === 0) return [[]];

      if (result.length > 0 && !Array.isArray(result[0])) {
        return [result as Point2D[]];
      }

      return result as Point2D[][];
    }

    // Force background layout configurations to match live state choices instantly when active in the UI
    ctx.latticeType = liveEditorState.latticeType;
    ctx.symmetryGroup = liveEditorState.latticeType === 'square' ? 'p1' : 'p3';

    const rawTile = compileSymmetricTile(liveEditorState);
    return normalizeWorkspaceTile(rawTile, liveEditorState, ctx.cellHeight);
  },

  // Square motif
  square: (ctx: MotifContext): Point2D[] => [
    { x: 0.0, y: 0.0 },
    { x: 1.0, y: 0.0 },
    { x: 1.0, y: ctx.cellHeight },
    { x: 0.0, y: ctx.cellHeight }
  ],

  // Pure Equilateral Triangle Motif
  triangle: (ctx: MotifContext): Point2D[] => {
    const triWidth = (Math.sqrt(3) / 2) * ctx.cellHeight;
    return [
      { x: 0.0,      y: 0.0 },
      { x: triWidth, y: ctx.cellHeight * 0.5 },
      { x: 0.0,      y: ctx.cellHeight }
    ];
  },

  // Point-topped hexagon
  hexagon: (ctx: MotifContext) => {
    const r = ctx.cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);

    return [
      { x: 0.0, y: 0.0 },              // Node 1: Origin Anchor Apex
      { x: h,   y: r * 0.5 },          // Node 2: Top Right Vertex
      { x: h,   y: ctx.cellHeight - r * 0.5 }, // Node 3: Bottom Right Vertex
      { x: 0.0, y: ctx.cellHeight },       // Node 4: Base Anchor Link
      { x: -h,  y: ctx.cellHeight - r * 0.5 }, // Node 5: Bottom Left Vertex
      { x: -h,  y: r * 0.5 },          // Node 6: Top Left Vertex
      { x: 0.0, y: 0.0 }               // Node 7: Close back to Origin
    ];
  },

  // Hexagon with lizzard drawing
  detailedHexagon: (ctx: MotifContext): Point2D[][] => {
    const components: Point2D[][] = [];
    const r = ctx.cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);

    // Regular hexagon vertices
    const corners: Point2D[] = [
      { x: 0.0, y: 0.0 },                  // Corner 0: Top Apex
      { x: h,   y: r * 0.5 },              // Corner 1: Top Right
      { x: h,   y: ctx.cellHeight - r * 0.5 }, // Corner 2: Bottom Right
      { x: 0.0, y: ctx.cellHeight },           // Corner 3: Bottom Apex
      { x: -h,  y: ctx.cellHeight - r * 0.5 }, // Corner 4: Bottom Left
      { x: -h,  y: r * 0.5 },              // Corner 5: Top Left
      { x: 0.0, y: 0.0 }                   // Close the path
    ];

    // compIndex === 0: Outer perimeter
    components.push(corners);

    // 1. Decorative Component: Symmetrical Head / Eye Bulbs
    components.push([
      { x: -h * 0.15, y: ctx.cellHeight * 0.22 },
      { x: -h * 0.20, y: ctx.cellHeight * 0.15 },
      { x: -h * 0.05, y: ctx.cellHeight * 0.12 },
      { x: 0.0,       y: ctx.cellHeight * 0.18 },
      { x: h * 0.05,  y: ctx.cellHeight * 0.12 },
      { x: h * 0.20,  y: ctx.cellHeight * 0.15 },
      { x: h * 0.15,  y: ctx.cellHeight * 0.22 }
    ]);

    // 2. Decorative Component: Main Spinal Column & Tail Ridge
    components.push([
      { x: 0.0,       y: ctx.cellHeight * 0.18 },
      { x: -h * 0.05, y: ctx.cellHeight * 0.30 },
      { x: h * 0.10,  y: ctx.cellHeight * 0.45 },
      { x: -h * 0.12, y: ctx.cellHeight * 0.65 },
      { x: h * 0.05,  y: ctx.cellHeight * 0.82 },
      { x: 0.0,       y: ctx.cellHeight }
    ]);

    // 3. Decorative Component: Right Arm & Detailed 3-Toed Claw
    components.push([
      { x: 0.0,       y: ctx.cellHeight * 0.35 },
      { x: h * 0.30,  y: ctx.cellHeight * 0.38 },
      { x: h * 0.44,  y: ctx.cellHeight * 0.32 },
      { x: h * 0.42,  y: ctx.cellHeight * 0.36 },
      { x: h * 0.48,  y: ctx.cellHeight * 0.37 },
      { x: h * 0.41,  y: ctx.cellHeight * 0.38 },
      { x: h * 0.44,  y: ctx.cellHeight * 0.43 },
      { x: h * 0.32,  y: ctx.cellHeight * 0.41 }
    ]);

    // 4. Decorative Component: Left Arm & Detailed 3-Toed Claw
    components.push([
      { x: 0.0,       y: ctx.cellHeight * 0.35 },
      { x: -h * 0.30, y: ctx.cellHeight * 0.38 },
      { x: -h * 0.44, y: ctx.cellHeight * 0.32 },
      { x: -h * 0.42, y: ctx.cellHeight * 0.36 },
      { x: -h * 0.48, y: ctx.cellHeight * 0.37 },
      { x: -h * 0.41, y: ctx.cellHeight * 0.38 },
      { x: -h * 0.44, y: ctx.cellHeight * 0.43 },
      { x: -h * 0.32, y: ctx.cellHeight * 0.41 }
    ]);

    // 5. Decorative Component: Detailed Left Hind Leg & 3-Toed Claw
    components.push([
      { x: -h * 0.12, y: ctx.cellHeight * 0.65 },
      { x: -h * 0.35, y: ctx.cellHeight * 0.70 },
      { x: -h * 0.56, y: ctx.cellHeight * 0.75 },
      { x: -h * 0.50, y: ctx.cellHeight * 0.78 },
      { x: -h * 0.58, y: ctx.cellHeight * 0.81 },
      { x: -h * 0.49, y: ctx.cellHeight * 0.82 },
      { x: -h * 0.52, y: ctx.cellHeight * 0.86 }
    ]);

    // 6. Decorative Component: Detailed Right Hind Leg & 3-Toed Claw
    components.push([
      { x: -h * 0.12,  y: ctx.cellHeight * 0.65 },
      { x: h * 0.35,  y: ctx.cellHeight * 0.70 },
      { x: h * 0.56,  y: ctx.cellHeight * 0.75 },
      { x: h * 0.50,  y: ctx.cellHeight * 0.78 },
      { x: h * 0.58,  y: ctx.cellHeight * 0.81 },
      { x: h * 0.49,  y: ctx.cellHeight * 0.82 },
      { x: h * 0.52,  y: ctx.cellHeight * 0.86 }
    ]);

    return components;
  },

  /**
   * 4. Interlocking Puzzle-Notch Hexagon Motif
   * Uses a point-topped regular hexagon framework with alternating
   * inward and outward rectangular interlocking tabs on its edges.
   */
  hexPuzzle: (ctx: MotifContext): Point2D[][] => {
    const components: Point2D[][] = [];
    const r = ctx.cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);

    // Six core vertices of the POINT-TOPPED regular hexagon base
    const v: Point2D[] = [
      { x: 0.0, y: 0.0 },                        // Vertex 0: Top Apex
      { x: h,   y: r * 0.5 },                    // Vertex 1: Top Right
      { x: h,   y: ctx.cellHeight - r * 0.5 },       // Vertex 2: Bottom Right
      { x: 0.0, y: ctx.cellHeight },                 // Vertex 3: Bottom Apex
      { x: -h,  y: ctx.cellHeight - r * 0.5 },       // Vertex 4: Bottom Left
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
    const center = { x: 0.0, y: ctx.cellHeight * 0.5 };
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
  detailedTriangle: (ctx: MotifContext): Point2D[][] => {
    const components: Point2D[][] = [];
    const triWidth = (Math.sqrt(3) / 2) * ctx.cellHeight;
    const h = ctx.cellHeight;

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
  detailedSquare: (ctx: MotifContext): Point2D[][] => {
    const components: Point2D[][] = [];
    const r = 0.15 * ctx.cellHeight;
    const stepsPerArc = 16;

    // compIndex === 0: Main square boundary loop
    components.push([
      { x: 0.0, y: 0.0 },
      { x: 1.0, y: 0.0 },
      { x: 1.0, y: ctx.cellHeight },
      { x: 0.0, y: ctx.cellHeight }
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
    components.push(generateArcPoints(1.0, ctx.cellHeight, Math.PI, (3 * Math.PI) / 2)); // Bottom-Right
    components.push(generateArcPoints(0.0, ctx.cellHeight, (3 * Math.PI) / 2, 2 * Math.PI)); // Bottom-Left
    return components;
  },

  // Chevron base motif
  chevron: (ctx: MotifContext): Point2D[] => [
    { x: 0.0, y: 0.0 },                  // Bottom-Left
    { x: 0.5, y: 0.5 },                  // Bottom-Middle (pushed up)
    { x: 1.0, y: 0.0 },                  // Bottom-Right
    { x: 1.0, y: ctx.cellHeight },           // Top-Right
    { x: 0.5, y: ctx.cellHeight + 0.5 },     // Top-Middle (pushed up)
    { x: 0.0, y: ctx.cellHeight }            // Top-Left
  ],

  // Smooth Sine Wavelet
  sinewave: (ctx: MotifContext): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.25,  y: -0.2 },                 // Top dip down/up simulation
    { x: 0.75,  y: 0.2 },                  // Crest/peak of the top curve
    { x: 1.0,   y: 0.0 },                  // Top-Right End
    { x: 1.0,   y: ctx.cellHeight },           // Drop to Bottom-Right
    { x: 0.75,  y: ctx.cellHeight + 0.2 },     // Bottom curve (perfect complement)
    { x: 0.25,  y: ctx.cellHeight - 0.2 },     // Trough/dip of the bottom curve
    { x: 0.0,   y: ctx.cellHeight },           // Left side cavity entry
    { x: 0.0,   y: ctx.cellHeight }            // Explicit Bottom-Left path closer
  ],

  // Castle Battlement / Square Wave Motif
  squarewave: (ctx: MotifContext): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.4,   y: 0.0 },                   // Narrower base wall
    { x: 0.4,   y: -ctx.cellHeight * 0.4 },     // Taller step height
    { x: 0.6,   y: -ctx.cellHeight * 0.4 },     // Narrower tooth width
    { x: 0.6,   y: 0.0 },                   // Step down
    { x: 1.0,   y: 0.0 },                   // Top-Right
    { x: 1.0,   y: ctx.cellHeight },            // Right edge down
    { x: 0.6,   y: ctx.cellHeight },            // Right-side bottom flat wall
    { x: 0.6,   y: ctx.cellHeight - ctx.cellHeight * 0.4 }, // Matching compact cavity
    { x: 0.4,   y: ctx.cellHeight - ctx.cellHeight * 0.4 }, // Inside floor of the bottom cavity
    { x: 0.4,   y: ctx.cellHeight },            // Corner where cavity steps back down
    { x: 0.0,   y: ctx.cellHeight }             // Bottom-Left
  ],

  // Proportioned Jigsaw Puzzle Tab preventing Bijectivity Distortion Faults
  squarePuzzle: (ctx: MotifContext): Point2D[] => [
    { x: 0.0,   y: 0.0 },
    { x: 0.5,   y: -ctx.cellHeight * 0.3 },     // Top bubble scaled to height
    { x: 1.0,   y: 0.0 },                   // Top-Right corner
    { x: 1.0,   y: ctx.cellHeight * 0.25 },     // Keep X locked to 1.0 wall
    { x: 1.2,   y: ctx.cellHeight * 0.5 },      // Controlled rightward protrusion
    { x: 1.0,   y: ctx.cellHeight * 0.75 },     // Right side hook neck return
    { x: 1.0,   y: ctx.cellHeight },            // Bottom-Right corner
    { x: 0.5,   y: ctx.cellHeight - ctx.cellHeight * 0.3 }, // Matching bottom bubble cavity
    { x: 0.0,   y: ctx.cellHeight },            // Bottom-Left corner anchor point
    { x: 0.0,   y: ctx.cellHeight * 0.75 },     // Keep X locked to 0.0 wall
    { x: 0.2,   y: ctx.cellHeight * 0.5 },      // Matching internal left cavity
    { x: 0.0,   y: ctx.cellHeight * 0.25 },     // Left side cavity entry
    { x: 0.0,   y: ctx.cellHeight }             // Explicit Bottom-Left path closer
  ],

  lizard: (ctx: MotifContext): Point2D[][] => {
    const lizardState: ModularEditorState = {
      latticeType: 'hexagonal',
      v1: { x: 0, y: -1 },
      v2: { x: 0.8660254037844386, y: -0.5 },
      v3: { x: 0.8660254037844386, y: 0.5 },
      v4: { x: 0, y: 1 },
      v5: { x: -0.8660254037844386, y: 0.5 },
      v6: { x: -0.8660254037844386, y: -0.5 },

      edgeA: [
        { x: 0.42009375000000004, y: -1.11815625 },
        { x: 0.52809375, y: -1.0521562500000001 },
        { x: 0.55209375, y: -0.71615625 },
        { x: 0.29409375000000004, y: -0.53615625 },
        { x: 0.38409375, y: -0.30215625 },
        { x: 0.7140937500000001, y: -0.11615625 },
        { x: 0.79809375, y: -0.31415625 },
        { x: 0.75009375, y: -0.43415625 }
      ],

      edgeB: [
        { x: 0.93009375, y: -0.35015625 },
        { x: 1.07409375, y: -0.33215625000000004 },
        { x: 0.9720937500000001, y: -0.12215625000000001 },
        { x: 0.88809375, y: 0.15984375 },
        { x: 0.39009375, y: 0.04584375 },
        { x: 0.28809375000000004, y: 0.17784375000000002 },
        { x: 0.27609375, y: 0.37584375000000003 },
        { x: 0.54009375, y: 0.38184375000000004 }
      ],

      edgeC: [
        { x: -0.39590625, y: 1.2938437500000002 },
        { x: -0.67790625, y: 1.36584375 },
        { x: -0.92390625, y: 1.31184375 },
        { x: -0.61190625, y: 1.19184375 },
        { x: -0.43190625000000005, y: 1.07784375 },
        { x: -0.34790625000000003, y: 0.9278437500000001 },
        { x: -0.29390625000000004, y: 0.70584375 },
        { x: -0.51590625, y: 0.51984375 },
        { x: -0.61190625, y: 0.23184375000000002 },
        { x: -0.79190625, y: 0.15984375 }
      ]
    };

    const rawTile = compileSymmetricTile(lizardState);
    return normalizeWorkspaceTile(rawTile, lizardState, ctx.cellHeight);
  },

  kochSnowflake: (ctx: MotifContext): Point2D[][] => {
    const snowflakeState: ModularEditorState = {
      latticeType: 'hexagonal',
      v1: { x: 0, y: -1 },
      v2: { x: 0.8660254037844386, y: -0.5 },
      v3: { x: 0.8660254037844386, y: 0.5 },
      v4: { x: 0, y: 1 },
      v5: { x: -0.8660254037844386, y: 0.5 },
      v6: { x: -0.8660254037844386, y: -0.5 },

      edgeA: [
        { x: 0.24009375000000002, y: -0.8430000000000001 },
        { x: 0.3711524566473989, y: -0.9 },
        { x: 0.35381141618497114, y: -1.0526011560693642 },
        { x: 0.5133489884393064, y: -0.9693641618497111 },
        { x: 0.64809375, y: -1.05 },
        { x: 0.6520773121387283, y: -0.9 },
        { x: 0.7873374277456648, y: -0.8028901734104047 },
        { x: 0.6694183526011561, y: -0.7369942196531792 },
        { x: 0.66609375, y: -0.609 }
      ],

      edgeB: [
        { x: 0.87009375, y: -0.255 },
        { x: 0.74409375, y: -0.192 },
        { x: 0.55209375, y: -0.342 },
        { x: 0.54009375, y: -0.12000000000000001 },
        { x: 0.35409375000000004, y: 0 },
        { x: 0.52809375, y: 0.10200000000000001 },
        { x: 0.53409375, y: 0.306 },
        { x: 0.7080937500000001, y: 0.18000000000000002 },
        { x: 0.86409375, y: 0.23700000000000002 }
      ],

      edgeC: [
        { x: -0.20390625, y: 0.8640000000000001 },
        { x: -0.20990625000000002, y: 0.7260000000000001 },
        { x: -0.02390625, y: 0.672 },
        { x: -0.20390625, y: 0.5700000000000001 },
        { x: -0.19790625, y: 0.39 },
        { x: -0.34190625, y: 0.48600000000000004 },
        { x: -0.52790625, y: 0.36600000000000005 },
        { x: -0.49790625000000005, y: 0.5700000000000001 },
        { x: -0.61790625, y: 0.657 }
      ]
    };

    const rawTile = compileSymmetricTile(snowflakeState);
    return normalizeWorkspaceTile(rawTile, snowflakeState, ctx.cellHeight);
  },

  JSquare: (ctx: MotifContext): Point2D[][] => {
    const puzzleState: ModularEditorState = {
      latticeType: 'square',
      v1: { x: 0.0, y: 0.0 },
      v4: { x: 0.0, y: ctx.cellHeight },

      // 1. Top Edge Interactive Path Handle Sequence (Indices 1 to 27)
      edgeTop: [
        { x: 0.5942846103040692, y: 0.1654572130890624 },
        { x: 0.9335766168917667, y: 0.011519173063162544 },
        { x: 0.9178686536238178, y: 0.07749261878854821 },
        { x: 0.6382669074543263, y: 0.5393067388662478 },
        { x: 0.6696828339902241, y: 0.6681120376634293 },
        { x: 0.5880014249968896, y: 0.6963863715457375 },
        { x: 0.5031784233499651, y: 0.6995279641993273 },
        { x: 0.4183554217030408, y: 0.6461208890883007 },
        { x: 0.3523819759776551, y: 0.5581562947877866 },
        { x: 0.415213829049451,  y: 0.520457182944709 },
        { x: 0.490612052735606,  y: 0.4701917004872723 },
        { x: 0.5314527572322733, y: 0.3979350694547071 },
        { x: 0.5126032013107346, y: 0.2848377339254745 },
        { x: 0.4403465702781693, y: 0.2220058808536787 },
        { x: 0.324107642095347,  y: 0.19687313962496034 },
        { x: 0.2518510110627817, y: 0.22828906616085826 },
        { x: 0.1984439359517552, y: 0.3036872898470133 },
        { x: 0.1481784534943185, y: 0.4042182547618867 },
        { x: 0.1324704902263696, y: 0.5016076270231703 },
        { x: 0.1670280094158573, y: 0.6021385919380436 },
        { x: 0.2392846404484225, y: 0.7403686686959945 },
        { x: 0.3586651612848346, y: 0.8723155601467658 },
        { x: 0.5471607205002222, y: 0.975988117715229 },
        { x: 1.0718066936497175, y: 0.8817403381075352 },
        { x: 0.795346540133816,  y: 0.5612978874413763 },
        { x: 0.9744173213884341, y: 0.08691739674931757 },
        { x: 1.005833247924332,  y: 0.020943951023931925 }
      ],

      // 2. Left Edge Interactive Path Handle Sequence (Indices 59 down to 61)
      edgeLeft: [
        { x: -0.1031489587928649, y: 0.5487315168270172 },
        { x: 0.1136209343048308,  y: 0.8911651160683045 }
      ]
    };

    // 3. Compile and normalize dynamically matching your standard structural pipeline
    const rawTile = compileSymmetricTile(puzzleState);
    return normalizeWorkspaceTile(rawTile, puzzleState, ctx.cellHeight);
  }
};
