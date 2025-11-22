# Project Memory

## CRITICAL: React Rules of Hooks

**⚠️ ALWAYS FOLLOW THESE RULES** - Violating these rules causes black screen crashes!

### Rule: ALL Hooks Must Be Called in the Same Order Every Render

React hooks (useState, useQuery, useMemo, useEffect, etc.) MUST be called:
1. ✅ **At the top level** of the component
2. ✅ **Before ANY conditional returns**
3. ✅ **In the exact same order** every render

### Correct Hook Ordering in Components

```tsx
export function MyComponent({ id }: Props) {
  // ✅ 1. ALL useState hooks first
  const [state1, setState1] = useState(initial)
  const [state2, setState2] = useState(initial)

  // ✅ 2. ALL useQuery hooks
  const { data, isLoading } = useQuery({
    queryKey: ['key', id],
    queryFn: () => fetchData(id),
    enabled: !!id  // Use enabled, not conditional hooks
  })

  // ✅ 3. ALL useMemo hooks
  const computed = useMemo(() => {
    // Use optional chaining if data might not exist
    return data?.property || defaultValue
  }, [data?.property])

  // ✅ 4. NOW safe to do conditional returns
  if (isLoading) {
    return <Loading />
  }

  if (!data) {
    return <Error />
  }

  // ✅ 5. Event handlers and other code
  const handleClick = () => { ... }

  return <div>...</div>
}
```

### ❌ WRONG - This Causes Black Screen Crashes

```tsx
export function MyComponent({ id }: Props) {
  const { data } = useQuery(...)

  // ❌ WRONG: Early return before hooks
  if (!data) {
    return <Loading />
  }

  // ❌ WRONG: useState called AFTER conditional return
  // This hook won't be called when data is null!
  const [state, setState] = useState(data.value)

  // ❌ WRONG: Using data in hook initialization
  // data doesn't exist on first render!
  const [value, setValue] = useState(data.property)
}
```

### How to Handle Data in Hook Initialization

```tsx
// ❌ WRONG - data doesn't exist yet
const [value, setValue] = useState(data.property)

// ✅ CORRECT - Use safe default, sync with useEffect
const [value, setValue] = useState(0)

useEffect(() => {
  if (data) {
    setValue(data.property)
  }
}, [data?.property])
```

### Common Mistakes and Fixes

| ❌ Mistake | ✅ Fix |
|-----------|--------|
| `if (!data) return <div/>` then `useState()` | Move all `useState` before the return |
| `useState(panel.amperage)` | Use `useState(0)` + `useEffect` to sync |
| `const val = useMemo(...)` after return | Move all `useMemo` before returns |
| `useQuery(...)` without `enabled` | Add `enabled: !!id` parameter |

### Why This Matters

When hooks are called conditionally:
1. First render: Component returns early, hooks never called
2. Second render: Data loads, hooks called for first time
3. **React Error**: Hook order changed between renders → BLACK SCREEN CRASH

**Remember**: React relies on hook call order to maintain state. The order MUST be identical every single render, or the component will crash.

---

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
- before resetting db in the future for this project, please let mek now so i can back up my data and create a conversion process. i was actively using this application and now my data is gone!