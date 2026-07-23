# 🗺️ Master Technical Roadmap: Mathematical Escher Spiral Engine

This document outlines the architectural milestones, mathematical features, and asset pipeline expansions for the conformal spiral tiling engine.

---

## 🏁 PHASE 1: Core Precision & Linear Framework `[COMPLETE]`
* **Horizontal Affine Shear Matrix:** Implemented dynamic transformation loops inside `spiralSVGGenerator.js` to ensure seamless alignment along structural symmetry axes.
* **Binary Snap Validation:** Integrated strict `0.0` or `1.0` boundary enforcement filters in `applyWallpaperSymmetry` to eliminate rounding drift.
* **Loop Continuity Automation:** Patched motif coordinate boundaries by enforcing explicit bottom-left closure anchors (`{x: 0.0, y: cellHeight}`).
* **Centralized Automated QA:** Deployed `verifyMotif.js` unit testing suite to evaluate node integrity and verify path loops prior to stage commits.
* **Multi-Component Asset Parsing:** Added support for internal geometric details (eyes, scales) by nesting sub-paths and isolating them into an independent stroke overlay.

---

## 🎨 PHASE 2: Resolution Independence & Native Smooth Curves `[UP NEXT]`
Transition the engine from strictly linear point arrays to native smooth vector geometries.
* [ ] **Multi-Type Node Data Structure:** Upgrade the `baseMotifs.js` library to accept complex curve command flags:
  ```javascript
  { type: 'C', x1: 0.25, y1: -0.2, x2: 0.75, y2: 0.2, x: 1.0, y: 0.0 } // Cubic Bezier
  ```
* [ ] **Upstream Path Compiler Refactor:** Rewrite the SVG path generation loops to dynamically map and output `'C'` (Cubic), `'Q'` (Quadratic), and `'S'` (Shorthand) vector strings instead of joining lines with `'L'`.
* [ ] **Tangency-Preserving Affine Warp:** Adapt the forward-mapping coordinate loops to deform control point handle vectors (`x1, y1`, `x2, y2`) perfectly in sync with localized grid shears.
* [ ] **Curvature-Aware Subdivision Engine:** Upgrade `subdividePath` to dynamically inject intermediate mid-curve control points on Bezier segments experiencing heavy loxodromic stretching.

---

## 🔌 PHASE 3: Dynamic Geometry & Native Asset Ingestion
Allow artists to feed custom vector artwork straight into the engine without modifying the codebase.
* [ ] **Color-Linked Internal Detail Serialization**
      * **Why it matters:** Currently, all internal details are grouped into a single global grey overlay container. Splitting these paths by their originating tile color will allow multi-material slicers (like PrusaSlicer) to automatically map the eyes, scales, or wings to their respective physical filament layers instead of forcing a single color across the entire design.
* [ ] **Multi-Path Native Typing Integration:** Coordinate the SVG ingestion parser to output standard multi-path arrays natively recognized by the `compIndex` pipeline and `verifyMotif.js`.
* [ ] **Arbitrary SVG Ingestion Engine:** Build an XML file-stream parser to automatically extract, strip, and flatten compound transformation matrices from external `.svg` source graphics.
* [ ] **Boundary Complementarity Verification Algorithm:** Programmatically parse an imported asset's bounding path to ensure its Top profile functions as a flawless mathematical complement to its Bottom profile.
* [ ] **Automatic Bounding Box Normalization:** Calculate scale differentials to compress, stretch, and fit any external vector shape cleanly into localized grid boundaries ranging from `X[0.0 - 1.0]` and `Y[0.0 - cellHeight]`.

---

## 🧮 PHASE 4: Conformal Complex Research Implementations
Incorporate advanced mathematical tiling behaviors outlined in canonical complex mapping literature.
* [ ] **Rational Fractional Stagger Factors:** Move beyond binary `0.0/1.0` snapping thresholds to allow variable fractional offsets (e.g., a `staggerFactor: 0.5` configuration for perfect running brick-bond alignments).
* [ ] **Derived Conformal Whirlpool Spaces (Mappings $\Phi_2$ & $\Phi_3$):** Implement forward transformation equations for the paper's Mobius-variant $\frac{z-i}{z+i}$ and periodic $\tan(z)$ mappings to generate complex multi-pole spiral whirlpool geometries.
* [ ] **Stereographic Riemann Sphere Projections:** Map flat logarithmic spiral configurations cleanly onto 3D spherical point arrays to create closed-globe interlocking geometries.
