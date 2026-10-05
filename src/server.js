/**
 * Hostinger entry shim.
 *
 * Hostinger reads `main` from backend/package.json ("src/server.js") but
 * resolves that path from the repository root, where it does not exist.
 * This file exists at <repo>/src/server.js so that entry point resolves;
 * the real Express app lives in backend/src/server.js.
 *
 * Uses dynamic import on purpose: it runs correctly whether Node treats this
 * file as CommonJS (no root package.json) or ESM.
 */
import('../backend/src/server.js').catch((err) => {
  console.error('[hostinger] failed to start backend:', err);
  process.exit(1);
});
