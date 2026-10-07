// Writes the package.json of the smoke-test project into the current directory.
//
// Usage: node write-smoke-package.mjs <version>
//
// The directory must already hold the packed tarballs. @gpuix/native lists its
// platform packages as exact-version optional dependencies, so each platform
// tarball is mapped with `overrides`. That keeps the install off the registry
// for @gpuix/* and lets npm skip the platform packages for other systems.
import fs from "node:fs";

const version = process.argv[2];
if (!version) {
  console.error("usage: write-smoke-package.mjs <version>");
  process.exit(1);
}

const tarball = (name) => {
  const file = `${name.replace(/^@/, "").replace("/", "-")}-${version}.tgz`;
  if (!fs.existsSync(file)) throw new Error(`missing tarball ${file}`);
  return `file:./${file}`;
};

// Every platform tarball in the directory: gpuix-native-<platform>-<version>.tgz
const suffix = `-${version}.tgz`;
const overrides = {};
for (const file of fs.readdirSync(".")) {
  if (!file.startsWith("gpuix-native-") || !file.endsWith(suffix)) continue;
  const platform = file.slice("gpuix-native-".length, file.length - suffix.length);
  if (!platform) continue; // gpuix-native-<version>.tgz is the main package
  overrides[`@gpuix/native-${platform}`] = `file:./${file}`;
}
if (Object.keys(overrides).length === 0) {
  throw new Error("no platform tarball found");
}

fs.writeFileSync(
  "package.json",
  JSON.stringify(
    {
      name: "aya-smoke",
      private: true,
      type: "module",
      dependencies: {
        "@gpuix/native": tarball("@gpuix/native"),
        "@gpuix/react": tarball("@gpuix/react"),
        "@gpuix/solid": tarball("@gpuix/solid"),
        react: "^19.2.4",
        "solid-js": "1.9.15",
      },
      overrides,
    },
    null,
    2,
  ) + "\n",
);
