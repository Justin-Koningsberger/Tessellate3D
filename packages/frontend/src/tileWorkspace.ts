import {
  updateLiveEditorState,
  type ModularEditorState
} from '@tessellate3d/core/src/tileSymmetry.ts';
import type { Point2D } from '@tessellate3d/core/src/tessellationEngine.ts';
import { CanvasProjection } from './utils/canvasProjection.ts';
import { LATTICE_REGISTRY, type LatticeType } from './utils/latticeRegistry.ts';

export type MobileInteractionMode = 'edit' | 'add' | 'delete';

// Self-contained high-performance workspace context managing canvas layout transforms,
// multi-lattice selection states, drag interactions, and disk storage sync loops.
export class CustomWorkspace {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private projection: CanvasProjection;

  private state!: ModularEditorState;
  private activeDragEdge: string | null = null;
  private activeDragIndex: number | null = null;
  private pixelInteractionThreshold = 14;
  private mobileMode: MobileInteractionMode = 'edit';
  public onMobileModeReset: ((newMode: MobileInteractionMode) => void) | null = null;
  private storageKey = 'tessellate3d_custom_motif';
  private currentLatticeType: LatticeType = 'hexagonal';
  private cellHeight: number;

  constructor(canvas: HTMLCanvasElement, cellHeight: number = 2.0) {
    this.canvas = canvas;
    this.cellHeight = cellHeight;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Could not acquire 2D canvas context');
    this.ctx = context;

    // Zoom setup: Scale to comfortably fit the canvas frame window boundaries
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
    } catch {
      // Graceful silent fallback to default generation state if local storage parses corruptly
    }

    this.state = LATTICE_REGISTRY[this.currentLatticeType].initializeDefaultState(cellHeight);
    this.persistAndSyncState();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('pointerdown', (e: PointerEvent) => {
      this.canvas.setPointerCapture(e.pointerId);
      this.handlePointerDown(e);
    });

    this.canvas.addEventListener('pointermove', this.handlePointerMove.bind(this));

