# Tessellate3D - Escher-Style Spiral Vector Engine 🌀

I have been creating tessellation SVGs for about two months now to print with my 3D printer. Throughout this journey, I found that the traditional workflow—using Inkscape to auto-trace or completely redraw a single tile inside a complex tessellation—was far too tedious and error-prone.

To solve this, I built **Tessellate3D** to bring the entire pipeline back into the pure mathematical domain. The goal is to enforce mathematical perfection at the tile boundaries while keeping the door wide open for artistic flourishes, ultimately giving the user absolute, granular control over their final vector and 3D printed physical manufacturing outputs.

During my research, I found the paper *"Generation of advanced Escher-like spiral tessellations"* (Ouyang et al., 2022). Their work is a massive source of inspiration for this engine, providing a beautiful mathematical framework for cyclic symmetry groups ($G_k(M, N)$) and conformal transformations. While their paper focuses on leveraging fragment shaders for high-resolution graphics and canvas rendering, it inspired me to adapt those same elegant equations into a native vector workflow.

This engine implements a **Forward Mapping** pipeline based on those concepts. Instead of computing pixel coordinates, it takes discrete vector shapes, steps across a structural lattice grid, and projects the raw path coordinates outward into spiral space. This produces clean, individual `<path>` elements native to vector editors like Illustrator or Inkscape—perfect for clean 3D prints, while leaving the door wide open to implement the paper's advanced derived mappings later on.

Motivation: I want to engineer a bulletproof manufacturing pipeline, get the technique down, and move on to the next challenge. By automating the strict mathematical constraints on the backend, this engine gives future users the freedom to be purely artistic, while allowing anyone without a 3D printer to generate flawless multi-material projects ready for commercial printing bureaus.

There is also a deep structural link between 3D printing and classical relief printmaking, like the woodcuts of **Frans Masereel**. Both mediums rely on raw material paths, height differences, and crisp perimeters where every single line must be intentional; by translating math arrays straight into physical layers of plastic, the code becomes the digital carving tool that unlocks modern 3D print art.

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
* **`[ ] [Multi-Component Asset Parser & Detail Separator]`**
  * *Status:* IN PROGRESS / BUG-FIXING
  * *Purpose:* Supports internal geometric details (eyes, scales).
  * *Strategy:* Isolates non-boundary segments from base fills and overlays them separately as a stroke container.
* **`[Color Cycler & Validator]`**
  * *Purpose:* Colors tiles diagonally via index modulo rules, formats standard XML schema prologues, and introduces explicit line breaks (`\n`) to prevent parser overflow.
  * *Grouping Output:* Organizes arrays of mapped coordinates dynamically into structured collections sorted by color parameters.

---

## Automated 3D Slicing & Manufacturing Pipeline (New Core Feature)

* **`[Microscopic Alignment Matrix Engine]`**
  * *Purpose:* Guarantees perfect alignment between changing color fields in 3D slicers.
  * *Strategy:* Automatically tracks the absolute extreme minimum and maximum (X, Y) coordinate boundaries across all generated arrays, injecting tiny geometric alignment artifacts at the canvas corners.
* **`[Library-Free ASCII STL Builder]`**
  * *Purpose:* Converts 2D mathematical vector paths into 3D manifolds on the server without heavy 3D rendering dependencies (like Three.js or OpenSCAD).
  * *Strategy:* Maps 2D coordinate points straight into a pure text string array template, generating side-wall and top/bottom triangles extruded dynamically to a user-specified height configuration (e.g., 0.4mm or 0.6mm) determined by the target 3D canvas model constraints.
* **`[Dynamic Parameter-Driven Payload Interface]`**
  * *Purpose:* Synchronizes client-side UI manipulation with server-side 3D generation.
  * *Strategy:* Minimizes bandwidth by passing raw, low-overhead JSON configuration objects containing symmetry variables, color lists, and target canvas choices directly from the browser to the backend service.
* **`[Headless Slicer Component Merger]`**
  * *Purpose:* Packages multi-color mathematical tessellations straight into print-ready physical configurations across dynamic canvas shapes.
  * *Strategy:* Spreads variable array strings (`...generatedSTLs`) into a headless PrusaSlicer runtime command block, using the `--merge` instruction to drop multi-material vector modifiers onto pre-configured 3D template archives (`.3mf`). This layout allows seamless experimentation with diverse 3D canvases, generating universal project files that can be sent directly to on-demand commercial printing bureaus.

---

## Project Suite Execution Scripts

Execute these scripts from your terminal environment to run the suite, using your system environment variables to seamlessly toggle execution paths between local testing profiles and your cloud backend servers:

1. **`[TypeScript Transition Target]`**
   * *Status:* ACTIVE REFACTOR
   * *Purpose:* Migrating all core mathematical transformations, array configurations, and string builders into strictly typed `.ts` models.
2. **Master Generation Engine:** `node spiralSVGGenerator.js`
3. **Automated Validation Suite:** `node tests/verifyMotif.js`
4. **Progressive Stress Test:** `node tests/stressTest.js`
5. **Headless Project Assembler:** `node server/compile3DProject.js` *(Runs web request parsing, ASCII text-to-STL extrusions, and dynamic PrusaSlicer CLI merging)*
