import type { Point2D } from './tessellationEngine.ts';

import {
  liveEditorState,
  compileSymmetricTile,
  type ModularEditorState,
  type SquareEditorState,
  type TriangularEditorState,
  type HexagonalEditorState
} from '@tessellate3d/frontend/src/tileSymmetry.ts';

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

  return components.map((component, compIdx) => {
    const total = component.length;
    return component.map((pt, idx) => {
      // ONLY flatten the first and last point if this is the main outer boundary loop (Index 0)
      if (compIdx === 0 && (idx === 0 || idx === total - 1)) {
        return { x: 0.0, y: 0.0 };
      }
      // Internal details keep their true raw coordinates scaled relative to the center
      return { x: (pt.x - originX) * scale, y: (pt.y - originY) * scale };
    });
  });
}

export interface MotifContext {
  cellHeight: number;
  symmetryGroup: 'p1' | 'p3' | 'p6';
  latticeType: 'triangular' | 'hexagonal' | 'square';
}

type MotifFunction = (ctx: MotifContext) => Point2D[][] | Point2D[];

type ConfigurableMotif = MotifFunction & {
  latticeType: 'triangular' | 'hexagonal' | 'square';
  symmetryGroup: 'p1' | 'p3' | 'p6';
};

const rawBaseMotifs: Record<string, any> = {
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

    // Used to add new base motifs
    console.log("👉 Live editor state:", JSON.stringify(liveEditorState, null, 2));

    // 1. Compile the master interlocking outer edge path loops matrix
    const rawTile = compileSymmetricTile(liveEditorState);

    // 2. Push all the detail paths right behind the outline loop matrix
    if ('activeDetailStroke' in liveEditorState) {
      const liveStrokes = liveEditorState.activeDetailStroke as Point2D[][];
      if (liveStrokes && liveStrokes.length > 0) {
        rawTile.push(...liveStrokes);
      }
    }

    return normalizeWorkspaceTile(rawTile, liveEditorState, ctx.cellHeight);
  },

  // Square motif
  square: (ctx: MotifContext): Point2D[] => [
    { x: 0.0, y: 0.0 },
    { x: ctx.cellHeight, y: 0.0 },
    { x: ctx.cellHeight, y: ctx.cellHeight },
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

  // Circle-Junction Square Motif aligned with the dynamic cellHeight
  detailedSquare: (ctx: MotifContext): Point2D[][] => {
    const components: Point2D[][] = [];
    const r = 0.15 * ctx.cellHeight;
    const stepsPerArc = 16;
    const w = ctx.cellHeight;

    // compIndex === 0: Main square boundary loop
    components.push([
      { x: 0.0, y: 0.0 },
      { x: w,   y: 0.0 },
      { x: w,   y: ctx.cellHeight },
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

    components.push(generateArcPoints(0.0, 0.0, 0, Math.PI / 2)); // Top-Left
    components.push(generateArcPoints(w,   0.0, Math.PI / 2, Math.PI)); // Top-Right
    components.push(generateArcPoints(w,   ctx.cellHeight, Math.PI, (3 * Math.PI) / 2)); // Bottom-Right
    components.push(generateArcPoints(0.0, ctx.cellHeight, (3 * Math.PI) / 2, 2 * Math.PI)); // Bottom-Left
    return components;
  },

  // Chevron base motif
  chevron: (ctx: MotifContext): Point2D[] => {
    const w = ctx.cellHeight;
    const h = ctx.cellHeight;
    return [
      { x: 0.0,     y: 0.0 },               // Bottom-Left
      { x: w * 0.5, y: h * 0.5 },           // Bottom-Middle (pushed up)
      { x: w,       y: 0.0 },               // Bottom-Right
      { x: w,       y: h },                 // Top-Right
      { x: w * 0.5, y: h + (h * 0.5) },     // Top-Middle (pushed up relative to height)
      { x: 0.0,     y: h }                  // Top-Left
    ];
  },

  // Smooth Sine Wavelet
  sinewave: (ctx: MotifContext): Point2D[] => {
    const w = ctx.cellHeight;
    const h = ctx.cellHeight;
    return [
      { x: 0.0,      y: 0.0 },
      { x: w * 0.25, y: -h * 0.2 },         // Top dip down/up scaled to height
      { x: w * 0.75, y: h * 0.2 },          // Crest/peak of the top curve scaled to height
      { x: w,        y: 0.0 },              // Top-Right End
      { x: w,        y: h },                // Drop to Bottom-Right
      { x: w * 0.75, y: h + (h * 0.2) },    // Bottom curve (perfect complement)
      { x: w * 0.25, y: h - (h * 0.2) },    // Trough/dip of the bottom curve
      { x: 0.0,      y: h },                // Left side cavity entry
      { x: 0.0,      y: h }                 // Explicit Bottom-Left path closer
    ];
  },

  // Castle Battlement / Square Wave Motif
  squarewave: (ctx: MotifContext): Point2D[] => {
    const w = ctx.cellHeight;
    const h = ctx.cellHeight;
    return [
      { x: 0.0,      y: 0.0 },
      { x: w * 0.4,  y: 0.0 },              // Narrower base wall
      { x: w * 0.4,  y: -h * 0.4 },         // Taller step height
      { x: w * 0.6,  y: -h * 0.4 },         // Narrower tooth width
      { x: w * 0.6,  y: 0.0 },              // Step down
      { x: w,        y: 0.0 },              // Top-Right
      { x: w,        y: h },                // Right edge down
      { x: w * 0.6,  y: h },                // Right-side bottom flat wall
      { x: w * 0.6,  y: h - (h * 0.4) },    // Matching compact cavity
      { x: w * 0.4,  y: h - (h * 0.4) },    // Inside floor of the bottom cavity
      { x: w * 0.4,  y: h },                // Corner where cavity steps back down
      { x: 0.0,      y: h }                 // Bottom-Left
    ];
  },

    lizard: (ctx: MotifContext): Point2D[][] => {
    const state = PRESET_STATES.lizard!();
    const rawTile = compileSymmetricTile(state);
    return normalizeWorkspaceTile(rawTile, state, ctx.cellHeight);
  },

  kochSnowflake: (ctx: MotifContext): Point2D[][] => {
    const state = PRESET_STATES.kochSnowflake!();
    const rawTile = compileSymmetricTile(state);
    return normalizeWorkspaceTile(rawTile, state, ctx.cellHeight);
  },

  cat: (ctx: MotifContext): Point2D[][] => {
    const scale = ctx.cellHeight / 2.0;

    const state = PRESET_STATES.cat!() as SquareEditorState & { activeDetailStroke: Point2D[][] };
    state.v4.y = ctx.cellHeight;

    state.edgeTop = state.edgeTop.map((p: Point2D) => ({ x: p.x * scale, y: p.y * scale }));
    state.edgeLeft = state.edgeLeft.map((p: Point2D) => ({ x: p.x * scale, y: p.y * scale }));

    const rawTile = compileSymmetricTile(state as any);
    return normalizeWorkspaceTile(rawTile, state as any, ctx.cellHeight);
  },

  letters: (ctx: MotifContext): Point2D[][] => {
    const scale = ctx.cellHeight / 2.0;

    const state = PRESET_STATES.letters!() as SquareEditorState & { activeDetailStroke: Point2D[][] };
    state.v4.y = ctx.cellHeight;

    state.edgeTop = state.edgeTop.map((p: Point2D) => ({ x: p.x * scale, y: p.y * scale }));
    state.edgeLeft = state.edgeLeft.map((p: Point2D) => ({ x: p.x * scale, y: p.y * scale }));

    const rawTile = compileSymmetricTile(state as any);
    return normalizeWorkspaceTile(rawTile, state as any, ctx.cellHeight);
  }
};

export const PRESET_STATES: Record<string, () => ModularEditorState> = {
  lizard: (): ModularEditorState => ({
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
    ],
    activeDetailStroke: []
  }),

  kochSnowflake: (): ModularEditorState => ({
    latticeType: 'hexagonal',
    v1: { x: 0, y: -1 },
    v2: { x: 0.8660254037844386, y: -0.5 },
    v3: { x: 0.8660254037844386, y: 0.5 },
    v4: { x: 0, y: 1 },
    v5: { x: -0.8660254037844386, y: 0.5 },
    v6: { x: -0.8660254037844386, y: -0.5 },
    edgeA: [
      { x: 0.24009375, y: -0.84300000 },
      { x: 0.37115246, y: -0.90000000 },
      { x: 0.35381142, y: -1.05260116 },
      { x: 0.51334899, y: -0.96936416 },
      { x: 0.64809375, y: -1.05000000 },
      { x: 0.65207731, y: -0.90000000 },
      { x: 0.78733743, y: -0.80289017 },
      { x: 0.66941835, y: -0.73699422 },
      { x: 0.66609375, y: -0.60900000 }
    ],
    edgeB: [
      { x: 0.87009375, y: -0.25500000 },
      { x: 0.74409375, y: -0.19200000 },
      { x: 0.55209375, y: -0.34200000 },
      { x: 0.54009375, y: -0.12000000 },
      { x: 0.35409375, y: 0.00000000 },
      { x: 0.52809375, y: 0.10200000 },
      { x: 0.53409375, y: 0.30600000 },
      { x: 0.70809375, y: 0.18000000 },
      { x: 0.86409375, y: 0.23700000 }
    ],
    edgeC: [
      { x: -0.20390625, y: 0.86400000 },
      { x: -0.20990625, y: 0.72600000 },
      { x: -0.02390625, y: 0.67200000 },
      { x: -0.20390625, y: 0.57000000 },
      { x: -0.19790625, y: 0.39000000 },
      { x: -0.34190625, y: 0.48600000 },
      { x: -0.52790625, y: 0.36600000 },
      { x: -0.49790625, y: 0.57000000 },
      { x: -0.61790625, y: 0.65700000 }
    ],
    activeDetailStroke: []
  }),

  cat: (): ModularEditorState => ({
    latticeType: 'square',
    v1: { x: 0.0, y: 0.0 },
    v4: { x: 0.0, y: 2.0 },
    edgeTop: [
      { x: 0.13609375, y: -0.02000000 },
      { x: 0.38809375, y: -0.02600000 },
      { x: 0.73009375, y: 0.04600000 },
      { x: 0.88609375, y: 0.20200000 },
      { x: 1.07209375, y: 0.28000000 },
      { x: 1.25809375, y: 0.22000000 },
      { x: 1.37809375, y: 0.09400000 },
      { x: 1.37809375, y: 0.71200000 },
      { x: 1.19809375, y: 1.27600000 },
      { x: 1.11409375, y: 1.36600000 },
      { x: 0.98209375, y: 1.38400000 },
      { x: 0.87409375, y: 1.37800000 },
      { x: 0.80209375, y: 1.30000000 },
      { x: 0.77809375, y: 1.23400000 },
      { x: 0.83809375, y: 1.18000000 },
      { x: 0.84409375, y: 1.09600000 },
      { x: 0.75409375, y: 0.98200000 },
      { x: 0.62209375, y: 0.89200000 },
      { x: 0.47209375, y: 0.85000000 },
      { x: 0.31009375, y: 0.92200000 },
      { x: 0.22009375, y: 1.03000000 },
      { x: 0.22609375, y: 1.19200000 },
      { x: 0.33409375, y: 1.34200000 },
      { x: 0.44209375, y: 1.43200000 },
      { x: 0.55009375, y: 1.53400000 },
      { x: 0.70609375, y: 1.61200000 },
      { x: 0.93409375, y: 1.66600000 },
      { x: 1.16209375, y: 1.62400000 },
      { x: 1.32409375, y: 1.45600000 },
      { x: 1.46209375, y: 1.25200000 },
      { x: 1.57009375, y: 1.00600000 },
      { x: 1.91809375, y: 0.01600000 }
    ],
    edgeLeft: [
      { x: -0.00190625, y: 0.32800000 },
      { x: 0.13609375,  y: 0.29200000 },
      { x: 0.13009375,  y: 0.19000000 },
      { x: 0.17209375,  y: 0.09400000 },
      { x: 0.32809375,  y: 0.11800000 },
      { x: 0.46009375,  y: 0.17800000 },
      { x: 0.56809375,  y: 0.32200000 },
      { x: 0.79009375,  y: 0.43000000 },
      { x: 0.57409375,  y: 0.51400000 },
      { x: 0.50809375,  y: 0.61000000 },
      { x: 0.41209375,  y: 0.67000000 },
      { x: 0.29809375,  y: 0.67000000 },
      { x: 0.17809375,  y: 0.63400000 },
      { x: 0.07609375,  y: 0.70600000 },
      { x: -0.01390625, y: 1.09600000 },
      { x: 0.21409375,  y: 1.43200000 },
      { x: 0.27409375,  y: 1.74400000 },
      { x: 0.19009375,  y: 1.88200000 }
    ],
    activeDetailStroke: []
  }),

  letters: (): ModularEditorState => ({
    latticeType: 'square',
    v1: { x: 0.0, y: 0.0 },
    v4: { x: 0.0, y: 2.0 },
    edgeTop: [
      { x: 0.25009375, y: 0.02800000 },
      { x: 0.44809375, y: 0.10000000 },
      { x: 0.68209375, y: 0.19000000 },
      { x: 0.84409375, y: 0.34600000 },
      { x: 0.94609375, y: 0.51400000 },
      { x: 0.95209375, y: 0.66400000 },
      { x: 0.91609375, y: 0.79600000 },
      { x: 0.88009375, y: 0.87400000 },
      { x: 0.79009375, y: 0.92800000 },
      { x: 0.68209375, y: 1.00000000 },
      { x: 0.56809375, y: 1.05400000 },
      { x: 0.72409375, y: 1.14400000 },
      { x: 0.83809375, y: 1.24000000 },
      { x: 0.88609375, y: 1.36600000 },
      { x: 0.91609375, y: 1.54600000 },
      { x: 0.89809375, y: 1.65400000 },
      { x: 0.82009375, y: 1.76200000 },
      { x: 0.72763128, y: 1.86803874 },
      { x: 0.48792184, y: 1.94430993 },
      { x: 0.13198963, y: 1.98789346 },
      { x: 0.92809375, y: 1.96000000 },
      { x: 1.31209375, y: 1.86400000 },
      { x: 1.51009375, y: 1.75000000 },
      { x: 1.70209375, y: 1.61800000 },
      { x: 1.81609375, y: 1.40800000 },
      { x: 1.94209375, y: 1.07800000 },
      { x: 1.91209375, y: 0.72400000 },
      { x: 1.82809375, y: 0.47200000 },
      { x: 1.66009375, y: 0.25600000 },
      { x: 1.33009375, y: 0.11200000 },
      { x: 1.03609375, y: 0.01000000 },
      { x: 1.01209375, y: 1.98400000 },
      { x: 1.12609375, y: 1.98400000 },
      { x: 1.96009375, y: 1.93000000 }
    ],
    edgeLeft: [
      { x: -0.00190625, y: 0.25600000 },
      { x: 0.22009375,  y: 0.29800000 },
      { x: 0.46009375,  y: 0.40600000 },
      { x: 0.55609375,  y: 0.49000000 },
      { x: 0.58609375,  y: 0.62800000 },
      { x: 0.50209375,  y: 0.73000000 },
      { x: 0.39409375,  y: 0.79000000 },
      { x: 0.25009375,  y: 0.90400000 },
      { x: 0.00000000,  y: 1.00000000 },
      { x: 0.00409375,  y: 1.15000000 },
      { x: 0.22009375,  y: 1.21000000 },
      { x: 0.42409375,  y: 1.28200000 },
      { x: 0.52609375,  y: 1.38400000 },
      { x: 0.56809375,  y: 1.49800000 },
      { x: 0.53209375,  y: 1.62400000 },
      { x: 0.38809375,  y: 1.69600000 },
      { x: 0.19609375,  y: 1.76200000 },
      { x: 0.01009375,  y: 1.79800000 }
    ],
    activeDetailStroke: []
  }),
};

// =========================================================================
// Attach layout metadata directly to raw keys
// =========================================================================

// Square Framework Layouts
rawBaseMotifs.square.latticeType         = 'square';    rawBaseMotifs.square.symmetryGroup         = 'p1';
rawBaseMotifs.detailedSquare.latticeType = 'square';    rawBaseMotifs.detailedSquare.symmetryGroup = 'p1';
rawBaseMotifs.cat.latticeType            = 'square';    rawBaseMotifs.cat.symmetryGroup            = 'p1';
rawBaseMotifs.letters.latticeType        = 'square';    rawBaseMotifs.letters.symmetryGroup        = 'p1';
rawBaseMotifs.chevron.latticeType        = 'square';    rawBaseMotifs.chevron.symmetryGroup        = 'p1';
rawBaseMotifs.sinewave.latticeType    = 'square';    rawBaseMotifs.sinewave.symmetryGroup    = 'p1';
rawBaseMotifs.squarewave.latticeType     = 'square';    rawBaseMotifs.squarewave.symmetryGroup     = 'p1';

// Triangular Framework Layouts
rawBaseMotifs.triangle.latticeType         = 'triangular'; rawBaseMotifs.triangle.symmetryGroup         = 'p6';
rawBaseMotifs.detailedTriangle.latticeType = 'triangular'; rawBaseMotifs.detailedTriangle.symmetryGroup = 'p6';

// Hexagonal Framework Layouts
rawBaseMotifs.hexagon.latticeType       = 'hexagonal';  rawBaseMotifs.hexagon.symmetryGroup       = 'p3';
rawBaseMotifs.detailedHexagon.latticeType = 'hexagonal'; rawBaseMotifs.detailedHexagon.symmetryGroup = 'p3';
rawBaseMotifs.hexPuzzle.latticeType       = 'hexagonal';  rawBaseMotifs.hexPuzzle.symmetryGroup       = 'p3';
rawBaseMotifs.lizard.latticeType        = 'hexagonal';  rawBaseMotifs.lizard.symmetryGroup        = 'p3';
rawBaseMotifs.kochSnowflake.latticeType = 'hexagonal';  rawBaseMotifs.kochSnowflake.symmetryGroup = 'p3';

// Main Compiler Track Default Fallback
rawBaseMotifs.customTileCompiler.latticeType = 'square'; rawBaseMotifs.customTileCompiler.symmetryGroup = 'p1';

// Export with explicit intersection contract
export const baseMotifs = rawBaseMotifs as Record<string, ConfigurableMotif>;
