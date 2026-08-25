import { createUncompressedZip } from './zipUtils.ts';
import { customWorkspace } from './tileWorkspace.ts';
import { CONFIG } from '@tessellate3d/core/src/config.ts';
import { generateTessellation, type Point2D } from '@tessellate3d/core/src/tessellationEngine.ts';

import {
  liveEditorState,
  updateLiveEditorState
} from '@tessellate3d/core/src/tileSymmetry.ts';

import type { EngineConfig } from '@tessellate3d/core/src/tessellationEngine.ts';

interface SlicerFileResponse {
  filename: string;
  content: string; // Base64 encoded string from Fastify container server
}

interface SlicerApiResponse {
  status: string;
  meta: {
    totalLayersGenerated: number;
    thicknessMillimeters: number;
  };
  files: SlicerFileResponse[];
}

/**
 * CORE STUDIO FRONTEND CONTROLLER
 * Explicitly binds native DOM event listeners directly to the stateless math engine.
 */
document.addEventListener('DOMContentLoaded', () => {
  // Create an in-memory clone of the default project configurations
  const currentConfig: EngineConfig = structuredClone(CONFIG);
  let cachedActiveSvgString: string | null = null; // High-performance text cache

  // Explicitly target element structures across the canvas grid panel
  const els = {
    variantMode: document.getElementById('variantMode') as HTMLSelectElement,
    baseMotif: document.getElementById('baseMotif') as HTMLSelectElement,
    latticeType: document.getElementById('latticeType') as HTMLSelectElement,
    symmetryGroup: document.getElementById('symmetryGroup') as HTMLSelectElement,
    autoAlignContainer: document.getElementById('auto-align-container') as HTMLLabelElement,
    useAutoAlignment: document.getElementById('useAutoAlignment') as HTMLInputElement,
    showDebugLabels: document.getElementById('showDebugLabels') as HTMLInputElement,
    totalBranches: document.getElementById('totalBranches') as HTMLInputElement,
    totalBranchesVal: document.getElementById('totalBranches-val') as HTMLSpanElement,
    maxRings: document.getElementById('maxRings') as HTMLInputElement,
    maxRingsVal: document.getElementById('maxRings-val') as HTMLSpanElement,
    decayMultiplier: document.getElementById('decayMultiplier') as HTMLInputElement,
    decayMultiplierVal: document.getElementById('decayMultiplier-val') as HTMLSpanElement,
    twistFactor: document.getElementById('twistFactor') as HTMLInputElement,
    twistFactorVal: document.getElementById('twistFactor-val') as HTMLSpanElement,
    staggerFactor: document.getElementById('staggerFactor') as HTMLInputElement,
    staggerFactorVal: document.getElementById('staggerFactor-val') as HTMLSpanElement,
    canvasTarget: document.getElementById('svg-injection-target') as HTMLDivElement,
    decayContainer: document.getElementById('decayContainer') as HTMLLabelElement,
    twistContainer: document.getElementById('twistContainer') as HTMLLabelElement,
    staggerContainer: document.getElementById('staggerContainer') as HTMLLabelElement,
    phaseOffsetContainer: document.getElementById('phaseOffsetContainer') as HTMLLabelElement,
    latticePhaseOffset: document.getElementById('latticePhaseOffset') as HTMLInputElement,
    latticePhaseOffsetVal: document.getElementById('latticePhaseOffset-val') as HTMLSpanElement,
    ringDistanceContainer: document.getElementById('ringDistanceContainer') as HTMLLabelElement,
    ringDistanceMultiplier: document.getElementById('ringDistanceMultiplier') as HTMLInputElement,
    ringDistanceMultiplierVal: document.getElementById('ringDistanceMultiplier-val') as HTMLSpanElement,
    intersectionContainer: document.getElementById('intersectionContainer') as HTMLLabelElement,
    ringIntersectionFactor: document.getElementById('ringIntersectionFactor') as HTMLInputElement,
    ringIntersectionFactorVal: document.getElementById('ringIntersectionFactor-val') as HTMLSpanElement,

    debuggingGridRow: document.getElementById('debugging-grid-row') as HTMLLabelElement,

    applyStroke: document.getElementById('applyStroke') as HTMLInputElement,
    // Color Palette DOM target mount nodes
    paletteContainer: document.getElementById('palette-list-container') as HTMLDivElement,
    btnAddColor: document.getElementById('btn-add-color') as HTMLButtonElement,

    // EXPORT BUTTON HOOKS
    btnDownloadMaster: document.getElementById('btn-download-master') as HTMLButtonElement,
    btnDownloadSeparatedColors: document.getElementById('btn-download-separated') as HTMLButtonElement,
    btnDownload3dStl: document.getElementById('btn-download-3d-stl') as HTMLButtonElement,
    btnOpenCustom: document.getElementById('btn-open-custom') as HTMLButtonElement,
    customModal: document.getElementById('custom-modal') as HTMLDivElement,
    customCanvas: document.getElementById('custom-canvas') as HTMLCanvasElement,
    btnCloseCustomSave: document.getElementById('btn-close-custom-save') as HTMLButtonElement,
    btnClosecustomCancel: document.getElementById('btn-close-custom-cancel') as HTMLButtonElement,
    btnClosecustomReset: document.getElementById('btn-close-custom-reset') as HTMLButtonElement
  };

  /**
   * Reads current input parameter configurations directly from the active UI panel bounds.
   */
  function updateEnginePipeline(): void {
    currentConfig.variantMode = els.variantMode.value as EngineConfig['variantMode'];
    currentConfig.baseMotif = els.baseMotif.value as EngineConfig['baseMotif'];
    currentConfig.latticeType = els.latticeType.value as EngineConfig['latticeType'];
    currentConfig.symmetryGroup = els.symmetryGroup.value as EngineConfig['symmetryGroup'];
    currentConfig.useAutoAlignment = els.useAutoAlignment.checked;
    currentConfig.showDebugLabels = els.showDebugLabels.checked;
    currentConfig.applyStroke = els.applyStroke.checked;

    currentConfig.layout = {
      totalBranches: parseInt(els.totalBranches.value, 10),
      maxRings: parseInt(els.maxRings.value, 10),
      globalScale: 1.0, // Hardcoded engine baseline value to satisfy strict configuration types
      subdivisionLimit: 0.05, // Hardcoded engine baseline value to satisfy strict configuration types
      decayMultiplier: parseFloat(els.decayMultiplier.value),
      twistFactor: parseFloat(els.twistFactor.value),
      staggerFactor: parseFloat(els.staggerFactor.value),
      latticePhaseOffset: parseFloat(els.latticePhaseOffset.value),
      ringDistanceMultiplier: parseFloat(els.ringDistanceMultiplier.value),
      ringIntersectionFactor: parseFloat(els.ringIntersectionFactor.value)
    };

    // Update real-time label values next to sliders
    els.totalBranchesVal.textContent = currentConfig.layout.totalBranches.toFixed(0);
    els.maxRingsVal.textContent = currentConfig.layout.maxRings.toFixed(0);
    els.twistFactorVal.textContent = currentConfig.layout.twistFactor.toFixed(2);
    els.staggerFactorVal.textContent = currentConfig.layout.staggerFactor.toFixed(1);
    els.decayMultiplierVal.textContent = currentConfig.layout.decayMultiplier.toFixed(2);
    els.latticePhaseOffsetVal.textContent = currentConfig.layout.latticePhaseOffset.toFixed(2);
    els.ringDistanceMultiplierVal.textContent = currentConfig.layout.ringDistanceMultiplier.toFixed(2);
    els.ringIntersectionFactorVal.textContent = currentConfig.layout.ringIntersectionFactor.toFixed(2);

    const currentLattice = els.latticeType.value;
    const isIsometric = currentLattice === 'triangular' || currentLattice === 'hexagonal';
    els.autoAlignContainer.style.display = isIsometric ? 'flex' : 'none';

    // Dynamically manage control panel visibility based on active variant mode mechanics
    const mode = currentConfig.variantMode;
    if (els.decayContainer) {
      els.decayContainer.style.display = mode === 'logarithmic' ? 'none' : 'flex';
    }
    if (els.twistContainer) {
      els.twistContainer.style.display = mode === 'loxodromic' ? 'flex' : 'none';
    }

    // Dynamically manage control panel visibility based on active base motif
    if (els.staggerContainer) {
      // The other motifs with interlocking edges do not support stagger yet
      const allowedMotifs = ['square', 'detailedSquare'];
      const isStaggerSupported = allowedMotifs.includes(currentConfig.baseMotif);

      if (isStaggerSupported) {
        els.staggerContainer.style.display = 'flex';
      } else {
        currentConfig.layout.staggerFactor = 0.0;
        els.staggerFactor.value = "0.0";
        els.staggerContainer.style.display =  'none';
      }
    }

    // Dynamically manage control panel visibility based on active lattice layout
    if (els.phaseOffsetContainer) {
      const showSliders = isIsometric && !els.useAutoAlignment.checked;
      els.phaseOffsetContainer.style.display = showSliders ? 'flex' : 'none';
      els.ringDistanceContainer.style.display = showSliders ? 'flex' : 'none';
      els.intersectionContainer.style.display = showSliders ? 'flex' : 'none';
    }

    // TELEMETRY STACK LOGGING
    console.log("⚙️ [Pipeline] Preparing math execution pass. Final scraped config parameters:", {
      variantMode: currentConfig.variantMode,
      baseMotif: currentConfig.baseMotif,
      symmetryGroup: currentConfig.symmetryGroup,
      latticeType: currentConfig.latticeType
    });

    try {
      console.log("⚙️ [Pipeline] Invoking core generateTessellation()...");
      // Execute pure transformation pass natively in-browser
      const svgString = generateTessellation(currentConfig);

      cachedActiveSvgString = svgString;

      if (els.canvasTarget) {
        els.canvasTarget.innerHTML = svgString;
        console.log(`🚀 [Pipeline] Render successful! Injected ${svgString.length} SVG characters into DOM.`);
      } else {
        console.error("❌ [Pipeline] DOM target 'els.canvasTarget' is completely missing!");
      }
    } catch (err) {
      console.error("❌❌ [Pipeline CRASH] Engine generation fault intercepted: ", err);
    }
  }

  /**
   * Initializes the interactive custom Symmetry Editor modal, canvas listeners,
   * and binds the output results back to the master production loop.
   */
  function initializeCustomEditor(): void {
    let customWorkspaceInstance: customWorkspace | null = null;

    // Pre-populate global editor memory from localStorage on page load.
    try {
      const savedState = localStorage.getItem('tessellate3d_custom_motif');
      if (savedState) {
        const parsed = JSON.parse(savedState);
        updateLiveEditorState(parsed);
        console.log("🚀 [Lifecycle Sync] Custom motif state successfully loaded from cache on startup.");
      }
    } catch (err) {
      console.warn("⚠️ [Lifecycle Sync] Failed loading startup layout cache:", err);
    }


    if (!els.btnOpenCustom || !els.customModal || !els.customCanvas || !els.btnCloseCustomSave || !els.btnClosecustomCancel) {
      return;
    }

    els.btnOpenCustom.addEventListener('click', () => {
      // Reveal modal backdrop window overlay layer
      els.customModal.style.display = 'flex';

      // Instantiate or redraw the native 2D workspace context state
      if (!customWorkspaceInstance) {
        customWorkspaceInstance = new customWorkspace(els.customCanvas, 2.0);
      } else {
        customWorkspaceInstance.render();
      }
    });

    els.btnCloseCustomSave.addEventListener('click', () => {
      els.customModal.style.display = 'none';

      currentConfig.baseMotif = "customSymmetricHexagon";
      currentConfig.symmetryGroup = "p3";

      if (els.baseMotif) {
        els.baseMotif.value = "customSymmetricHexagon";
      }

      console.log("🔍 [UI Sync] Configuration mutated: baseMotif='customSymmetricHexagon', symmetryGroup='p3'");

      if (liveEditorState) {
        console.log("🔍 [UI Sync] liveEditorState exists. Master edge lengths:", {
          edgeA: liveEditorState.edgeA.length,
          edgeB: liveEditorState.edgeB.length,
          edgeC: liveEditorState.edgeC.length
        });
      } else {
        console.warn("⚠️ [UI Sync] liveEditorState is null or undefined prior to pipeline compilation!");
      }

      console.log("🚀 [UI Sync] Invoking updateEnginePipeline()...");
      updateEnginePipeline();
    });

    els.btnClosecustomCancel.addEventListener('click', () => {
      els.customModal.style.display = 'none';
    });

    if (els.btnClosecustomReset) {
      els.btnClosecustomReset.addEventListener('click', () => {
        if (customWorkspaceInstance) {
          customWorkspaceInstance.resetToDefaultLattice(2.0);
        }
      });
    }
  }

  /**
   * Dynamically renders color input swatches based on the active config array.
   */
  function renderPaletteUI(): void {
    els.paletteContainer.innerHTML = '';

    currentConfig.colorPalette.forEach((colorHex, index) => {
      const row = document.createElement('div');
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.style.width = '100%';
      row.style.padding = '4px 0';

      const pickerLabel = document.createElement('label');
      pickerLabel.style.display = 'flex';
      pickerLabel.style.flexDirection = 'row';
      pickerLabel.style.flexWrap = 'nowrap';
      pickerLabel.style.alignItems = 'center';
      pickerLabel.style.gap = '12px';
      pickerLabel.style.cursor = 'pointer';

      // Color Picker Native Input
      const picker = document.createElement('input');
      picker.type = 'color';
      picker.value = colorHex;
      picker.style.padding = '0';
      picker.style.width = '42px';
      picker.style.height = '28px';
      picker.style.cursor = 'pointer';
      picker.style.border = 'none';

      picker.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        currentConfig.colorPalette[index] = target.value;
        labelText.textContent = target.value.toUpperCase();
      });

      // Regenerate the engine ONLY when users release the click
      picker.addEventListener('change', () => {
        updateEnginePipeline();
      });

      // Label hex value text
      const labelText = document.createElement('span');
      labelText.textContent = colorHex.toUpperCase();
      labelText.style.fontFamily = 'monospace';
      labelText.style.fontSize = '13px';

      // Assemble the picker interactive section
      pickerLabel.appendChild(picker);
      pickerLabel.appendChild(labelText);
      pickerLabel.title = "Change color";

      // Color Removal Button
      const btnDelete = document.createElement('button');
      btnDelete.type = 'button';
      btnDelete.innerHTML = '❌';
      btnDelete.style.background = 'none';
      btnDelete.style.border = 'none';
      btnDelete.style.padding = '6px';

      // Enforce a strict minimum floor of 2 colors for pattern contrast
      const paletteAtMinimum = currentConfig.colorPalette.length <= 2;

      // Visual alert/disabled state configuration
      btnDelete.disabled = paletteAtMinimum;
      btnDelete.style.cursor = paletteAtMinimum ? 'not-allowed' : 'pointer';
      btnDelete.style.opacity = paletteAtMinimum ? '0.3' : '1';
      btnDelete.title = paletteAtMinimum ? `Cannot delete: Minimum of ${currentConfig.layout.totalBranches} colors (same as # of branches) required.` : 'Delete color';

      btnDelete.addEventListener('click', () => {
        if (!paletteAtMinimum) {
          currentConfig.colorPalette.splice(index, 1);
          renderPaletteUI();
          updateEnginePipeline();
        }
      });

      row.appendChild(pickerLabel);
      row.appendChild(btnDelete);
      els.paletteContainer.appendChild(row);
    });
  }

  // Bind listener to append colors dynamically
  if (els.btnAddColor) {
    els.btnAddColor.addEventListener('click', (e) => {
      e.preventDefault(); // Stop default event propagation form cycles

      // Generate a valid 24-bit integer, convert to hex, and pad to exactly 6 characters
      const randomHex = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');

      currentConfig.colorPalette.push(randomHex);
      renderPaletteUI();
      updateEnginePipeline();
    });
  }

  /**
   * TASK 3: ONBOARDING VISUAL PRESET LISTENER SYSTEM
   * Configures math parameters dynamically to showcase specific geometric families.
   */
  const presetContainer = document.querySelector('.preset-grid');
  if (presetContainer) {
    presetContainer.addEventListener('click', (e) => {
      const target = e.target as HTMLButtonElement;
      if (!target.classList.contains('btn-preset')) return;

      const presetName = target.getAttribute('data-preset');

      switch (presetName) {
        case 'fortress':
          els.variantMode.value = 'single-pole';
          els.baseMotif.value = 'squarewave';
          els.latticeType.value = 'square'
          els.totalBranches.value = '5';
          els.maxRings.value = '6';
          els.decayMultiplier.value = '0.35';
          els.twistFactor.value = '0.00';
          els.staggerFactor.value = '0.0';
          els.latticePhaseOffset.value = '1.00';
          els.ringDistanceMultiplier.value = '1.00';
          els.ringIntersectionFactor.value = '1.00';
          els.applyStroke.checked = false;
          break;
        case 'vortex':
          els.variantMode.value = 'loxodromic';
          els.baseMotif.value = 'square';
          els.latticeType.value = 'square'
          els.totalBranches.value = '4';
          els.maxRings.value = '16';
          els.decayMultiplier.value = '0.3';
          els.twistFactor.value = '1.5';
          els.staggerFactor.value = '3.0';
          els.latticePhaseOffset.value = '1.00';
          els.ringDistanceMultiplier.value = '1.00';
          els.ringIntersectionFactor.value = '1.00';
          els.applyStroke.checked = false;
          break;
        case 'rose':
          els.variantMode.value = 'multi-pole';
          els.baseMotif.value = 'square';
          els.latticeType.value = 'square'
          els.totalBranches.value = '8';
          els.maxRings.value = '5';
          els.decayMultiplier.value = '0.40';
          els.twistFactor.value = '0.00';
          els.staggerFactor.value = '1.2';
          els.latticePhaseOffset.value = '1.00';
          els.ringDistanceMultiplier.value = '1.00';
          els.ringIntersectionFactor.value = '1.00';
          els.applyStroke.checked = true;
          break;
        case 'mandala':
          els.variantMode.value = 'logarithmic';
          els.baseMotif.value = 'detailedTriangle';
          els.latticeType.value = 'triangular'
          els.useAutoAlignment.checked = true;
          els.totalBranches.value = '10';
          els.maxRings.value = '6';
          els.decayMultiplier.value = '0.00';
          els.twistFactor.value = '0.00';
          els.staggerFactor.value = '0.0';
          els.latticePhaseOffset.value = '-5.00';
          els.ringDistanceMultiplier.value = '0.27';
          els.ringIntersectionFactor.value = '0.54';
          els.applyStroke.checked = false;
          break;
        case 'cyclone':
          els.variantMode.value = 'loxodromic';
          els.baseMotif.value = 'triangle';
          els.latticeType.value = 'triangular'
          els.useAutoAlignment.checked = true;
          els.totalBranches.value = '10';
          els.maxRings.value = '6';
          els.decayMultiplier.value = '1.00';
          els.twistFactor.value = '-0.67';
          els.staggerFactor.value = '0.0';
          els.latticePhaseOffset.value = '-4.00';
          els.ringDistanceMultiplier.value = '0.27';
          els.ringIntersectionFactor.value = '0.54';
          els.applyStroke.checked = false;
          break;
        case 'mitosis':
          els.variantMode.value = 'multi-pole';
          els.baseMotif.value = 'triangle';
          els.latticeType.value = 'triangular'
          els.useAutoAlignment.checked = true;
          els.totalBranches.value = '20';
          els.maxRings.value = '7';
          els.decayMultiplier.value = '1.58';
          els.twistFactor.value = '0.00';
          els.staggerFactor.value = '0.0';
          els.latticePhaseOffset.value = '4.00';
          els.ringDistanceMultiplier.value = '-1.31';
          els.ringIntersectionFactor.value = '0.27';
          els.applyStroke.checked = false;
          break;
        case 'bismuth':
          els.variantMode.value = 'single-pole';
          els.baseMotif.value = 'hexagon';
          els.latticeType.value = 'hexagonal'
          els.useAutoAlignment.checked = true;
          els.totalBranches.value = '20';
          els.maxRings.value = '20';
          els.decayMultiplier.value = '1.05';
          els.twistFactor.value = '0.0';
          els.staggerFactor.value = '0.0';
          els.latticePhaseOffset.value = '0.00';
          els.ringDistanceMultiplier.value = '0.27';
          els.ringIntersectionFactor.value = '0.54';
          els.applyStroke.checked = false;
          break;
        case 'buzzsaw':
          els.variantMode.value = 'loxodromic';
          els.baseMotif.value = 'hexagon';
          els.latticeType.value = 'hexagonal'
          els.useAutoAlignment.checked = true;
          els.totalBranches.value = '10';
          els.maxRings.value = '10';
          els.decayMultiplier.value = '1.25';
          els.twistFactor.value = '-0.67';
          els.staggerFactor.value = '0.0';
          els.latticePhaseOffset.value = '-4.00';
          els.ringDistanceMultiplier.value = '0.27';
          els.ringIntersectionFactor.value = '0.54';
          els.applyStroke.checked = true;
          break;
        case 'hexPuzzle':
          els.variantMode.value = 'logarithmic';
          els.baseMotif.value = 'hexPuzzle';
          els.latticeType.value = 'hexagonal'
          els.useAutoAlignment.checked = true;
          els.totalBranches.value = '10';
          els.maxRings.value = '14';
          els.decayMultiplier.value = '1.00';
          els.twistFactor.value = '0.0';
          els.staggerFactor.value = '0.0';
          els.latticePhaseOffset.value = '2.50';
          els.ringDistanceMultiplier.value = '-1.29';
          els.ringIntersectionFactor.value = '0.21';
          els.applyStroke.checked = true;
          break;
        default:
          return;
      }

      // Synchronize UI view elements, recompute vectors, and inject fresh vector layouts
      updateEnginePipeline();
    });
  }


  /**
   * Launches a native download stream for any binary or text Blob via dynamic document
   * link anchors.
   */
  function triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  // A. EXPORT COMPOSITE DESIGN FILE
  if (els.btnDownloadMaster) {
    els.btnDownloadMaster.addEventListener('click', (e) => {
      e.preventDefault();

      // Read directly from memory cache instead of heavy innerHTML string serialization
      let activeSvg = cachedActiveSvgString ? cachedActiveSvgString.trim() : '';

      if (!activeSvg || !activeSvg.includes('<svg')) {
        alert("Canvas workspace empty. Generate a layout pattern first.");
        return;
      }

      // Inject the required XML standard tracking prologue header back into the file data stream
      if (!activeSvg.startsWith('<?xml')) {
        activeSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n` + activeSvg;
      }

      const fileName = `tessellate3d_${currentConfig.variantMode}_${currentConfig.baseMotif}.svg`;

      // Wrap SVG text contents into a standard W3C compliant vector blob
      const svgBlob = new Blob([activeSvg], { type: 'image/svg+xml;charset=utf-8' });
      triggerDownload(svgBlob, fileName);
    });
  }

  // B. EXPORT ISOLATED COLOR FILES
  if (els.btnDownloadSeparatedColors) {
    els.btnDownloadSeparatedColors.addEventListener('click', (e) => {
      e.preventDefault();

      // Read directly from high-performance cache string
      const activeSvg = cachedActiveSvgString;
      if (!activeSvg) {
        alert("No pattern data cached. Please generate a tessellation first.");
        return;
      }

      // 1. FAST VIRTUAL PARSING
      const virtualDoc = document.implementation.createHTMLDocument('');
      const container = virtualDoc.createElement('div');
      container.innerHTML = activeSvg;

      const rootSvg = container.querySelector('svg');
      if (!rootSvg) {
        alert("Failed to resolve root vector parameters from memory cache.");
        return;
      }

      const colorGroups = container.querySelectorAll('g[id^="color_"]');
      const detailGroup = container.querySelector('g[id="custom_internal_details"]');

      if (colorGroups.length === 0) {
        alert("No printable color groups discovered within the vector memory stream.");
        return;
      }

      const viewBox = rootSvg.getAttribute('viewBox') || "-600 -600 1200 1200";
      const width = currentConfig.canvas.width;
      const height = currentConfig.canvas.height;

      const bundleManifest: { name: string; content: string }[] = [];

      // 2. PARSE GEOMETRY AND ACCUMULATE TARGET VECTOR SHEETS INTO THE ZIP MANIFEST
      colorGroups.forEach((group, idx) => {
        const idAttr = group.getAttribute('id') || '';

        // Skip details layers during the main loop so they don't generate separate files
        if (idAttr.endsWith('_details')) return;

        const parts = idAttr.split('_');

        // Extract branch numbers and color hex codes safely
        const layerNumber = parts[parts.length - 2] || (idx + 1).toString();
        const hexSuffix = parts[parts.length - 1] || 'unknown';

        // Dynamically find the matching interior lines group for this specific color layer
        const matchingDetailsGroup = container.querySelector(`g[id="color_${layerNumber}_${hexSuffix}_details"]`);

        let splitSvg = `<?xml version="1.0" encoding="UTF-8" standalone="no"?>\n`;
        splitSvg += `<svg width="${width}" height="${height}" viewBox="${viewBox}" version="1.1" xmlns="http://w3.org/2000/svg">\n`;
        // Layer 1: The colored base motif shapes
        splitSvg += `  ${group.outerHTML}\n`;

        // Layer 2: The matching graphic detail lines inside the same file
        if (matchingDetailsGroup) {
          splitSvg += `  ${matchingDetailsGroup.outerHTML}\n`;
        }
        splitSvg += `</svg>\n`;

        // Hyper-clean structural naming convention
        bundleManifest.push({
          name: `layer${layerNumber}-${hexSuffix}.svg`,
          content: splitSvg
        });
      });

      // 3. COMPILE BUNDLE OVER RAW UNCOMPRESSED BINARY UTILITIES
      try {
        const zipBlob = createUncompressedZip(bundleManifest);
        // Wrap compiled PKWARE archive contents into a standard uncompressed binary blob
        triggerDownload(zipBlob, `tessellate3d_separated_colors.zip`);
      } catch (error) {
        console.error("Vector pack streaming failure:", error);
        alert("Failed to build color bundle archive from memory cache.");
      }
    });
  }

  // FIX: Larger STL files take a while to zip, longer than creating the STL files in the first place
  // C. EXPORT 3D MULTI-MATERIAL STL FILES
  if (els.btnDownload3dStl) {
    els.btnDownload3dStl.addEventListener('click', async (e) => {
      e.preventDefault();

      const activeSvg = cachedActiveSvgString;
      if (!activeSvg) {
        alert("No pattern data cached. Please generate a tessellation first.");
        return;
      }

      const initialButtonLabel = els.btnDownload3dStl.innerText;
      els.btnDownload3dStl.innerText = 'Slicing Meshes...';
      els.btnDownload3dStl.disabled = true;

      // Dynamically resolve target based on deployment environment
      const API_BASE_URL = import.meta.env.VITE_SLICER_SERVICE_API_BASE_URL;
      const ENDPOINT_URL = `${API_BASE_URL}/api/v1/slice`;

      try {
        console.log('📡 Transmitting SVG vector field to secure container slicing microservice...');

        const apiResponse = await fetch(ENDPOINT_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ svgString: activeSvg, designThickness: 0.6 })
        });

        if (!apiResponse.ok) {
          const errorPayload = await apiResponse.json().catch(() => ({ message: 'Unknown engine crash' }));
          throw new Error(`Slicer Container Refusal [${apiResponse.status}]: ${errorPayload.message}`);
        }

        const payload = await apiResponse.json() as SlicerApiResponse;
        if (payload.status !== 'success' || !payload.files || payload.files.length === 0) {
          throw new Error('Mesh calculations completed but returned an empty asset group.');
        }

        console.log(`📦 Unpacking ${payload.files.length} layers. Building uncompressed binary ZIP block in browser memory...`);

        const bundleManifest: { name: string; content: Uint8Array }[] = [];

        // Pack every returned file layer directly into the bundle array matrix
        payload.files.forEach((fileAsset: SlicerFileResponse) => {
          // Decode transport Base64 formatting string back into standard raw bytes arrays
          const binaryBytesArray = Uint8Array.from(atob(fileAsset.content), c => c.charCodeAt(0));

          bundleManifest.push({
            name: fileAsset.filename,
            content: binaryBytesArray // Pass raw binary bytes cleanly into manifest indices
          });
        });

        // Package everything into a single file archive
        const zipArchiveBlob = createUncompressedZip(bundleManifest);
        const customFileName = `tessellate3d_${currentConfig.variantMode}_${currentConfig.baseMotif}.zip`;

        // Dispatch single archive download event
        triggerDownload(zipArchiveBlob, customFileName);
        console.log('🎉 Consolidated multi-material asset package exported successfully!');

      } catch (err) {
        const runErrorMessage = err instanceof Error ? err.message : String(err);
        const fallbackUrl = API_BASE_URL || 'https://0.0.0.0:3000';
        alert(`Failed to compile 3D meshes: ${runErrorMessage}\n\n💡 Tip: Open a new tab and confirm you can access ${fallbackUrl}/health to clear local certificate blocks or verify server availability.`);
      } finally {
        els.btnDownload3dStl.innerText = initialButtonLabel;
        els.btnDownload3dStl.disabled = false;
      }
    });
  }

  // Hook native listeners explicitly to global settings inputs only
  const globalInputs = document.querySelectorAll('#controls input:not([type="color"]), #controls select');
  globalInputs.forEach(input => {
    input.addEventListener('input', updateEnginePipeline);
  });

  // Hide debugging in production builds
  if (import.meta.env.PROD && els.debuggingGridRow) {
    els.debuggingGridRow.style.display = 'none';
  }

  initializeCustomEditor();
  renderPaletteUI();

  updateEnginePipeline();
});
