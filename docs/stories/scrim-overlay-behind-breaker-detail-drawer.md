# Scrim Overlay Behind Breaker Detail Drawer — Brownfield Addition

**Status:** Draft
**Created:** 2026-05-28
**Type:** Brownfield Story (UI)
**Author:** Bob (Scrum Master)

---

## User Story

As a **user editing a breaker via the side drawer**,
I want **the breaker panel grid behind the drawer to be visually de-emphasized and non-interactive while the drawer is open**,
So that **my focus is on the form I'm editing, I don't accidentally click panel switches thinking they're the live state, and I'm not confused about whether changes apply immediately or require the drawer's Save button**.

---

## Story Context

**Problem this solves:**
The breaker detail drawer (`BreakerDetailPanel.tsx`) currently slides in over the panel grid but leaves the grid behind it fully visible and interactive. Two confusion modes result:

1. Users see breaker switches in the grid behind the drawer and click them, expecting the click to do something — but the click either changes a different breaker's state (out from under the drawer's form) or does nothing useful.
2. Users edit values in the drawer's form fields and then click panel switches in the grid, assuming those clicks apply their drawer edits. They don't — the drawer's **Save Changes** button is the only commit point.

Adding a scrim overlay behind the drawer makes the "focus is here, the rest is inactive" contract visually obvious and matches the existing modal pattern already used elsewhere in the app.

**Existing System Integration:**

- **Integrates with:** `src/renderer/components/breaker-panel/BreakerDetailPanel.tsx` (the drawer itself) and its mount point in `src/renderer/components/breaker-panel/BreakerPanelGrid.tsx` (around line 624)
- **Technology:** React 18.3, TypeScript, Tailwind CSS 3.4 utility classes
- **Follows pattern:** the existing modal-scrim pattern used by `AddPropertyModal`, `AddPanelModal`, `PropertySelectorModal`, `PropertyPanelSelectorModal`, `PanelSelectorModal`, and `AssignEntitiesModal`. Specifically the markup:
  ```tsx
  <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
  ```
- **Touch points:**
  - `BreakerDetailPanel.tsx` — render a backdrop layer alongside the drawer when the drawer is open
  - `BreakerPanelGrid.tsx` — no structural change expected; the drawer already manages its own open/close lifecycle via the `breaker` prop being null vs. set

---

## Acceptance Criteria

### Functional Requirements

1. **A backdrop overlay appears behind the drawer when the drawer is open.** The overlay covers the full viewport, sits visually behind the drawer (lower `z-index`), and is above all other page content.

2. **The backdrop is semi-transparent black** (`bg-black/70` — matching the existing modal pattern in `AddPropertyModal.tsx:51` exactly, so the visual language is consistent across modals and the drawer).

3. **Clicking the backdrop closes the drawer**, using the same close-behavior path as clicking the drawer's existing close button (i.e., calls `onClose`). If the drawer has unsaved changes, the same warning/confirmation flow that already exists for the close button should fire — backdrop-click is just another path to "close." If no such confirmation exists today, backdrop-click closes immediately without prompting (matching current close-button behavior).

4. **The backdrop blocks interaction with the panel grid behind it.** Clicks on the backdrop hit the backdrop, not the breaker switches behind it. Hover states on breakers behind the drawer no longer fire while the drawer is open.

