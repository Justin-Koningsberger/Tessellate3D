# 🗺️ Master Technical Roadmap: Mathematical Escher Spiral Engine

This document outlines the architectural milestones, mathematical features, and asset pipeline expansions for the conformal spiral tiling engine.

---

## 🏁 PHASE 1: Core Precision, Linear Framework & TypeScript Migration `[COMPLETE]`
* **Strict NodeNext ES Module & Node 24 Architecture:** Migrated all core transformation modules, matrix loops, and layout engines into stateless, strongly typed TypeScript files (`.ts`) targeting modern ECMAScript specifications natively on the **Node.js v24** runtime.
* **Horizontal Affine Shear Matrix:** Implemented dynamic transformation loops inside `tessellationEngine.ts` to ensure seamless alignment along structural symmetry axes.
* **Binary Snap Validation:** Integrated strict `0.0` or `1.0` boundary enforcement filters in `applyWallpaperSymmetry` using explicit `EngineConfig` parameters to eliminate rounding drift.
* **Loop Continuity & Boundary Complementarity Sync:** Patched motif coordinate boundaries by enforcing explicit bottom-left closure anchors (`{x: 0.0, y: cellHeight}`).
* **Pure Conformal Twin Mapping Matrices:** Fully synchronized and locked down the stateless mathematical forward/inverse equations (`single-pole` and `multi-pole`), completely isolating global rotation angles from interactive spatial multipliers.
* **Decoupled Automated QA Harness:** Re-engineered verification scripts into an isolated testing suite (`validateMotif.test.ts`, `validateTransforms.test.ts`, `fuzzEngine.test.ts`, `zipUtils.test.ts`).
* **Multi-Component Layering & Color Linking:** Fully resolved internal detail extraction bugs. The system now parses custom element sub-paths natively, separating closed master interlocking structural boundaries (`compIndex === 0`) from open decorative gray stroke segments (`compIndex > 0`) with complete namespace validation.
 **Warped-Space Adaptive Subdivision Engine:** Upgraded `subdividePath` to dynamically sample post-transformation distances. It auto-scales resolution limit thresholds using the active `decayMultiplier`, decreasing SVG file size (the hero svg in /assets went from 99kb down to 69kb) while completely sealing sub-pixel fractures.

---

## 🎨 PHASE 2: Resolution Independence & Multi-Material 3D Extrusion `[UP NEXT]`
Transition the engine from strictly linear point arrays to native smooth vector geometries.
* [ ] **Parametric Curve Blueprinting Framework:** Expand the `baseMotifs.ts` dictionary to accept analytical parametric equations (e.g., ellipses, cycloids) alongside linear paths, ensuring smooth interior details can be evaluated procedurally.
* [ ] **Upstream Path Compiler Refactor:** Rewrite the SVG path generation loops to dynamically map and output `'C'` (Cubic), `'Q'` (Quadratic), and `'S'` (Shorthand) vector strings instead of joining lines with `'L'`.
* [ ] **Post-Transformation Vectorization Filter:** Implement an optimization pass that compresses dense point sequences back into SVG cubic Bézier segments *after* they are projected into screen space, keeping files tiny while preventing boundary tearing.
* [ ] **Adaptive Detail Stroke-Weight Scaling:** Implement dynamic `stroke-width` scaling specifically targeting detail sub-groups (`compIndex > 0`) to taper line thicknesses toward center poles, preventing open arcs from bleeding or overlapping as log-polar spatial coordinates compress near zero.
[x] **Library-Free ASCII STL Builder (`src/stlBuilder.ts`):** Complete the server-side manifold extrusion script to map completed 2D vector coordinate arrays directly into 3D triangles capped to explicit target canvas height, producing robust multi-material STL files compatible with any standard slicer or 3D software.
* [ ] **Headless Slicer Command Assembly:** Wire up the automated backend `prusa-slicer` binary runtime script with the `--merge` parameter block inside an `xvfb-run` container environment to package independent, server-extruded STL plates into unified multi-material `.3mf` projects.

---

## 🔌 PHASE 3: Dynamic Geometry & Native Asset Ingestion
Allow artists to feed custom vector artwork straight into the engine without modifying the codebase.
* [X] **Color-Linked Internal Detail Serialization**
      * **Why it matters:** Internal details are grouped into a details layer (colorIndex_hexColor_details) per color used. This allows allows users to easily change the color used for details instead of forcing a single color across the entire design.
* [ ] **Multi-Path Native Typing Integration:** Coordinate the SVG ingestion parser to output standard multi-path arrays natively recognized by the `compIndex` pipeline and `src/tests/validateMotif.test.ts`.
* [ ] **Arbitrary SVG Ingestion Engine:** Build an XML file-stream parser to automatically extract, strip, and flatten compound transformation matrices from external `.svg` source graphics.
* [ ] **Boundary Complementarity Verification Algorithm:** Programmatically parse an imported asset's bounding path to ensure its Top profile functions as a flawless mathematical complement to its Bottom profile.
* [ ] **Automatic Bounding Box Normalization:** Calculate scale differentials to compress, stretch, and fit any external vector shape cleanly into localized grid boundaries ranging from `X[0.0 - 1.0]` and `Y[0.0 - cellHeight]`.

---

## 🧮 PHASE 4: Conformal Complex Research Implementations
Incorporate advanced mathematical tiling behaviors outlined in canonical complex mapping literature.
* [x] **Rational Fractional Stagger Factors:** Moved beyond binary `0.0/1.0` snapping thresholds to support continuous, fractional offsets (0.0 to 1.0+). Successfully verified fluid, gap-free running brick-bond alignments under all warp variants for the `square` and `detailedSquare` motifs, with the frontend panel safely restricting visibility to these supported profiles.
* [ ] **Grünbaum-Shephard Isohedral Parameterization:** Implement an `ihSymmetryEngine.ts` module to classify and enforce edge transitivity across all 93 IH types. Map custom paths directly to J-edges (asymmetric), U-edges (glide-reflected), and K-edges (centrosymmetric midpoints).
* [ ] **Derived Conformal Whirlpool Spaces (Mappings $\Phi_2$ & $\Phi_3$):** Implement forward transformation equations for the paper's Mobius-variant $\frac{z-i}{z+i}$ and periodic $\tan(z)$ mappings to generate complex multi-pole spiral whirlpool geometries.
* [ ] **Stereographic Riemann Sphere Projections:** Map flat logarithmic spiral configurations cleanly onto 3D spherical point arrays to create closed-globe interlocking geometries.

---

## 🧬 PHASE 5: Automated Algorithmic Escherization
Leverage topological shape optimization loops to warp user-provided artwork into compliant tiles.
* [ ] **Target Energy Minimization Solver (`src/escherize.ts`):** Build a shape optimization loop (using a heuristic solver like Nelder-Mead) to automatically modify an incoming target silhouette path until it satisfies the interlocking boundary conditions of a chosen wallpaper or IH group.
* [ ] **Symmetry Procrustes Analysis:** Programmatically calculate geometric distance metrics between arbitrary user sketches and ideal isohedral templates to find the mathematically closest-matching symmetry group before starting deformations.
