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

  private initializeHexagonAnchors(cellHeight: number): void {
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

    updateLiveEditorState(this.state);
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('pointerdown', this.handlePointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this.handlePointerUp.bind(this));
  }

  private handlePointerDown(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseScreen: Point2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const edges: ('A' | 'B' | 'C')[] = ['A', 'B', 'C'];
    for (const edge of edges) {
      const pointList = edge === 'A' ? this.state.edgeA : edge === 'B' ? this.state.edgeB : this.state.edgeC;
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

    if (this.activeDragEdge === 'A') this.state.edgeA[this.activeDragIndex] = vectorPos;
    if (this.activeDragEdge === 'B') this.state.edgeB[this.activeDragIndex] = vectorPos;
    if (this.activeDragEdge === 'C') this.state.edgeC[this.activeDragIndex] = vectorPos;

    updateLiveEditorState(this.state);
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
      this.ctx.strokeStyle = '#4a90e2';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
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
}
