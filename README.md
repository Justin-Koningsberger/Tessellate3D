# Tessellate3D - Escher-Style Spiral Vector Engine 🌀

I have been creating tessellation SVGs for about two months now to print with my 3D printer. Throughout this journey, I found that the traditional workflow—using Inkscape to auto-trace or completely redraw a single tile inside a complex tessellation—was far too tedious and error-prone.

To solve this, I built **Tessellate3D** to bring the entire pipeline back into the pure mathematical domain. The goal is to enforce mathematical perfection at the tile boundaries while keeping the door wide open for artistic flourishes, ultimately giving the user absolute, granular control over their final vector and 3D printed physical manufacturing outputs.

During my research, I found the paper *"Generation of advanced Escher-like spiral tessellations"* (Ouyang et al., 2022). Their work is a massive source of inspiration for this engine, providing a beautiful mathematical framework for cyclic symmetry groups ($G_k(M, N)$) and conformal transformations. While their paper focuses on leveraging fragment shaders for high-resolution graphics and canvas rendering, it inspired me to adapt those same elegant equations into a native vector workflow.

This engine implements a **Forward Mapping** pipeline based on those concepts. Instead of computing pixel coordinates, it takes discrete vector shapes, steps across a structural lattice grid, and projects the raw path coordinates outward into spiral space. This produces clean, individual `<path>` elements native to vector editors like Illustrator or Inkscape—perfect for clean 3D prints, while leaving the door wide open to implement the paper's advanced derived mappings later on.

---

# Architecture Documentation: Escher Spiral Vector Engine

## Forward vs. Backward Mapping Foundations

### 1. Raster-Based Mapping Methods
* Loops through screen pixel coordinates $(x, y)$ to reverse-map a flat domain space.
* Outstanding for real-time screens, high-resolution shaders, and canvas textures.

### 2. Our Engine's Vector-Based Method (Forward Mapping)
* Loops through structural grid coordinates (Rings and Branches).
* Takes a specific, pre-defined vector path shape (**Base Motif**).
* Shifts the motif across a 2D wallpaper domain using layout rules.
* Warps the coordinates outward via a forward conformal function.
* **Result:** Outputs clean, individual vector paths (`<path d="..." />`) natively readable by Inkscape, Illustrator, and 3D slicers.

---

## Current Stable Pipeline Components (Logarithmic Spiral Stage)

* **`[Base Motif]`**
  * *Definition:* Point array mapping an interlocking square/chevron shape.
* **`[Subdivision Engine (subdividePath)]`**
  * *Purpose:* Injects extra vertices along long straight path edges.
  * *Why:* Conformal mappings bend straight lines into smooth curves. Without subdivision, the output paths would warp as straight, jagged chords instead of fluid spiral segments.
* **`[Symmetry Engine (applyWallpaperSymmetry)]`**
  * *Purpose:* Stacks tiles edge-to-edge in flat 2D domain space.
  * *Layout:* Ring = X-axis translation, Branch = Y-axis translation.
* **`[Horizontal Affine Shear Matrix & Binary Snap Filter]`**
  * *Purpose:* Aligns tiling vertices perfectly across layout lanes.
  * *Why:* Eliminates rounding drift and structural gap tearing.
* **`[Conformal Warper (forwardLogSpiral)]`**
  * *Purpose:* Translates flat grid positions into spiral space.
  * *Math:* Complex function $w = e^z$, mapping rectangular strips seamlessly into a swirling logarithmic layout.
* **`[Multi-Component Asset Parser & Detail Separator]`**
  * *Purpose[*] Supports internal geometric details (eyes, scales).
  * *Strategy:* Isolates non-boundary segments from base fills and overlays them separately as a stroke container.
* **`[Color Cycler & Validator]`**
  * *Purpose:* Colors tiles diagonally via index modulo rules, formats standard XML schema prologues, and introduces explicit line breaks (`\n`) to prevent parser overflow.

---

## Project Suite Execution Scripts

Execute these scripts from your terminal environment to run the suite:
* **Master Generation Engine:** `node spiralSVGGenerator.js`
* **Automated Validation Suite:** `node tests/verifyMotif.js`
* **Progressive Stress Test:** `node tests/stressTest.js`
