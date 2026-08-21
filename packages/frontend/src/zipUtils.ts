// TODO: move ziputils to /utils and update all imports
/**
 * High-performance, zero-dependency client-side ZIP archiver.
 * To keep the core package 100% dependency-free as long as possible, this computes PKWARE ZIP
 * formatting structures using uncompressed raw data byte injection (Store Mode, Method 0).
 */

interface ZipFileItem {
  name: string;
  content: string | Uint8Array;
}

// Pre-computed CRC32 cyclic redundancy check lookup table.
const CRC_TABLE = new Int32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let j = 0; j < 8; j++) {
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  }
  CRC_TABLE[i] = c;
}

/**
 * Executes a bitwise CRC32 calculation over a text string or raw binary byte array block.
 */
function calculateCRC32(content: string | Uint8Array): number {
  const bytes = typeof content === 'string' ? new TextEncoder().encode(content) : content;
  let crc = 0 ^ (-1);
  for (let i = 0; i < bytes.length; i++) {
    // Asserting array indexes are safe under strictNullChecks via non-null assertion
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ bytes[i]!) & 0xFF]!;
  }
  return (crc ^ (-1)) >>> 0;
}

/**
 * Compiles an array of virtual text files into an uncompressed binary ZIP Blob.
 * Maps sequential local file blocks, a central directory tracker, and an EOCD tail record.
 */
export function createUncompressedZip(files: ZipFileItem[]): Blob {
  // Explicitly type chunks array as BlobPart[] to bypass SharedArrayBuffer casting errors
  const chunks: BlobPart[] = [];
  const directoryEntries: { name: string; size: number; offset: number; crc: number }[] = [];
  let currentOffset = 0;
  const encoder = new TextEncoder();

  // 1. SERIALIZE LOCAL FILE HEADER BLOCKS (PK0304)
  for (const file of files) {
    // Forward raw binary bytes directly; encode only text strings
    const fileBytes = typeof file.content === 'string' ? encoder.encode(file.content) : file.content;

    const nameBytes = encoder.encode(file.name);
    const crc = calculateCRC32(file.content);
    const size = fileBytes.length;

    // Cache structural parameters to build the Central Directory later
    directoryEntries.push({ name: file.name, size, offset: currentOffset, crc });

    const localHeader = new ArrayBuffer(30 + nameBytes.length);
    const view = new DataView(localHeader);

    view.setUint32(0, 0x04034b50, true);  // PK0304 Signature (Local File Header)
    view.setUint16(4, 10, true);          // Minimum extraction specification version (1.0)
    view.setUint16(6, 0, true);           // Bit flags (No compression tuning / encryption)
    view.setUint16(8, 0, true);           // Compression format method (0 = Stored / Raw Bytes)
    view.setUint16(10, 0x5400, true);     // Hardcoded MS-DOS system time window stub
    view.setUint16(12, 0x4800, true);     // Hardcoded MS-DOS system date window stub
    view.setUint32(14, crc, true);        // Computed data CRC-32 checksum integer
    view.setUint32(18, size, true);       // Payload length (Compressed)
    view.setUint32(22, size, true);       // Payload length (Uncompressed)
    view.setUint16(26, nameBytes.length, true); // Byte size allocation for string filename
    view.setUint16(28, 0, true);          // Offset length allocation for extra attribute fields

    const headerBytes = new Uint8Array(localHeader);
    headerBytes.set(nameBytes, 30);

    chunks.push(headerBytes);
    chunks.push(new Uint8Array(fileBytes));

    // Increment global tracking pointer position across the accumulating binary stream
    currentOffset += headerBytes.length + fileBytes.length;
  }

  // 2. CONSTRUCT CENTRAL DIRECTORY RECORD TABLE (PK0102)
  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  for (const entry of directoryEntries) {
    const nameBytes = encoder.encode(entry.name);
    const dirHeader = new ArrayBuffer(46 + nameBytes.length);
    const view = new DataView(dirHeader);

    view.setUint32(0, 0x02014b50, true);  // PK0102 Signature (Central Directory Header)
    view.setUint16(4, 20, true);          // Specification version used to compile
    view.setUint16(6, 10, true);          // Specification version minimum requirement
    view.setUint16(8, 0, true);           // Bit flags tracking array
    view.setUint16(10, 0, true);          // Compression method flag (0)
    view.setUint16(12, 0x5400, true);     // File time signature tracker
    view.setUint16(14, 0x4800, true);     // File date signature tracker
    view.setUint32(16, entry.crc, true);  // Mirror structural CRC-32 validation block
    view.setUint32(20, entry.size, true); // Data boundary check (Compressed size)
    view.setUint32(24, entry.size, true); // Data boundary check (Uncompressed size)
    view.setUint16(28, nameBytes.length, true); // Filename string length tracker
    view.setUint16(30, 0, true);          // Extra field allocation length
    view.setUint16(32, 0, true);          // File structural comment array tracking length
    view.setUint16(34, 0, true);          // Target partition disk registry locator splits
    view.setUint16(36, 0, true);          // Core execution internal file permissions flags
    view.setUint32(38, 0, true);          // Operating system external file system permission matrix
    view.setUint32(42, entry.offset, true); // Relative memory layout offset pointer to local file header

    const dirHeaderBytes = new Uint8Array(dirHeader);
    dirHeaderBytes.set(nameBytes, 46);

    chunks.push(dirHeaderBytes);
    centralDirSize += dirHeaderBytes.length;
    currentOffset += dirHeaderBytes.length;
  }

  // 3. SECURE END OF CENTRAL DIRECTORY BLOCK FOOTER (PK0506)
  const eocd = new ArrayBuffer(22);
  const viewEOCD = new DataView(eocd);

  viewEOCD.setUint32(0, 0x06054b50, true);   // PK0506 Signature (End of Central Directory)
  viewEOCD.setUint16(4, 0, true);            // Current target volume slice registry indicator
  viewEOCD.setUint16(6, 0, true);            // Location pointer of directory table volume mapping
  viewEOCD.setUint16(8, files.length, true); // Cumulative files count verified inside current track segment
  viewEOCD.setUint16(10, files.length, true);// Comprehensive total system file volume count registration
  viewEOCD.setUint32(12, centralDirSize, true); // Aggregate memory byte length size of central directory entries
  viewEOCD.setUint32(16, centralDirStartOffset, true); // Initial base offset positioning value of central directory
  viewEOCD.setUint16(20, 0, true);           // String field tracker block extension text size

  chunks.push(new Uint8Array(eocd));

  // Package unified segments directly into a browser application archive download container
  return new Blob(chunks, { type: 'application/zip' });
}
