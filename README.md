# Tessellate3D - Escher-Style Spiral Vector Engine 

<p align="center">
  <img src="./src/assets/hero-tessellation.svg" width="50%" alt="Loxodromic Square wave Tessellation" />
</p>

**Live Demo:** [tessellate3d.github.io](https://justin-koningsberger.github.io/Tessellate3D/) 🚀

I have been creating tessellation SVGs for a few months now to print with my 3D printer. Throughout this journey, I found that the traditional workflow—using Inkscape to auto-trace an image or completely redraw a single tile inside a complex tessellation—was far too tedious and error-prone.

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

### 2. Our Engine's Vector-Based Method (Adaptive Forward-Conformal Mapping)
* Loops through structural grid coordinates (Rings and Branches) on an infinite mathematical plane.
* Evaluates path coordinates natively in flat continuous space, eliminating layout grid distortion before applying spatial transformations.
* Processes raw vector shapes (**Base Motifs**) through a highly optimized, conformal warper matrix that scales straight outward from true geometric poles.
* **Dynamic Resolution Engine:** Features an adaptive post-transformation subdivision engine that scales vertex density proportionally with spatial warping and decay. This seals micro-gaps near high-distortion vortex areas while reducing redundant vertex weights in flat zones.
* **Result:** Outputs remarkably lightweight, individual vector paths (`<path d="..." />`) natively readable by Inkscape, Illustrator, and 3D slicers while preserving flawless edge-to-edge interlocking continuity.

---

## Stable Pipeline Components (Phase 1 Conformal Architecture Core)

* **`[Base Motif]`**
  * *Definition:* Statically typed, resolution-independent vector matrices supporting multi-component elements (outer boundaries and fine internal accent contours).
* **`[Subdivision Engine (subdividePath)]`**
  * *Purpose:* Dynamically samples absolute Euclidean distance post-transformation to inject native flat-space vertices exactly where non-linear curves bend aggressively.
  * *Why:* Keeps geometry perfectly fluid without turning arcs into jagged polygonal chords. It scales its accuracy resolution using the active `decayMultiplier` to optimize performance, while serving as a fine-nozzle FDM feature filter that automatically skips sub-micron details below $0.2\text{mm}$.
  * *Why:* Conformal mappings bend straight lines into smooth curves. Without subdivision, the output paths would warp as straight, jagged chords instead of fluid spiral segments.
* **`[Symmetry Engine (applyWallpaperSymmetry)]`**
  * *Purpose:* Stacks tiles edge-to-edge in flat 2D domain space.
  * *Layout:* Ring = X-axis translation, Branch = Y-axis translation.
* **`[Horizontal Affine Shear Matrix & Binary Snap Filter]`**
  * *Purpose:* Aligns tiling vertices perfectly across layout lanes.
  * *Why:* Eliminates rounding drift and structural gap tearing.
* **`[Conformal Warper (forwardLogSpiral)]`**
  * *Purpose:* Translates flat grid positions into four specialized conformal projection variations: `logarithmic` ($w = e^z$), `single-pole` (exponential decay), `multi-pole` (trigonometric hyperbolic split), and `loxodromic` (torsional complex phase twists).
* **`[Exact Transcendental Factor Recovery Solver]`**
  * *Purpose:* Performs exact backward grid tracking via reverse algebraic transformations.
  * *Strategy:* Leverages localized fixed-point iteration loops and decoupled matrix mappings to isolate u,v coordinates from screen space without runtime mathematical singularity collapses.
* **`[Multi-Component Asset Parser & Detail Separator]`**
  * *Status:* COMPLETE
    * *Purpose:* Stacks interlocking structural tiles seamlessly across an exponential log-polar coordinate plane.
  * *Layout:* Concentric depth Rings populate the radial vector path, while Angular Branches step uniformly to preserve the a-priori $2\pi$ circle wrapper continuity, completely preventing edge tearing.
* **`[Horizontal Affine Shear Matrix & Boundary Complementarity Sync]`**
  * *Purpose:* Implements rigid shear slopes alongside strict wall-complementarity parsers to guarantee face-to-face interlocking alignment across tile lanes.
* **`[Pure Conformal Warper Matrix (forward)]`**
  * *Purpose:* Translates linear grid fields into four mathematically isolated, pure complex projections: `logarithmic` ($w = e^z$), scale-invariant `single-pole` (constant-frequency log-radial flow), transcendental `multi-pole` (complex analytic sine mapping), and complex-phase `loxodromic` (torsional spiral twists). Global angle offsets and rotation variables act purely as final rigid coordinate translations, completely decoupling mapping frequency from interactive spatial sliders.
* **`[Stateless Inverse Solver Engines]`**
  * *Purpose:* Performs exact backward grid tracking across independent variant configurations without relying on hardcoded scaling limits or approximation loops.
  * *Strategy:* Implements pure mathematical inverses—such as direct algebraic parameter extractions and a dedicated complex inverse sine ($z = \text{asin}(w)$) formulation—mapping distorted screen dimensions directly back to flat operational space.
* **`[Multi-Layer Asset Parser & Detached Color Grouper]`**
  * *Status:* COMPLETE
  * *Purpose:* Encodes a deterministic sorting layer key matching color palette index strings (`colorIndex_hexColor`). This safely segregates primary boundary fills (`compIndex === 0`) into unified, self-contained SVG `<g>` groups while isolating internal decorative line work (`compIndex > 0`), ensuring reliable layer stacks inside vector illustration tools and multi-material slicers.

* **`[Color Cycler & Validator]`**
  * *Purpose:* Directs index-modulo path coloring across branches, running programmatic bijectivity round-trips to catch sub-micron panel drift.
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

## Prerequisites & Local Validation Environment

This project utilizes advanced ESM features and native testing frameworks.
To run this workspace engine locally, ensure your environment meets these constraints:

* **Node.js:** Runtime `v24.x.x` is required (Native execution spec).
* **Environment Management:** If you have multiple versions active, use [nvm](https://github.com/creationix/nvm) to initialize the target state before executing packages:
  ```bash
  nvm use 24
  npm install
  npm run dev:ui
  ```

## Project Suite Execution Scripts

This project is compiled under a modern, strict `NodeNext` ECMAScript specification framework. Execute these scripts using your npm workspace lifecycle tooling from the repository's root directory:

1. **Local Compiler Test Runner:** `npm run dev` *(Evaluates local configuration layers at `src/config.ts` and outputs test slices into the root directory)*
2. **Master Verification Test Suite:** `npm test` *(Triggers and strings together all tests in series)*
3. **Motif Boundary Constraint Test:** `npm run test:motifs` *(Performs rigorous micro-micron closure checks over your base motif libraries)*
4. **Mathematical Regression Test:** `npm run test:transforms` *(Asserts forward coordinate vectors against exact algebraic checkpoints)*
5. **Engine Telemetry Fuzzer:** `npm run test:fuzz` *(Runs a deep dual-progression random sweep across varying depth limits and ring layers)*
6. **ZIP Binary Signature Test:** `npm run test:zip` *(Validates PKWARE local file headers, byte offsets, and CRC32 integrity checks)*
7. **Headless Project Assembler:** `node dist/server/compile3DProject.js` *(In development for Phase 2 manufacturing)*
