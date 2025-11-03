import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

export type Theme =
  | 'default'
  | 'electrical-light'
  | 'electrical-dark'
  | 'professional-light'
  | 'professional-dark'
  | 'utility-dark'
  | 'slate-light'
  | 'nord-dark'
  | 'ocean-light'

export const THEMES = {
  default: {
    id: 'default' as Theme,
    name: 'Default (Light)',
    description: 'Clean blue theme with standard styling'
  },
  'electrical-light': {
    id: 'electrical-light' as Theme,
    name: 'Electrical Industrial (Light)',
    description: 'Amber and electric blue - Industrial tech aesthetic'
  },
  'electrical-dark': {
    id: 'electrical-dark' as Theme,
    name: 'Electrical Industrial (Dark)',
    description: 'Dark mode with amber and electric blue accents'
  },
  'professional-light': {
    id: 'professional-light' as Theme,
    name: 'Clean Professional (Light)',
    description: 'Forest green with gold accents - Business aesthetic'
  },
  'professional-dark': {
    id: 'professional-dark' as Theme,
    name: 'Clean Professional (Dark)',
    description: 'Dark mode with forest green and gold'
  },
  'utility-dark': {
    id: 'utility-dark' as Theme,
    name: 'Utility Dashboard (Dark)',
    description: 'Power utility aesthetic with cyan and yellow'
  },
  'slate-light': {
    id: 'slate-light' as Theme,
    name: 'Modern Slate (Light)',
    description: 'Minimalist gray tones - Clean and modern'
  },
  'nord-dark': {
    id: 'nord-dark' as Theme,
    name: 'Nordic (Dark)',
    description: 'Nord-inspired - Cool blues and teals'
  },
  'ocean-light': {
    id: 'ocean-light' as Theme,
    name: 'Ocean Breeze (Light)',
    description: 'Refreshing blues and teals - Calm and clean'
  }
}

interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
  availableThemes: typeof THEMES
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // Get theme from localStorage or default to 'default'
    const stored = localStorage.getItem('theme')

    // Migration: Handle old theme names
    const themeMap: Record<string, Theme> = {
      'electrical': 'electrical-light',
      'professional': 'professional-light',
      'utility': 'utility-dark'
    }

    if (stored && themeMap[stored]) {
      // Migrate old theme name to new one
      const newTheme = themeMap[stored]
      localStorage.setItem('theme', newTheme)
      return newTheme
    }

    // Check if stored theme exists in available themes
    if (stored && THEMES[stored as Theme]) {
      return stored as Theme
    }

    // Default to 'default' if nothing valid
    return 'default'
  })

  useEffect(() => {
    // Apply theme to document root
    const root = document.documentElement

    // Remove all theme data attributes
    root.removeAttribute('data-theme')

    // Apply new theme if not default
    if (theme !== 'default') {
      root.setAttribute('data-theme', theme)
    }

    // Save to localStorage
    localStorage.setItem('theme', theme)
  }, [theme])

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme, availableThemes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
