import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ToggleLeft, ToggleRight, RefreshCw, History, AlertCircle } from 'lucide-react'
import { useWorkspaces, useAPIKeys, useTriggerFetch, useBackfill } from '../hooks/useUsageQuery'
import { workspaceApi, apiKeyApi } from '../api/client'
import ApiKeyForm from '../components/ApiKeyForm'
import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import clsx from 'clsx'

const PRESET_COLORS = ['#6366f1', '#22d3ee', '#34d399', '#f59e0b', '#f87171', '#a78bfa', '#60a5fa', '#fb923c']

export default function Workspaces() {
  const qc = useQueryClient()
  const { activeWorkspaceId, setActiveWorkspaceId } = useStore(useShallow(s => ({
    activeWorkspaceId: s.activeWorkspaceId,
    setActiveWorkspaceId: s.setActiveWorkspaceId,
  })))
  const { data: workspaces = [] } = useWorkspaces()
  const { data: keys = [] } = useAPIKeys(activeWorkspaceId)

  const [showNewWs, setShowNewWs] = useState(false)
  const [showNewKey, setShowNewKey] = useState(false)
  const [newWsName, setNewWsName] = useState('')
  const [newWsColor, setNewWsColor] = useState('#6366f1')

  const createWs = useMutation({
    mutationFn: () => workspaceApi.create(newWsName, newWsColor),
    onSuccess: (ws) => {
      qc.invalidateQueries({ queryKey: ['workspaces'] })
      setActiveWorkspaceId(ws.id)
      setShowNewWs(false)
      setNewWsName('')
    },
  })

  const deleteWs = useMutation({
    mutationFn: (id: string) => workspaceApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['workspaces'] }) },
  })

  const deleteKey = useMutation({
    mutationFn: (id: string) => apiKeyApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }) },
  })

  const toggleKey = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      apiKeyApi.update(id, { is_active }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['api-keys'] }) },
  })

  const triggerFetch = useTriggerFetch()
  const backfill = useBackfill()
  const [fetchErrors, setFetchErrors] = useState<Record<string, string>>({})

  const activeWs = workspaces.find(w => w.id === activeWorkspaceId)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-100">Workspaces</h1>
        <button className="btn-primary flex items-center gap-1.5" onClick={() => setShowNewWs(s => !s)}>
          <Plus size={14} /> New workspace
        </button>
      </div>

      {/* New workspace form */}
      {showNewWs && (
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-slate-200">New workspace</h3>
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              placeholder="e.g. My App"
              value={newWsName}
              onChange={e => setNewWsName(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Color</label>
            <div className="flex gap-2 flex-wrap">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewWsColor(c)}
                  className={clsx(
                    'w-7 h-7 rounded-full border-2 transition-transform',
                    newWsColor === c ? 'border-white scale-110' : 'border-transparent'
                  )}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button className="btn-ghost" onClick={() => setShowNewWs(false)}>Cancel</button>
            <button
              className="btn-primary"
              disabled={!newWsName.trim() || createWs.isPending}
              onClick={() => createWs.mutate()}
            >
              {createWs.isPending ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}

      {/* Workspace list */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {workspaces.map(ws => (
          <button
            key={ws.id}
            onClick={() => setActiveWorkspaceId(ws.id)}
            className={clsx(
              'card text-left transition-all hover:border-indigo-500/50 group relative',
              ws.id === activeWorkspaceId && 'border-indigo-500/60 bg-indigo-900/10'
            )}
          >
            <div className="flex items-center gap-2 mb-1">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: ws.color }} />
              <span className="font-medium text-sm text-slate-100 truncate">{ws.name}</span>
            </div>
            <p className="text-xs text-slate-500">
              {ws.id === activeWorkspaceId ? 'Active' : 'Click to activate'}
            </p>
            <button
              onClick={e => { e.stopPropagation(); if (confirm('Delete this workspace and all its data?')) deleteWs.mutate(ws.id) }}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
            >
              <Trash2 size={13} />
            </button>
          </button>
        ))}
      </div>

      {/* API keys section */}
      {activeWs && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-300">
              API keys in <span style={{ color: activeWs.color }}>{activeWs.name}</span>
            </h2>
            <button
              className="btn-primary flex items-center gap-1.5 text-xs"
              onClick={() => setShowNewKey(s => !s)}
            >
              <Plus size={12} /> Add key
            </button>
          </div>

          {showNewKey && (
            <div className="card">
              <ApiKeyForm
                workspaceId={activeWs.id}
                onSuccess={() => setShowNewKey(false)}
                onCancel={() => setShowNewKey(false)}
              />
            </div>
          )}

          {keys.length === 0 && !showNewKey && (
            <p className="text-sm text-slate-500 card">No API keys yet. Add one to start monitoring.</p>
          )}

          <div className="space-y-2">
            {keys.map(key => (
              <div key={key.id} className="card space-y-2">
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={clsx('w-1.5 h-1.5 rounded-full', key.is_active ? 'bg-emerald-400' : 'bg-slate-600')} />
                      <span className="text-sm font-medium text-slate-200 truncate">{key.label}</span>
                      <span className="text-xs px-1.5 py-0.5 rounded bg-surface border border-surface-border text-slate-400 capitalize">
                        {key.provider}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 font-mono">…{key.key_hint}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      title="Fetch today's usage"
                      className="btn-ghost p-1.5"
                      onClick={() => triggerFetch.mutate(key.id, {
                        onSuccess: (result) => {
                          if (result.error) setFetchErrors(prev => ({ ...prev, [key.id]: result.error! }))
                          else setFetchErrors(prev => { const n = { ...prev }; delete n[key.id]; return n })
                        },
                      })}
                    >
                      <RefreshCw size={12} className={triggerFetch.isPending ? 'animate-spin' : ''} />
                    </button>
                    <button
                      title="Backfill 90 days of history"
                      className="btn-ghost p-1.5"
                      onClick={() => backfill.mutate({ apiKeyId: key.id, days: 90 }, {
                        onSuccess: (result) => {
                          if (result.error) setFetchErrors(prev => ({ ...prev, [key.id]: result.error! }))
                          else setFetchErrors(prev => { const n = { ...prev }; delete n[key.id]; return n })
                        },
                      })}
                    >
                      <History size={12} className={backfill.isPending ? 'animate-spin' : ''} />
                    </button>
                    <button
                      title={key.is_active ? 'Disable polling' : 'Enable polling'}
                      className="btn-ghost p-1.5"
                      onClick={() => toggleKey.mutate({ id: key.id, is_active: !key.is_active })}
                    >
                      {key.is_active
                        ? <ToggleRight size={16} className="text-emerald-400" />
                        : <ToggleLeft size={16} className="text-slate-500" />
                      }
                    </button>
                    <button
                      title="Delete key"
                      className="btn-ghost p-1.5 text-slate-500 hover:text-red-400"
                      onClick={() => { if (confirm('Delete this key?')) deleteKey.mutate(key.id) }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                {fetchErrors[key.id] && (
                  <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-900/20 border border-amber-800/40 rounded p-2">
                    <AlertCircle size={12} className="flex-shrink-0 mt-0.5" />
                    <span>{fetchErrors[key.id]}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