5. **Pressing the `Escape` key closes the drawer** (the backdrop change is a good time to add this if it isn't already wired up — verify during implementation; if it already exists, no change needed).

### Integration Requirements

6. **Existing drawer functionality continues to work unchanged.** Save Changes button, Cancel button, all form fields, the assign-entities modal-within-drawer, the delete-confirmation flow, the tandem-convert flow — all behave identically to today.

7. **The backdrop uses the same opacity, color, and z-index scale as existing modals.** Existing modals use `bg-black/70` and `z-50`. The drawer should use the **same backdrop classes**, with the drawer itself rendered at `z-[51]` (or whatever the next-higher class) so it floats above the backdrop. **Do not invent new z-index values** — per project conventions, z-index values must be explained and must fit the existing layer system. Add a brief comment justifying the layer.

8. **Other modals that can open from within the drawer** (the `AssignEntitiesModal`, the delete confirmation, the tandem-convert confirmation) **continue to render above the drawer**, not below it. These modals already render with `z-50` per the existing pattern — verify they still appear correctly stacked when triggered from inside the drawer, and bump their z-index higher if needed.

### Quality Requirements

9. **No regression in existing functionality.** Manual smoke test before committing: open the drawer, edit fields, click Save, verify changes persist. Open the drawer, click Cancel, verify changes discard. Open the drawer, click the new backdrop, verify it closes. Open the drawer, click the assign-entities button inside the drawer, verify that modal still appears.

10. **The change does not regress the existing modal-scrim experience.** Open `AddPropertyModal`, `AddPanelModal`, and at least one other existing modal to confirm their backdrops still behave identically.

11. **Build and typecheck pass.** `npm run build` succeeds; `npm run typecheck` shows no NEW errors beyond the 9 known pre-existing ones (see release-process.md).

---

## Technical Notes

- **Integration Approach:** Add a `<div>` element rendered conditionally (or always, gated by drawer-open state) inside `BreakerDetailPanel.tsx` *before* the drawer's main slide-in container in the JSX tree. Apply the same Tailwind classes used by existing modals: `fixed inset-0 bg-black/70 z-50`. Attach an `onClick` handler that calls the drawer's existing close path. The drawer's own container gets a higher z-index (`z-[51]` or similar) so it sits above the backdrop.

- **Existing Pattern Reference:** `src/renderer/components/property/AddPropertyModal.tsx` line 51 — `<div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">`. This is the canonical pattern. The drawer's backdrop should match it visually 1:1.

- **Animation consideration:** The drawer slides in from the right. The backdrop should ideally **fade in** simultaneously with the drawer's slide-in (and fade out on close). If the existing drawer has no transition timing, this story does NOT require adding one — a hard show/hide of the backdrop is acceptable for v0.1.x. Polish-pass animation can be a follow-up story.

- **Key Constraints:**
  - **No `!important` overrides** — per project conventions, fix specificity issues at the root, don't paper over them with `!`.
  - **No magic z-index numbers** — every z-index must have a brief comment justifying the layer's place in the system.
  - **Positive boolean naming** — if a new prop like `showBackdrop` is added, use the positive form (`showBackdrop`, not `hideBackdrop`).
  - **Use `as const` over string literals** if introducing any new state values.
  - **No `useCallback`/`useMemo`/`React.memo` reflex memoization** — write plain functions unless there's a measured reason otherwise.

---

## Risk and Compatibility Check

**Primary Risk:** The backdrop's click-to-close behavior could surprise users mid-edit, discarding their unsaved changes if no confirmation flow exists for the close button today.

**Mitigation:** Before implementing, check whether the drawer's existing close button (X) confirms when there are unsaved changes. If yes — backdrop-click should route through the same confirmation. If no — match the existing behavior (close immediately without confirmation). Either way, backdrop-click must NOT introduce a behavior that's stricter or laxer than the existing close button. Symmetry with current behavior is the goal.

**Secondary Risk:** z-index collision with the existing modals that can render from inside the drawer (`AssignEntitiesModal`, delete confirm, tandem convert).

**Mitigation:** Manually trigger each modal-within-drawer scenario and verify stacking. If a modal-within-drawer renders behind the drawer's backdrop, bump that modal's z-index above the drawer's. Document the resulting z-index ladder in a brief comment.

**Rollback:** Single-component change. To revert: `git revert` the implementation commit. No schema changes, no IPC changes, no persisted-state changes — purely visual layer.

**Compatibility Verification:**

- [ ] No breaking changes to any APIs (IPC, types, exported components)
- [ ] No database/schema changes
- [ ] UI change follows existing design patterns (the modal-scrim pattern)
- [ ] Performance impact negligible (one additional fixed-position div, no extra renders)

---

## Definition of Done

- [ ] Backdrop overlay renders behind the drawer when the drawer is open
- [ ] Backdrop uses `bg-black/70` matching existing modal pattern
- [ ] Clicking the backdrop closes the drawer with the same semantics as the existing close button
- [ ] Backdrop click does not bubble through to interact with breakers in the grid behind
- [ ] Escape key closes the drawer (verify existing — add if missing)
- [ ] Modals triggered from inside the drawer (assign entities, delete confirm, tandem convert) still render correctly above the drawer
- [ ] All existing drawer functionality regression-tested manually (open, edit, save, cancel, close, all internal flows)
- [ ] Existing modals (`AddPropertyModal`, etc.) regression-tested — their backdrops still work
- [ ] `npm run build` succeeds
- [ ] `npm run typecheck` shows no new errors beyond the 9 pre-existing
- [ ] z-index values are explained with a brief comment
- [ ] No new `useCallback`/`useMemo`/`React.memo`, no `!important`, no magic numbers, no `eslint-disable`

---

## Validation Checklist (run before marking the story Approved → In Progress)

**Scope Validation:**

- [x] Story can be completed in one development session (estimated 1-2 hours)
- [x] Integration approach is straightforward (reusing existing modal-scrim pattern verbatim)
- [x] Follows existing patterns exactly
- [x] No new design or architecture work required

**Clarity Check:**

- [x] Story requirements are unambiguous
- [x] Integration points are clearly specified (`BreakerDetailPanel.tsx`, with reference to `AddPropertyModal.tsx:51` as the canonical pattern)
- [x] Success criteria are testable (each Definition of Done item is a verifiable claim)
- [x] Rollback approach is simple (single `git revert`)

---

## Notes for the Dev Agent

- Read `AddPropertyModal.tsx:51` first — that's the pattern to mirror.
- The drawer's open/closed state is governed by the `breaker` prop being non-null. There's no separate `isOpen` bool — the conditional render is `breaker && ...` (or similar). The backdrop should follow the same condition.
- Check whether the drawer currently has any close-confirmation flow for unsaved changes. If yes, route backdrop-click through it; if no, don't invent one.
- Be deliberate about z-index. If you add `z-[51]` or similar, leave a comment like `/* above backdrop (z-50), below modals-within-drawer (z-[52]) */`.
- This story explicitly does NOT include backdrop fade-in animation. Polish-only follow-up.
