import type { Point2D, EngineConfig } from '@tessellate3d/core/src/tessellationEngine.ts';
import {
  rotateAroundPivot,
  type ModularEditorState,
  type HexagonalEditorState,
  type SquareEditorState,
  type TriangularEditorState
} from '../tileSymmetry.ts';
import type { CanvasProjection } from '../utils/canvasProjection.ts';

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
  initializeDefaultState: (cellHeight: number) => ModularEditorState;
  renderTwins: (ctx: CanvasRenderingContext2D, state: any, projection: CanvasProjection, cellHeight: number) => void;
}

export const LATTICE_REGISTRY: Record<LatticeType, LatticeDefinition> = {
  hexagonal: {
    type: 'hexagonal',
    getCenterOffset: (cellHeight) => ({ x: 0.0, y: -(cellHeight * 0.5) }),
    getBaseEdges: (cellHeight: number) => {
      const r = cellHeight / 2;
      const h = r * (Math.sqrt(3) / 2);
      const v1 = { x: 0.0, y: 0.0 };
      const v2 = { x: h,   y: r * 0.5 };
      const v3 = { x: h,   y: cellHeight - r * 0.5 };
      const v4 = { x: 0.0, y: cellHeight };
      const v5 = { x: -h,  y: cellHeight - r * 0.5 };
      const v6 = { x: -h,  y: r * 0.5 };
      return [
        { start: v1, end: v2 }, { start: v2, end: v3 }, { start: v3, end: v4 },
        { start: v4, end: v5 }, { start: v5, end: v6 }, { start: v6, end: v1 }
      ];
    },
    getInteractiveEdges: (state: HexagonalEditorState) => [
      { key: 'edgeA', start: state.v1, end: state.v2, isInteractive: true },
      { key: 'edgeB', start: state.v2, end: state.v3, isInteractive: true },
      { key: 'edgeC', start: state.v4, end: state.v5, isInteractive: true }
    ],
    initializeDefaultState: (cellHeight: number): HexagonalEditorState => {
      const r = cellHeight / 2;
      const h = r * (Math.sqrt(3) / 2);
      const v1 = { x: 0.0, y: 0.0 };
      const v2 = { x: h,   y: r * 0.5 };
      const v3 = { x: h,   y: cellHeight - r * 0.5 };
      const v4 = { x: 0.0, y: cellHeight };
      const v5 = { x: -h,  y: cellHeight - r * 0.5 };
      const v6 = { x: -h,  y: r * 0.5 };
      return {
        latticeType: 'hexagonal',
        v1, v2, v3, v4, v5, v6,
        edgeA: [{ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }],
        edgeB: [{ x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2 }],
        edgeC: [{ x: (v4.x + v5.x) / 2, y: (v4.y + v5.y) / 2 }]
      };
    },
    renderTwins: (ctx, state: HexagonalEditorState, projection, cellHeight) => {
      const v2s = (pt: Point2D) => projection.vectorToScreen(pt);

      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;

      // 1. Top-Left Twin (Edge A rotated 120° around v1)
      ctx.beginPath();
      ctx.moveTo(v2s(state.v6).x, v2s(state.v6).y);
      for (let i = state.edgeA.length - 1; i >= 0; i--) {
        const r = rotateAroundPivot(state.edgeA[i]!, state.v1, 120);
        ctx.lineTo(v2s(r).x, v2s(r).y);
      }
      ctx.lineTo(v2s(state.v1).x, v2s(state.v1).y);
      ctx.stroke();

      // 2. Bottom-Right Twin (Edge B rotated -120° around v3)
      ctx.beginPath();
      ctx.moveTo(v2s(state.v3).x, v2s(state.v3).y);
      for (let i = state.edgeB.length - 1; i >= 0; i--) {
        const r = rotateAroundPivot(state.edgeB[i]!, state.v3, -120);
        ctx.lineTo(v2s(r).x, v2s(r).y);
      }
      ctx.lineTo(v2s(state.v4).x, v2s(state.v4).y);
      ctx.stroke();

      // 3. Left Straight Twin (Edge C rotated -120° around v5)
      ctx.beginPath();
      ctx.moveTo(v2s(state.v5).x, v2s(state.v5).y);
      for (let i = state.edgeC.length - 1; i >= 0; i--) {
        const r = rotateAroundPivot(state.edgeC[i]!, state.v5, -120);
        ctx.lineTo(v2s(r).x, v2s(r).y);
      }
      ctx.lineTo(v2s(state.v6).x, v2s(state.v6).y);
      ctx.stroke();

      ctx.restore();
    }
  },
  square: {
    type: 'square',
    getCenterOffset: () => ({ x: -1.0, y: -1.0 }),
    getBaseEdges: (cellHeight: number) => {
      const w = cellHeight;
      const v1 = { x: 0.0, y: 0.0 };
      const v2 = { x: w,   y: 0.0 };
      const v3 = { x: w,   y: w };
      const v4 = { x: 0.0, y: w };
      return [{ start: v1, end: v2 }, { start: v2, end: v3 }, { start: v3, end: v4 }, { start: v4, end: v1 }];
    },
    getInteractiveEdges: (state: SquareEditorState, cellHeight: number) => {
      const w = cellHeight;
      return [
        { key: 'edgeTop',  start: state.v1, end: { x: w, y: 0.0 }, isInteractive: true },
        { key: 'edgeLeft', start: state.v1, end: state.v4, isInteractive: true }
      ];
    },
    initializeDefaultState: (cellHeight: number): SquareEditorState => ({
      latticeType: 'square',
      v1: { x: 0.0, y: 0.0 },
      v4: { x: 0.0, y: cellHeight },
      edgeTop: [{ x: cellHeight * 0.5, y: 0.0 }],
      edgeLeft: [{ x: 0.0, y: cellHeight * 0.5 }]
    }),
    renderTwins: (ctx, state: SquareEditorState, projection, cellHeight) => {
      const w = cellHeight;
      const v2s = (pt: Point2D) => projection.vectorToScreen(pt);

      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;

      // 1. Bottom Twin (Edge Top shifted vertically downward by cellHeight)
      ctx.beginPath();
      ctx.moveTo(v2s({ x: 0.0, y: cellHeight }).x, v2s({ x: 0.0, y: cellHeight }).y);
      for (const pt of state.edgeTop) {
        ctx.lineTo(v2s({ x: pt.x, y: pt.y + cellHeight }).x, v2s({ x: pt.x, y: pt.y + cellHeight }).y);
      }
      ctx.lineTo(v2s({ x: w, y: cellHeight }).x, v2s({ x: w, y: cellHeight }).y);
      ctx.stroke();

      // 2. Right Twin (Edge Left shifted horizontally rightward by w)
      ctx.beginPath();
      ctx.moveTo(v2s({ x: w, y: 0.0 }).x, v2s({ x: w, y: 0.0 }).y);
      for (const pt of state.edgeLeft) {
        // Shift right on X by full width bounds, maintain raw Y tracking
        ctx.lineTo(v2s({ x: pt.x + w, y: pt.y }).x, v2s({ x: pt.x + w, y: pt.y }).y);
      }
      ctx.lineTo(v2s({ x: w, y: cellHeight }).x, v2s({ x: w, y: cellHeight }).y);
      ctx.stroke();

      ctx.restore();
    }
  },
  triangular: {
    type: 'triangular',
    getCenterOffset: () => ({ x: -Math.sqrt(3) / 3, y: -1.0 }),
    getBaseEdges: (cellHeight: number) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      const v1 = { x: 0.0,      y: 0.0 };
      const v2 = { x: triWidth, y: cellHeight * 0.5 };
      const v4 = { x: 0.0,      y: cellHeight };
      return [{ start: v1, end: v2 }, { start: v2, end: v4 }, { start: v4, end: v1 }];
    },
    getInteractiveEdges: (state: TriangularEditorState, cellHeight: number) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      return [
        { key: 'edgeSpine',     start: state.v1, end: state.v2, isInteractive: true },
        { key: 'edgeInterlock', start: state.v1, end: { x: 0.0, y: cellHeight * 0.5 }, isInteractive: true }
      ];
    },
    initializeDefaultState: (cellHeight: number): TriangularEditorState => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      return {
        latticeType: 'triangular',
        v1: { x: 0.0, y: 0.0 },
        v2: { x: triWidth, y: cellHeight * 0.5 },
        v4: { x: 0.0, y: cellHeight },
        edgeSpine: [{ x: triWidth * 0.5, y: cellHeight * 0.25 }],
        edgeInterlock: [{ x: 0.0, y: cellHeight * 0.25 }]
      };
    },
    renderTwins: (ctx, state: TriangularEditorState, projection, cellHeight) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      const v2s = (pt: Point2D) => projection.vectorToScreen(pt);
      const leftSpineMidpoint = { x: 0.0, y: cellHeight * 0.5 };

      // Show index debug labels for each point along an edge
      const showDebug = !import.meta.env.PROD;

      ctx.save();
      ctx.setLineDash([]);

      if (showDebug) {
        ctx.font = '12px monospace';
      }

      // ==========================================
      // PART 1: TOP ANGLED INTERACTIVE EDGE (BLUE)
      // ==========================================
      if (showDebug) {
        ctx.fillStyle = '#00aec9'; // Blue for source labels
        ctx.fillText('v1', v2s(state.v1).x - 15, v2s(state.v1).y - 5);
        ctx.fillText('v2', v2s(state.v2).x + 10, v2s(state.v2).y);

        state.edgeSpine.forEach((pt, index) => {
          const screenPt = v2s(pt);
          ctx.fillText(`P${index}`, screenPt.x - 10, screenPt.y - 12);
        });

        // ==========================================
        // PART 2: LEFT VERTICAL INTERACTIVE EDGE (BLUE)
        // =// ==========================================
        state.edgeInterlock.forEach((pt, index) => {
          const screenPt = v2s(pt);
          ctx.fillText(`P${index}`, screenPt.x - 25, screenPt.y);
        });
      }

      // ==========================================
      // PART 3: BOTTOM ANGLED TWIN EDGE (RED)
      // ==========================================
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;

      if (showDebug) {
        ctx.fillStyle = '#ff7675'; // Red for twin labels
        ctx.fillText('v4', v2s(state.v4).x - 15, v2s(state.v4).y + 15);
      }

      ctx.beginPath();
      ctx.moveTo(v2s(state.v2).x, v2s(state.v2).y);

      const computedAngledTwins: Point2D[] = [];
      for (let i = state.edgeSpine.length - 1; i >= 0; i--) {
        const pt = state.edgeSpine[i]!;
        const r = rotateAroundPivot(pt, state.v2, -60);
        computedAngledTwins.push(r);
        ctx.lineTo(v2s(r).x, v2s(r).y);
      }
      ctx.lineTo(v2s(state.v4).x, v2s(state.v4).y);
      ctx.stroke();

      if (showDebug) {
        computedAngledTwins.forEach((twinPt, index) => {
          const sourceIndex = (state.edgeSpine.length - 1) - index;
          const screenTwin = v2s(twinPt);
          ctx.fillText(`P${sourceIndex}`, screenTwin.x - 10, screenTwin.y + 15);
        });
      }

      // ==========================================
      // PART 4: VERTICAL LEFT SPINE TWIN (RED)
      // ==========================================
      ctx.beginPath();
      ctx.moveTo(v2s(leftSpineMidpoint).x, v2s(leftSpineMidpoint).y);

      const computedLeftTwins: Point2D[] = [];
      for (let i = state.edgeInterlock.length - 1; i >= 0; i--) {
        const r = rotateAroundPivot(state.edgeInterlock[i]!, leftSpineMidpoint, 180);
        computedLeftTwins.push(r);
        ctx.lineTo(v2s(r).x, v2s(r).y);
      }
      ctx.lineTo(v2s(state.v4).x, v2s(state.v4).y);
      ctx.stroke();

      if (showDebug) {
        computedLeftTwins.forEach((twinPt, index) => {
          const sourceIndex = (state.edgeInterlock.length - 1) - index;
          const screenTwin = v2s(twinPt);
          ctx.fillText(`P${sourceIndex}`, screenTwin.x - 25, screenTwin.y);
        });
      }

      ctx.restore();
    }
  }
};
