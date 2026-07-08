import { inflateRawSync } from "node:zlib";

// A minimal ZIP central-directory reader for the container-based extractors
// (pptx/odt/odp/epub). Deliberately dependency-free: the extraction deps are
// this package's heaviest, and the OOXML/ODF/EPUB extractors only need "list
// entries, inflate one" — ~100 lines against node:zlib, not a new library.
//
// Scope matches the read tool's constraints: files arrive whole in memory
// (the 10 MB stat guard bites first), so no streaming; ZIP64 is out of scope
// (a >4 GB member can't occur under that cap); encrypted members are refused
// honestly.

const EOCD_SIGNATURE = 0x06054b50; // end of central directory
const CENTRAL_SIGNATURE = 0x02014b50; // central directory file header
const LOCAL_SIGNATURE = 0x04034b50; // local file header
// EOCD is 22 bytes + up to 65535 bytes of trailing comment.
const EOCD_SCAN_LIMIT = 22 + 0xffff;

const METHOD_STORED = 0;
const METHOD_DEFLATE = 8;

interface ZipEntryRecord {
  readonly localHeaderOffset: number;
  readonly compressedSize: number;
  readonly method: number;
  readonly encrypted: boolean;
}

/**
 * A parsed ZIP archive: entry names in central-directory order, plus lazy
 * per-entry decompression. Produced by {@link openZip}.
 */
export interface ZipArchive {
  /** Entry names (directory entries excluded), in central-directory order. */
  readonly names: readonly string[];
  /** Whether the archive contains the named entry. */
  has(name: string): boolean;
  /**
   * Decompress one entry. Returns `null` for a name the archive doesn't
   * carry; throws for entries this reader can't decode (encryption, an
   * unsupported compression method, a corrupt local header) with a message
   * naming the problem.
   */
  read(name: string): Buffer;
}

function findEndOfCentralDirectory(buffer: Buffer): number {
  const stop = Math.max(0, buffer.length - EOCD_SCAN_LIMIT);
  // The EOCD signature sits before a variable-length comment, so scan back
  // from the tail. A four-byte signature can also occur inside the comment
  // bytes, so a hit only counts when its comment-length field makes the
  // record span exactly to EOF.
  for (let at = buffer.length - 22; at >= stop; at--) {
    if (buffer.readUInt32LE(at) !== EOCD_SIGNATURE) continue;
    const commentLength = buffer.readUInt16LE(at + 20);
    if (at + 22 + commentLength === buffer.length) return at;
  }
  throw new Error("not a readable zip archive (no end-of-central-directory record)");
}

/**
 * Parse a ZIP archive from a whole-file buffer. Throws when the buffer is
 * not a readable archive; entry decompression is lazy (see
 * {@link ZipArchive.read}).
 */
export function openZip(buffer: Buffer): ZipArchive {
  if (buffer.length < 22) {
    throw new Error("not a readable zip archive (too small)");
  }
  const eocd = findEndOfCentralDirectory(buffer);
  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);

  const entries = new Map<string, ZipEntryRecord>();
  const names: string[] = [];
  let at = centralOffset;
  for (let i = 0; i < entryCount; i++) {
    if (at + 46 > buffer.length || buffer.readUInt32LE(at) !== CENTRAL_SIGNATURE) {
      throw new Error("not a readable zip archive (corrupt central directory)");
    }
    const flags = buffer.readUInt16LE(at + 8);
    const method = buffer.readUInt16LE(at + 10);
    const compressedSize = buffer.readUInt32LE(at + 20);
    const nameLength = buffer.readUInt16LE(at + 28);
    const extraLength = buffer.readUInt16LE(at + 30);
    const commentLength = buffer.readUInt16LE(at + 32);
    const localHeaderOffset = buffer.readUInt32LE(at + 42);
    const name = buffer.subarray(at + 46, at + 46 + nameLength).toString("utf8");
    if (!name.endsWith("/")) {
      // A central directory can list one path twice (appended archives);
      // last record wins, and `names` never carries duplicates — a
      // duplicated slide/section entry must not inflate document counts.
      if (!entries.has(name)) names.push(name);
      entries.set(name, {
        localHeaderOffset,
        compressedSize,
        method,
        encrypted: (flags & 0x1) !== 0,
      });
    }
    at += 46 + nameLength + extraLength + commentLength;
  }

  return {
    names,
    has: (name) => entries.has(name),
    read(name) {
      const entry = entries.get(name);
      if (entry === undefined) {
        throw new Error(`zip archive has no entry named ${name}`);
      }
      if (entry.encrypted) {
        throw new Error(`zip entry ${name} is encrypted (password-protected archives are not supported)`);
      }
      const local = entry.localHeaderOffset;
      if (local + 30 > buffer.length || buffer.readUInt32LE(local) !== LOCAL_SIGNATURE) {
        throw new Error(`zip entry ${name} has a corrupt local header`);
      }
      // Local-header name/extra lengths can differ from the central copy
      // (extra fields especially), so the data offset must come from here.
      const nameLength = buffer.readUInt16LE(local + 26);
      const extraLength = buffer.readUInt16LE(local + 28);
      const dataStart = local + 30 + nameLength + extraLength;
      const dataEnd = dataStart + entry.compressedSize;
      if (dataEnd > buffer.length) {
        throw new Error(`zip entry ${name} is truncated`);
      }
      const data = buffer.subarray(dataStart, dataEnd);
      switch (entry.method) {
        case METHOD_STORED:
          return Buffer.from(data);
        case METHOD_DEFLATE:
          return inflateRawSync(data);
        default:
          throw new Error(
            `zip entry ${name} uses unsupported compression method ${entry.method}`,
          );
      }
    },
  };
}
