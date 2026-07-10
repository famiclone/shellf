import type { PatchFormat } from "@shellf/shared";

export class PatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatchError";
  }
}

function readVarint(data: Buffer, offset: number): [number, number] {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < data.length) {
    const byte = data[pos]!;
    result |= (byte & 0x7f) << shift;
    pos++;
    if ((byte & 0x80) === 0) break;
    shift += 7;
  }
  return [result, pos];
}

function applyIpsPatch(rom: Buffer, patch: Buffer): Buffer {
  if (patch.length < 5 || patch.subarray(0, 5).toString("ascii") !== "PATCH") {
    throw new PatchError("Невірний формат IPS патчу");
  }

  let output = new Uint8Array(rom);
  let offset = 5;

  const ensureSize = (size: number) => {
    if (size <= output.length) return;
    const next = new Uint8Array(size);
    next.set(output);
    output = next;
  };

  while (offset + 5 <= patch.length) {
    const recordOffset =
      (patch[offset]! << 16) | (patch[offset + 1]! << 8) | patch[offset + 2]!;
    offset += 3;

    if (recordOffset === 0x454f46) break;

    const size = patch.readUInt16BE(offset);
    offset += 2;

    if (size > 0) {
      if (offset + size > patch.length) {
        throw new PatchError("Пошкоджений IPS патч");
      }
      ensureSize(recordOffset + size);
      output.set(patch.subarray(offset, offset + size), recordOffset);
      offset += size;
      continue;
    }

    if (offset + 3 > patch.length) {
      throw new PatchError("Пошкоджений IPS патч");
    }
    const rleSize = patch.readUInt16BE(offset);
    offset += 2;
    const value = patch[offset]!;
    offset += 1;
    ensureSize(recordOffset + rleSize);
    output.fill(value, recordOffset, recordOffset + rleSize);
  }

  return Buffer.from(output);
}

function applyBpsPatch(rom: Buffer, patch: Buffer): Buffer {
  const magic = patch.subarray(0, 4).toString("ascii");
  if (magic !== "BPS1") {
    throw new PatchError("Невірний формат BPS патчу");
  }

  let offset = 4;
  const [sourceSize, o1] = readVarint(patch, offset);
  offset = o1;
  const [, o2] = readVarint(patch, offset);
  offset = o2;
  const [, o3] = readVarint(patch, offset);
  offset = o3;

  if (rom.length !== sourceSize) {
    throw new PatchError(
      `Розмір ROM (${rom.length}) не відповідає очікуваному патчем (${sourceSize})`,
    );
  }

  const output: number[] = [];
  let sourceOffset = 0;
  let targetOffset = 0;
  const romArr = [...rom];

  while (offset < patch.length - 12) {
    const [data, nextOffset] = readVarint(patch, offset);
    offset = nextOffset;
    const command = data & 3;
    const length = (data >> 2) + 1;

    if (command === 0) {
      for (let i = 0; i < length; i++) {
        output.push(romArr[sourceOffset]!);
        sourceOffset++;
        targetOffset++;
      }
    } else if (command === 1) {
      for (let i = 0; i < length; i++) {
        output.push(patch[offset]!);
        offset++;
        targetOffset++;
      }
    } else if (command === 2) {
      const [relOffset, o4] = readVarint(patch, offset);
      offset = o4;
      const signedOffset = relOffset & 1 ? -(relOffset >> 1) : relOffset >> 1;
      sourceOffset = targetOffset + signedOffset;
      for (let i = 0; i < length; i++) {
        output.push(romArr[sourceOffset]!);
        sourceOffset++;
        targetOffset++;
      }
    } else {
      throw new PatchError("Невідома BPS команда");
    }
  }

  return Buffer.from(output);
}

export function applyPatch(rom: Buffer, patch: Buffer, format: PatchFormat): Buffer {
  try {
    if (format === "ips") {
      return applyIpsPatch(rom, patch);
    }
    if (format === "bps") {
      return applyBpsPatch(rom, patch);
    }
    throw new PatchError(`Невідомий формат патчу: ${format}`);
  } catch (err) {
    if (err instanceof PatchError) throw err;
    throw new PatchError(
      err instanceof Error ? err.message : "Помилка застосування патчу",
    );
  }
}

export function detectPatchFormat(filename: string): PatchFormat | null {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".ips")) return "ips";
  if (lower.endsWith(".bps")) return "bps";
  return null;
}
