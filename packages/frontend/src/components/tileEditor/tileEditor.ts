import { PRESET_STATES } from '@tessellate3d/core/src/baseMotifs.ts';
import { type Point2D} from '@tessellate3d/core/src/tessellationEngine.ts'
import { CustomWorkspace, type MobileInteractionMode } from '../../tileWorkspace.ts';
import { type LatticeType } from '../../utils/latticeRegistry.ts';
import { tileEditorTemplate } from './tileEditor.html.ts';
import type { ModularEditorState } from '../../tileSymmetry.ts';
import './tileEditor.css';

// Interface representing the global application context configuration state
interface EditorPipelineContext {
  currentConfig: { baseMotif: string; symmetryGroup: string };
  updateLiveEditorState: (state: ModularEditorState) => void;
  updateEnginePipeline: () => void;
  getLiveEditorState: () => ModularEditorState | null;
  baseMotifSelectElement: HTMLSelectElement | null;

  mainLatticeSelectElement?: HTMLSelectElement | null;
  mainSymmetryGroupSelectElement?: HTMLSelectElement | null;
}

export class tileEditorComponent {
  private container: HTMLDivElement;
  private els: Record<string, HTMLElement | null> = {};
  private workspaceInstance: CustomWorkspace | null = null;
  private isMaximized = false;
  private ctx: EditorPipelineContext;

  constructor(mountParent: HTMLElement, pipelineContext: EditorPipelineContext) {
    this.ctx = pipelineContext;

    // Inject the declarative layout view directly into DOM tree
    this.container = document.createElement('div');
    this.container.innerHTML = tileEditorTemplate.trim();
    mountParent.appendChild(this.container.firstElementChild!);

    this.cacheElements();
    this.bindActionInterceptors();
  }

  private cacheElements(): void {
    this.els = {
      modal: document.getElementById('customTileModal'),
      modalContainer: document.getElementById('custom-modal-container'),
      mountCompact: document.getElementById('mountCompact'),
      mountMaximized: document.getElementById('mountMaximized'),
      btnMaxCompact: document.getElementById('btnMaxCompact'),
      btnRestoreMax: document.getElementById('btnRestoreMax'),
      btnSaveCompact: document.getElementById('btnSaveCompact'),
      btnSaveMax: document.getElementById('btnSaveMax'),
      btnCancelCompact: document.getElementById('btnCancelCompact'),
      btnCancelMax: document.getElementById('btnCancelMax'),
      btnResetCompact: document.getElementById('btnResetCompact'),
      btnResetMax: document.getElementById('btnResetMax'),
      editorLatticeSelect: document.getElementById('editorLatticeSelect'),
      editorLatticeSelectCompact: document.getElementById('editorLatticeSelectCompact'),
      editorPresetSelect: document.getElementById('editorPresetSelect'),
      btnModeEdit: document.getElementById('btnModeEdit'),
      btnModeAdd: document.getElementById('btnModeAdd'),
      btnModeDelete: document.getElementById('btnModeDelete'),

      chkDrawDetails: document.getElementById('chkDrawDetails'),
      chkDrawDetailsCompact: document.getElementById('chkDrawDetailsCompact'),
      chkDrawDetailsTouch: document.getElementById('chkDrawDetailsTouch'),
      // TODO: Decide if this is still needed
      drawingStatusBanner: document.getElementById('drawingStatusBanner'),
      drawActionsStrip: document.querySelector('.draw-actions-strip'),
      btnUndoDetail: document.getElementById('btnUndoDetail'),
      btnStartNewPath: document.getElementById('btnStartNewPath'),
      btnClearDetail: document.getElementById('btnClearDetail'),

      btnUndoDetailMax: document.getElementById('btnUndoDetailMax'),
      btnStartNewPathMax: document.getElementById('btnStartNewPathMax'),
      btnClearDetailMax: document.getElementById('btnClearDetailMax')
    };
  }

