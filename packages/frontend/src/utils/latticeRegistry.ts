import type { Point2D, EngineConfig } from '@tessellate3d/core/src/tessellationEngine.ts';

export type LatticeType = EngineConfig['latticeType'];

export interface EdgeConfig {
  key: string;
  start: Point2D;
  end: Point2D;
  isInteractive: boolean;
}

export interface LatticeDefinition {
  type: LatticeType;
  getCenterOffset: (cellHeight: number) => Point2D; // Pure centering offset vector
  getBaseEdges: (cellHeight: number) => { start: Point2D; end: Point2D }[];
  getInteractiveEdges: (state: any, cellHeight: number) => EdgeConfig[];
  initializeDefaultState: (cellHeight: number) => any;
}

export const LATTICE_REGISTRY: Record<LatticeType, LatticeDefinition> = {
  hexagonal: {
    type: 'hexagonal',
    getCenterOffset: () => ({ x: 0.0, y: 0.0 }),
    getBaseEdges: (cellHeight: number) => {
      const r = cellHeight / 2;
      const h = r * (Math.sqrt(3) / 2);
      const centerYOffset = 1.0;
      const v1 = { x: 0.0, y: 0.0 - centerYOffset };
      const v2 = { x: h,   y: (r * 0.5) - centerYOffset };
      const v3 = { x: h,   y: (cellHeight - r * 0.5) - centerYOffset };
      const v4 = { x: 0.0, y: cellHeight - centerYOffset };
      const v5 = { x: -h,  y: (cellHeight - r * 0.5) - centerYOffset };
      const v6 = { x: -h,  y: (r * 0.5) - centerYOffset };
      return [
        { start: v1, end: v2 }, { start: v2, end: v3 }, { start: v3, end: v4 },
        { start: v4, end: v5 }, { start: v5, end: v6 }, { start: v6, end: v1 }
      ];
    },
    getInteractiveEdges: (state: any) => [
      { key: 'edgeA', start: state.v1, end: state.v2, isInteractive: true },
      { key: 'edgeB', start: state.v2, end: state.v3, isInteractive: true },
      { key: 'edgeC', start: state.v4, end: state.v5, isInteractive: true }
    ],
    initializeDefaultState: (cellHeight: number) => {
      const r = cellHeight / 2;
      const h = r * (Math.sqrt(3) / 2);
      const centerYOffset = 1.0;
      const v1 = { x: 0.0, y: 0.0 - centerYOffset };
      const v2 = { x: h,   y: (r * 0.5) - centerYOffset };
      const v3 = { x: h,   y: (cellHeight - r * 0.5) - centerYOffset };
      const v4 = { x: 0.0, y: cellHeight - centerYOffset };
      const v5 = { x: -h,  y: (cellHeight - r * 0.5) - centerYOffset };
      const v6 = { x: -h,  y: (r * 0.5) - centerYOffset };
      return {
        latticeType: 'hexagonal',
        v1, v2, v3, v4, v5, v6,
        edgeA: [{ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }],
        edgeB: [{ x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2 }],
        edgeC: [{ x: (v4.x + v5.x) / 2, y: (v4.y + v5.y) / 2 }]
      };
    }
  },
  square: {
    type: 'square',
    getCenterOffset: () => ({ x: -0.5, y: -1.0 }),
    getBaseEdges: (cellHeight: number) => {
      const w = 1.0;
      const v1 = { x: 0.0, y: 0.0 };
      const v2 = { x: w,   y: 0.0 };
      const v3 = { x: w,   y: cellHeight };
      const v4 = { x: 0.0, y: cellHeight };
      return [{ start: v1, end: v2 }, { start: v2, end: v3 }, { start: v3, end: v4 }, { start: v4, end: v1 }];
    },
    getInteractiveEdges: (state: any, cellHeight: number) => {
      const w = 1.0;
      return [
        { key: 'edgeTop',  start: { x: 0.0, y: 0.0 }, end: { x: w, y: 0.0 }, isInteractive: true },
        { key: 'edgeLeft', start: { x: 0.0, y: cellHeight }, end: { x: 0.0, y: 0.0 }, isInteractive: true }
      ];
    },
    initializeDefaultState: (cellHeight: number) => ({
      latticeType: 'square',
      v1: { x: 0.0, y: 0.0 },
      v4: { x: 0.0, y: cellHeight },
      edgeTop: [{ x: 0.5, y: 0.0 }],
      edgeLeft: [{ x: 0.0, y: cellHeight * 0.5 }]
    })
  },
  triangular: {
    type: 'triangular',
    getCenterOffset: (cellHeight: number) => ({ x: -Math.sqrt(3) / 3, y: -1.0 }),
    getBaseEdges: (cellHeight: number) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      // Sync vertices to match core height-tracking expectations (v1 and v4)
      const v1 = { x: 0.0,      y: 0.0 };
      const v2 = { x: triWidth, y: cellHeight * 0.5 };
      const v4 = { x: 0.0,      y: cellHeight };

      return [
        { start: v1, end: v2 }, // Top-Right Angled Edge
        { start: v2, end: v4 }, // Bottom-Right Mirrored Edge
        { start: v4, end: v1 }  // Left Vertical Spine Axis
      ];
    },
    getInteractiveEdges: (state: any, cellHeight: number) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      const v1 = { x: 0.0,      y: 0.0 };
      const v2 = { x: triWidth, y: cellHeight * 0.5 };
      const v4 = { x: 0.0,      y: cellHeight };
      const midpoint = { x: 0.0, y: cellHeight * 0.5 };

      return [
        { key: 'edgeSpine',     start: v1, end: midpoint, isInteractive: true },
        { key: 'edgeInterlock', start: v1, end: v2, isInteractive: true }
      ];
    },
    initializeDefaultState: (cellHeight: number) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      return {
        latticeType: 'triangular',
        v1: { x: 0.0, y: 0.0 },
        v4: { x: 0.0, y: cellHeight }, // Explicitly matches your target block structure
        // Initialize handle point at 25% height of the spine
        edgeSpine: [{ x: 0.0, y: cellHeight * 0.25 }],
        edgeInterlock: [{ x: triWidth * 0.5, y: cellHeight * 0.25 }]
      };
    }
  }
};
