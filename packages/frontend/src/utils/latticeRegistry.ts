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
  getCenterOffset: (cellHeight: number) => Point2D;
  getBaseEdges: (cellHeight: number) => { start: Point2D; end: Point2D }[];
  getInteractiveEdges: (state: any, cellHeight: number) => EdgeConfig[];
  initializeDefaultState: (cellHeight: number) => any;
  // New automated rendering hook to keep tileWorkspace completely free of loops
  renderTwins: (ctx: CanvasRenderingContext2D, state: any, projection: any, cellHeight: number) => void;
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
    },
    renderTwins: () => {} // Hexagonal uses custom down-stream sub-segment methods
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
      const v1 = { x: 0.0, y: 0.0 };
      const v4 = { x: 0.0, y: cellHeight };
      return [
        { key: 'edgeTop',  start: v1, end: { x: w, y: 0.0 }, isInteractive: true },
        { key: 'edgeLeft', start: v4, end: v1, isInteractive: true }
      ];
    },
    initializeDefaultState: (cellHeight: number) => ({
      latticeType: 'square',
      edgeA: [], edgeB: [], edgeC: [],
      edgeTop: [{ x: 0.5, y: 0.0 }],
      edgeLeft: [{ x: 0.0, y: cellHeight * 0.5 }]
    }),
    renderTwins: (ctx, state, projection, cellHeight) => {
      const topList = state['edgeTop'] || [];
      const leftList = state['edgeLeft'] || [];

      ctx.save();
      ctx.setLineDash([6, 4]); // Clean rendering dashed outline style
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;

      // 1. Render Bottom Parallel Twin (Project edgeTop down by cellHeight)
      ctx.beginPath();
      const bStart = projection.vectorToScreen({ x: 0.0, y: cellHeight });
      ctx.moveTo(bStart.x, bStart.y);
      for (const pt of topList) {
        const screenPt = projection.vectorToScreen({ x: pt.x, y: pt.y + cellHeight });
        ctx.lineTo(screenPt.x, screenPt.y);
      }
      const bEnd = projection.vectorToScreen({ x: 1.0, y: cellHeight });
      ctx.lineTo(bEnd.x, bEnd.y);
      ctx.stroke();

      // 2. Render Right Parallel Twin (Project edgeLeft right by 1.0)
      ctx.beginPath();
      const rStart = projection.vectorToScreen({ x: 1.0, y: cellHeight });
      ctx.moveTo(rStart.x, rStart.y);
      for (const pt of leftList) {
        const screenPt = projection.vectorToScreen({ x: pt.x + 1.0, y: pt.y });
        ctx.lineTo(screenPt.x, screenPt.y);
      }
      const rEnd = projection.vectorToScreen({ x: 1.0, y: 0.0 });
      ctx.lineTo(rEnd.x, rEnd.y);
      ctx.stroke();
      ctx.restore();
    }
  },
  triangular: {
    type: 'triangular',
    getCenterOffset: (cellHeight: number) => ({ x: -Math.sqrt(3) / 3, y: -1.0 }),
    getBaseEdges: (cellHeight: number) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      const v1 = { x: 0.0,      y: 0.0 };
      const v2 = { x: triWidth, y: cellHeight * 0.5 };
      const v4 = { x: 0.0,      y: cellHeight };
      return [{ start: v1, end: v2 }, { start: v2, end: v4 }, { start: v4, end: v1 }];
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
        edgeA: [], edgeB: [], edgeC: [],
        v1: { x: 0.0, y: 0.0 },
        v4: { x: 0.0, y: cellHeight },
        edgeSpine: [{ x: 0.0, y: cellHeight * 0.25 }],
        edgeInterlock: [{ x: triWidth * 0.5, y: cellHeight * 0.25 }]
      };
    },
    renderTwins: (ctx, state, projection, cellHeight) => {
      const interlockList = state['edgeInterlock'] || [];
      const spineList = state['edgeSpine'] || [];

      ctx.save();
      ctx.setLineDash([6, 4]);
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;

      // 1. Render Spine Anti-Symmetric Twin (Lower vertical spine half)
      ctx.beginPath();
      const midScreen = projection.vectorToScreen({ x: 0.0, y: cellHeight * 0.5 });
      ctx.moveTo(midScreen.x, midScreen.y);
      for (let i = spineList.length - 1; i >= 0; i--) {
        const pt = spineList[i];
        const screenPt = projection.vectorToScreen({ x: -pt.x, y: cellHeight - pt.y });
        ctx.lineTo(screenPt.x, screenPt.y);
      }
      const bottomScreen = projection.vectorToScreen({ x: 0.0, y: cellHeight });
      ctx.lineTo(bottomScreen.x, bottomScreen.y);
      ctx.stroke();

      // 2. Render Angled Mirror Twin (Bottom right slope)
      ctx.beginPath();
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      const startTwin = projection.vectorToScreen({ x: triWidth, y: cellHeight * 0.5 });
      ctx.moveTo(startTwin.x, startTwin.y);
      for (let i = interlockList.length - 1; i >= 0; i--) {
        const pt = interlockList[i];
        const screenPt = projection.vectorToScreen({ x: pt.x, y: cellHeight - pt.y });
        ctx.lineTo(screenPt.x, screenPt.y);
      }
      ctx.lineTo(bottomScreen.x, bottomScreen.y);
      ctx.stroke();
      ctx.restore();
    }
  }
};