    this.canvas.addEventListener('pointerup', (e: PointerEvent) => {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Safe bypass if pointer capture dropped implicitly
      }
      this.handlePointerUp();
    });

    this.canvas.addEventListener('pointercancel', (e: PointerEvent) => {
      try {
        this.canvas.releasePointerCapture(e.pointerId);
      } catch {
        // Safe bypass if overridden by OS window alerts
      }
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

    // Pad the click threshold buffer on touch inputs to ensure fingers grab nodes cleanly
    const currentThreshold = e.pointerType === 'touch'
      ? this.pixelInteractionThreshold * 2.0
      : this.pixelInteractionThreshold;

    if (e.shiftKey || this.mobileMode === 'delete') {
      for (const edge of interactiveEdges) {
        const pointList = (this.state[edge.key as keyof ModularEditorState] as unknown) as Point2D[] | undefined;
        if (!pointList) continue;

        const idx = this.projection.findClosestNode(mouseScreen, pointList, currentThreshold);
        if (idx !== null) {
          pointList.splice(idx, 1);
          this.mobileMode = 'edit';
          if (this.onMobileModeReset) this.onMobileModeReset('edit');
          this.persistAndSyncState();
          this.render();
          return;
        }
      }
      return;
    }

    if (e.altKey || this.mobileMode === 'add') {
      const mouseVector = this.projection.screenToVector(mouseScreen.x, mouseScreen.y);

      for (const edge of interactiveEdges) {
        const rawPoints = (this.state[edge.key as keyof ModularEditorState] as unknown) as Point2D[] | undefined;
        if (!rawPoints) continue;

        const fullSequence = [edge.start, ...rawPoints, edge.end];
        for (let i = 0; i < fullSequence.length - 1; i++) {
          const distancePx = this.getDistanceToSegmentPx(mouseVector, fullSequence[i]!, fullSequence[i + 1]!);

          if (distancePx < currentThreshold) {
            rawPoints.splice(i, 0, mouseVector);
            this.mobileMode = 'edit';
            if (this.onMobileModeReset) this.onMobileModeReset('edit');
            this.persistAndSyncState();
            this.render();
            return;
          }
        }
      }
      return;
    }

    for (const edge of interactiveEdges) {
      const pointList = (this.state[edge.key as keyof ModularEditorState] as unknown) as Point2D[] | undefined;
      if (!pointList) continue;

      const idx = this.projection.findClosestNode(mouseScreen, pointList, currentThreshold);
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

    const targetEdgeList = (this.state[this.activeDragEdge as keyof ModularEditorState] as unknown) as Point2D[] | undefined;
    if (targetEdgeList && targetEdgeList[this.activeDragIndex]) {
      targetEdgeList[this.activeDragIndex] = vectorPos;
      this.persistAndSyncState();
      this.render();
    }
  }

  private handlePointerUp(): void {
    this.activeDragEdge = null;
    this.activeDragIndex = null;
  }

  public render(): void {
    // 1. Clear the canvas and retrieve the current lattice configuration
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const latticeDef = LATTICE_REGISTRY[this.currentLatticeType];
    if (!latticeDef) return;

    const baseEdges = latticeDef.getBaseEdges(this.cellHeight);
    const interactiveEdges = latticeDef.getInteractiveEdges(this.state, this.cellHeight);

    // 2. Draw the un-deformed base background reference layout guidelines (Faint grey markers)
    this.ctx.save();
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.11)';
    baseEdges.forEach(edge => {
      this.ctx.beginPath();
      const startScreen = this.projection.vectorToScreen(edge.start);
      const endScreen = this.projection.vectorToScreen(edge.end);
      this.ctx.moveTo(startScreen.x, startScreen.y);
      this.ctx.lineTo(endScreen.x, endScreen.y);
      this.ctx.stroke();
    });
    this.ctx.restore();

    // 3. Delegate automated parallel / mirrored twin loops to the strategy registry (Red dashed lines)
    latticeDef.renderTwins(this.ctx, this.state, this.projection, this.cellHeight);

    // 4. Render the active user-interactive blue boundary line segments
    this.ctx.save();
    this.ctx.lineWidth = 2.5;
    this.ctx.strokeStyle = '#00d2ff';
    interactiveEdges.forEach(edge => {
      const pointList = ((this.state[edge.key as keyof ModularEditorState] as unknown) as Point2D[]) || [];
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

    // 5. Render interactive circular handle points uniformly across all active grid options
    this.ctx.save();
    this.ctx.lineWidth = 1.5;
    interactiveEdges.forEach(edge => {
      const pointList = ((this.state[edge.key as keyof ModularEditorState] as unknown) as Point2D[]) || []
      pointList.forEach((node: Point2D) => {
        const screenPos = this.projection.vectorToScreen(node);
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x, screenPos.y, 5, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff3b30';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.stroke();
      });
    });
    this.ctx.restore();

    // 6. Draw a node marker directly over the true visual center of the shape body
    let visualCenter: Point2D = { x: 0.0, y: 0.0 };

    if (this.currentLatticeType === 'hexagonal' || this.currentLatticeType === 'square') {
      visualCenter = {
        x: this.currentLatticeType === 'square' ? (this.cellHeight * 0.5) : 0.0,
        y: this.cellHeight * 0.5
      };
    } else if (this.currentLatticeType === 'triangular') {
      const triWidth = (Math.sqrt(3) / 2) * this.cellHeight;
      visualCenter = {
        x: triWidth / 3,
        y: this.cellHeight * 0.5
      };
    }

    const centerScreenCoords = this.projection.vectorToScreen(visualCenter);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.arc(centerScreenCoords.x, centerScreenCoords.y, 4, 0, Math.PI * 2);
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fill();
    this.ctx.strokeStyle = '#1e1e1e';
    this.ctx.lineWidth = 1.5;
    this.ctx.stroke();
    this.ctx.restore();
  }

  /**
   * Purge storage and reset vectors back to the default state
   */
  public resetToDefaultLattice(cellHeight: number): void {
    this.activeDragEdge = null;
    this.activeDragIndex = null;

    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // Safe silent bypass if local storage write/delete is blocked
    }

    this.initializeActiveLattice(cellHeight);
    this.render();
  }

  public resizeWorkspace(newWidth: number, newHeight: number): void {
    const fluidWidth = Math.max(300, newWidth);
    const fluidHeight = Math.max(300, newHeight);

    this.canvas.width = fluidWidth;
    this.canvas.height = fluidHeight;
    this.projection.updateDimensions(fluidWidth, fluidHeight);
    this.render();
  }

  public getCurrentLatticeType(): LatticeType {
    return this.currentLatticeType;
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

  public setInteractionMode(mode: MobileInteractionMode): void {
    this.mobileMode = mode;
    if (mode === 'add') this.canvas.style.cursor = 'copy';
    else if (mode === 'delete') this.canvas.style.cursor = 'no-drop';
    else this.canvas.style.cursor = 'default';
  }
}
