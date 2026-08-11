import * as fs from 'fs/promises';
import * as path from 'path';
import { extrude2DPathToStl } from './stlBuilder.ts';
import type { Point2D } from '@tessellate3d/core';

function parseSvgPathToPoints(pathData: string, scaleFactor: number = 0.2): Point2D[] {
  const tokens = pathData.match(/[MLHVCSQTAZmlhvcsvqtaz]|[-+]?[0-9]*\.?[0-9]+/g);
  if (!tokens) return [];

  const points: Point2D[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i]!;
    // Advance cleanly past any structural vector command characters
    if (/[MLHVCSQTAZmlhvcsvqtaz]/.test(token)) {
      i++;
      continue;
    }

    const x = parseFloat(token);
    const y = parseFloat(tokens[i + 1] ?? '0');
    if (!isNaN(x) && !isNaN(y)) {
      points.push({
        x: x * scaleFactor,
        y: y * scaleFactor
      });
    }
    i += 2;
  }
  return points;
}

function snapToLayerHeight(value: number, layerHeight: number = 0.2): number {
  return Math.round(value / layerHeight) * layerHeight;
}

function translateMeshZOffset(stlString: string, verticalZOffset: number): string {
  const vertexRegex = /vertex ([-+]?[0-9]*\.?[0-9]+) ([-+]?[0-9]*\.?[0-9]+) ([-+]?[0-9]*\.?[0-9]+)/g;

  return stlString.replace(vertexRegex, (_, x, y, z) => {
    const adjustedZ = parseFloat(z) + verticalZOffset;
    return `vertex ${x} ${y} ${adjustedZ.toFixed(6)}`;
  });
}

/**
 * Processes SVG's to generate multi-layer STL files.
 */
