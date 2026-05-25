import React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi } from '../api/client'
import { useState } from 'react'
import {
  Save, RotateCcw, Plus, Trash2, AlertTriangle, RefreshCw,
  Sun, Moon, Palette, Pencil, Check, X, type LucideProps,
} from 'lucide-react'
import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import { useRefreshProjects } from '../hooks/useUsageQuery'
import type { Theme } from '../store'

const EMPTY_PRICES = { input: '', output: '', cached: '' }

const ACCENT_PRESETS = [
  { label: 'Indigo',  hex: '#6366f1' },
  { label: 'Violet',  hex: '#8b5cf6' },
  { label: 'Sky',     hex: '#0ea5e9' },
  { label: 'Teal',    hex: '#14b8a6' },
  { label: 'Emerald', hex: '#10b981' },
  { label: 'Rose',    hex: '#f43f5e' },
  { label: 'Amber',   hex: '#f59e0b' },
]

export default function SettingsPage() {
  const qc = useQueryClient()

  // ── Theme state ─────────────────────────────────────────────────────────────
  const { theme, accentHex, setTheme, setAccentHex } = useStore(useShallow(s => ({
    theme: s.theme,
    accentHex: s.accentHex,
    setTheme: s.setTheme,
    setAccentHex: s.setAccentHex,
  })))
  const activeWorkspaceId = useStore(s => s.activeWorkspaceId)

  // ── Pricing state ────────────────────────────────────────────────────────────
  const [activeOnly, setActiveOnly] = useState(true)
  const { data: prices, isLoading: pricesLoading } = useQuery({
    queryKey: ['prices', activeOnly],
    queryFn: () => settingsApi.getPrices(activeOnly),
  })
  const { data: unknownData } = useQuery({
    queryKey: ['unknown-models'],
    queryFn: settingsApi.getUnknownModels,
    refetchInterval: 30_000,
  })
  const unknownModels = unknownData?.models ?? []

  const [editing, setEditing] = useState<string | null>(null)
  const [editValues, setEditValues] = useState(EMPTY_PRICES)
  const [showAddForm, setShowAddForm] = useState(false)
  const [newModel, setNewModel] = useState('')
  const [newPrices, setNewPrices] = useState(EMPTY_PRICES)

  const saveMutation = useMutation({
    mutationFn: ({ model, input, output, cached }: { model: string; input: number; output: number; cached: number }) =>
      settingsApi.updatePrice(model, input, output, cached),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prices'] })
      qc.invalidateQueries({ queryKey: ['unknown-models'] })
      setEditing(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (model: string) => settingsApi.deletePrice(model),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['prices'] }),
  })

  const addMutation = useMutation({
    mutationFn: ({ model, input, output, cached }: { model: string; input: number; output: number; cached: number }) =>
      settingsApi.updatePrice(model, input, output, cached),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prices'] })
      qc.invalidateQueries({ queryKey: ['unknown-models'] })
      setShowAddForm(false)
      setNewModel('')
      setNewPrices(EMPTY_PRICES)
    },
  })

  const startEdit = (model: string, p: { input: number; output: number; cached: number }) => {
    setEditing(model)
    setEditValues({ input: String(p.input), output: String(p.output), cached: String(p.cached) })
  }

  // ── Projects state ───────────────────────────────────────────────────────────
  const { data: projectsData, isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: settingsApi.getProjects,
  })
  const projects = projectsData?.projects ?? []
  const refreshProjects = useRefreshProjects()
  const [editingProject, setEditingProject] = useState<string | null>(null)
  const [projectAlias, setProjectAlias] = useState('')

  const patchProjectMutation = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => settingsApi.patchProject(id, name),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['analytics'] })
      setEditingProject(null)
    },
  })

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-100">Settings</h1>
        <p className="text-xs text-slate-400 mt-0.5">Pricing, projects, and appearance</p>
      </div>

      {/* ── Appearance ──────────────────────────────────────────────────────── */}
      <div className="card space-y-5">
        <h2 className="text-sm font-semibold text-slate-200">Appearance</h2>

        {/* Dark / Light toggle */}
        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 w-24">Theme</span>
          <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-1">
            {([['dark', Moon], ['light', Sun]] as [Theme, React.FC<LucideProps>][]).map(([t, Icon]) => (
              <button
                key={t}
                onClick={() => setTheme(t)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors capitalize ${
                  theme === t
                    ? 'bg-accent-dim text-white'
                    : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                <Icon size={12} />
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Accent color */}
        <div className="flex items-start gap-4">
          <span className="text-xs text-slate-400 w-24 pt-1">Accent color</span>
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {ACCENT_PRESETS.map(({ label, hex }) => (
                <button
                  key={hex}
                  title={label}
                  onClick={() => setAccentHex(hex)}
                  className="w-7 h-7 rounded-full border-2 transition-all"
                  style={{
                    backgroundColor: hex,
                    borderColor: accentHex === hex ? 'white' : 'transparent',
                    transform: accentHex === hex ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Palette size={13} className="text-slate-500" />
              <span className="text-xs text-slate-500">Custom:</span>
              <input
                type="color"
                value={accentHex}
                onChange={e => setAccentHex(e.target.value)}
                className="w-8 h-6 rounded cursor-pointer border border-surface-border bg-transparent"
              />
              <span className="text-xs font-mono text-slate-400">{accentHex}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Projects ────────────────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">OpenAI Projects</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Fetch project names from your OpenAI organization. Names are shown instead of IDs throughout the app.
            </p>
          </div>
          <button
            className="btn-ghost flex items-center gap-1.5 text-xs"
            disabled={refreshProjects.isPending}
            onClick={() => refreshProjects.mutate()}
          >
            <RefreshCw size={12} className={refreshProjects.isPending ? 'animate-spin' : ''} />
            {refreshProjects.isPending ? 'Fetching…' : 'Sync from OpenAI'}
          </button>
        </div>

        {refreshProjects.error && (
          <div className="text-xs text-red-400 bg-red-900/10 border border-red-900/30 rounded-lg px-3 py-2">
            {(refreshProjects.error as Error).message}
          </div>
        )}

        {projectsLoading && <div className="animate-pulse h-16 bg-surface-border/20 rounded-lg" />}

        {projects.length === 0 && !projectsLoading && (
          <p className="text-xs text-slate-500">
            No projects cached yet. Click "Sync from OpenAI" to fetch them.
          </p>
        )}

        {projects.length > 0 && (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-surface-border">
                <th className="text-left pb-2 font-medium">Name / Alias</th>
                <th className="text-left pb-2 font-medium">Project ID</th>
                <th className="text-left pb-2 font-medium">Status</th>
                <th className="pb-2 w-16" />
              </tr>
            </thead>
            <tbody>
              {projects.map(p => (
                <tr key={p.id} className="border-b border-surface-border/30 group">
                  <td className="py-2 text-slate-200 font-medium">
                    {editingProject === p.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          className="input py-1 text-xs w-40"
                          value={projectAlias}
                          onChange={e => setProjectAlias(e.target.value)}
                          autoFocus
                        />
                        <button
                          className="text-emerald-400 hover:text-emerald-300 p-1"
                          onClick={() => patchProjectMutation.mutate({ id: p.id, name: projectAlias })}
                        >
                          <Check size={13} />
                        </button>
                        <button
                          className="text-slate-500 hover:text-slate-300 p-1"
                          onClick={() => setEditingProject(null)}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ) : (
                      <span>{p.name}</span>
                    )}
                  </td>
                  <td className="py-2 font-mono text-xs text-slate-500">{p.id}</td>
                  <td className="py-2">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      p.status === 'active'
                        ? 'bg-emerald-900/30 text-emerald-400'
                        : 'bg-slate-700/50 text-slate-400'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="py-2 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                    {editingProject !== p.id && (
                      <button
                        className="btn-ghost text-xs py-1 px-2"
                        onClick={() => { setEditingProject(p.id); setProjectAlias(p.name) }}
                      >
                        <Pencil size={11} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Unknown models banner ────────────────────────────────────────────── */}
      {unknownModels.length > 0 && (
        <div className="card border-amber-800/40 bg-amber-900/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <AlertTriangle size={14} />
            <span className="text-sm font-semibold">New models detected — cost shown as $0.00</span>
          </div>
          <p className="text-xs text-slate-400">
            These models appeared in your usage data but have no configured price. Click to add pricing.
          </p>
          <div className="flex flex-wrap gap-2">
            {unknownModels.map(m => (
              <button
                key={m}
                className="text-xs font-mono bg-amber-900/30 border border-amber-700/40 text-amber-300 px-2 py-1 rounded hover:bg-amber-900/50 transition-colors"
                onClick={() => { setShowAddForm(true); setNewModel(m) }}
              >
                {m} →
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Model pricing table ──────────────────────────────────────────────── */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-200">Model pricing (per 1M tokens, USD)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Prices persist to disk. OpenAI doesn't expose a pricing API — update manually when rates change.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={activeOnly}
                onChange={e => setActiveOnly(e.target.checked)}
                className="rounded"
              />
              Active models only
            </label>
            <button
              className="btn-primary flex items-center gap-1.5 text-xs"
              onClick={() => setShowAddForm(s => !s)}
            >
              <Plus size={12} /> Add model
            </button>
          </div>
        </div>

        {/* Add model form */}
        {showAddForm && (
          <div className="border border-accent/30 rounded-lg p-3 space-y-3 bg-accent/5">
            <h3 className="text-xs font-semibold text-slate-300">New model</h3>
            <div>
              <label className="label">Model name (exact string from usage data)</label>
              <input
                className="input"
                placeholder="e.g. gpt-4o-2025-01-01"
                value={newModel}
                onChange={e => setNewModel(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(['input', 'output', 'cached'] as const).map(field => (
                <div key={field}>
                  <label className="label capitalize">{field} $</label>
                  <input
                    className="input text-right"
                    placeholder="0.00"
                    value={newPrices[field]}
                    onChange={e => setNewPrices(v => ({ ...v, [field]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button className="btn-ghost text-xs" onClick={() => { setShowAddForm(false); setNewModel(''); setNewPrices(EMPTY_PRICES) }}>
                Cancel
              </button>
              <button
                className="btn-primary text-xs flex items-center gap-1"
                disabled={!newModel.trim() || addMutation.isPending}
                onClick={() => addMutation.mutate({
                  model: newModel.trim(),
                  input: Number(newPrices.input) || 0,
                  output: Number(newPrices.output) || 0,
                  cached: Number(newPrices.cached) || 0,
                })}
              >
                <Save size={11} /> {addMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}

        {pricesLoading && <div className="animate-pulse h-32 bg-surface-border/20 rounded-lg" />}

        {prices && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-surface-border">
                  <th className="text-left pb-2 font-medium">Model</th>
                  <th className="text-right pb-2 font-medium">Input $</th>
                  <th className="text-right pb-2 font-medium">Output $</th>
                  <th className="text-right pb-2 font-medium">Cached $</th>
                  <th className="pb-2 w-20" />
                </tr>
              </thead>
              <tbody>
                {Object.entries(prices).map(([model, p]) => (
                  <tr key={model} className="border-b border-surface-border/30 group">
                    <td className="py-2 font-mono text-xs text-slate-300">{model}</td>
                    {editing === model ? (
                      <>
                        {(['input', 'output', 'cached'] as const).map(field => (
                          <td key={field} className="py-1 pr-1">
                            <input
                              className="input text-right"
                              value={editValues[field]}
                              onChange={e => setEditValues(v => ({ ...v, [field]: e.target.value }))}
                            />
                          </td>
                        ))}
                        <td className="py-1">
                          <div className="flex gap-1 justify-end">
                            <button
                              className="btn-primary flex items-center gap-1 text-xs py-1"
                              onClick={() => saveMutation.mutate({
                                model,
                                input: Number(editValues.input),
                                output: Number(editValues.output),
                                cached: Number(editValues.cached),
                              })}
                            >
                              <Save size={11} /> Save
                            </button>
                            <button className="btn-ghost text-xs py-1" onClick={() => setEditing(null)}>
                              <RotateCcw size={11} />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 text-right text-slate-300">{p.input}</td>
                        <td className="py-2 text-right text-slate-300">{p.output}</td>
                        <td className="py-2 text-right text-slate-300">{p.cached}</td>
                        <td className="py-2 text-right">
                          <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                            <button className="btn-ghost text-xs py-1 px-2" onClick={() => startEdit(model, p)}>
                              Edit
                            </button>
                            <button
                              className="btn-ghost text-xs py-1 px-1 text-slate-500 hover:text-red-400"
                              title="Remove override"
                              onClick={() => { if (confirm(`Remove price override for ${model}?`)) deleteMutation.mutate(model) }}
                            >
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {Object.keys(prices).length === 0 && (
              <p className="text-xs text-slate-500 py-4 text-center">
                {activeOnly ? 'No usage records yet — uncheck "Active models only" to see all.' : 'No prices configured.'}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── About ───────────────────────────────────────────────────────────── */}
      <div className="card space-y-3 text-sm">
        <h2 className="text-sm font-semibold text-slate-200">About LLM HUD</h2>
        <ul className="space-y-1 text-slate-400 text-xs">
          <li>• API keys are encrypted at rest using AES-128 (Fernet). Encryption key lives at <code className="bg-surface px-1 rounded">~/.llm-hud/secret.key</code>.</li>
          <li>• Raw API keys are never returned by the backend after saving.</li>
          <li>• The app binds to <code className="bg-surface px-1 rounded">127.0.0.1</code> only by default.</li>
          <li>• "Real-time" monitoring is frequent polling (min 30s). OpenAI does not offer usage webhooks.</li>
          <li>• Data is stored locally in <code className="bg-surface px-1 rounded">~/.llm-hud/llm_hud.db</code>. Swap <code className="bg-surface px-1 rounded">DATABASE_URL</code> in <code className="bg-surface px-1 rounded">.env</code> to use PostgreSQL.</li>
          <li>• Price overrides and project names are saved to <code className="bg-surface px-1 rounded">~/.llm-hud/</code> and persist across restarts.</li>
        </ul>
      </div>
    </div>
  )
}

