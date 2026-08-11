import Fastify from 'fastify';
import cors from '@fastify/cors';
import { executeMeshGenerationPipeline } from './index.ts';
import * as fs from 'fs/promises';
import * as path from 'path';
import { tmpdir } from 'os';

let sslConfig: { key: Buffer; cert: Buffer } | undefined = undefined;
try {
  // Resolve paths relative to the package root
  const packageRoot = path.join(import.meta.dirname, '..');
  const sslKeyBuffer = await fs.readFile(path.join(packageRoot, 'certs/key.pem'));
  const sslCertBuffer = await fs.readFile(path.join(packageRoot, 'certs/cert.pem'));
   sslConfig = { key: sslKeyBuffer, cert: sslCertBuffer };
} catch {
  console.warn('⚠️ Local SSL certificates missing. Falling back to raw HTTP channel mode.');
}

const fastify = Fastify({
  logger: true,
  bodyLimit: 50 * 1024 * 1024,
  ...(sslConfig ? { https: sslConfig } : {})
});

await fastify.register(cors, {
  origin: true,
  methods: ['POST', 'GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
});

interface SlicerPayloadBody {
  svgString: string;
  designThickness?: number;
}

/**
 * Slicing Endpoint
 */
fastify.post('/api/v1/slice', async (request, reply) => {
  const { svgString, designThickness } = request.body as SlicerPayloadBody;

  if (!svgString) {
    return reply.status(400).send({ status: 'error', message: 'Missing required field: [svgString]' });
  }

  const sessionToken = `tessellate3d_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const temporaryWorkDirectory = path.join(tmpdir(), sessionToken);
  const thickness = designThickness ?? 4.0;

  try {
    const colorGroupRegex = /<g id=["'](color_[0-9]+_[0-9a-fA-F]+)["']/g;
    const uniqueLayers = new Set<string>();
    let match;

    while ((match = colorGroupRegex.exec(svgString)) !== null) {
      const fullGroupId = match[1];
      if (fullGroupId && !fullGroupId.includes('_details')) {
        uniqueLayers.add(fullGroupId);
      }
    }

    if (uniqueLayers.size === 0) {
      return reply.status(422).send({ status: 'error', message: 'No valid color layers found.' });
    }

    const compiledFilesList: string[] = [];

    for (const layerId of uniqueLayers) {
      const paths = await executeMeshGenerationPipeline(svgString, temporaryWorkDirectory, layerId, thickness);
      compiledFilesList.push(...paths);
    }

    const detailPaths = await executeMeshGenerationPipeline(svgString, temporaryWorkDirectory, 'global_accent_details', thickness);
    compiledFilesList.push(...detailPaths);

    const payloadManifest = [];
    for (const fileLocation of compiledFilesList) {
      const fileDataBuffer = await fs.readFile(fileLocation);
      payloadManifest.push({
        filename: path.basename(fileLocation),
        content: fileDataBuffer.toString('base64')
      });
    }

    await fs.rm(temporaryWorkDirectory, { recursive: true, force: true });

    return reply.status(200).send({
      status: 'success',
      meta: { totalLayersGenerated: compiledFilesList.length },
      files: payloadManifest
    });

  } catch (error) {
    try { await fs.rm(temporaryWorkDirectory, { recursive: true, force: true }); } catch {}
    const errMessage = error instanceof Error ? error.message : String(error);
    fastify.log.error(`Pipeline runtime collapse: ${errMessage}`);
    return reply.status(500).send({ status: 'error', message: errMessage });
  }
});

// Status endpoint
fastify.get('/health', async () => {
  return { status: 'healthy', timestamp: new Date().toISOString() };
});

const bootstrapServerInstance = async () => {
  try {
    // Await core application initialization readiness check routines
    await fastify.ready();
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    const activeSchema = sslConfig ? 'https' : 'http';
    console.log(`🚀 Slicer Service Container Engine Online: Listening over [${activeSchema}://0.0.0.0:3000]`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

bootstrapServerInstance();
