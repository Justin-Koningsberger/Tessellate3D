import type { Point2D } from './tessellationEngine.ts';

/**
 * Tracks the raw, user-editable nodes for the 3 primary edges of a hexagonal tile.
 */
export interface ModularEditorState {
  v1: Point2D; // Top Apex Anchor
  v2: Point2D; // Top Right Vertex
  v3: Point2D; // Bottom Right Vertex
  v4: Point2D; // Bottom Apex Anchor
  v5: Point2D; // Bottom Left Vertex
  v6: Point2D; // Top Left Vertex

  edgeA: Point2D[]; // Sits between v1 and v2
  edgeB: Point2D[]; // Sits between v2 and v3
  edgeC: Point2D[]; // Sits between v3 and v4
}

// Global active tracking state pointers
export let liveEditorState: ModularEditorState | null = null;

export function updateLiveEditorState(newState: ModularEditorState): void {
  liveEditorState = newState;
}

/**
 * 2D Vector Rotation around an arbitrary anchor pivot point.
 */
export function rotateAroundPivot(point: Point2D, pivot: Point2D, angleDegrees: number): Point2D {
  const radians = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  const dx = point.x - pivot.x;
  const dy = point.y - pivot.y;

  return {
    x: dx * cos - dy * sin + pivot.x,
    y: dx * sin + dy * cos + pivot.y
  };
}

/**
 * Compiles custom editor states into a nested component array.
 * Component represents the perfect interlocking closed perimeter loop.
 * Pairs adjacent sides around alternating pivot vertices (v1, v3, v5).
 */
export function compileSymmetricTile(state: ModularEditorState): Point2D[][] {
  const components: Point2D[][] = [];
  const perimeterPath: Point2D[] = [];

  // ==========================================
  // PHASE 1: MASTER INPUT HANDLES & CORNERS
  // ==========================================

  // 1. Top Apex Pivot A (v1) -> Master Edge A -> Top-Right Corner (v2)
  perimeterPath.push({ x: state.v1.x, y: state.v1.y });
  for (let i = 0; i < state.edgeA.length; i++) {
    perimeterPath.push({ x: state.edgeA[i]!.x, y: state.edgeA[i]!.y });
  }

  // 2. Top-Right Corner (v2) -> Master Edge B -> Bottom-Right Pivot C (v3)
  perimeterPath.push({ x: state.v2.x, y: state.v2.y });
  for (let i = 0; i < state.edgeB.length; i++) {
    perimeterPath.push({ x: state.edgeB[i]!.x, y: state.edgeB[i]!.y });
  }

  // 3. Bottom-Right Pivot C Corner (v3)
  perimeterPath.push({ x: state.v3.x, y: state.v3.y });

  // Twin B: Rotate Edge B by -120° around pivot v3 to build the Bottom-Right edge
  const rotatedB = state.edgeB.map((p: Point2D) => rotateAroundPivot(p, state.v3, -120)).reverse();
  for (let i = 0; i < rotatedB.length; i++) {
    perimeterPath.push(rotatedB[i]!);
  }

  // 4. Bottom Apex (v4) -> Master Edge C -> Bottom-Left Pivot B (v5)
  perimeterPath.push({ x: state.v4.x, y: state.v4.y });
  for (let i = 0; i < state.edgeC.length; i++) {
    perimeterPath.push({ x: state.edgeC[i]!.x, y: state.edgeC[i]!.y });
  }

  // 5. Bottom-Left Pivot B Corner (v5)
  perimeterPath.push({ x: state.v5.x, y: state.v5.y });

  // ==========================================
  // PHASE 2: REMAINING LEFT-SIDE SYMMETRY SEALS
  // ==========================================

  // Twin C: Rotate Edge C by -120° around pivot v5 to build the Left-Vertical edge
  const rotatedC = state.edgeC.map((p: Point2D) => rotateAroundPivot(p, state.v5, -120)).reverse();
  for (let i = 0; i < rotatedC.length; i++) {
    perimeterPath.push(rotatedC[i]!);
  }
  perimeterPath.push({ x: state.v6.x, y: state.v6.y });

  // Twin A: Rotate Edge A by 120° around pivot v1 to build the Top-Left slope edge
  const rotatedA = state.edgeA.map((p: Point2D) => rotateAroundPivot(p, state.v1, 120)).reverse();
  for (let i = 0; i < rotatedA.length; i++) {
    perimeterPath.push(rotatedA[i]!);
  }

  // 6. Perfect Manifold Seam Closure Weld
  perimeterPath.push({ x: state.v1.x, y: state.v1.y });

  components.push(perimeterPath);
  return components;
}
