import type { Point2D } from './tessellationEngine.ts';

export interface BaseEditorState {
  v1: Point2D; // Base origin node anchor common across shapes
  v4: Point2D; // Base height node anchor common across shapes
}

export interface HexagonalEditorState extends BaseEditorState {
  latticeType: 'hexagonal';
  v2: Point2D;
  v3: Point2D;
  v5: Point2D;
  v6: Point2D;
  edgeA: Point2D[];
  edgeB: Point2D[];
  edgeC: Point2D[];
}

export interface SquareEditorState extends BaseEditorState {
  latticeType: 'square';
  edgeTop: Point2D[];
  edgeLeft: Point2D[];
}

export interface TriangularEditorState extends BaseEditorState {
  latticeType: 'triangular';
  v2: Point2D; // Right corner node
  edgeSpine: Point2D[];
  edgeInterlock: Point2D[];
}

/**
 * Universal Discriminated Union representing the state contract.
 * Checking state.latticeType automatically unpacks the exact required properties.
 */
export type ModularEditorState = HexagonalEditorState | SquareEditorState | TriangularEditorState;

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
 * Specialized compiler pass producing a closed interlocking loop for Hexagonal tiles.
 */
function compileHexagonalTile(state: HexagonalEditorState): Point2D[] {
  const path: Point2D[] = [];

  path.push({ x: state.v1.x, y: state.v1.y });
  state.edgeA.forEach(p => path.push({ x: p.x, y: p.y }));
  path.push({ x: state.v2.x, y: state.v2.y });
  state.edgeB.forEach(p => path.push({ x: p.x, y: p.y }));

  path.push({ x: state.v3.x, y: state.v3.y });
  state.edgeB.map(p => rotateAroundPivot(p, state.v3, -120)).reverse().forEach(p => path.push(p));

  path.push({ x: state.v4.x, y: state.v4.y });
  state.edgeC.forEach(p => path.push({ x: p.x, y: p.y }));
  path.push({ x: state.v5.x, y: state.v5.y });

  state.edgeC.map(p => rotateAroundPivot(p, state.v5, -120)).reverse().forEach(p => path.push(p));
  path.push({ x: state.v6.x, y: state.v6.y });

  state.edgeA.map(p => rotateAroundPivot(p, state.v1, 120)).reverse().forEach(p => path.push(p));
  path.push({ x: state.v1.x, y: state.v1.y });
  return path;
}

/**
 * Specialized compiler pass producing a closed interlocking loop for Triangular tiles.
 */
function compileTriangularTile(state: TriangularEditorState): Point2D[] {
  const path: Point2D[] = [];
  const cellHeight = state.v4.y;
  const triWidth = (Math.sqrt(3) / 2) * cellHeight;

  path.push({ x: state.v1.x, y: state.v1.y });
  state.edgeInterlock.forEach(p => path.push({ x: p.x, y: p.y }));
  path.push({ x: triWidth, y: cellHeight * 0.5 });

  state.edgeInterlock.forEach(pt => path.push({ x: triWidth - pt.x, y: pt.y + (cellHeight * 0.5) }));
  path.push({ x: state.v4.x, y: state.v4.y });

  for (let i = state.edgeSpine.length - 1; i >= 0; i--) {
    path.push({ x: -state.edgeSpine[i]!.x, y: state.edgeSpine[i]!.y + (cellHeight * 0.5) });
  }
  path.push({ x: 0.0, y: cellHeight * 0.5 });
  for (let i = state.edgeSpine.length - 1; i >= 0; i--) {
    path.push({ x: state.edgeSpine[i]!.x, y: state.edgeSpine[i]!.y });
  }
  path.push({ x: state.v1.x, y: state.v1.y });
  return path;
}

/**
 * Specialized compiler pass producing a closed interlocking loop for Square tiles.
 */
function compileSquareTile(state: SquareEditorState): Point2D[] {
  const path: Point2D[] = [];
  const cellHeight = state.v4.y;

  path.push({ x: state.v1.x, y: state.v1.y });
  state.edgeTop.forEach(p => path.push({ x: p.x, y: p.y }));
  path.push({ x: cellHeight, y: 0.0 });

  state.edgeLeft.forEach(p => path.push({ x: p.x + cellHeight, y: p.y }));
  path.push({ x: cellHeight, y: cellHeight });

  for (let i = state.edgeTop.length - 1; i >= 0; i--) {
    path.push({ x: state.edgeTop[i]!.x, y: state.edgeTop[i]!.y + cellHeight });
  }
  path.push({ x: 0.0, y: cellHeight });
  for (let i = state.edgeLeft.length - 1; i >= 0; i--) {
    path.push({ x: state.edgeLeft[i]!.x, y: state.edgeLeft[i]!.y });
  }
  path.push({ x: state.v1.x, y: state.v1.y });
  return path;
}

/**
 * Polymorphic router compiling custom editor states into a nested component path loop matrix.
 * Leveraging the Discriminated Union allows TypeScript to narrow types inside the branches perfectly.
 */
export function compileSymmetricTile(state: ModularEditorState): Point2D[][] {
  switch (state.latticeType) {
    case 'triangular':
      return [compileTriangularTile(state)];
    case 'square':
      return [compileSquareTile(state)];
    case 'hexagonal':
    default:
      return [compileHexagonalTile(state)];
  }
}