export async function executeMeshGenerationPipeline(
  rawSvgString: string,
  outputDirectory: string,
  layerIdentifier: string = 'layer_pack',
  designThickness: number = 4.0
): Promise<string[]> {
  const generatedFilePaths: string[] = [];
  let compoundStlString = '';
  let activeTileCount = 0;
  const SVG_TO_MM_SCALE = 0.20;
  // Default to 0.2 for now
  const LAYER_HEIGHT = 0.20;

  const isGlobalDetailsPass = layerIdentifier === 'global_accent_details';
  console.log(`\n🔍 Slicing vector layer: [${layerIdentifier}]`);

  const groupBlockRegex = /<g([\s\S]*?)>([\s\S]*?)<\/g>/g;
  let groupMatch;

  while ((groupMatch = groupBlockRegex.exec(rawSvgString)) !== null) {
    const groupHeaderAttrs = groupMatch[1] || '';
    const groupInnerContent = groupMatch[2] || '';

    const idMatch = /id=["']([^"']+)["']/i.exec(groupHeaderAttrs);
    const groupId = idMatch ? idMatch[1] || '' : '';

    if (isGlobalDetailsPass) {
      if (!groupId.includes('_details')) continue;

      const groupWidthMatch = /stroke-width=["']([^"']+)["']/i.exec(groupHeaderAttrs);
      const baselineGroupWidth = groupWidthMatch ? groupWidthMatch[1] || '1.5' : '1.5';

      const pathBlockRegex = /<path([\s\S]*?)\/>/g;
      let pathBlockMatch;

      while ((pathBlockMatch = pathBlockRegex.exec(groupInnerContent)) !== null) {
        const fullPathText = pathBlockMatch[1] || '';

        const dAttrMatch = /d=["']([^"']+)["']/i.exec(fullPathText);
        const pathWidthMatch = /stroke-width=["']([^"']+)["']/i.exec(fullPathText);

        const pathCommandData = dAttrMatch ? dAttrMatch[1] || '' : '';
        const finalStrokeValue = pathWidthMatch ? pathWidthMatch[1] || baselineGroupWidth : baselineGroupWidth;

        const computedStrokeWidthMm = parseFloat(finalStrokeValue) * SVG_TO_MM_SCALE;
        const rawLinePoints = parseSvgPathToPoints(pathCommandData, SVG_TO_MM_SCALE);

        const closedStrokePolygon = expandStrokeToPolygon(rawLinePoints, computedStrokeWidthMm);

        if (closedStrokePolygon.length >= 3) {
          activeTileCount++;

          const verticalZOffset = snapToLayerHeight(designThickness / 2, LAYER_HEIGHT);
          const tactileReliefHeight = 0.40;
          const detailExtrusionHeight = designThickness - verticalZOffset + tactileReliefHeight;

          const detailMeshName = `detail_ribbon_${activeTileCount}`;
          // Generate the base mesh
          const rawRibbonMesh = extrude2DPathToStl(closedStrokePolygon, detailExtrusionHeight, detailMeshName);
          // Translate the Z axis up to the target layer height
          const extrudedRibbonMesh = translateMeshZOffset(rawRibbonMesh, verticalZOffset);

          compoundStlString += extrudedRibbonMesh;
        }
      }
    } else {
      if (groupId !== layerIdentifier) continue;

      const pathRegex = /d=["']([^"']+)["']/gi;
      let pathMatch;

      while ((pathMatch = pathRegex.exec(groupInnerContent)) !== null) {
        const pathCommandData = pathMatch[1] || '';
        const tileCoordinates = parseSvgPathToPoints(pathCommandData, SVG_TO_MM_SCALE);

        if (tileCoordinates.length >= 3) {
          activeTileCount++;

          const tileMeshName = `tile_${activeTileCount}`;
          const tileStlFacets = extrude2DPathToStl(tileCoordinates, designThickness, tileMeshName);

          compoundStlString += tileStlFacets;
        }
      }
    }
  }

  if (activeTileCount > 0) {
    const fileName = isGlobalDetailsPass ? `global_accent_details.stl` : `${layerIdentifier}_solid_base.stl`;
    const targetFilePath = path.join(outputDirectory, fileName);

    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(targetFilePath, compoundStlString, 'utf-8');

    console.log(`  ✔ Compiled 3D Mesh: ${fileName} [Generated ${activeTileCount} structural parts]`);
    generatedFilePaths.push(targetFilePath);
  }

  return generatedFilePaths;
}

/**
 * Converts an open stroke path line sequence into a closed, printable ribbon polygon.
 * Offsets vertices outward perpendicularly along both sides of each segment edge.
 */
function expandStrokeToPolygon(points: Point2D[], strokeWidthMm: number): Point2D[] {
  if (points.length < 2) return [];

  const leftSide: Point2D[] = [];
  const rightSide: Point2D[] = [];
  const halfWidth = strokeWidthMm / 2;

  for (let i = 0; i < points.length; i++) {
    const current = points[i]!;
    let dx = 0;
    let dy = 0;

    if (i === 0) {
      const next = points[i + 1]!;
      dx = next.x - current.x;
      dy = next.y - current.y;
    } else if (i === points.length - 1) {
      const prev = points[i - 1]!;
      dx = current.x - prev.x;
      dy = current.y - prev.y;
    } else {
      const prev = points[i - 1]!;
      const next = points[i + 1]!;
      const d1x = current.x - prev.x;
      const d1y = current.y - prev.y;
      const d2x = next.x - current.x;
      const d2y = next.y - current.y;
      dx = (d1x + d2x) / 2;
      dy = (d1y + d2y) / 2;
    }

    const len = Math.sqrt(dx * dx + dy * dy);
    if (len === 0) continue;

    const nx = -dy / len;
    const ny = dx / len;

    leftSide.push({ x: current.x + nx * halfWidth, y: current.y + ny * halfWidth });
    rightSide.unshift({ x: current.x - nx * halfWidth, y: current.y - ny * halfWidth });
  }

  return [...leftSide, ...rightSide];
}
