import type { Point2D } from '@tessellate3d/core';

interface Vertex3D { x: number; y: number; z: number; }

interface Facet3D {
  normal: Vertex3D;
  v1: Vertex3D;
  v2: Vertex3D;
  v3: Vertex3D;
}

/**
 * Computes polygon signed area using the Shoelace Formula.
 * Returns positive values for Counter-Clockwise (CCW), negative for Clockwise (CW).
 */
function getPolygonWindingArea(points: Point2D[]): number {
  let area = 0;
  const count = points.length;
  for (let i = 0; i < count; i++) {
    const p1 = points[i]!;
    const p2 = points[(i + 1) % count]!;
    area += (p1.x * p2.y) - (p2.x * p1.y);
  }
  return area / 2;
}

/**
 * Standard cross-product calculation to establish true outward normal vectors.
 */
function calculateNormal(v1: Vertex3D, v2: Vertex3D, v3: Vertex3D): Vertex3D {
  const ux = v2.x - v1.x;
  const uy = v2.y - v1.y;
  const uz = v2.z - v1.z;

  const vx = v3.x - v1.x;
  const vy = v3.y - v1.y;
  const vz = v3.z - v1.z;

  const nx = uy * vz - uz * vy;
  const ny = uz * ux - ux * vz;
  const nz = ux * vy - uy * vx;

  const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
  if (length === 0) return { x: 0, y: 0, z: 1 };
  return { x: nx / length, y: ny / length, z: nz / length };
}

/**
 * Validates whether a given point sits inside a specified triangle boundary.
 */
function isPointInTriangle(p: Point2D, a: Point2D, b: Point2D, c: Point2D): boolean {
  const v0x = c.x - a.x, v0y = c.y - a.y;
  const v1x = b.x - a.x, v1y = b.y - a.y;
  const v2x = p.x - a.x, v2y = p.y - a.y;

  const dot00 = v0x * v0x + v0y * v0y;
  const dot01 = v0x * v1x + v0y * v1y;
  const dot02 = v0x * v2x + v0y * v2y;
  const dot11 = v1x * v1x + v1y * v1y;
  const dot12 = v1x * v2x + v1y * v2y;

  const invDenom = 1 / (dot00 * dot11 - dot01 * dot01);
  const u = (dot11 * dot02 - dot01 * dot12) * invDenom;
  const v = (dot00 * dot12 - dot01 * dot02) * invDenom;

  return (u >= 0) && (v >= 0) && (u + v < 1);
}

/**
 * Robust Ear-Clipping Triangulation Engine.
 * Converts complex concave/curving polygons into optimized flat index loops.
 */
function triangulateConcavePolygon(polygon: Point2D[]): [number, number, number][] {
  const indices = polygon.map((_, idx) => idx);
  const triangles: [number, number, number][] = [];

  const vertexPool = [...indices];
  let iterations = 0;
  const maxIterations = vertexPool.length * 2;

  while (vertexPool.length > 2 && iterations < maxIterations) {
    iterations++;
    let earFound = false;

    for (let i = 0; i < vertexPool.length; i++) {
      const prevIdx = vertexPool[(i - 1 + vertexPool.length) % vertexPool.length]!;
      const currIdx = vertexPool[i]!;
      const nextIdx = vertexPool[(i + 1) % vertexPool.length]!;

      const pPrev = polygon[prevIdx]!;
      const pCurr = polygon[currIdx]!;
      const pNext = polygon[nextIdx]!;

      // Verify convexity: cross-product must match CCW alignment
      const crossProduct = (pCurr.x - pPrev.x) * (pNext.y - pCurr.y) - (pCurr.y - pPrev.y) * (pNext.x - pCurr.x);
      if (crossProduct <= 0) continue;

      // Check if any remaining loose vertices sit inside this candidate triangle ear
      let hasInternalPoints = false;
      for (let j = 0; j < vertexPool.length; j++) {
        const checkIdx = vertexPool[j]!;
        if (checkIdx === prevIdx || checkIdx === currIdx || checkIdx === nextIdx) continue;

        if (isPointInTriangle(polygon[checkIdx]!, pPrev, pCurr, pNext)) {
          hasInternalPoints = true;
          break;
        }
      }

      if (!hasInternalPoints) {
        // Valid ear isolated! Snip it and log the triangle indices
        triangles.push([prevIdx, currIdx, nextIdx]);
        vertexPool.splice(i, 1);
        earFound = true;
        break;
      }
    }

    if (!earFound) {
      // Degenerate safety fallback sequence: force a fallback split if polygon is hyper-warped
      const prevIdx = vertexPool[0] ?? 0;
      const currIdx = vertexPool[1] ?? 1;
      const nextIdx = vertexPool[2] ?? 2;
      triangles.push([prevIdx, currIdx, nextIdx]);
      vertexPool.splice(1, 1);
    }
  }

  return triangles;
}

