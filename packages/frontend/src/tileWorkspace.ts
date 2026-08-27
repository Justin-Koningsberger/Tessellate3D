import {
  compileSymmetricTile,
  updateLiveEditorState,
  type ModularEditorState
} from '@tessellate3d/core/src/tileSymmetry.ts';
import type { Point2D } from '@tessellate3d/core/src/tessellationEngine.ts';
import { CanvasProjection } from './utils/canvasProjection.ts';
import { LATTICE_REGISTRY, type LatticeType } from './utils/latticeRegistry.ts';

// Using a class here because the canvas needs continuous state tracking
// (drag handles, active indices, mouse listeners). Keeps it performant,
// self-contained, and easy to port to a framework later if needed.
export class customWorkspace {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private projection: CanvasProjection;

  // TODO: Update this to a proper editorState type once all lattices are supported
  private state!: any;
  private activeDragEdge: string | null = null;
  private activeDragIndex: number | null = null;
  private pixelInteractionThreshold = 14;
  private storageKey = 'tessellate3d_custom_motif';
  private currentLatticeType: LatticeType = 'hexagonal';
  private cellHeight: number;

  constructor(canvas: HTMLCanvasElement, cellHeight: number = 2.0) {
    this.canvas = canvas;
    this.cellHeight = cellHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not acquire 2D canvas context');
    this.ctx = context;

    // Zoom setup: Scale to comfortably fit the 500x500 frame window boundaries
    const scale = Math.min(canvas.width, canvas.height) / 3.0;
    this.projection = new CanvasProjection(canvas.width, canvas.height, scale);

    this.syncActiveLatticeType();
    const initialOffset = LATTICE_REGISTRY[this.currentLatticeType].getCenterOffset(this.cellHeight);
    this.projection.setCenterOffset(initialOffset);

    this.initializeActiveLattice(cellHeight);
    this.setupEventListeners();
    this.render();
  }

