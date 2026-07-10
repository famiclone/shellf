import { createHash } from "node:crypto";

function crc32(buffer: Buffer): string {
  let crc = 0xffffffff;
  const table = getCrc32Table();
  for (let i = 0; i < buffer.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buffer[i]!) & 0xff]!;
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).toUpperCase().padStart(8, "0");
}

let crc32Table: Uint32Array | null = null;

function getCrc32Table() {
  if (crc32Table) return crc32Table;
  crc32Table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc32Table[i] = c;
  }
  return crc32Table;
}

export interface RomHashes {
  crc32: string;
  md5: string;
  sha1: string;
  size: number;
}

export function computeRomHashes(buffer: Buffer): RomHashes {
  return {
    crc32: crc32(buffer),
    md5: createHash("md5").update(buffer).digest("hex").toUpperCase(),
    sha1: createHash("sha1").update(buffer).digest("hex").toUpperCase(),
    size: buffer.length,
  };
}
