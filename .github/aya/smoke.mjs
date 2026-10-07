// Smoke test for the packed tarballs. Run inside a clean project that installed
// them from the tarballs.
//
// Usage: node|bun smoke.mjs <version> [--load-only] [--expect-test-renderer]
//
//   --load-only             only load the packages
//   --expect-test-renderer  the native binding must include TestGpuixRenderer,
//                           and the test renders one frame to a PNG
import { createRequire } from "node:module";
import { readFileSync, statSync } from "node:fs";

const [version, ...flags] = process.argv.slice(2);
if (!version) throw new Error("usage: smoke.mjs <version> [flags]");
const loadOnly = flags.includes("--load-only");
const expectRenderer = flags.includes("--expect-test-renderer");
const require = createRequire(import.meta.url);

for (const name of ["native", "react", "solid"]) {
  const pkg = JSON.parse(
    readFileSync(`node_modules/@gpuix/${name}/package.json`, "utf8"),
  );
  if (pkg.version !== version) {
    throw new Error(`@gpuix/${name} is ${pkg.version}, expected ${version}`);
  }
}

// ESM entry, then the CommonJS entry.
const esm = await import("@gpuix/native");
const cjs = require("@gpuix/native");
for (const [label, binding] of [["esm", esm], ["cjs", cjs]]) {
  if (typeof binding.GpuixRenderer !== "function") {
    throw new Error(`${label}: GpuixRenderer missing from the binding`);
  }
  if (binding.hasTestGpuixRenderer() !== expectRenderer) {
    throw new Error(
      `${label}: hasTestGpuixRenderer() is ${binding.hasTestGpuixRenderer()}, expected ${expectRenderer}`,
    );
  }
}
console.log(`native binding OK (hasTestGpuixRenderer=${expectRenderer})`);

await import("@gpuix/react");
await import("@gpuix/solid");
console.log("react and solid packages OK");

if (expectRenderer && !loadOnly) {
  const { TestGpuixRenderer } = esm;
  const renderer = new TestGpuixRenderer(320, 200);
  renderer.applyBatch(
    JSON.stringify([
      ["createElement", 1, "text"],
      ["setText", 1, "Test renderer"],
      ["setRoot", 1],
    ]),
  );
  renderer.flush();
  renderer.captureScreenshot("test-renderer.png");
  if (
    renderer.getAllText()[0] !== "Test renderer" ||
    statSync("test-renderer.png").size === 0
  ) {
    throw new Error("TestGpuixRenderer did not render");
  }
  console.log("TestGpuixRenderer OK");
}
