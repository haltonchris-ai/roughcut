// Applies patches/ (see patches/react-native+*.patch) after install. Skips
// quietly where patch-package isn't installed (e.g. the Vercel web build, which
// doesn't use React Native); fails loudly if it is installed and a patch breaks.
const { spawnSync } = require("child_process");

let bin;
try {
  bin = require.resolve("patch-package");
} catch {
  console.log("[postinstall] patch-package not installed here; skipping patches.");
  process.exit(0);
}

const result = spawnSync(process.execPath, [bin], { stdio: "inherit" });
process.exit(result.status === null ? 1 : result.status);
