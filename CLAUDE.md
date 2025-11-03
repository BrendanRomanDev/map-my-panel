# Project Memory

## React Query Data Management Pattern

**✅ CORRECT PATTERN** - Always use this approach:

### Rule: Separate Server State from UI State

1. **Store only IDs in React state** (UI state)
   ```tsx
   const [currentPanelId, setCurrentPanelId] = useState<string | null>(null)
   ```

2. **Query for server data using those IDs** (server state)
   ```tsx
   const { data: panel } = useQuery({
     queryKey: ['panel', panelId],
     queryFn: () => window.electronAPI.panels.findById(panelId),
     enabled: !!panelId
   })
   ```

3. **React Query handles everything automatically:**
   - Caching across components
   - Automatic updates when data changes
   - Deduplication of identical queries
   - Loading states

### When to Use This Pattern

✅ **USE THIS** when a component needs server data:
- Query directly using IDs
- Let React Query manage the cache
- UI updates automatically

❌ **DON'T DO THIS** - Anti-patterns:
```tsx
// ❌ BAD: Storing full objects in state
const [panel, setPanel] = useState<Panel | null>(null)

// ❌ BAD: Copying query data to state
useEffect(() => {
  if (queryData) setPanel(queryData)
}, [queryData])

// ❌ BAD: Passing full objects down as props
<ChildComponent panel={panel} />
```

✅ **DO THIS** - Correct pattern:
```tsx
// ✅ GOOD: Store only ID in state
const [panelId, setPanelId] = useState<string | null>(null)

// ✅ GOOD: Query where needed
const { data: panel } = useQuery({
  queryKey: ['panel', panelId],
  queryFn: () => window.electronAPI.panels.findById(panelId)
})

// ✅ GOOD: Pass ID down, child queries directly
<ChildComponent panelId={panelId} />
```

### Data Flow Architecture

```
App.tsx
  ├─ State: currentPanelId (just the ID)
  └─ Pass ID to children ↓

MainLayout.tsx
  ├─ Query: useQuery(['panel', panelId])  ← React Query cache
  ├─ Pass ID to children ↓
  │
  ├─> SettingsView.tsx
  │     └─ Query: useQuery(['panel', panelId])  ← Same cache!
  │
  └─> BreakerPanelGrid.tsx
        └─ Query: useQuery(['panel', panelId])  ← Same cache!

When data updates:
1. Call window.electronAPI.panels.update()
2. Call queryClient.invalidateQueries({ queryKey: ['panel', panelId] })
3. React Query automatically refetches
4. All components using this query update instantly
```

### Query Invalidation Best Practices

```tsx
// After updating data
await window.electronAPI.panels.update(panelId, { name: newName })

// Invalidate specific query
queryClient.invalidateQueries({
  queryKey: ['panel', panelId],
  refetchType: 'active'  // Only refetch queries currently in use
})

// Multiple related queries
await Promise.all([
  queryClient.invalidateQueries({ queryKey: ['panel', panelId] }),
  queryClient.invalidateQueries({ queryKey: ['breakers', panelId] }),
  queryClient.invalidateQueries({ queryKey: ['entities', panelId] })
])
```

### Example: Adding a New Feature

**Scenario**: Adding a "favorites" feature for panels

❌ **WRONG Approach**:
```tsx
// Don't do this!
interface MainLayoutProps {
  panel: Panel  // ❌ Passing full object
  favorites: string[]
}

function MainLayout({ panel, favorites }: MainLayoutProps) {
  const [localPanel, setLocalPanel] = useState(panel)  // ❌ Copying to state

  useEffect(() => {
    setLocalPanel(panel)  // ❌ Manual sync
  }, [panel])

  // Problem: UI doesn't update when panel changes in database
}
```

✅ **CORRECT Approach**:
```tsx
// Do this!
interface MainLayoutProps {
  panelId: string  // ✅ Just the ID
  favoriteIds: string[]  // ✅ Just IDs
}

function MainLayout({ panelId, favoriteIds }: MainLayoutProps) {
  // ✅ Query directly
  const { data: panel } = useQuery({
    queryKey: ['panel', panelId],
    queryFn: () => window.electronAPI.panels.findById(panelId)
  })

  // ✅ Query for favorites too
  const { data: favorites } = useQuery({
    queryKey: ['panels', 'favorites'],
    queryFn: () => window.electronAPI.panels.findByIds(favoriteIds)
  })

  // ✅ UI updates automatically when data changes!
}
```

### Debugging Checklist

If UI isn't updating after data changes:

1. ✅ Are you storing only IDs in state? (not full objects)
2. ✅ Are you querying where data is needed? (not prop drilling)
3. ✅ Are you invalidating queries after updates?
4. ✅ Is `refetchType: 'active'` set for immediate updates?
5. ✅ Are query keys consistent? (same key = same cache)

### Reference Implementation

See commit `f993bfa` for full refactor example:
- `src/renderer/App.tsx` - Store IDs only
- `src/renderer/components/layout/MainLayout.tsx` - Query with IDs
- `src/renderer/components/settings/SettingsView.tsx` - Query directly
- `src/renderer/components/breaker-panel/BreakerPanelGrid.tsx` - Query directly

### Key Principle

**Server state (data from database) and UI state (which panel is selected) are SEPARATE.**
- Use React state for UI state (IDs, UI toggles, form inputs)
- Use React Query for server state (data from API/database)
- Never copy server state into React state
