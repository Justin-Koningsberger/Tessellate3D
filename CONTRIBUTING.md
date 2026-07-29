# Contributing to Tessellate3D 🛠️

Hello everybody, whoop, whoop, whoop, whoop, whoop!

![Zoidberg Entrance](https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExNHdvem1odW1heGkwZWFsNGZ0b3hlbDN4MWt2OHo3bTFodXp0eXNhOSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/SNK21X1PBrtQs/giphy.gif)

Since this is a private project shared among a trusted group, the focus is on maintaining exceptional mathematical precision and a clean workflow. Before writing code or tweaking conformal parameters, please review these architectural guardrails.

---

## 🧪 Operational Rule #1: Validate Before Committing

To protect the forward-mapping engine from edge tearing or alignment drift, **never commit a change to the codebase without running the validation suites.**

Before staging any updates, execute the master test suite runner from the root directory:
```bash
npm test
```

This sequentially verifies motif boundary constraints, exact transformation regression points, and deep telemetry fuzzing parameters. If any assertion throws a type error or constraint fault, verify your code matrices before pushing.

---

## 🧬 Architectural Principles

### 1. Pure, Stateless Decoupling
The core computational engines (`tessellationEngine.ts`, `forward.ts`, `inverse.ts`) must remain pure and free from state dependencies. Never hardcode file-system assumptions or global configuration hooks into calculation paths. All variations must pass explicitly via the `EngineConfig` parameter block to support upcoming interactive web interfaces.

### 2. Standardized Module Resolution
Always target modern ECMAScript compilation rules. In compliance with strict `NodeNext` configurations, all internal module imports within source dependencies must include explicit, valid `.js` file extensions:
```typescript
import { forward } from './transforms/forward.js';
```

### 3. Resolution-Independent Motif Scaling
All raw structural node definitions inside `src/baseMotifs.ts` must balance uniformly between localized tile boundary constraints ($X[0.0 - 1.0]$ and $Y[0.0 - cellHeight]$). Let the forward conformal warper handle dynamic canvas scaling down into the focal poles.

### 4. Respect Layer Ordering Boundaries
* **`compIndex === 0`**: Strictly reserved for foundational, structural, interlocking tile boundaries with explicitly closed manifold loops (`Z`).
* **`compIndex > 0`**: Reserved for internal artistic details (scales, wings, eye accent lines) where filling tracking flags are automatically stripped.

---

## 🚀 Branching & Pull Requests

* Avoid committing experimental sandbox motifs or unverified math models directly to `main`.
* Use feature branches focused on isolated pipelines (e.g., `feature/bezier-nodes` or `experiment/tan-warp`).
* Open a formal Pull Request or ping the group chat so the team can review the deep convergence stress metrics together.
