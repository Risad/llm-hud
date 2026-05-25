import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import { useWorkspaces } from '../hooks/useUsageQuery'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

export default function WorkspaceSelector() {
  const { activeWorkspaceId, setActiveWorkspaceId, workspaces } = useStore(useShallow(s => ({
    activeWorkspaceId: s.activeWorkspaceId,
    setActiveWorkspaceId: s.setActiveWorkspaceId,
    workspaces: s.workspaces,
  })))
  useWorkspaces()

  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const active = workspaces.find(w => w.id === activeWorkspaceId)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-surface-border/20 transition-colors text-left"
      >
        {active ? (
          <>
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ background: active.color }}
            />
            <span className="text-sm text-slate-100 flex-1 truncate">{active.name}</span>
          </>
        ) : (
          <span className="text-sm text-slate-400 flex-1">Select workspace…</span>
        )}
        <ChevronDown size={14} className="text-slate-500" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface-card border border-surface-border rounded-lg shadow-xl z-50 overflow-hidden">
          {workspaces.length === 0 ? (
            <p className="px-3 py-2 text-xs text-slate-500">No workspaces yet</p>
          ) : (
            workspaces.map(ws => (
              <button
                key={ws.id}
                onClick={() => { setActiveWorkspaceId(ws.id); setOpen(false) }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-surface-border/20 text-left transition-colors"
              >
                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: ws.color }} />
                <span className="truncate text-slate-100">{ws.name}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
