#!/bin/bash
# Patch onstarjs2 to fix Linux GPU crash in headless/browser auth
# Chromium crashes with "Target page, context or browser has been closed"
# This adds --disable-gpu and --disable-software-rasterizer to browser args
#
# Usage: Run after npm install
#   bash scripts/patch-linux-gpu.sh

set -e
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DIST_FILE="$SCRIPT_DIR/../node_modules/onstarjs2/dist/index.mjs"

if [ ! -f "$DIST_FILE" ]; then
  echo "❌ onstarjs2 dist not found at $DIST_FILE"
  echo "   Run npm install first."
  exit 1
fi

if grep -q '"--disable-gpu"' "$DIST_FILE"; then
  echo "✅ Patch already applied (--disable-gpu found)"
  exit 0
fi

# Add --disable-gpu and --disable-software-rasterizer after --use-gl=swiftshader
sed -i 's/browserArgs.push("--use-gl=swiftshader");/browserArgs.push("--use-gl=swiftshader");\n                browserArgs.push("--disable-gpu");\n                browserArgs.push("--disable-software-rasterizer");/' "$DIST_FILE"

# Verify
if grep -q '"--disable-gpu"' "$DIST_FILE"; then
  echo "✅ Patch applied successfully: added --disable-gpu and --disable-software-rasterizer"
else
  echo "❌ Patch failed — sed didn't match. Manual patch needed."
  exit 1
fi
