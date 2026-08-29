import type { Point2D, EngineConfig } from '@tessellate3d/core/src/tessellationEngine.ts';
import {
  type ModularEditorState,
  type HexagonalEditorState,
  type SquareEditorState,
  type TriangularEditorState
} from '@tessellate3d/core/src/tileSymmetry.ts';
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
      const rotatePoint = (point: Point2D, pivot: Point2D, angleDegrees: number) => {
        const radians = (angleDegrees * Math.PI) / 180;
        const cos = Math.cos(radians);
        const sin = Math.sin(radians);
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;
        return { x: dx * cos - dy * sin + pivot.x, y: dx * sin + dy * cos + pivot.y };
      };

      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;

      // 1. Top-Left Twin (Edge A rotated 120° around v1)
      ctx.beginPath();
      ctx.moveTo(v2s(state.v6).x, v2s(state.v6).y);
      for (let i = state.edgeA.length - 1; i >= 0; i--) {
        const r = rotatePoint(state.edgeA[i]!, state.v1, 120);
        ctx.lineTo(v2s(r).x, v2s(r).y);
      }
      ctx.lineTo(v2s(state.v1).x, v2s(state.v1).y);
      ctx.stroke();

      // 2. Bottom-Right Twin (Edge B rotated -120° around v3)
      ctx.beginPath();
      ctx.moveTo(v2s(state.v3).x, v2s(state.v3).y);
      for (let i = state.edgeB.length - 1; i >= 0; i--) {
        const r = rotatePoint(state.edgeB[i]!, state.v3, -120);
        ctx.lineTo(v2s(r).x, v2s(r).y);
      }
      ctx.lineTo(v2s(state.v4).x, v2s(state.v4).y);
      ctx.stroke();

      // 3. Left Straight Twin (Edge C rotated -120° around v5)
      ctx.beginPath();
      ctx.moveTo(v2s(state.v5).x, v2s(state.v5).y);
      for (let i = state.edgeC.length - 1; i >= 0; i--) {
        const r = rotatePoint(state.edgeC[i]!, state.v5, -120);
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
      const v3 = { x: w,   y: cellHeight };
      const v4 = { x: 0.0, y: cellHeight };
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
        { key: 'edgeSpine',     start: state.v1, end: { x: 0.0, y: cellHeight * 0.5 }, isInteractive: true },
        { key: 'edgeInterlock', start: state.v1, end: { x: triWidth, y: cellHeight * 0.5 }, isInteractive: true }
      ];
    },
    initializeDefaultState: (cellHeight: number): TriangularEditorState => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      return {
        latticeType: 'triangular',
        v1: { x: 0.0, y: 0.0 },
        v2: { x: triWidth, y: cellHeight * 0.5 },
        v4: { x: 0.0, y: cellHeight },
        edgeSpine: [{ x: 0.0, y: cellHeight * 0.25 }],
        edgeInterlock: [{ x: triWidth * 0.5, y: cellHeight * 0.25 }]
      };
    },
    renderTwins: (ctx, state: TriangularEditorState, projection, cellHeight) => {
      const triWidth = (Math.sqrt(3) / 2) * cellHeight;
      const v2s = (pt: Point2D) => projection.vectorToScreen(pt);

      ctx.save();
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ff7675';
      ctx.lineWidth = 2;

      // 1. Lower Left Spine Twin (Glide translation top-down mapping)
      ctx.beginPath();
      ctx.moveTo(v2s({ x: 0.0, y: cellHeight * 0.5 }).x, v2s({ x: 0.0, y: cellHeight * 0.5 }).y);
      for (let i = 0; i < state.edgeSpine.length; i++) {
        const pt = state.edgeSpine[i]!;
        ctx.lineTo(v2s({ x: -pt.x, y: pt.y + (cellHeight * 0.5) }).x, v2s({ x: -pt.x, y: pt.y + (cellHeight * 0.5) }).y);
      }
      ctx.lineTo(v2s({ x: 0.0, y: cellHeight }).x, v2s({ x: 0.0, y: cellHeight }).y);
      ctx.stroke();

      // 2. Bottom Angled Interlocking Twin (Anti-Symmetric vertical shift)
      ctx.beginPath();
      const startPos = { x: triWidth, y: cellHeight * 0.5 };
      ctx.moveTo(v2s(startPos).x, v2s(startPos).y);
      for (let i = 0; i < state.edgeInterlock.length; i++) {
        const pt = state.edgeInterlock[i]!;
        ctx.lineTo(v2s({ x: triWidth - pt.x, y: pt.y + (cellHeight * 0.5) }).x, v2s({ x: triWidth -pt.x, y: pt.y + (cellHeight * 0.5) }).y);
      }
      ctx.lineTo(v2s({ x: 0.0, y: cellHeight }).x, v2s({ x: 0.0, y: cellHeight }).y);
      ctx.stroke();

      ctx.restore();
    }
  }
};
