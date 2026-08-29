import { CustomWorkspace } from '../../tileWorkspace.ts';
import { type LatticeType } from '../../utils/latticeRegistry.ts';
import { tileEditorTemplate } from './tileEditor.html.ts';
import type { ModularEditorState } from '@tessellate3d/core/src/tileSymmetry.ts';
import './tileEditor.css';

// Interface representing the global application context configuration state
interface EditorPipelineContext {
  currentConfig: { baseMotif: string; symmetryGroup: string };
  updateLiveEditorState: (state: ModularEditorState) => void;
  updateEnginePipeline: () => void;
  getLiveEditorState: () => ModularEditorState | null;
  baseMotifSelectElement: HTMLSelectElement | null;
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
      modalContainer: document.getElementById('customModalContainer'),
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
    };
  }

  public open(): void {
    this.isMaximized = false;
    this.els.modalContainer?.classList.remove('maximized-mode-active');

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
    } else {
      this.workspaceInstance.resizeWorkspace(500, 500);
      this.workspaceInstance.render();
    }

    // Synchronize sidebar dropdown selector state with active memory metrics on open
    if (this.els.editorLatticeSelect && this.workspaceInstance) {
      const workspace = this.workspaceInstance as CustomWorkspace;
      (this.els.editorLatticeSelect as HTMLSelectElement).value = workspace.getCurrentLatticeType();
    }
  }

  private bindActionInterceptors(): void {
    const executeSave = () => {
      if (this.els.modal) this.els.modal.style.display = 'none';
      this.ctx.currentConfig.baseMotif = 'customTileCompiler';
      this.ctx.currentConfig.symmetryGroup = 'p3';

      if (this.ctx.baseMotifSelectElement) {
        this.ctx.baseMotifSelectElement.value = 'customTileCompiler';
      }

      const activeState = this.ctx.getLiveEditorState();
      if (activeState) {
        console.log('🔍 [UI Sync] Live state handles verified on save:', {
          edgeA: ('edgeA' in activeState) ? activeState.edgeA.length : 0,
          edgeB: ('edgeB' in activeState) ? activeState.edgeB.length : 0,
          edgeC: ('edgeC' in activeState) ? activeState.edgeC.length : 0,
          edgeTop: ('edgeTop' in activeState) ? activeState.edgeTop.length : 0,
          edgeLeft: ('edgeLeft' in activeState) ? activeState.edgeLeft.length : 0,
          edgeSpine: ('edgeSpine' in activeState) ? activeState.edgeSpine.length : 0,
          edgeInterlock: ('edgeInterlock' in activeState) ? activeState.edgeInterlock.length : 0
        });
      }
      this.ctx.updateEnginePipeline();
    };

    const executeCancel = () => {
      if (this.els.modal) this.els.modal.style.display = 'none';
    };

    const executeReset = () => {
      if (!this.workspaceInstance) return;
      if (window.confirm('Are you sure you want to reset the geometry? This will completely clear all your custom points.')) {
        this.workspaceInstance.resetToDefaultLattice(2.0);
        this.ctx.updateEnginePipeline(); // Sync master canvas immediately
      }
    };

    this.els.btnSaveCompact?.addEventListener('click', executeSave);
    this.els.btnSaveMax?.addEventListener('click', executeSave);
    this.els.btnCancelCompact?.addEventListener('click', executeCancel);
    this.els.btnCancelMax?.addEventListener('click', executeCancel);
    this.els.btnResetCompact?.addEventListener('click', executeReset);
    this.els.btnResetMax?.addEventListener('click', executeReset);

    // --- STRATEGY SWAP EVENT WATCHER ---
    this.els.editorLatticeSelect?.addEventListener('change', (e: Event) => {
      if (!this.workspaceInstance) return;

      const targetType = (e.target as HTMLSelectElement).value as LatticeType;

      // 1. Hot-swap workspace coordinate system and dimensions maps
      this.workspaceInstance.switchLatticeSystem(targetType, 2.0);

      // 2. Force the master compiler pass to target the custom tile motif
      if (this.ctx.baseMotifSelectElement) {
        this.ctx.baseMotifSelectElement.value = 'customTileCompiler';
      }

      // 3. Keep master rendering loops perfectly in line
      this.ctx.updateEnginePipeline();
    });

    this.els.btnMaxCompact?.addEventListener('click', () => this.toggleLayoutMode(true));
    this.els.btnRestoreMax?.addEventListener('click', () => this.toggleLayoutMode(false));
  }

  private toggleLayoutMode(toMaximized: boolean): void {
    const canvas = document.getElementById('tileCanvas') as HTMLCanvasElement;
    if (!this.workspaceInstance || !this.els.modalContainer || !canvas) return;

    this.isMaximized = toMaximized;
    this.els.modalContainer.classList.toggle('maximized-mode-active', toMaximized);

    const skeleton = document.getElementById('sidebarSkeletonPlaceholder');
    const actualContent = document.getElementById('sidebarActualContent');

    if (toMaximized) {
      // Ensure placeholder is active immediately to preserve 320px layout constraints
      if (skeleton) skeleton.style.display = 'flex';
      if (actualContent) actualContent.style.display = 'none';

      if (this.els.mountMaximized) this.els.mountMaximized.appendChild(canvas);

      const isMobileScreen = window.innerWidth <= 768;
      const availableWidth = isMobileScreen ? window.innerWidth - 40 : window.innerWidth - 320 - 80;
      const availableHeight = isMobileScreen ? (window.innerHeight * 0.6) : window.innerHeight - 80;

      // Clamp workspace measurements to a strict square aspect to keep mouse tracking unified
      const uniformSize = Math.min(availableWidth, availableHeight);
      this.workspaceInstance.resizeWorkspace(uniformSize, uniformSize);

      // Swap placeholder out for content fluidly after layout engine calculation completes
      setTimeout(() => {
        if (skeleton) skeleton.style.display = 'none';
        if (actualContent) actualContent.style.display = 'flex';
      }, 180);
    } else {
      if (this.els.mountCompact) this.els.mountCompact.appendChild(canvas);
      this.workspaceInstance.resizeWorkspace(500, 500);
    }
  }
}