/**
 * Transforms an array of 2D coordinates into an ASCII STL mesh
 * via a rigid vertical extrusion pass with clean winding verification.
 */
export function extrude2DPathToStl(
  polygon: Point2D[],
  extrusionHeight: number = 4.0,
  meshName: string = 'tessellate3d_extrusion'
): string {
  if (polygon.length < 3) return '';

  const cleanVertices = [...polygon];
  const first = cleanVertices[0];
  const last = cleanVertices[cleanVertices.length - 1];

  if (first && last && Math.abs(first.x - last.x) < 1e-5 && Math.abs(first.y - last.y) < 1e-5) {
    cleanVertices.pop();
  }

  const count = cleanVertices.length;
  if (count < 3) return '';

  // 🏛️ FORCE UNIFORM WINDING
  const windingArea = getPolygonWindingArea(cleanVertices);
  if (windingArea < 0) {
    cleanVertices.reverse();
  }

  const facets: Facet3D[] = [];

  // Triangulate using Ear-Clipping Engine instead of a naive convex fan
  const flatTriangles = triangulateConcavePolygon(cleanVertices);

  // 1. GENERATE THE ROOF CAP (Z = extrusionHeight, facing UP)
  for (const [idx1, idx2, idx3] of flatTriangles) {
    const p1 = cleanVertices[idx1]!;
    const p2 = cleanVertices[idx2]!;
    const p3 = cleanVertices[idx3]!;
    facets.push({
      normal: { x: 0, y: 0, z: 1 },
      v1: { x: p1.x, y: p1.y, z: extrusionHeight },
      v2: { x: p2.x, y: p2.y, z: extrusionHeight },
      v3: { x: p3.x, y: p3.y, z: extrusionHeight }
    });
  }

  // 2. GENERATE THE FLOOR CAP (Z = 0, facing DOWN)
  // Inverts node order sequence to flip the surface normal vectors out of the solid block base
  for (const [idx1, idx2, idx3] of flatTriangles) {
    const p1 = cleanVertices[idx1]!;
    const p2 = cleanVertices[idx2]!;
    const p3 = cleanVertices[idx3]!;
    facets.push({
      normal: { x: 0, y: 0, z: -1 },
      v1: { x: p1.x, y: p1.y, z: 0 },
      v2: { x: p3.x, y: p3.y, z: 0 },
      v3: { x: p2.x, y: p2.y, z: 0 }
    });
  }

  // 3. GENERATE INTERLOCKING VERTICAL SIDE WALLS
  for (let i = 0; i < count; i++) {
    const p1 = cleanVertices[i]!;
    const p2 = cleanVertices[(i + 1) % count]!;

    const floorP1: Vertex3D = { x: p1.x, y: p1.y, z: 0 };
    const floorP2: Vertex3D = { x: p2.x, y: p2.y, z: 0 };
    const roofP1: Vertex3D  = { x: p1.x, y: p1.y, z: extrusionHeight };
    const roofP2: Vertex3D  = { x: p2.x, y: p2.y, z: extrusionHeight };

    const normalA = calculateNormal(floorP1, floorP2, roofP2);
    facets.push({ normal: normalA, v1: floorP1, v2: floorP2, v3: roofP2 });

    const normalB = calculateNormal(floorP1, roofP2, roofP1);
    facets.push({ normal: normalB, v1: floorP1, v2: roofP2, v3: roofP1 });
  }

  // 4. COMPILE INTO NATIVE ASCII STL FILE SPECIFICATION
  let stl = `solid ${meshName}\n`;
  for (const f of facets) {
    stl += `  facet normal ${f.normal.x.toFixed(6)} ${f.normal.y.toFixed(6)} ${f.normal.z.toFixed(6)}\n`;
    stl += `    outer loop\n`;
    stl += `      vertex ${f.v1.x.toFixed(6)} ${f.v1.y.toFixed(6)} ${f.v1.z.toFixed(6)}\n`;
    stl += `      vertex ${f.v2.x.toFixed(6)} ${f.v2.y.toFixed(6)} ${f.v2.z.toFixed(6)}\n`;
    stl += `      vertex ${f.v3.x.toFixed(6)} ${f.v3.y.toFixed(6)} ${f.v3.z.toFixed(6)}\n`;
    stl += `    endloop\n`;
    stl += `  endfacet\n`;
  }
  stl += `endsolid ${meshName}\n`;

  return stl;
}
