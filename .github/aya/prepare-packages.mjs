// Prepares the workspace packages for `npm pack` in the aya release workflow.
//
// Usage: node .github/aya/prepare-packages.mjs <version>
//
// Run it after `napi create-npm-dirs` and `napi artifacts`. It
//   - drops platform package directories that have no .node file (a target
//     that this run did not build),
//   - sets one version on @gpuix/native, its platform packages, @gpuix/react
//     and @gpuix/solid,
//   - lists the platform packages as exact-version optionalDependencies of
//     @gpuix/native, and
//   - replaces `workspace:` ranges on @gpuix/* packages with the exact version.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const version = process.argv[2];
if (!version || !/^\d+\.\d+\.\d+-aya\.\d+$/.test(version)) {
  console.error(`usage: prepare-packages.mjs <x.y.z-aya.N>, got "${version}"`);
  process.exit(1);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const writeJson = (file, value) =>
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

const nativeDir = path.join(root, "packages/native");
const nativeFile = path.join(nativeDir, "package.json");
const native = readJson(nativeFile);
const base = native.version;

if (!version.startsWith(`${base}-aya.`)) {
  console.error(`version ${version} does not extend the upstream version ${base}`);
  process.exit(1);
}

// Platform packages.
const npmDir = path.join(nativeDir, "npm");
const platforms = [];
for (const entry of fs.readdirSync(npmDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const dir = path.join(npmDir, entry.name);
  const file = path.join(dir, "package.json");
  if (!fs.existsSync(file)) continue;
  const hasBinary = fs.readdirSync(dir).some((name) => name.endsWith(".node"));
  if (!hasBinary) {
    console.log(`skip ${entry.name}: no .node file in this run`);
    fs.rmSync(dir, { recursive: true, force: true });
    continue;
  }
  const pkg = readJson(file);
  pkg.version = version;
  writeJson(file, pkg);
  platforms.push(pkg.name);
}
if (platforms.length === 0) {
  console.error("no platform package has a .node file; run `napi artifacts` first");
  process.exit(1);
}

native.version = version;
native.optionalDependencies = Object.fromEntries(
  platforms.sort().map((name) => [name, version]),
);
writeJson(nativeFile, native);

// Adapters.
for (const name of ["react", "solid"]) {
  const file = path.join(root, "packages", name, "package.json");
  const pkg = readJson(file);
  if (pkg.version !== base) {
    console.error(`@gpuix/${name} is ${pkg.version}, expected ${base}`);
    process.exit(1);
  }
  pkg.version = version;
  for (const field of ["dependencies", "peerDependencies", "optionalDependencies"]) {
    for (const [dep, range] of Object.entries(pkg[field] ?? {})) {
      if (!String(range).startsWith("workspace:")) continue;
      if (!dep.startsWith("@gpuix/")) {
        console.error(`${pkg.name} has a workspace range on ${dep}`);
        process.exit(1);
      }
      pkg[field][dep] = version;
    }
  }
  writeJson(file, pkg);
}

console.log(`prepared ${version}: native + ${platforms.join(", ")} + react + solid`);
