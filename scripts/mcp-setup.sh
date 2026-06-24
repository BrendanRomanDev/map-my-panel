#!/usr/bin/env bash
# Builds a node-ABI copy of better-sqlite3 for the MCP server, so the MCP (system
# Node) and the desktop app (Electron) can each load their correct binary without
# a rebuild dance. Run this once, and again whenever your Node version changes.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Rebuilding better-sqlite3 for system Node…"
npm rebuild better-sqlite3 >/dev/null

mkdir -p mcp/native
cp node_modules/better-sqlite3/build/Release/better_sqlite3.node mcp/native/better_sqlite3-node.node
echo "→ Saved node-ABI binary to mcp/native/better_sqlite3-node.node"

echo "→ Restoring Electron-ABI binary for the desktop app…"
npm run postinstall >/dev/null

echo "✓ MCP setup complete. The MCP and the app can now both run."
