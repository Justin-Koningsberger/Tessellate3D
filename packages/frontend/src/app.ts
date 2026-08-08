import { createUncompressedZip } from './zipUtils.ts';
import { CONFIG } from '@tessellate3d/core/src/config.ts';
import { generateEscherTessellation } from '@tessellate3d/core/src/tessellationEngine.ts';

import type { EngineConfig } from '@tessellate3d/core/src/tessellationEngine.ts';

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
    useInverseDebugging: document.getElementById('useInverseDebugging') as HTMLInputElement,
    totalBranches: document.getElementById('totalBranches') as HTMLInputElement,
    totalBranchesVal: document.getElementById('totalBranches-val') as HTMLSpanElement,
    maxRings: document.getElementById('maxRings') as HTMLInputElement,
    maxRingsVal: document.getElementById('maxRings-val') as HTMLSpanElement,
    globalRotation: document.getElementById('globalRotation') as HTMLInputElement,
    globalRotationVal: document.getElementById('globalRotation-val') as HTMLSpanElement,
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

    applyStroke: document.getElementById('applyStroke') as HTMLInputElement,
    // Color Palette DOM target mount nodes
    paletteContainer: document.getElementById('palette-list-container') as HTMLDivElement,
    btnAddColor: document.getElementById('btn-add-color') as HTMLButtonElement,

    // EXPORT BUTTON HOOKS
    btnDownloadMaster: document.getElementById('btn-download-master') as HTMLButtonElement,
    btnDownloadSeparatedColors: document.getElementById('btn-download-separated') as HTMLButtonElement
  };

  /**
   * Reads current input parameter configurations directly from the active UI panel bounds.
   */
  function updateEnginePipeline(): void {
    currentConfig.variantMode = els.variantMode.value as EngineConfig['variantMode'];
    currentConfig.baseMotif = els.baseMotif.value as EngineConfig['baseMotif'];
    currentConfig.useInverseDebugging = els.useInverseDebugging.checked;
    currentConfig.applyStroke = els.applyStroke.checked;

    currentConfig.layout = {
      totalBranches: parseInt(els.totalBranches.value, 10),
      maxRings: parseInt(els.maxRings.value, 10),
      globalScale: 1.0, // Hardcoded engine baseline value to satisfy strict configuration types
      globalRotation: parseFloat(els.globalRotation.value),
      subdivisionLimit: 0.05, // Hardcoded engine baseline value to satisfy strict configuration types
      decayMultiplier: parseFloat(els.decayMultiplier.value),
      twistFactor: parseFloat(els.twistFactor.value),
      staggerFactor: parseFloat(els.staggerFactor.value)

    };

    // Update real-time label values next to sliders
    els.totalBranchesVal.textContent = currentConfig.layout.totalBranches.toFixed(0);
    els.maxRingsVal.textContent = currentConfig.layout.maxRings.toFixed(0);
    els.globalRotationVal.textContent = currentConfig.layout.globalRotation.toFixed(2);
    els.twistFactorVal.textContent = currentConfig.layout.twistFactor.toFixed(2);
    els.staggerFactorVal.textContent = currentConfig.layout.staggerFactor.toFixed(1);
    els.decayMultiplierVal.textContent = currentConfig.layout.decayMultiplier.toFixed(2);

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

      els.staggerContainer.style.display = isStaggerSupported ? 'flex' : 'none';
    }


    try {
      // Execute pure transformation pass natively in-browser
      const svgString = generateEscherTessellation(currentConfig);

      cachedActiveSvgString = svgString;

      els.canvasTarget.innerHTML = svgString;
    } catch (err) {
      console.error("Engine generation fault intercepted: ", err);
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
      const detailGroup = container.querySelector('g[id="escher_internal_details"]');

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

  // Hook native listeners explicitly to global settings inputs only
  const globalInputs = document.querySelectorAll('#controls input:not([type="color"]), #controls select');
  globalInputs.forEach(input => {
    input.addEventListener('input', updateEnginePipeline);
  });

  // Initialize your dynamic filament view and execute the starting draw pass
  renderPaletteUI();
  updateEnginePipeline();
});
