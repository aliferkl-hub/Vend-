---
name: Post-merge setup
description: Durable requirement for task merges to install dependencies and validate the app.
---

The project must keep a non-interactive post-merge setup script configured through the `.replit` post-merge section. It should install locked dependencies and run the repository's type-check and production build.

**Why:** A task merge failed when no script path was configured, preventing automatic reconciliation from completing.

**How to apply:** Keep the script idempotent, fail-fast, and within the configured timeout; use `npm ci --ignore-scripts --no-audit --no-fund`, then the project's lint/type-check and build commands.