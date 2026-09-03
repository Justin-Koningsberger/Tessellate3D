export const tileEditorTemplate = `
  <div id="customTileModal" class="custom-modal-backdrop">
    <div id="customModalContainer" class="custom-modal-container">

      <!-- COMPACT LAYOUT ENGINE CARD -->
      <div class="view-compact-block">
        <div class="compact-header-row">
          <h3 class="compact-title">Symmetric Motif Vector Editor</h3>
          <button type="button" id="btnMaxCompact" class="btn-maximize">Maximize Studio</button>
        </div>
        <p class="compact-desc">Design a custom interlocking base motif</p>
        <p class="compact-shortcuts">
          Use <span class="key-hint-cyan">Alt + Click</span> to add a node handle.
          Use <span class="key-hint-coral">Shift + Click</span> to remove a handle.
        </p>

        <!-- MOBILE TOOLBAR -->
        <div class="mobile-interaction-toolbar">
          <button type="button" id="btnModeEdit" class="btn-mode-toggle mode-active">✨ Move Handle</button>
          <button type="button" id="btnModeAdd" class="btn-mode-toggle">➕ Add Handle</button>
          <button type="button" id="btnModeDelete" class="btn-mode-toggle">❌ Delete Handle</button>
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
          <div class="editor-canvas-container">
            <div class="editor-viewport-top-bar">
              <button type="button" id="btnRestoreMax" class="btn-restore-relative">Restore Compact View</button>
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
              <p class="maximized-desc">
                Design a custom interlocking base motif.
              </p>
              <p class="maximized-shortcuts-line">
                • <span class="key-hint-cyan">Alt + Click</span> on a blue line segment to add a new control handle.<br>
                • <span class="key-hint-coral">Shift + Click</span> on a red control handle to delete it.
              </p>

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