  public open(): void {
    this.isMaximized = false;
    this.els.modalContainer?.classList.remove('maximized-mode-active');
    this.els.modalContainer?.classList.remove('drawing-session-active');

    if (this.els.modal) {
      this.els.modal.style.display = 'flex';
    }

    // Lazy instantiate canvas elements so they exist cleanly inside the scope layer
    let canvas = document.getElementById('tileCanvas') as HTMLCanvasElement;
    if (!canvas) {
      canvas = document.createElement('canvas');
      canvas.id = 'tileCanvas';
      canvas.className = 'editor-canvas';
      canvas.width = 500;
      canvas.height = 500;
    }

    if (this.els.mountCompact) {
      this.els.mountCompact.appendChild(canvas);
      canvas.style.position = 'static';
    }

    if (!this.workspaceInstance) {
      this.workspaceInstance = new CustomWorkspace(canvas, 2.0);
      this.workspaceInstance.onMobileModeReset = (autoMode) => this.updateMobileModeButtons(autoMode);
    } else {
      this.workspaceInstance.resizeWorkspace(500, 500);
      // Enforce cold opens back to deform perimeter & edit mode
      this.workspaceInstance.setInteractionMode('edit');
      this.workspaceInstance.render();
    }

    // Force HTML input check states back to unselected false on cold open boot
    const sliders = [this.els.chkDrawDetailsCompact, this.els.chkDrawDetailsTouch, this.els.chkDrawDetails];
    sliders.forEach(slider => { if (slider) (slider as HTMLInputElement).checked = false; });
    if (this.els.editorPresetSelect) {
      (this.els.editorPresetSelect as HTMLSelectElement).value = "";
    }
    if (this.els.drawingStatusBanner) this.els.drawingStatusBanner.style.display = 'none';
    this.updateMobileModeButtons('edit');

    // Synchronize responsive layout dropdown selectors
    if (this.workspaceInstance) {
      const workspace = this.workspaceInstance as CustomWorkspace;
      const targetLatticeType = workspace.getCurrentLatticeType();
      const selectors = [this.els.editorLatticeSelect, this.els.editorLatticeSelectCompact];
      selectors.forEach(select => { if (select) (select as HTMLSelectElement).value = targetLatticeType; });
    }
  }

