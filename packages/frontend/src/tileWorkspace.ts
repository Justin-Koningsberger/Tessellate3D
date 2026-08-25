import {
  compileSymmetricTile,
  updateLiveEditorState,
  type ModularEditorState
} from '@tessellate3d/core/src/tileSymmetry.ts';
import type { Point2D } from '@tessellate3d/core/src/tessellationEngine.ts';
import { CanvasProjection } from './utils/canvasProjection.ts';

// Using a class here because the canvas needs continuous state tracking
// (drag handles, active indices, mouse listeners). Keeps it performant,
// self-contained, and easy to port to a framework later if needed.
export class customWorkspace {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private projection: CanvasProjection;

  private state!: ModularEditorState;
  private activeDragEdge: 'A' | 'B' | 'C' | null = null;
  private activeDragIndex: number | null = null;
  private pixelInteractionThreshold = 14;
  private storageKey = 'tessellate3d_custom_motif';

  constructor(canvas: HTMLCanvasElement, cellHeight: number = 2.0) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not acquire 2D canvas context');
    this.ctx = context;

    // Zoom setup: Scale to comfortably fit the 500x500 frame window boundaries
    const scale = Math.min(canvas.width, canvas.height) / 3.0;
    this.projection = new CanvasProjection(canvas.width, canvas.height, scale);

