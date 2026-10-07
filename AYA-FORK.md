# About this fork

This is a fork of [remorses/gpuix](https://github.com/remorses/gpuix). It exists
so that applications that depend on GPUIX can use fixes and features before they
land upstream, without publishing anything to npm under the `@gpuix` scope. The
fork never publishes to a registry. It attaches `npm pack` tarballs to GitHub
Releases instead.

The code is Apache-2.0, like upstream. Changes meant for upstream are sent
upstream as pull requests; see upstream's `AGENTS.md` for who may open them.

## Branches

| Branch | Content |
| --- | --- |
| `main` | A mirror of upstream `main`. Nothing is built or released from it, and it is never pushed to by hand. |
| `aya` | An upstream release tag (`@gpuix/react@<version>`) plus this fork's patches. All releases are cut from here. |
| `aya/<item>` | One topic branch per change, based on an upstream tag or on `aya`, written so that it can become an upstream pull request. They are merged into `aya` once reviewed. |

To move to a newer upstream release, create the new `aya` from the new upstream
tag and re-apply the patches (rebase or cherry-pick). The fork's own files are
kept small to make this easy: `AYA-FORK.md`, `.github/workflows/aya-release.yml`,
`.github/aya/`, and two `if:` lines in `.github/workflows/ci.yml` that skip the
upstream publish jobs outside `remorses/gpuix`.

## Releases

A release is a GitHub Release named `aya-v<upstream version>-aya.<N>`, for
example `aya-v0.10.0-aya.1`. It holds one tarball per package and a `SHA256SUMS`
file:

- `gpuix-native-<version>.tgz` (`@gpuix/native`)
- `gpuix-native-<platform>-<version>.tgz` (the platform packages with the
  binaries: `win32-x64-msvc` and `linux-x64-gnu`, and `darwin-arm64` when asked for)
- `gpuix-react-<version>.tgz` (`@gpuix/react`)
- `gpuix-solid-<version>.tgz` (`@gpuix/solid`)

All of them carry the same version, `<upstream version>-aya.<N>`, and the
packages depend on each other at exactly that version.

To cut a release, from the `aya` branch:

1. Push a tag named `aya-v<upstream version>-aya.<N>` that points at the commit
   to release. This is the dependable way, since it needs no setup on the
   default branch.
2. Or start the `aya-release` workflow by hand with `N` as input (and the macOS
   switch, which is off by default). GitHub only lists a manually started workflow
   when its file is on the default branch, so use the tag when that is not the case.

The workflow builds each platform, packs the tarballs, installs them into an empty
project on each operating system and loads them (on Windows and macOS it also
renders one frame with `TestGpuixRenderer`), and only then creates the release.
It uses the built-in `GITHUB_TOKEN` and no other secret. It refuses to run on
`main` and in `remorses/gpuix`. A release that already exists is never replaced:
delete it, or use the next `N`.

Notes on the build:

- Windows and macOS binaries include `TestGpuixRenderer`, as upstream's CI builds
  them. The Linux binary is built the way upstream's CI builds it, without
  `test-support`, because that renderer is not available on Linux.
- The browser (Wasm) build is not part of these tarballs, so the `browser`
  export condition of `@gpuix/native` does not work with them.

## Using a release

The registry does not have these versions, so point every `@gpuix` package at its
tarball. With pnpm, in the application's `package.json`:

```json
{
  "dependencies": {
    "@gpuix/react": "https://github.com/<owner>/gpuix/releases/download/aya-v0.10.0-aya.1/gpuix-react-0.10.0-aya.1.tgz"
  },
  "pnpm": {
    "overrides": {
      "@gpuix/native": "https://github.com/<owner>/gpuix/releases/download/aya-v0.10.0-aya.1/gpuix-native-0.10.0-aya.1.tgz",
      "@gpuix/native-win32-x64-msvc": "https://github.com/<owner>/gpuix/releases/download/aya-v0.10.0-aya.1/gpuix-native-win32-x64-msvc-0.10.0-aya.1.tgz",
      "@gpuix/native-linux-x64-gnu": "https://github.com/<owner>/gpuix/releases/download/aya-v0.10.0-aya.1/gpuix-native-linux-x64-gnu-0.10.0-aya.1.tgz"
    }
  }
}
```

Use the overrides for every platform package you need and for `@gpuix/solid` if
you use it. pnpm installs only the platform package that matches the machine.
The lockfile records the integrity hash of each tarball; to check a download by
hand, compare it with `SHA256SUMS` from the same release. The URLs are plain
downloads, so the repository must be readable without a login for them to work
in CI.