  private bindActionInterceptors(): void {
    const executeDrawingModeToggle = (e: Event) => {
      if (!this.workspaceInstance) return;
      const isChecked = (e.target as HTMLInputElement).checked;

      // Call unified workspace mode router to switch cursors and freeze perimeters
      const targetMode: MobileInteractionMode = isChecked ? 'drawDetails' : 'edit';
      this.workspaceInstance.setInteractionMode(targetMode);

      this.updateMobileModeButtons(targetMode);
    };

    this.els.chkDrawDetailsCompact?.addEventListener('change', executeDrawingModeToggle);
    this.els.chkDrawDetailsTouch?.addEventListener('change', executeDrawingModeToggle);
    this.els.chkDrawDetails?.addEventListener('change', executeDrawingModeToggle);

    const executeUndo = () => {
      if (this.workspaceInstance) {
        this.workspaceInstance.undoLastDetailStroke();
        this.ctx.updateEnginePipeline();
      }
    };
    this.els.btnUndoDetail?.addEventListener('click', executeUndo);
    this.els.btnUndoDetailMax?.addEventListener('click', executeUndo);

    const executeClear = () => {
      if (this.workspaceInstance && window.confirm('Are you sure you want to completely erase all custom lines inside your tile?')) {
        this.workspaceInstance.clearAllDetailStrokes();
        this.ctx.updateEnginePipeline();
      }
    };
    this.els.btnClearDetail?.addEventListener('click', executeClear);
    this.els.btnClearDetailMax?.addEventListener('click', executeClear);

    const executeStartNewPath = () => {
      if (this.workspaceInstance) {
        this.workspaceInstance.setInteractionMode('edit');
        this.workspaceInstance.setInteractionMode('drawDetails');

        this.workspaceInstance.render?.();
      }
    };
    this.els.btnStartNewPath?.addEventListener('click', executeStartNewPath);
    this.els.btnStartNewPathMax?.addEventListener('click', executeStartNewPath);


    const executeSave = () => {
      if (this.els.modal) this.els.modal.style.display = 'none';
      this.ctx.currentConfig.baseMotif = 'customTileCompiler';

      if (this.ctx.baseMotifSelectElement) {
        this.ctx.baseMotifSelectElement.value = 'customTileCompiler';
      }

      this.syncMainDropdownsWithEditorLattice();
      this.toggleLayoutMode(false);

      this.ctx.updateEnginePipeline();
    };

    const executeCancel = () => {
      if (this.els.modal) this.els.modal.style.display = 'none';
      this.toggleLayoutMode(false);
    };

    const executeReset = () => {
      if (!this.workspaceInstance) return;
      if (window.confirm('Are you sure you want to reset the geometry? This will clear all your custom points and drawings.')) {
        this.workspaceInstance.resetToDefaultLattice(2.0);
        this.toggleLayoutMode(false);

        this.ctx.updateEnginePipeline(); // Sync master canvas immediately
      }
    };

    this.els.btnSaveCompact?.addEventListener('click', executeSave);
    this.els.btnSaveMax?.addEventListener('click', executeSave);
    this.els.btnCancelCompact?.addEventListener('click', executeCancel);
    this.els.btnCancelMax?.addEventListener('click', executeCancel);
    this.els.btnResetCompact?.addEventListener('click', executeReset);
    this.els.btnResetMax?.addEventListener('click', executeReset);

    // --- MOBILE INTERACTION MODE INTERCEPTORS ---
    (['edit', 'add', 'delete'] as MobileInteractionMode[]).forEach(mode => {
      const capitalized = mode.charAt(0).toUpperCase() + mode.slice(1);
      this.els[`btnMode${capitalized}`]?.addEventListener('click', () => this.updateMobileModeButtons(mode));
      this.els[`btnMode${capitalized}Max`]?.addEventListener('click', () => this.updateMobileModeButtons(mode));
    });

    // --- UNIFIED STRATEGY SWAP EVENT WATCHER ---
    const executeLatticeSystemSwap = (e: Event) => {
      if (!this.workspaceInstance) return;

      const targetType = (e.target as HTMLSelectElement).value as LatticeType;

      this.workspaceInstance.switchLatticeSystem(targetType, 2.0);

      // Force the workspace back to edit mode during a lattice swap
      this.workspaceInstance.setInteractionMode('edit');

      if (this.ctx.baseMotifSelectElement) {
        this.ctx.baseMotifSelectElement.value = 'customTileCompiler';
      }

      this.syncMainDropdownsWithEditorLattice();

      const selectors = [this.els.editorLatticeSelect, this.els.editorLatticeSelectCompact];
      selectors.forEach(select => { if (select) (select as HTMLSelectElement).value = targetType; });

      // Sync drawing switch indicators to false since swap defaults back to edit mode
      const checkCompact = this.els.chkDrawDetailsCompact as HTMLInputElement | null;
      const checkTouch = this.els.chkDrawDetailsTouch as HTMLInputElement | null;
      const checkMax = this.els.chkDrawDetails as HTMLInputElement | null;
      if (checkCompact) checkCompact.checked = false;
      if (checkTouch) checkTouch.checked = false;
      if (checkMax) checkMax.checked = false;

      // Reset the defaults
      this.els.modalContainer?.classList.remove('drawing-session-active');
      this.updateMobileModeButtons('edit');

      this.ctx.updateEnginePipeline();
    };

    this.els.editorLatticeSelect?.addEventListener('change', executeLatticeSystemSwap);
    this.els.editorLatticeSelectCompact?.addEventListener('change', executeLatticeSystemSwap);

    // --- WORKSPACE PRESET IMPORT EVENT INTERCEPTOR ---
    this.els.editorPresetSelect?.addEventListener('change', (e: Event) => {
      if (!this.workspaceInstance) return;

      const selectedPresetKey = (e.target as HTMLSelectElement).value;

      if (PRESET_STATES[selectedPresetKey]) {
        // 1. Generate a clone of preset coordinates
        const rawPresetState = PRESET_STATES[selectedPresetKey]();

        // 2. Normalize the coordinates to line up with the workspace
        const workspaceReadyState = translatePresetStateToWorkspace(rawPresetState);

        // 3. Push the translated coordinates to the workspace
        this.workspaceInstance.loadPresetToWorkspace(workspaceReadyState, 2.0);

        // 4. Synchronize UI drop-downs and form elements
        this.syncMainDropdownsWithEditorLattice();

        const selectors = [this.els.editorLatticeSelect, this.els.editorLatticeSelectCompact];
        selectors.forEach(select => {
          if (select) (select as HTMLSelectElement).value = workspaceReadyState.latticeType;
        });

        const sliders = [this.els.chkDrawDetailsCompact, this.els.chkDrawDetailsTouch, this.els.chkDrawDetails];
        sliders.forEach(slider => { if (slider) (slider as HTMLInputElement).checked = false; });
        this.els.modalContainer?.classList.remove('drawing-session-active');
        this.updateMobileModeButtons('edit');
      }

      (e.target as HTMLSelectElement).value = "";
    });

    this.els.btnMaxCompact?.addEventListener('click', () => this.toggleLayoutMode(true));
    this.els.btnRestoreMax?.addEventListener('click', () => this.toggleLayoutMode(false));
  }

  private toggleLayoutMode(toMaximized: boolean): void {
    const canvas = document.getElementById('tileCanvas') as HTMLCanvasElement;
    const wrapper = document.getElementById('editorLayoutWrapper');
    if (!this.workspaceInstance || !this.els.modalContainer || !canvas || !wrapper) return;

    this.isMaximized = toMaximized;
    const skeleton = document.getElementById('sidebarSkeletonPlaceholder');
    const actualContent = document.getElementById('sidebarActualContent');

    // Toggle state styling switches directly onto the master layout wrapper
    if (toMaximized) {
      wrapper.className = 'layout-maximized-active';
      this.els.modalContainer.classList.add('maximized-mode-active');

      if (this.els.mountMaximized) this.els.mountMaximized.appendChild(canvas);

      // Postpone sizing tracking until the next render cycle allows the CSS grid container tracks to expand fully
      requestAnimationFrame(() => {
        if (!this.workspaceInstance || !this.els.mountMaximized) return;
        const bounds = this.els.mountMaximized.getBoundingClientRect();
        this.workspaceInstance.resizeWorkspace(bounds.width, bounds.height || 500);
      });
      setTimeout(() => {
        if (skeleton) skeleton.style.display = 'none';
        if (actualContent) actualContent.style.display = 'flex';
      }, 180);
    } else {
      wrapper.className = 'layout-compact-active';
      this.els.modalContainer.classList.remove('maximized-mode-active');

      if (this.els.mountCompact) this.els.mountCompact.appendChild(canvas);
      this.workspaceInstance.resizeWorkspace(500, 500);
    }
  }