    this.initializeHexagonAnchors(cellHeight);
    this.setupEventListeners();
    this.render();
  }

  /**
   * Synchronizes the master pipeline state and commits the current points to localStorage.
   */
  private persistAndSyncState(): void {
    updateLiveEditorState(this.state);
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (err) {
      console.warn('⚠️ [Storage] Could not write custom motif definition to localStorage:', err);
    }
  }


  private initializeHexagonAnchors(cellHeight: number): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.state = JSON.parse(saved);
        updateLiveEditorState(this.state);
        return;
      }
    } catch (err) {
      console.warn('⚠️ [Storage] Failed parsing stored motif. Resetting layout.', err);
    }

    const r = cellHeight / 2;
    const h = r * (Math.sqrt(3) / 2);
    const centerYOffset = 1.0;

    const v1 = { x: 0.0, y: 0.0 - centerYOffset };
    const v2 = { x: h,   y: (r * 0.5) - centerYOffset };
    const v3 = { x: h,   y: (cellHeight - r * 0.5) - centerYOffset };
    const v4 = { x: 0.0, y: cellHeight - centerYOffset };
    const v5 = { x: -h,  y: (cellHeight - r * 0.5) - centerYOffset };
    const v6 = { x: -h,  y: (r * 0.5) - centerYOffset };

    this.state = {
      v1, v2, v3, v4, v5, v6,

      edgeA: [{ x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 }], // Handle 0: Top-Right
      edgeB: [{ x: (v2.x + v3.x) / 2, y: (v2.y + v3.y) / 2 }], // Handle 1: Right-Vertical
      edgeC: [{ x: (v4.x + v5.x) / 2, y: (v4.y + v5.y) / 2 }]  // Handle 2: Bottom-Left (for Step 3)
    };

    this.persistAndSyncState();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
  }

  /**
   * Evaluates the shortest distance from a point to a line segment defined by two points.
   * Returns the distance in pixels.
   */
  private getDistanceToSegmentPx(pt: Point2D, segStart: Point2D, segEnd: Point2D): number {
    const startScreen = this.projection.vectorToScreen(segStart);
    const endScreen = this.projection.vectorToScreen(segEnd);
    const ptScreen = this.projection.vectorToScreen(pt);

    const dx = endScreen.x - startScreen.x;
    const dy = endScreen.y - startScreen.y;
    const l2 = dx * dx + dy * dy;

    if (l2 === 0) {
      return Math.hypot(ptScreen.x - startScreen.x, ptScreen.y - startScreen.y);
    }

    let t = ((ptScreen.x - startScreen.x) * dx + (ptScreen.y - startScreen.y) * dy) / l2;
    t = Math.max(0, Math.min(1, t));

    const projX = startScreen.x + t * dx;
    const projY = startScreen.y + t * dy;

    return Math.hypot(ptScreen.x - projX, ptScreen.y - projY);
  }

  /**
   * Clean state selector utility to reduce redundant ternary operations across loops
   */
  private getEdgePoints(key: 'A' | 'B' | 'C'): Point2D[] {
    if (key === 'A') return this.state.edgeA;
    if (key === 'B') return this.state.edgeB;
    return this.state.edgeC;
  }

  private handlePointerDown(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseScreen: Point2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const edgeKeys: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];

    // Intercept Shift + Click for handle deletion
    if (e.shiftKey) {
      for (const edge of edgeKeys) {
        const pointList = this.getEdgePoints(edge);
        const idx = this.projection.findClosestNode(mouseScreen, pointList, this.pixelInteractionThreshold);

        if (idx !== null) {
          pointList.splice(idx, 1);
          this.persistAndSyncState();
          this.render();
          return;
        }
      }
      return;
    }

    // Intercept Alt + Click for precision point addition
    if (e.altKey) {
      const mouseVector = this.projection.screenToVector(mouseScreen.x, mouseScreen.y);
      const targetEdges: { key: 'A' | 'B' | 'C'; start: Point2D; end: Point2D }[] = [
        { key: 'A', start: this.state.v1, end: this.state.v2 },
        { key: 'B', start: this.state.v2, end: this.state.v3 },
        { key: 'C', start: this.state.v4, end: this.state.v5 }
      ];

      for (const edgeConfig of targetEdges) {
        const rawPoints = this.getEdgePoints(edgeConfig.key);
        const fullSequence = [edgeConfig.start, ...rawPoints, edgeConfig.end];

        for (let i = 0; i < fullSequence.length - 1; i++) {
          const distancePx = this.getDistanceToSegmentPx(mouseVector, fullSequence[i]!, fullSequence[i + 1]!);

          if (distancePx < this.pixelInteractionThreshold) {
            if (edgeConfig.key === 'A') this.state.edgeA.splice(i, 0, mouseVector);
            if (edgeConfig.key === 'B') this.state.edgeB.splice(i, 0, mouseVector);
            if (edgeConfig.key === 'C') this.state.edgeC.splice(i, 0, mouseVector);

            this.persistAndSyncState();
            this.render();
            return;
          }
        }
      }
      return;
    }

    for (const edge of edgeKeys) {
      const pointList = this.getEdgePoints(edge);
      const idx = this.projection.findClosestNode(mouseScreen, pointList, this.pixelInteractionThreshold);

      if (idx !== null) {
        this.activeDragEdge = edge;
        this.activeDragIndex = idx;
        return;
      }
    }
  }

  private handlePointerMove(e: PointerEvent): void {
    if (this.activeDragEdge === null || this.activeDragIndex === null) return;

    const rect = this.canvas.getBoundingClientRect();
    const vectorPos = this.projection.screenToVector(
      e.clientX - rect.left,
      e.clientY - rect.top
    );

    this.getEdgePoints(this.activeDragEdge)[this.activeDragIndex] = vectorPos;

    this.persistAndSyncState();
    this.render();
  }

  private handlePointerUp(): void {
    this.activeDragEdge = null;
    this.activeDragIndex = null;
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Draw the compiled symmetry polygon path
    const components = compileSymmetricTile(this.state);
    const perimeter = components[0];

    if (perimeter && perimeter.length > 0) {
      this.ctx.beginPath();
      const start = this.projection.vectorToScreen(perimeter[0]!);
      this.ctx.moveTo(start.x, start.y);

      for (let i = 1; i < perimeter.length; i++) {
        const pt = this.projection.vectorToScreen(perimeter[i]!);
        this.ctx.lineTo(pt.x, pt.y);
      }

      this.ctx.fillStyle = 'rgba(74, 144, 226, 0.15)';
      this.ctx.fill();

    }

    // 1. RENDER THE USER-INTERACTIVE EDGES
    const masterSequences = [
      [this.state.v1, ...this.state.edgeA, this.state.v2],
      [this.state.v2, ...this.state.edgeB, this.state.v3],
      [this.state.v4, ...this.state.edgeC, this.state.v5]
    ];

    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = '#00d2ff';
    masterSequences.forEach(seq => {
      this.ctx.beginPath();
      const start = this.projection.vectorToScreen(seq[0]!);
      this.ctx.moveTo(start.x, start.y);
      for (let i = 1; i < seq.length; i++) {
        const pt = this.projection.vectorToScreen(seq[i]!);
        this.ctx.lineTo(pt.x, pt.y);
      }
      this.ctx.stroke();
    });

    // 2. RENDER THE NON-INTERACTIVE MIRRORED TWINS
    if (perimeter && perimeter.length > 0) {
      this.ctx.save();
      this.ctx.setLineDash([6, 4]);
      this.ctx.strokeStyle = '#ff7675';
      this.ctx.lineWidth = 2;

      this.drawSubSegment(perimeter, this.state.v3, this.state.v4);
      this.drawSubSegment(perimeter, this.state.v5, this.state.v6);
      this.drawSubSegment(perimeter, this.state.v6, this.state.v1);

      this.ctx.restore();
    }

    // Draw interactive circular handle points
    const masterNodes = [...this.state.edgeA, ...this.state.edgeB, ...this.state.edgeC];
    masterNodes.forEach(node => {
      const screenPos = this.projection.vectorToScreen(node);
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
      this.ctx.fillStyle = '#ff3b30';
      this.ctx.fill();
      this.ctx.strokeStyle = '#ffffff';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();
    });
  }

  /**
   * Helper method to render isolated sub-sections of the perimeter loop without overlapping master edges.
   */
  private drawSubSegment(perimeter: Point2D[], targetStart: Point2D, targetEnd: Point2D): void {
    let startIndex = -1;
    let endIndex = -1;

    for (let i = 0; i < perimeter.length; i++) {
      if (perimeter[i]!.x === targetStart.x && perimeter[i]!.y === targetStart.y) startIndex = i;
      if (perimeter[i]!.x === targetEnd.x && perimeter[i]!.y === targetEnd.y) endIndex = i;
    }

    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      this.ctx.beginPath();
      const first = this.projection.vectorToScreen(perimeter[startIndex]!);
      this.ctx.moveTo(first.x, first.y);
      for (let i = startIndex + 1; i <= endIndex; i++) {
        const pt = this.projection.vectorToScreen(perimeter[i]!);
        this.ctx.lineTo(pt.x, pt.y);
      }
      this.ctx.stroke();
    }
  }

  /**
   * Purge storage and reset vectors back to a regular point-topped hexagon
   */
  public resetToDefaultLattice(cellHeight: number): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (err) {}

    this.initializeHexagonAnchors(cellHeight);
    this.render();
  }
}
