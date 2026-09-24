#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

# Keep post-merge setup deterministic and non-interactive.
npm ci --ignore-scripts --no-audit --no-fund
npm run lint
npm run build