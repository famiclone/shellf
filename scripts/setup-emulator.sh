#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="${EMULATOR_DEST:-$ROOT/apps/frontend/public/emulator}"
DATA_DIR="$DEST/data"
CORES_DIR="$DATA_DIR/cores"
CDN="https://cdn.emulatorjs.org/stable/data"

mkdir -p "$DATA_DIR" "$CORES_DIR"

if [ ! -f "$DATA_DIR/loader.js" ] || [ ! -f "$DATA_DIR/emulator.min.js" ]; then
  echo "Downloading EmulatorJS source..."
  TMP=$(mktemp -d)
  trap 'rm -rf "$TMP"' EXIT

  git clone --depth 1 --branch v4.2.3 https://github.com/EmulatorJS/EmulatorJS.git "$TMP/emulatorjs"
  cp -r "$TMP/emulatorjs/data/"* "$DATA_DIR/"

  echo "Downloading minified bundle..."
  curl -fsSL -o "$TMP/emulator.min.zip" "$CDN/emulator.min.zip"
  unzip -o "$TMP/emulator.min.zip" -d "$DATA_DIR"
fi

# Cores used by Shellf platforms (nes/famicom, snes, gb/gbc, gba, megadrive)
CORES=(
  "fceumm-legacy-wasm.data"
  "fceumm-wasm.data"
  "snes9x-legacy-wasm.data"
  "snes9x-wasm.data"
  "gambatte-legacy-wasm.data"
  "gambatte-wasm.data"
  "mgba-legacy-wasm.data"
  "mgba-wasm.data"
  "genesis_plus_gx-legacy-wasm.data"
  "genesis_plus_gx-wasm.data"
)

echo "Downloading emulator cores..."
for core in "${CORES[@]}"; do
  if [ -f "$CORES_DIR/$core" ]; then
    continue
  fi
  echo "  $core"
  curl -fsSL -o "$CORES_DIR/$core" "$CDN/cores/$core" || echo "    (skipped — not on CDN)"
done

echo "EmulatorJS ready at $DEST"
