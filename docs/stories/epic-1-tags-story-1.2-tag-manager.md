# Story 1.2: Tag Manager (Settings) + Default Icons

**Epic:** 1 — Tags
**Status:** Done _(Released v0.2.0)_
**Architecture ref:** `docs/architecture-tags-and-history.md`, `docs/front-end-spec-tags-and-history.md`

## Story

As a user, I want to manage my tags from Settings — create, edit (name, description, color, icon, condense flag), and delete them — so I can curate my tag vocabulary and control how tags appear on cards.

## Acceptance Criteria

1. Settings has a "Manage Tags" section listing all property-scoped + global tags. (Global tags marked.)
2. Each tag can be edited: name, description, color (fixed palette), icon (emoji), condense flag. A live preview badge shows the result.
3. Default tags are editable AND deletable (unlike custom entity types).
4. Deleting a tag shows a confirmation with its usage count and warns it will be removed from all attached items; confirm → cascade delete.
5. App ships with default icons/colors on the default tags; existing installs are backfilled (migration 011) without clobbering user edits.
6. New properties get the icon/color-laden defaults (PropertyRepository seed updated).
7. Editing a tag updates it everywhere it's used (rename-in-one-place).
8. Tests pass; typecheck baseline; build succeeds.

## Dev Agent Record

### File List
**New:**
- `src/renderer/components/settings/TagManager.tsx`
- `src/renderer/components/tags/tagColors.ts`

**Modified:**
- `src/main/db/migrations.ts` (009 seed now includes icon/color/condense; new migration 011 backfills existing default tags)
- `src/main/db/repositories/TagRepository.ts` (DEFAULT_TAGS with visuals; seedDefaultsForProperty updated)
- `src/renderer/components/tags/TagBadge.tsx` (uses tagColorClasses)
- `src/renderer/components/settings/SettingsView.tsx` (mounts TagManager)
- `tests/integration/TagRepository.test.ts` (+ icon/color/condense + update tests)

### Completion Notes
- 25 unit tests pass (14 TagRepository). Typecheck baseline (9 pre-existing, 0 new). Build succeeds.
- Default tag visuals: No Ground Wire 🚫 red (condense), Grounded to Box 🔩 amber (condense), Reverse Polarity ⚡ red (condense), GFCI 🛡️ green, AFCI 🛡️ blue.
- Migration 011 only updates default-named tags WHERE icon IS NULL, preserving any user edits.
- Color stored as a key (gray/red/amber/green/blue/purple) mapped to theme-aware Tailwind classes in tagColors.ts.
- Delete confirmation queries listTargetsForTag for the live usage count.

### Change Log
- 2026-06-23: Implemented Settings TagManager + default icons/colors + migration 011 backfill.