  private syncActiveLatticeType(): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.currentLatticeType = parsed.latticeType || 'hexagonal';
      }
    } catch (e) {
      this.currentLatticeType = 'hexagonal';
    }
  }

  public switchLatticeSystem(type: LatticeType, cellHeight: number = 2.0): void {
    this.currentLatticeType = type;
    this.cellHeight = cellHeight;

    // Update projection centering matrices instantly on hot-swapping types
    const dynamicOffset = LATTICE_REGISTRY[type].getCenterOffset(cellHeight);
    this.projection.setCenterOffset(dynamicOffset);

    this.state = LATTICE_REGISTRY[type].initializeDefaultState(cellHeight);
    this.persistAndSyncState();
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


  private initializeActiveLattice(cellHeight: number): void {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved) {
        this.state = JSON.parse(saved);
        this.currentLatticeType = this.state.latticeType || 'hexagonal';
        updateLiveEditorState(this.state);
        return;
      }
    } catch (err) {
      console.warn('⚠️ [Storage] Failed parsing stored motif. Resetting layout.', err);
    }

    this.state = LATTICE_REGISTRY[this.currentLatticeType].initializeDefaultState(cellHeight);
    this.persistAndSyncState();
  }

  private setupEventListeners(): void {
    // Pointerdown hooks tracking elements
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      // Locks mobile contact to this specific canvas node,
      // preventing the browser from dropping tracking if a fast-moving finger leaves the bounds.
      this.canvas.setPointerCapture(e.pointerId);

      this.handlePointerDown(e);
    });

    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));

    this.canvas.addEventListener('pointerup', (e: PointerEvent) => {
      // Safely release the locked pointer context
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {
        // Safe bypass if pointer capture was dropped implicitly
      }
      this.handlePointerUp();
    });

    // Fallback block if system windows override gestures (e.g. push notification alerts)
    this.canvas.addEventListener('pointercancel', (e: PointerEvent) => {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch (err) {}
      this.handlePointerUp();
    });
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

  private handlePointerDown(e: PointerEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseScreen: Point2D = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const latticeDef = LATTICE_REGISTRY[this.currentLatticeType];
    const interactiveEdges = latticeDef.getInteractiveEdges(this.state, this.cellHeight);

    // Intercept Shift + Click for handle deletion
    if (e.shiftKey) {
      for (const edge of interactiveEdges) {
        const pointList = this.state[edge.key] || [];
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

      for (const edge of interactiveEdges) {
        const rawPoints = this.state[edge.key] || [];
        const fullSequence = [edge.start, ...rawPoints, edge.end];

        for (let i = 0; i < fullSequence.length - 1; i++) {
          const distancePx = this.getDistanceToSegmentPx(mouseVector, fullSequence[i]!, fullSequence[i + 1]!);

          if (distancePx < this.pixelInteractionThreshold) {
            rawPoints.splice(i, 0, mouseVector);

            this.persistAndSyncState();
            this.render();
            return;
          }
        }
      }
      return;
    }

    for (const edge of interactiveEdges) {
      const pointList = this.state[edge.key] || [];
      const idx = this.projection.findClosestNode(mouseScreen, pointList, this.pixelInteractionThreshold);

      if (idx !== null) {
        this.activeDragEdge = edge.key;
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

    this.state[this.activeDragEdge][this.activeDragIndex] = vectorPos;

    this.persistAndSyncState();
    this.render();
  }

  private handlePointerUp(): void {
    this.activeDragEdge = null;
    this.activeDragIndex = null;
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    let perimeter: Point2D[] | undefined = undefined;

    // DEFENSIVE GUARD: Only run the hexagonal compilation system
    // if the active workspace grid model is explicitly set to hexagonal.
    if (this.currentLatticeType === 'hexagonal') {
      const components = compileSymmetricTile(this.state);
      perimeter = components[0];
    }

    // ==========================================================================
    // 1. RENDER NON-HEXAGONAL BASE LATTICE SYSTEMS
    // ==========================================================================
    if (this.currentLatticeType !== 'hexagonal') {
      const latticeDef = LATTICE_REGISTRY[this.currentLatticeType];
      const baseEdges = latticeDef.getBaseEdges(this.cellHeight);
      const interactiveEdges = latticeDef.getInteractiveEdges(this.state, this.cellHeight);

      // Draw the un-deformed layout guidelines for non-hexagonal grids
      this.ctx.save();
      this.ctx.lineWidth = 1.5;
      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)'; // Faint visual backing grid
      baseEdges.forEach(edge => {
        this.ctx.beginPath();
        const startScreen = this.projection.vectorToScreen(edge.start);
        const endScreen = this.projection.vectorToScreen(edge.end);
        this.ctx.moveTo(startScreen.x, startScreen.y);
        this.ctx.lineTo(endScreen.x, endScreen.y);
        this.ctx.stroke();
      });
      this.ctx.restore();

      // Execute strategy twin path calculation loops dynamically from registry
      latticeDef.renderTwins(this.ctx, this.state, this.projection, this.cellHeight);

      // Render the active interactive lines for squares or triangles
      this.ctx.save();
      this.ctx.lineWidth = 2.5;
      this.ctx.strokeStyle = '#00d2ff'; // Primary editing blue color
      interactiveEdges.forEach(edge => {
        const pointList = this.state[edge.key] || [];
        const fullSequence = [edge.start, ...pointList, edge.end];

        this.ctx.beginPath();
        const start = this.projection.vectorToScreen(fullSequence[0]!);
        this.ctx.moveTo(start.x, start.y);
        for (let i = 1; i < fullSequence.length; i++) {
          const pt = this.projection.vectorToScreen(fullSequence[i]!);
          this.ctx.lineTo(pt.x, pt.y);
        }
        this.ctx.stroke();
      });
      this.ctx.restore();

      // Draw interactive handle nodes for alternative lattice geometries
      this.ctx.save();
      this.ctx.lineWidth = 1.5;
      interactiveEdges.forEach(edge => {
        const pointList = this.state[edge.key] || [];
        pointList.forEach(node => {
          const screenPos = this.projection.vectorToScreen(node);
          this.ctx.beginPath();
          this.ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
          this.ctx.fillStyle = '#ff3b30';
          this.ctx.fill();
          this.ctx.strokeStyle = '#ffffff';
          this.ctx.lineWidth = 1.5;
          this.ctx.stroke();
        });
      });
      this.ctx.restore();

      return;
    }

    // ==========================================================================
    // EXISTING HEXAGONAL RENDER FLOW
    // ==========================================================================
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

    // --- PHASE 0: DRAW THE UN-DEFORMED BASE LATTICE REFERENCE GUIDES ---
    const originalEdges = [
      { start: this.state.v1, end: this.state.v2 }, // Base Edge A
      { start: this.state.v2, end: this.state.v3 }, // Base Edge B
      { start: this.state.v3, end: this.state.v4 }, // Base Twin B
      { start: this.state.v4, end: this.state.v5 }, // Base Edge C
      { start: this.state.v5, end: this.state.v6 }, // Base Twin C
      { start: this.state.v6, end: this.state.v1 }  // Base Twin A
    ];

    this.ctx.save();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)'; // Faint visual baseline anchor
    originalEdges.forEach(edge => {
      this.ctx.beginPath();
      const startScreen = this.projection.vectorToScreen(edge.start);
      const endScreen = this.projection.vectorToScreen(edge.end);
      this.ctx.moveTo(startScreen.x, startScreen.y);
      this.ctx.lineTo(endScreen.x, endScreen.y);
      this.ctx.stroke();
    });
    this.ctx.restore();

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

    // Draw a dot in the center of the original motif
    const motifCenterVector = { x: 0.0, y: 0.0 };
    const centerScreenCoords = this.projection.vectorToScreen(motifCenterVector);

    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerScreenCoords.x, centerScreenCoords.y, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'; // Soft, faint gray marker
    this.ctx.fill();
    this.ctx.restore();
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
    // 1. Completely decouple and drop active memory object bindings
    this.state = null as any;
    this.activeDragEdge = null;
    this.activeDragIndex = null;

    // 2. Clear out the persistent disk buffer layout definitions
    try {
      localStorage.removeItem(this.storageKey);
    } catch (err) {}

    // 3. Re-execute initialization with a completely clean environment
    this.initializeActiveLattice(cellHeight);
    this.render();
  }

  /**
   * Dynamically resizes the drawing layout bounds while enforcing strict 1:1 square aspect metrics
   */
  public resizeWorkspace(newWidth: number, newHeight: number): void {
    // Let the width expand horizontally while tracking the height to maintain proper aspect ratio scaling
    const fluidWidth = Math.max(300, newWidth);
    const fluidHeight = Math.max(300, newHeight);

    this.canvas.width = fluidWidth;
    this.canvas.height = fluidHeight;
    this.projection.updateDimensions(fluidWidth, fluidHeight);
    this.render();
  }
}
