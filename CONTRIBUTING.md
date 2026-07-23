# Contributing to Tessellate3D 🛠️
Hello everybody, whoop, whoop, whoop, whoop, whoop!

Since this is a private project shared among a trusted group, we want to maintain high math precision and a clean workflow. Before writing code or tweaking mathematical parameters, please review these baseline guardrails.

## 🧪 Operational Rule #1: Validate Before Committing
To protect the forward-mapping boundary engine from edge tearing or alignment drift, **never commit a change to `baseMotifs.js` without running the validator.**

Before staging your changes, run:
```bash
node tests/verifyMotif.js
```
The script performs strict closure verification target algorithms ($10^{-6}$ error limits) on the outer container loop. If it throws a closure error, check your coordinates.

## 🧬 Architectural Principles

1. **Keep the Math Independent of Resolution:** All coordinates in `baseMotifs.js` should scale between localized boundaries ($X[0.0 - 1.0]$ and $Y[0.0 - cellHeight]$). Let the forward conformal warper handle the scale.
2. **Respect `compIndex` Boundaries:**
   * `compIndex === 0` must strictly be reserved for structural, interlocking tile boundaries with closed loops (`Z`).
   * `compIndex > 0` must strictly be open paths used for artistic details (scales, wings, eyes) where fill rules are automatically stripped.

## 🚀 Branching & Pull Requests
* Avoid committing experimental sandbox motifs directly to `main`.
* Use feature branches (e.g., `feature/bezier-nodes` or `experiment/tan-warp`).
* Open a quick Pull Request or ping the group chat so we can evaluate the test sweeps inside `tests/stressTest.js` together.
