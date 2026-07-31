import * as fs from 'fs';
import * as path from 'path';
import { CONFIG } from './config.ts';
import { generateEscherTessellation } from './tessellationEngine.ts';

/**
 * Executes a local compilation pipeline to evaluate lattice outputs manually.
 * Consumes the central configuration object and commits generated vector data directly to disk.
 */
function runLocalPipeline(): void {
  console.log("🌀 Initializing Tessellate3D Local Validation Run...");
  console.log(`📍 Variant Mode: ${CONFIG.variantMode} | Motif Target: ${CONFIG.baseMotif}`);
  console.log(`📊 Parameters: Branches: ${CONFIG.layout.totalBranches}, Rings: ${CONFIG.layout.maxRings}`);

  try {
    // Generate the complete vector map payload by passing the configuration block down explicitly
    const outputSvg = generateEscherTessellation(CONFIG);

    // Commit the resulting SVG buffer to the root-level folder for active analysis
    const targetPath = path.join(process.cwd(), 'escher_output.svg');
    fs.writeFileSync(targetPath, outputSvg, 'utf8');

    console.log(`\n✅ Build Complete! SVG written successfully to:`);
    console.log(`👉 ${targetPath}`);
  } catch (error) {
    console.error("❌ Fatal execution failure encountered during compilation loop:", error);
    process.exit(1);
  }
}

runLocalPipeline();
