export const tileEditorTemplate = `
  <div id="customTileModal" class="custom-modal-backdrop">
    <div id="customModalContainer" class="custom-modal-container">

      <!-- COMPACT LAYOUT ENGINE CARD -->
      <div class="view-compact-block">
        <h3 class="compact-title">Symmetric Motif Vector Editor</h3>

        <!-- DESKTOP-ONLY ROW: Top-left slider capsule, top-right maximize action -->
        <div class="compact-header-row desktop-only-row">
          <div class="canvas-overlay-switch compact-switch-overlay" style="background: rgba(255, 255, 255, 0.05); padding: 5px 10px; border-radius: 20px; display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255, 255, 255, 0.1);">
            <span style="font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px;">Deform</span>
            <label class="ui-toggle-slider" style="position: relative; display: inline-block; width: 30px; height: 18px; margin: 0;">
              <input type="checkbox" id="chkDrawDetailsCompact" style="opacity: 0; width: 0; height: 0;">
              <span class="slider-round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4a4a4a; transition: .3s; border-radius: 18px;"></span>
            </label>
            <span style="font-size: 10px; font-weight: bold; color: #f1c40f; text-transform: uppercase; letter-spacing: 0.5px;">Draw</span>
          </div>
          <button type="button" id="btnMaxCompact" class="btn-maximize">Maximize Studio</button>
        </div>

        <p class="compact-desc">Design a custom interlocking base motif</p>
        <p class="compact-shortcuts">
          Use <span class="key-hint-cyan">Alt + Click</span> to add a node handle.
          Use <span class="key-hint-coral">Shift + Click</span> to remove a handle.
        </p>

        <!-- DYNAMIC DRAWING STATUS NOTIFICATION -->
        <div id="drawingStatusBanner" style="display: none; color: #f1c40f; font-size: 13px; font-weight: bold; margin: -5px 0 15px 0; text-align: center; background: rgba(241, 196, 15, 0.1); padding: 8px; border-radius: 6px; border: 1px solid rgba(241, 196, 15, 0.2); width: 100%; box-sizing: border-box;">🎨 Drawing Mode Active — Click inside tile bounds to draw</div>

        <!-- TOUCHSCREEN-ONLY TOOLBAR ROW -->
        <div class="mobile-interaction-toolbar touch-only-row" style="align-items: center; justify-content: center; gap: 10px; margin: 10px 0 15px 0; width: 100%;">
          <div class="canvas-overlay-switch compact-switch-overlay touch-only-toggle" style="background: rgba(255, 255, 255, 0.05); padding: 7px 10px; border-radius: 6px; display: flex; align-items: center; gap: 6px; border: 1px solid rgba(255, 255, 255, 0.1); height: 36px; box-sizing: border-box;">
            <span style="font-size: 12px; font-weight: bold; color: rgba(255,255,255,0.5); text-transform: uppercase; letter-spacing: 0.5px;">Deform</span>
            <label class="ui-toggle-slider" style="position: relative; display: inline-block; width: 30px; height: 18px; margin: 0;">
              <input type="checkbox" id="chkDrawDetailsTouch" style="opacity: 0; width: 0; height: 0;">
              <span class="slider-round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4a4a4a; transition: .3s; border-radius: 18px;"></span>
            </label>
            <span style="font-size: 12px; font-weight: bold; color: #f1c40f; text-transform: uppercase; letter-spacing: 0.5px;">Draw</span>
            <button type="button" id="btnModeEdit" class="btn-mode-toggle mode-active">✨ Move Handle</button>
            <button type="button" id="btnModeAdd" class="btn-mode-toggle">➕ Add Handle</button>
            <button type="button" id="btnModeDelete" class="btn-mode-toggle">❌ Delete Handle</button>
          </div>
        </div>

        <!-- MOBILE GRID SELECTION LINK -->
        <div class="compact-lattice-selector-group">
          <label for="editorLatticeSelectCompact" class="sidebar-setting-label">Active Lattice Grid System</label>
          <select id="editorLatticeSelectCompact" class="sidebar-setting-dropdown">
            <option value="hexagonal">Hexagonal (p3 Framework)</option>
            <option value="square">Square (p1 Framework)</option>
            <option value="triangular">Triangular (p6 Framework)</option>
          </select>
        </div>

        <div id="mountCompact" class="canvas-mount-zone">
          <!-- Canvas dynamic mount core -->
        </div>

        <div class="compact-footer-row">
          <button type="button" id="btnSaveCompact" class="btn-editor-action btn-action-save">Apply Tile</button>
          <button type="button" id="btnCancelCompact" class="btn-editor-action btn-action-cancel">Cancel</button>
          <button type="button" id="btnResetCompact" class="btn-editor-action btn-action-reset">Reset Base Tile</button>
        </div>
      </div>

      <!-- FULL-SCREEN STUDIO LAYOUT GRID -->
      <div class="view-maximized-grid">
        <div class="editor-canvas-viewport">
          <div class="editor-canvas-container" style="position: relative;">

            <div class="editor-viewport-top-bar" style="position: absolute; top: 12px; right: 12px; z-index: 10; background: transparent; width: auto; padding: 0;">
              <button type="button" id="btnRestoreMax" class="btn-restore-relative">Restore Compact View</button>
            </div>

            <div class="canvas-overlay-switch studio-switch-overlay" style="position: absolute; top: 12px; left: 12px; z-index: 10; background: rgba(30, 30, 30, 0.75); padding: 6px 12px; border-radius: 20px; backdrop-filter: blur(4px); display: flex; align-items: center; gap: 8px; border: 1px solid rgba(255, 255, 255, 0.15);">
              <span style="font-size: 12px; font-weight: bold; color: rgba(255,255,255,0.6); text-transform: uppercase; letter-spacing: 0.5px;">Deform</span>
              <label class="ui-toggle-slider" style="position: relative; display: inline-block; width: 40px; height: 22px; margin: 0;">
                <input type="checkbox" id="chkDrawDetails" style="opacity: 0; width: 0; height: 0;">
                <span class="slider-round" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #4a4a4a; transition: .3s; border-radius: 22px;"></span>
              </label>
              <span style="font-size: 12px; font-weight: bold; color: #f1c40f; text-transform: uppercase; letter-spacing: 0.5px;">Draw</span>
            </div>

            <div id="mountMaximized" class="canvas-stretch-mount"><!-- Dynamic canvas mount --></div>
          </div>
        </div>

        <div class="editor-sidebar-panel">
          <!-- Structural Skeleton Loading State Placeholder -->
          <div id="sidebarSkeletonPlaceholder" class="sidebar-skeleton-wrapper">
            <div class="skeleton-line skeleton-title"></div>
            <div class="skeleton-line skeleton-text-long"></div>
            <div class="skeleton-line skeleton-text-short"></div>
            <div class="skeleton-line skeleton-button"></div>
          </div>

          <!-- High Fidelity Core Content Area -->
          <div id="sidebarActualContent" class="sidebar-content-loaded" style="display: none;">
            <div>
              <div class="maximized-header-row">
                <h2 class="maximized-title">Symmetric Motif Vector Editor</h2>
              </div>
              <!-- BASE DEFORM MOTIF INSTRUCTIONS CONTAINER -->
              <div class="deform-instructions-block">
                <p class="maximized-desc">
                  Design a custom interlocking base motif.
                </p>
                <p class="maximized-shortcuts-line">
                  <span class="key-hint-cyan">Alt + Click</span> on a blue line segment to add a new control handle.<br>
                  <span class="key-hint-coral">Shift + Click</span> on a red control handle to delete it.
                </p>
              </div>

              <!-- DYNAMIC MULTI-STROKE DETAIL SKETCH INSTRUCTIONS CONTAINER -->
              <div class="draw-instructions-block">
                <p class="maximized-desc">Add vector details like eyes, loops, or custom internal patterns to your tile.</p>
                <p class="maximized-shortcuts-line">🎨 <span style="color: #f1c40f; font-weight: bold;">Drawing Mode Active</span><br>Click inside the tile boundaries to begin sketching decorative line elements.</p>
              </div>

              <!-- MOBILE TOOLBAR (STUDIO VIEW) -->
              <div class="mobile-interaction-toolbar maximized-toolbar">
                <button type="button" id="btnModeEdit" class="btn-mode-toggle mode-active">✨ Move Handle</button>
                <button type="button" id="btnModeAdd" class="btn-mode-toggle">➕ Add Handle</button>
                <button type="button" id="btnModeDelete" class="btn-mode-toggle">❌ Delete Handle</button>
              </div>

              <!-- LATTICE SELECTION SYSTEM MODULE -->
              <div class="sidebar-setting-group">
                <label for="editorLatticeSelect" class="sidebar-setting-label">Active Lattice Grid System</label>
                <select id="editorLatticeSelect" class="sidebar-setting-dropdown">
                  <option value="hexagonal">Hexagonal (p3 Framework)</option>
                  <option value="square">Square (p1 Framework)</option>
                  <option value="triangular">Triangular (p3c3 Rosette) Framework</option>
                </select>
              </div>
            </div>
            <div class="maximized-footer-row">
              <button type="button" id="btnSaveMax" class="btn-editor-action btn-action-save">Apply Tile</button>
              <button type="button" id="btnCancelMax" class="btn-editor-action btn-action-cancel">Cancel</button>
              <button type="button" id="btnResetMax" class="btn-editor-action btn-action-reset">Reset base Tile</button>
            </div>
        </div>
      </div>
    </div>
  </div>
`;
