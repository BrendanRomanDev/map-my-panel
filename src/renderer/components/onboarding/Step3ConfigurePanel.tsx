interface Step3ConfigurePanelProps {
  panelName: string
  totalPositions: number
  onUpdate: (panelName: string, totalPositions: number) => void
  onNext: () => void
  onBack: () => void
}

export function Step3ConfigurePanel({
  panelName,
  totalPositions,
  onUpdate,
  onNext,
  onBack
}: Step3ConfigurePanelProps) {
  const addRow = () => {
    if (totalPositions < 100) {
      onUpdate(panelName, totalPositions + 2)
    }
  }

  const removeRow = () => {
    if (totalPositions > 2) {
      onUpdate(panelName, totalPositions - 2)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-2">Step 3: Configure Your Panel</h2>
      <p className="text-muted-foreground mb-6">
        Set up your breaker panel configuration. Most residential panels have 24-40 positions.
      </p>

      <div className="space-y-6">
        {/* Panel name */}
        <div>
          <label className="block text-sm font-medium mb-1">Panel Name</label>
          <input
            type="text"
            value={panelName}
            onChange={e => onUpdate(e.target.value, totalPositions)}
            placeholder="e.g., Main Panel"
            className="w-full px-3 py-2 border border-input rounded-md bg-background"
          />
        </div>

        {/* Panel visualization */}
        <div>
          <label className="block text-sm font-medium mb-2">Panel Layout</label>
          <div className="border border-border rounded-md p-4 bg-muted/30">
            {/* Visual representation */}
            <div className="grid grid-cols-2 gap-2 max-h-96 overflow-y-auto">
              {Array.from({ length: totalPositions }, (_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center h-12 border border-border rounded bg-background text-sm text-muted-foreground"
                >
                  Position {i + 1}
                </div>
              ))}
            </div>

            {/* Row controls */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-sm text-muted-foreground">
                {totalPositions} positions ({totalPositions / 2} rows)
              </div>
              <div className="flex gap-2">
                <button
                  onClick={removeRow}
                  disabled={totalPositions <= 2}
                  className="px-3 py-1 border border-border rounded hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Remove Row
                </button>
                <button
                  onClick={addRow}
                  disabled={totalPositions >= 100}
                  className="px-3 py-1 bg-primary text-primary-foreground rounded hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Add Row
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between gap-2 mt-8">
        <button
          onClick={onBack}
          className="px-6 py-2 border border-border rounded-md hover:bg-muted"
        >
          Back
        </button>
        <button
          onClick={onNext}
          disabled={!panelName.trim()}
          className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Next
        </button>
      </div>
    </div>
  )
}
