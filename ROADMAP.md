# 🗺️ Master Technical Roadmap: Mathematical Escher Spiral Engine

This document outlines the architectural milestones, mathematical features, and asset pipeline expansions for the conformal spiral tiling engine.

---

## 🏁 PHASE 1: Core Precision, Linear Framework & TypeScript Migration `[COMPLETE]`
* **Strict NodeNext ES Module & Node 24 Architecture:** Migrated all core transformation modules, matrix loops, and layout engines into stateless, strongly typed TypeScript files (`.ts`) targeting modern ECMAScript specifications natively on the **Node.js v24** runtime.
* **Horizontal Affine Shear Matrix:** Implemented dynamic transformation loops inside `tessellationEngine.ts` to ensure seamless alignment along structural symmetry axes.
* **Binary Snap Validation:** Integrated strict `0.0` or `1.0` boundary enforcement filters in `applyWallpaperSymmetry` using explicit `EngineConfig` parameters to eliminate rounding drift.
* **Loop Continuity Automation:** Patched motif coordinate boundaries by enforcing explicit bottom-left closure anchors (`{x: 0.0, y: cellHeight}`).
* **Decoupled Automated QA Harness:** Re-engineered verification scripts into an isolated testing suite (`validateMotif.test.ts`, `validateTransforms.test.ts`, `fuzzEngine.test.ts`) utilizing strong type casting and a randomized dual-progression telemetry fuzzer.
* **Multi-Component Layering & Color Linking:** Fully resolved internal detail extraction bugs. The system now parses custom element sub-paths natively, separating closed master interlocking structural boundaries (`compIndex === 0`) from open decorative gray stroke segments (`compIndex > 0`) with complete namespace validation.

---

## 🎨 PHASE 2: Resolution Independence & Multi-Material 3D Extrusion `[UP NEXT]`
Transition the engine from strictly linear point arrays to native smooth vector geometries.
* [ ] **Multi-Type Node Data Structure:** Upgrade the `baseMotifs.ts` library to accept complex curve command flags:
  ```javascript
  { type: 'C', x1: 0.25, y1: -0.2, x2: 0.75, y2: 0.2, x: 1.0, y: 0.0 } // Cubic Bezier
  ```
* [ ] **Upstream Path Compiler Refactor:** Rewrite the SVG path generation loops to dynamically map and output `'C'` (Cubic), `'Q'` (Quadratic), and `'S'` (Shorthand) vector strings instead of joining lines with `'L'`.
* [ ] **Tangency-Preserving Affine Warp:** Adapt the forward-mapping coordinate loops to deform control point handle vectors (`x1, y1`, `x2, y2`) perfectly in sync with localized grid shears.
* [ ] **Conformal Derivative Subdivision Engine:** Upgrade `subdividePath` to dynamically inject intermediate mid-curve control points based on the local scale factor metric $|f'(z)|$. Automatically cull decorative sub-features (`compIndex > 0`) that fall below physical FDM printing limits (<0.2mm) near logarithmic focal poles.
* [ ] **Library-Free ASCII STL Builder (`src/stlBuilder.ts`):** Complete the server-side manifold extrusion script to map completed 2D vector coordinate arrays directly into 3D triangles capped to explicit target canvas height heights.
* [ ] **Headless Slicer Command Assembly:** Wire up the automated `prusa-slicer` runtime script with the `--merge` parameter block inside an `xvfb-run` container environment to output universal multi-material `.3mf` projects.

---

## 🔌 PHASE 3: Dynamic Geometry & Native Asset Ingestion
Allow artists to feed custom vector artwork straight into the engine without modifying the codebase.
* [ ] **Color-Linked Internal Detail Serialization**
      * **Why it matters:** Currently, all internal details are grouped into a single global grey overlay container. Splitting these paths by their originating tile color will allow multi-material slicers (like PrusaSlicer) to automatically map the eyes, scales, or wings to their respective physical filament layers instead of forcing a single color across the entire design.
* [ ] **Multi-Path Native Typing Integration:** Coordinate the SVG ingestion parser to output standard multi-path arrays natively recognized by the `compIndex` pipeline and `src/tests/validateMotif.test.ts`.
* [ ] **Arbitrary SVG Ingestion Engine:** Build an XML file-stream parser to automatically extract, strip, and flatten compound transformation matrices from external `.svg` source graphics.
* [ ] **Boundary Complementarity Verification Algorithm:** Programmatically parse an imported asset's bounding path to ensure its Top profile functions as a flawless mathematical complement to its Bottom profile.
* [ ] **Automatic Bounding Box Normalization:** Calculate scale differentials to compress, stretch, and fit any external vector shape cleanly into localized grid boundaries ranging from `X[0.0 - 1.0]` and `Y[0.0 - cellHeight]`.

---

## 🧮 PHASE 4: Conformal Complex Research Implementations
Incorporate advanced mathematical tiling behaviors outlined in canonical complex mapping literature.
* [ ] **Rational Fractional Stagger Factors:** Move beyond binary `0.0/1.0` snapping thresholds to allow variable fractional offsets (e.g., a `staggerFactor: 0.5` configuration for perfect running brick-bond alignments).
* [ ] **Grünbaum-Shephard Isohedral Parameterization:** Implement an `ihSymmetryEngine.ts` module to classify and enforce edge transitivity across all 93 IH types. Map custom paths directly to J-edges (asymmetric), U-edges (glide-reflected), and K-edges (centrosymmetric midpoints).
* [ ] **Derived Conformal Whirlpool Spaces (Mappings $\Phi_2$ & $\Phi_3$):** Implement forward transformation equations for the paper's Mobius-variant $\frac{z-i}{z+i}$ and periodic $\tan(z)$ mappings to generate complex multi-pole spiral whirlpool geometries.
* [ ] **Stereographic Riemann Sphere Projections:** Map flat logarithmic spiral configurations cleanly onto 3D spherical point arrays to create closed-globe interlocking geometries.

---

## 🧬 PHASE 5: Automated Algorithmic Escherization
Leverage topological shape optimization loops to warp user-provided artwork into compliant tiles.
* [ ] **Target Energy Minimization Solver (`src/escherize.ts`):** Build a shape optimization loop (using a heuristic solver like Nelder-Mead) to automatically modify an incoming target silhouette path until it satisfies the interlocking boundary conditions of a chosen wallpaper or IH group.
* [ ] **Symmetry Procrustes Analysis:** Programmatically calculate geometric distance metrics between arbitrary user sketches and ideal isohedral templates to find the mathematically closest-matching symmetry group before starting deformations.
