// Narrows `napi.targets` in packages/native/package.json to the targets this
// run built, so `napi create-npm-dirs` and `napi artifacts` do not expect a
// binary that was never built (for example macOS when it is switched off).
//
// Usage: MATRIX='<json>' node narrow-targets.mjs   (run in packages/native)
//
// MATRIX is the build matrix from the plan job: {"include":[{"target":...}]}.
// It fails when a built target is not listed in `napi.targets`.
import fs from "node:fs";

const built = JSON.parse(process.env.MATRIX ?? "").include.map((entry) => entry.target);
if (built.length === 0) throw new Error("the matrix has no targets");

const file = "package.json";
const pkg = JSON.parse(fs.readFileSync(file, "utf8"));
const configured = pkg.napi?.targets ?? [];
const missing = built.filter((target) => !configured.includes(target));
if (missing.length > 0) {
  throw new Error(`built targets missing from napi.targets: ${missing.join(", ")}`);
}

pkg.napi.targets = configured.filter((target) => built.includes(target));
fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + "\n");
console.log(`napi.targets: ${pkg.napi.targets.join(", ")}`);
