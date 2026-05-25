import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { LayoutDashboard, BarChart3, KeyRound, Settings, Zap } from 'lucide-react'
import { useStore, applyTheme } from './store'
import { useShallow } from 'zustand/react/shallow'
import { useWorkspaces } from './hooks/useUsageQuery'
import { useWorkspaceWebSocket } from './hooks/useWebSocket'
import WorkspaceSelector from './components/WorkspaceSelector'
import LiveIndicator from './components/LiveIndicator'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import Workspaces from './pages/Workspaces'
import SettingsPage from './pages/Settings'
import clsx from 'clsx'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/workspaces', icon: KeyRound, label: 'Workspaces' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function App() {
  const { activeWorkspaceId, setActiveWorkspaceId, theme, accentHex } = useStore(useShallow(s => ({
    activeWorkspaceId: s.activeWorkspaceId,
    setActiveWorkspaceId: s.setActiveWorkspaceId,
    theme: s.theme,
    accentHex: s.accentHex,
  })))
  const { data: workspaces } = useWorkspaces()
  const navigate = useNavigate()
  const location = useLocation()

  // Apply theme whenever it changes (also runs on first render to restore persisted theme)
  useEffect(() => {
    applyTheme(theme, accentHex)
  }, [theme, accentHex])

  // Auto-select first workspace
  useEffect(() => {
    if (!activeWorkspaceId && workspaces && workspaces.length > 0) {
      setActiveWorkspaceId(workspaces[0].id)
    }
  }, [workspaces, activeWorkspaceId, setActiveWorkspaceId])

  useWorkspaceWebSocket(activeWorkspaceId)

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 flex flex-col bg-surface-card border-r border-surface-border">
        {/* Logo */}
        <div className="flex items-center gap-2 px-5 py-4 border-b border-surface-border">
          <Zap size={20} className="text-accent" />
          <span className="font-bold text-sm tracking-wide text-slate-100">LLM HUD</span>
        </div>

        {/* Workspace selector */}
        <div className="px-3 py-3 border-b border-surface-border">
          <WorkspaceSelector />
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors',
                  isActive
                    ? 'bg-accent/20 text-accent font-medium'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-surface-border/20'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Live indicator */}
        <div className="px-4 py-3 border-t border-surface-border">
          <LiveIndicator />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        {/* Workspaces/Settings pages work without an active workspace */}
        {!activeWorkspaceId && !['/workspaces', '/settings'].includes(location.pathname) ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <KeyRound size={48} className="opacity-30" />
            <p className="text-sm">No workspace selected.</p>
            <button className="btn-primary" onClick={() => navigate('/workspaces')}>
              Create a workspace
            </button>
          </div>
        ) : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/workspaces" element={<Workspaces />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        )}
      </main>
    </div>
  )
}
