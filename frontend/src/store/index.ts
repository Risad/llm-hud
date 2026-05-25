import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Workspace, APIKey } from '../api/client'

export type Theme = 'dark' | 'light'

// Default indigo-500 / indigo-600 in RGB triples
const DEFAULT_ACCENT     = '99 102 241'
const DEFAULT_ACCENT_DIM = '79 70 229'

/** Parse a hex color string like "#4f46e5" → "79 70 229" */
export function hexToRgbTriple(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return DEFAULT_ACCENT
  return `${r} ${g} ${b}`
}

/** Darken an RGB triple by a fixed amount (for accent-dim) */
function darken(triple: string, amount = 20): string {
  const [r, g, b] = triple.split(' ').map(Number)
  return `${Math.max(0, r - amount)} ${Math.max(0, g - amount)} ${Math.max(0, b - amount)}`
}

export function applyTheme(theme: Theme, accentHex: string) {
  const root = document.documentElement
  root.dataset.theme = theme === 'light' ? 'light' : ''
  const triple = hexToRgbTriple(accentHex)
  root.style.setProperty('--accent', triple)
  root.style.setProperty('--accent-dim', darken(triple))
}

interface HudStore {
  // Active workspace
  activeWorkspaceId: string | null
  setActiveWorkspaceId: (id: string | null) => void

  // Workspaces cache
  workspaces: Workspace[]
  setWorkspaces: (ws: Workspace[]) => void

  // API keys cache
  apiKeys: APIKey[]
  setApiKeys: (keys: APIKey[]) => void

  // Time range selection
  timeRange: string
  customStart: string | null
  customEnd: string | null
  setTimeRange: (range: string, start?: string, end?: string) => void

  // Live mode toggle
  liveMode: boolean
  setLiveMode: (v: boolean) => void

  // Last WS event
  lastEvent: object | null
  setLastEvent: (e: object) => void

  // Theme
  theme: Theme
  accentHex: string
  setTheme: (theme: Theme) => void
  setAccentHex: (hex: string) => void
}

export const useStore = create<HudStore>()(
  persist(
    (set) => ({
      activeWorkspaceId: null,
      setActiveWorkspaceId: (id) => set({ activeWorkspaceId: id }),

      workspaces: [],
      setWorkspaces: (workspaces) => set({ workspaces }),

      apiKeys: [],
      setApiKeys: (apiKeys) => set({ apiKeys }),

      timeRange: '30d',
      customStart: null,
      customEnd: null,
      setTimeRange: (timeRange, customStart, customEnd) =>
        set({ timeRange, customStart: customStart ?? null, customEnd: customEnd ?? null }),

      liveMode: false,
      setLiveMode: (liveMode) => set({ liveMode }),

      lastEvent: null,
      setLastEvent: (lastEvent) => set({ lastEvent }),

      theme: 'dark',
      accentHex: '#6366f1',
      setTheme: (theme) => set({ theme }),
      setAccentHex: (accentHex) => set({ accentHex }),
    }),
    {
      name: 'llm-hud-store',
      partialize: (s) => ({
        activeWorkspaceId: s.activeWorkspaceId,
        timeRange: s.timeRange,
        liveMode: s.liveMode,
        theme: s.theme,
        accentHex: s.accentHex,
      }),
    }
  )
)
