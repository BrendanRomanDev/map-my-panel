# Release Process

This document is the runbook for cutting a new release of Map My Panel. Follow it top-to-bottom for any version bump (patch, minor, or major).

If you're hitting an unfamiliar failure mode, jump to [Known Gotchas](#known-gotchas) first.

---

## Prerequisites

You need these on your machine before starting any release work:

- **macOS** with Apple Silicon or Intel — required to build the macOS `.dmg` files. (Windows `.exe` cross-compiles fine from Mac via electron-builder.)
- **Node 18+ and npm 10+**, matching the versions in `package.json`'s `engines` field if set.
- **`gh` CLI** authenticated to GitHub with `repo` scope. Verify with `gh auth status` — it should report `Logged in to github.com account BrendanRomanDev`.
- **ImageMagick** (`brew install imagemagick`) — only needed if regenerating the app icon files.
- **A clean working tree** — `git status` should show no uncommitted changes that aren't part of the release.

---

## Versioning Rules

Map My Panel follows [Semantic Versioning](https://semver.org/). Pick the right increment before writing the CHANGELOG entry:

| Change shape | Increment | Examples |
|---|---|---|
| Bug fix only, no API or behavior changes visible to users | **PATCH** (0.1.0 → 0.1.1) | Icon refresh, README fix, schema migration that's invisible to users |
| New user-facing feature, no breaking change | **MINOR** (0.1.0 → 0.2.0) | New entity type, new sidebar view, new export format |
| Breaking change to the backup JSON format, IPC contract, or schema in a way that requires user data migration | **MAJOR** (0.1.0 → 1.0.0) | Backup v2.0 → v3.0 format, removing a feature, renaming a stored field |

When in doubt, **prefer the larger bump.** Friends-and-family software can absorb the version-number cost. Confusion later is more expensive.

---

## The Release Flow

These steps are ordered. Each step assumes the previous one completed cleanly. If anything fails partway through, stop and fix the root cause before continuing — don't paper over.

### 1. Pre-flight checks

```bash
# Confirm you're on main and synced with origin
git status
git pull origin main

# Confirm the app builds + types check (typechecker has known pre-existing
# errors — those are OK, anything NEW from your changes is not)
npm run build
npm run typecheck

# Run tests (skip if you're cutting a docs-only release)
npm run test:unit
```

If the build fails, do not proceed. If `typecheck` shows *new* errors beyond the known pre-existing ones, fix them.

### 2. Bump the version

Edit two files in lockstep — `package.json` and `package-lock.json` — to the new version. Don't use `npm version` (it creates a commit and tag automatically, and we want to control both).

```bash
# Example: cutting v0.1.2
# Edit package.json: "version": "0.1.2"
# Edit package-lock.json: top-level "version" AND packages[""].version (lines 3 and 9)
```

Verify with:

```bash
grep -E '"version":' package.json
head -10 package-lock.json | grep version
```

Both should show the new version. **Do not** search-and-replace the entire `package-lock.json` — there are unrelated dependency packages that happen to also be at `0.1.x` versions. Only update the top-level project entries.

### 3. Update the CHANGELOG

Add a new section at the top of `CHANGELOG.md`, above the previous version's entry, following the [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) format:

```markdown
## [0.1.2] — 2026-MM-DD

Short one-sentence summary of what this release does.

### Added
- (new features)

### Changed
- (behavior changes that aren't bugs)

### Fixed
- (bug fixes)

### Known limitations
- (only include if the release ships with known unresolved issues)
```

Skip any section that has no entries. Don't include empty headers.

### 4. Commit the version bump

Two commits, in this order:

```bash
# Commit any feature/fix work that's been sitting uncommitted FIRST,
# so the version bump is its own atomic commit.
git add <feature files>
git commit -m "Descriptive message about the feature work"

# Then the version bump itself
git add package.json package-lock.json CHANGELOG.md
git commit -m "Bump to v0.1.2"
```

Why two commits: a future `git revert` of the version bump should not also revert the feature work, and vice versa.

### 5. Push main

```bash
git push origin main
```

Wait for any CI to pass (if/when CI exists). For now there's no CI gate.

### 6. Build the installers

Clean the previous build output to avoid version-mismatch confusion:

```bash
rm -rf release/mac release/mac-arm64 release/*.dmg release/*.dmg.blockmap

# Build macOS .dmgs (produces arm64 and x64 builds)
npm run dist:mac

# (Optional) Windows .exe — only if you want to attach it to this release
npm run dist:win
```

The build takes 30–90 seconds when Electron binaries are cached. First-ever build (or after a major Electron version bump) downloads ~200MB of binaries — closer to 3–5 minutes.

Verify the output:

```bash
ls -lh release/*.dmg
```

You should see `Map My Panel-X.Y.Z-arm64.dmg` and `Map My Panel-X.Y.Z-x64.dmg`, both 100MB+. The version in the filename must match what's in `package.json`. If it doesn't, electron-builder cached old metadata — `rm -rf release/` and rebuild.

### 7. Tag the commit

```bash
git tag -a vX.Y.Z -m "vX.Y.Z — short description"
git push origin vX.Y.Z
```

The tag points at the version-bump commit, NOT the feature-work commit before it. This way `git checkout vX.Y.Z` checks out a state where `package.json` already reflects the released version.

### 8. Extract the release notes for the GitHub Release

```bash
# Pull the CHANGELOG section for THIS version into a temp file
awk '/^## \[X\.Y\.Z\]/{flag=1; next} /^## \[/{flag=0} flag' CHANGELOG.md > /tmp/release-notes.md

# Sanity check it
cat /tmp/release-notes.md
```

### 9. Create the GitHub Release

```bash
gh release create vX.Y.Z \
  "release/Map My Panel-X.Y.Z-arm64.dmg" \
  "release/Map My Panel-X.Y.Z-x64.dmg" \
  --title "vX.Y.Z — short description" \
  --notes-file /tmp/release-notes.md
```

If you built a Windows `.exe`, add it to the file list:

```bash
gh release create vX.Y.Z \
  "release/Map My Panel-X.Y.Z-arm64.dmg" \
  "release/Map My Panel-X.Y.Z-x64.dmg" \
  "release/Map My Panel Setup X.Y.Z.exe" \
  --title "vX.Y.Z — short description" \
  --notes-file /tmp/release-notes.md
```

### 10. Verify

```bash
gh release view vX.Y.Z
gh release list
```

The new release should be marked **Latest**. The previous release stays in the history.

Click the URL in `gh release view` and confirm:
- Release notes render correctly (no markdown weirdness)
- Both `.dmg` files are attached (and the `.exe` if you built one)
- Asset sizes look right (~100-120MB per `.dmg`)

---

## Known Gotchas

Real failure modes we've hit and how to handle them.

### `window.electronAPI is undefined` in the packaged app

**Symptom:** packaged app launches but the renderer shows "Error loading application — electronAPI not available."

**Cause:** `src/main/index.ts` is looking for the preload at the wrong filename. `electron-vite` emits `index.mjs` for the preload in both dev and prod, not `index.js`.

**Fix:** the preload path in `src/main/index.ts` should be:

```ts
const preloadPath = join(__dirname, '../preload/index.mjs')
```

If you ever see this regression, that file is the suspect.

### `.dmg` files keep building with the old version number

**Cause:** electron-builder caches some metadata between runs.

**Fix:** delete the entire `release/` directory and rebuild:

```bash
rm -rf release/
npm run dist:mac
```

### Icon looks double-rounded in the macOS Dock

**Cause:** the source `build/icon.png` has its own rounded corners baked in, AND macOS is applying its squircle mask on top.

**Fix:** the source PNG must be a true square with sharp 90° corners. macOS applies the rounded mask in `iconutil`. If your source has rounded corners, mask them off:

```bash
# Apply macOS squircle mask (22.5% corner radius for 1024px)
magick -size 1024x1024 xc:none \
  -fill white -draw "roundrectangle 0,0 1023,1023 230,230" \
  /tmp/squircle-mask.png
magick build/icon.png /tmp/squircle-mask.png \
  -alpha off -compose copy_opacity -composite \
  build/icon.png
```

Then regenerate `icon.icns` and `icon.ico` (see [Regenerating Icon Files](#regenerating-icon-files)).

### App icon looks oversized in the Dock relative to neighbors

**Cause:** the artwork fills the full canvas edge-to-edge, without Apple's standard ~80% "safe area" padding.

**Fix:** scale the artwork to 80% inside a 1024×1024 canvas filled with the background color of the icon, then apply the squircle mask. Or, easier: ask whoever generates the icon to include the safe area in their output (most modern AI image tools handle this when told explicitly).

### `npm run dist:mac` fails with `arm64.dmg` lock errors

**Symptom:** build log ends with a stack trace mentioning `builder-util/src/util.ts`, but the `.app` bundle was produced successfully.

**Cause:** a previous `.dmg` is still mounted from a recent install, or another build process holds a lock.

**Fix:** unmount any Map My Panel `.dmg`s in Finder, kill any electron-builder background processes (`pkill -f electron-builder`), delete `release/mac-arm64/` (just the directory, not the `.dmg`), then retry.

### The packaged app uses the same database as `npm run dev`

This is intentional. Both modes read/write to `~/Library/Application Support/map-my-panel/map-my-panel.db` because the `userData` path is derived from `package.json:name`, not `productName`. See ADR-001 (when written) for the rationale.

If you're shipping a destructive schema migration, **back up your DB first**:

```bash
mkdir -p ~/Documents/map-my-panel-backups/pre-vX.Y.Z-$(date +%Y%m%d-%H%M%S)
cp ~/Library/Application\ Support/map-my-panel/map-my-panel.db \
   ~/Documents/map-my-panel-backups/pre-vX.Y.Z-$(date +%Y%m%d-%H%M%S)/
```

---

## Regenerating Icon Files

If you replace `build/icon.png` with a new design, regenerate `.icns` and `.ico` from it:

```bash
cd build

# .icns via iconutil (macOS native)
mkdir -p icon.iconset
for sz in 16 32 64 128 256 512; do
  sips -z $sz $sz icon.png --out "icon.iconset/icon_${sz}x${sz}.png" >/dev/null
  sips -z $((sz*2)) $((sz*2)) icon.png --out "icon.iconset/icon_${sz}x${sz}@2x.png" >/dev/null
done
sips -z 1024 1024 icon.png --out "icon.iconset/icon_512x512@2x.png" >/dev/null
iconutil -c icns icon.iconset -o icon.icns
rm -rf icon.iconset

# .ico (multi-size for Windows)
magick icon.png -define icon:auto-resize=256,128,64,48,32,16 icon.ico
```

The source `icon.png` should be:
- Exactly 1024×1024 pixels
- Square (sharp 90° corners on the canvas), but with the macOS squircle mask applied to the artwork (so the visible icon is rounded, but the canvas isn't)
- Solid (non-transparent) background — `iconutil` handles transparency fine but the Dock can render small inconsistencies if the source has subtle alpha edges

---

## Emergency Procedures

### "I cut the release and the installer is broken"

Order of operations:

1. **Don't delete the release.** GitHub Releases are visible to anyone who already saw it; deleting causes more confusion than leaving it.
2. **Mark it as a pre-release** to discourage new downloads:
   ```bash
   gh release edit vX.Y.Z --prerelease
   ```
3. **Edit the release notes** to add a `> ⚠️ Known broken — install v[previous] or v[next] instead.` warning at the top.
4. **Cut a patch release** (vX.Y.Z+1) with the fix. Don't try to re-upload to the broken release.

### "I need to take a release down entirely"

```bash
gh release delete vX.Y.Z --yes
git push --delete origin vX.Y.Z
```

Only do this for true emergencies (security issue, accidentally-shipped private data). Otherwise the pre-release flag above is the right move.

### "I committed a secret into the repo"

The release process never moves anything sensitive, but if you discover a leaked secret in a commit that's already pushed:

1. **Rotate the secret immediately** — assume it's compromised the moment it hit GitHub.
2. Do NOT just `git revert`. The bad commit is still in history.
3. Use `git filter-repo` to rewrite history (the BFG Repo-Cleaner is also OK).
4. Force-push and notify any collaborators that their clones are stale.

---

## Quick Reference

For the experienced reader who just needs the command sequence:

```bash
# 1. pre-flight
git pull origin main
npm run build && npm run typecheck

# 2. version bump (manual edits to package.json + package-lock.json + CHANGELOG.md)

# 3. commit
git add package.json package-lock.json CHANGELOG.md
git commit -m "Bump to vX.Y.Z"
git push origin main

# 4. build
rm -rf release/
npm run dist:mac

# 5. tag + release
git tag -a vX.Y.Z -m "vX.Y.Z — description"
git push origin vX.Y.Z

awk '/^## \[X\.Y\.Z\]/{flag=1; next} /^## \[/{flag=0} flag' CHANGELOG.md > /tmp/release-notes.md
gh release create vX.Y.Z release/*.dmg \
  --title "vX.Y.Z — description" \
  --notes-file /tmp/release-notes.md
```
