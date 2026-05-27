interface Step0ChoiceScreenProps {
  onCreateNew: () => void
  onRestore: () => void
  onLoadSample: () => void
  isImporting: boolean
  isLoadingSample: boolean
}

export function Step0ChoiceScreen({
  onCreateNew,
  onRestore,
  onLoadSample,
  isImporting,
  isLoadingSample
}: Step0ChoiceScreenProps) {
  const anyBusy = isImporting || isLoadingSample

  return (
    <div className="flex flex-col items-center justify-center py-12">
      <h2 className="text-2xl font-bold mb-4">Get Started</h2>
      <p className="text-muted-foreground mb-8 text-center max-w-lg">
        Create a new electrical panel from scratch, restore from a backup, or load a sample panel to explore the app.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl">
        {/* Create New Panel */}
        <button
          onClick={onCreateNew}
          disabled={anyBusy}
          className="flex flex-col items-center justify-center p-8 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-16 h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Create New Panel</h3>
          <p className="text-sm text-muted-foreground text-center">
            Set up a new electrical panel with guided steps
          </p>
        </button>

        {/* Restore from Backup */}
        <button
          onClick={onRestore}
          disabled={anyBusy}
          className="flex flex-col items-center justify-center p-8 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-16 h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Restore from Backup</h3>
          <p className="text-sm text-muted-foreground text-center">
            {isImporting ? 'Importing backup...' : 'Load panel data from a backup file'}
          </p>
        </button>

        {/* Try Sample Data */}
        <button
          onClick={onLoadSample}
          disabled={anyBusy}
          className="flex flex-col items-center justify-center p-8 border-2 border-border rounded-lg hover:border-primary hover:bg-accent transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="w-16 h-16 mb-4 bg-primary/10 rounded-full flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-primary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">Try Sample Data</h3>
          <p className="text-sm text-muted-foreground text-center">
            {isLoadingSample ? 'Loading sample...' : 'Explore a pre-filled example panel'}
          </p>
        </button>
      </div>
    </div>
  )
}
