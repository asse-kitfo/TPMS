---
name: Artifact auto-workflow CWD quirk
description: Replit auto-configured artifact workflows run from INSIDE the artifact's directory, not the workspace root.
---

## Rule

Auto-configured artifact workflows (e.g. `artifacts/trading-psychology: web`) run their shell command from **inside** the artifact's own directory, not from `/home/runner/workspace`.

**Why:** Replit's artifact system sets the CWD to the artifact's directory before running the command. This means commands like `cd artifacts/trading-psychology` fail with "No such file or directory" because the shell is already inside that directory.

**How to apply:**
- These workflows are locked — cannot be overridden via `configureWorkflow` (error: "managed by an artifact")
- To fix a broken locked-command like `cd artifacts/trading-psychology && PORT=X npx vite --config vite.config.ts`, create a real nested directory `artifacts/[app]/artifacts/[app]/` with a `vite.config.ts` that uses absolute paths (`/home/runner/workspace/artifacts/[app]`) for `root`, aliases, and `build.outDir`.
- The nested config causes the `cd` to succeed, then Vite is pointed back at the real source with `fs.strict: false`.
- Do NOT use symlinks — they create circular resolution loops.
