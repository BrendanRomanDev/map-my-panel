- ## React Query Data Refresh Pattern

  **Problem**: When updating data via database calls, UI doesn't refresh until app restart despite query invalidation.

  **Root Cause**: Component receives data as props from parent state. Query invalidation doesn't automatically update parent state.

  **Solution Pattern** - Use this checklist when implementing data updates:

  1. **Identify components that both**:
     - Receive data as props (from parent state)
     - Update that data locally (via database calls)

  2. **Add local useQuery**:
     ```tsx
     const { data: localData } = useQuery({
       queryKey: ['dataType', data.id],
       queryFn: () => window.electronAPI.dataType.findById(data.id),
       initialData: data
     })

     const currentData = localData || data

  3. Use currentData everywhere:
    - Display values: {currentData.field}
    - Comparisons: if (value === currentData.field)
    - useEffect dependencies: [currentData.field]
  4. Invalidate with refetchType: 'active':
  await queryClient.invalidateQueries({
    queryKey: ['dataType', id],
    refetchType: 'active'
  })

  Example locations:
  - src/renderer/components/settings/SettingsView.tsx - Uses this pattern for both property and panel data
  - See commit 12d935d for full implementation

  When to use: Any component that displays AND modifies the same data should use this pattern.