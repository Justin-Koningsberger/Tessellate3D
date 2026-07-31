import * as assert from 'node:assert';
import { test, describe } from 'node:test';
import { createUncompressedZip } from '../zipUtils.ts';

describe('ZipUtils Engine Tests', () => {
  test('should compile a valid binary ZIP structure from virtual file inputs', async () => {
    // Define realistic mock vector data mimicking a color layer sheet
    const mockFiles = [
      { name: 'layer1-e62b12.svg', content: '<svg>PathData1</svg>' },
      { name: 'layer2-f5c107.svg', content: '<svg>PathData2</svg>' }
    ];

    // Generate the uncompressed binary blob payload
    const zipBlob = createUncompressedZip(mockFiles);

    // Convert browser/node Blob to a readable array buffer to inspect low-level bytes
    const arrayBuffer = await zipBlob.arrayBuffer();
    const view = new DataView(arrayBuffer);
    const bytes = new Uint8Array(arrayBuffer);

    // Verify the archive is non-empty and type-correct
    assert.strictEqual(zipBlob.type, 'application/zip');
    assert.ok(arrayBuffer.byteLength > 100, 'ZIP byte structure is abnormally short.');

    // Validate PKWARE Local File Header Magic Signature (0x04034B50 -> Little Endian format)
    const localHeaderMagic = view.getUint32(0, true);
    assert.strictEqual(localHeaderMagic, 0x04034b50, 'Invalid PK0304 Local File Header magic signature.');

    // Verify method configuration is set strictly to Store/Raw Injection (Compression Method = 0)
    const compressionMethod = view.getUint16(8, true);
    assert.strictEqual(compressionMethod, 0, 'Compression method must be 0 (Stored/Uncompressed).');

    // Confirm filename data mapping strings exist intact inside the binary sequence
    const textDecoder = new TextDecoder();
    const rawStringDump = textDecoder.decode(bytes);

    assert.ok(rawStringDump.includes('layer1-e62b12.svg'), 'Filename tracking block 1 was mutated or omitted.');
    assert.ok(rawStringDump.includes('layer2-f5c107.svg'), 'Filename tracking block 2 was mutated or omitted.');
  });

  test('should generate predictable byte outputs and handle empty manifests gracefully', () => {
    // Edge case handling: verify an empty archive still constructs a valid End of Central Directory trailing record
    const emptyBlob = createUncompressedZip([]);
    assert.strictEqual(emptyBlob.size, 22, 'Empty ZIP archive must be exactly 22 bytes long (EOCD record length).');
  });
});
