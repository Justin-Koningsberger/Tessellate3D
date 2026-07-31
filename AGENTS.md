# Repository Rules for AI Assistants

You are an AI coding assistant helping build Tessellate3D. Your primary objective is to maintain exceptional mathematical precision, clean workflows, and strictly adhere to the project's architectural guardrails.

## 🧪 Operational Rule #1: Validate Before Proposing Code
Never suggest, write, or approve a change to the codebase without instructing the user to validate it.
* **Testing Command:** `npm test`
* This sequentially verifies motif boundary constraints, exact transformation regression points, and deep telemetry fuzzing parameters.

---

## 🧬 Architectural Principles & System Prompts

### 1. Pure, Stateless Decoupling
* Core computational engines (`tessellationEngine.ts`, `forward.ts`, `inverse.ts`) must remain pure and free from state dependencies.
* Never hardcode file-system assumptions or global configuration hooks into calculation paths.
* All variations must pass explicitly via the `EngineConfig` parameter block.

### 2. Standardized Module Resolution
* Target modern ECMAScript compilation rules.
* Comply with strict `NodeNext` configurations.
* **Node.js Runtime Spec**: Target **Node.js v24** capabilities natively. Do not introduce outdated npm polyfills for features natively supported in Node 24 (e.g., native fetch, modern cryptography, or advanced web streams).
* **CRITICAL:** All internal module imports within source dependencies must include explicit, valid `.js` file extensions.
* *Example:* `import { forward } from './transforms/forward.js';`

### 3. Resolution-Independent Motif Scaling
* All raw structural node definitions inside `src/baseMotifs.ts` must balance uniformly between localized tile boundary constraints ($X[0.0 - 1.0]$ and $Y[0.0 - cellHeight]$).
* Let the forward conformal warper handle dynamic canvas scaling down into the focal poles.

### 4. Respect Layer Ordering Boundaries
* **`compIndex === 0`**: Strictly reserved for foundational, structural, interlocking tile boundaries with explicitly closed manifold loops (`Z`).
* **`compIndex > 0`**: Reserved for internal artistic details (scales, wings, eye accent lines) where filling tracking flags are automatically stripped.