  private syncMainDropdownsWithEditorLattice(): void {
    if (!this.workspaceInstance || !this.ctx.mainLatticeSelectElement) return;

    const targetType = this.workspaceInstance.getCurrentLatticeType();
    let mainLatticeValue = 'square';
    let defaultSymmetryGroup = 'p1';

    if (targetType === 'hexagonal') {
      mainLatticeValue = 'hexagonal';
      defaultSymmetryGroup = 'p3';
    } else if (targetType === 'triangular') {
      mainLatticeValue = 'triangular';
      defaultSymmetryGroup = 'p6';
    }

    this.ctx.mainLatticeSelectElement.value = mainLatticeValue;

    if (this.ctx.mainSymmetryGroupSelectElement) {
      this.ctx.mainSymmetryGroupSelectElement.value = defaultSymmetryGroup;
    }

    const mainAutoAlignCheck = document.getElementById('useAutoAlignment') as HTMLInputElement | null;
    if (mainAutoAlignCheck) {
      mainAutoAlignCheck.checked = true;
    }

    this.ctx.currentConfig.symmetryGroup = defaultSymmetryGroup;
    if ('latticeType' in this.ctx.currentConfig) {
      (this.ctx.currentConfig as any).latticeType = mainLatticeValue;
    }
  }

  private updateMobileModeButtons(activeMode: MobileInteractionMode): void {
    if (!this.workspaceInstance) return;
    this.workspaceInstance.setInteractionMode(activeMode);

    // Synchronize touchScreen toolbar button states
    ['btnModeEdit', 'btnModeAdd', 'btnModeDelete'].forEach(id => {
      const btn = this.els[id];
      if (btn) {
        // If drawing mode is active, make sure all buttons are unselected
        const targetIdSuffix = activeMode === 'drawDetails' ? 'None' : activeMode.charAt(0).toUpperCase() + activeMode.slice(1);

        btn.classList.toggle('mode-active', id === `btnMode${targetIdSuffix}`);
      }
    });

    // --- MANAGE DRAWING MODE SLIDER SYNC ON MODE MUTATION ---
    const checkCompact = this.els.chkDrawDetailsCompact as HTMLInputElement | null;
    const checkTouch = this.els.chkDrawDetailsTouch as HTMLInputElement | null;
    const checkMax = this.els.chkDrawDetails as HTMLInputElement | null;

    if (activeMode === 'drawDetails') {
      if (checkCompact) checkCompact.checked = true;
      if (checkTouch) checkTouch.checked = true;
      if (checkMax) checkMax.checked = true;

      // Morph UI Layout: Toggle background classes and shift status header components active
      this.els.modalContainer?.classList.add('drawing-session-active');
    } else {
      if (checkCompact) checkCompact.checked = false;
      if (checkTouch) checkTouch.checked = false;
      if (checkMax) checkMax.checked = false;

      // Restore Layout: Clean structural state adjustments back to base deform options
      this.els.modalContainer?.classList.remove('drawing-session-active');
    }
  }
}

/**
 * Automatically shifts raw exported/logged preset configurations into standard
 * local workspace view boundaries without altering the original coordinate data.
 */
function translatePresetStateToWorkspace(state: ModularEditorState): ModularEditorState {
  const cloned = JSON.parse(JSON.stringify(state));

  if (cloned.latticeType === 'hexagonal') {
    const shiftY = 1.0;

    cloned.v1.y += shiftY;
    cloned.v2.y += shiftY;
    cloned.v3.y += shiftY;
    cloned.v4.y += shiftY;
    cloned.v5.y += shiftY;
    cloned.v6.y += shiftY;

    ['edgeA', 'edgeB', 'edgeC'].forEach(key => {
      if (cloned[key]) {
        cloned[key] = cloned[key].map((pt: Point2D) => ({ x: pt.x, y: pt.y + shiftY }));
      }
    });

    if (cloned.activeDetailStroke && cloned.activeDetailStroke.length > 0) {
      cloned.activeDetailStroke = cloned.activeDetailStroke.map((stroke: any[]) =>
        stroke.map((pt: any) => ({ x: pt.x, y: pt.y + shiftY }))
      );
    }
  }

  return cloned;
}
