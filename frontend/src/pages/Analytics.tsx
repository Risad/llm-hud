import { useState } from 'react'
import { useAnalytics, useRefreshProjects } from '../hooks/useUsageQuery'
import TimeFramePicker from '../components/TimeFramePicker'
import TokenTimeSeriesChart from '../components/charts/TokenTimeSeriesChart'
import CostByModelChart from '../components/charts/CostByModelChart'
import UsageHeatmap from '../components/charts/UsageHeatmap'
import ModelComparisonChart from '../components/charts/ModelComparisonChart'
import { formatModelName } from '../utils/modelNames'
import { RefreshCw } from 'lucide-react'
import type { ProjectRow, ProjectModelRow } from '../api/client'

type ChartMode = 'tokens' | 'cost'

// Tooltip helper: shows project ID and status on hover over the project name
function ProjectCell({ row }: { row: ProjectRow | ProjectModelRow }) {
  const pid = row.project_id
  const name = 'project_name' in row ? row.project_name : pid
  const status = 'project_status' in row ? row.project_status : null
  const isDifferent = name !== pid

  return (
    <span className="group relative inline-block cursor-default">
      <span className={`font-mono text-xs ${name === 'unknown' ? 'text-slate-500 italic' : 'text-slate-200'}`}>
        {name}
      </span>
      {isDifferent && (
        <span className="absolute left-0 top-full mt-1 z-50 hidden group-hover:flex flex-col gap-0.5 bg-slate-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs whitespace-nowrap shadow-lg">
          <span className="text-slate-400 font-mono">{pid}</span>
          {status && (
            <span className={status === 'active' ? 'text-emerald-400' : 'text-slate-500'}>
              {status}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

export default function Analytics() {
  const { data, isLoading } = useAnalytics()
  const refreshProjects = useRefreshProjects()
  const [chartMode, setChartMode] = useState<ChartMode>('tokens')
  const [pivotMode, setPivotMode] = useState<'project-rows' | 'model-rows'>('project-rows')

  const hasUnresolvedProjects = data?.by_project.some(
    p => p.project_name === p.project_id && p.project_id.startsWith('proj_')
  ) ?? false

  // Build a pivot structure: rows = projects, columns = models (or vice-versa)
  const buildPivot = (rows: ProjectModelRow[]) => {
    const projects = [...new Set(rows.map(r => r.project_id))]
    const models   = [...new Set(rows.map(r => r.model))]
    // project → model → {tokens, cost}
    const matrix: Record<string, Record<string, { tokens: number; cost: number }>> = {}
    for (const r of rows) {
      if (!matrix[r.project_id]) matrix[r.project_id] = {}
      matrix[r.project_id][r.model] = { tokens: r.tokens, cost: r.cost }
    }
    return { projects, models, matrix }
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Analytics</h1>
          <p className="text-xs text-slate-400 mt-0.5">Deep-dive usage breakdown</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-lg p-1">
            {(['tokens', 'cost'] as ChartMode[]).map(m => (
              <button
                key={m}
                onClick={() => setChartMode(m)}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors capitalize ${
                  chartMode === m ? 'bg-accent-dim text-white' : 'text-slate-400 hover:text-slate-100'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <TimeFramePicker />
        </div>
      </div>

      {!data && isLoading && (
        <div className="grid grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-64 animate-pulse bg-surface-card/50" />
          ))}
        </div>
      )}

      {data && (
        <>
          {hasUnresolvedProjects && (
            <div className="flex items-center justify-between bg-amber-900/10 border border-amber-800/40 rounded-lg px-4 py-2.5 text-xs text-amber-300">
              <span>Project IDs are showing instead of names — sync project names from OpenAI.</span>
              <button
                className="flex items-center gap-1.5 ml-4 text-amber-300 hover:text-amber-100 font-medium shrink-0"
                disabled={refreshProjects.isPending}
                onClick={() => refreshProjects.mutate()}
              >
                <RefreshCw size={12} className={refreshProjects.isPending ? 'animate-spin' : ''} />
                {refreshProjects.isPending ? 'Syncing…' : 'Sync now'}
              </button>
            </div>
          )}

          {/* Token / Cost over time */}
          <div className="card h-72">
            <h3 className="text-xs font-semibold text-slate-400 mb-3">
              {chartMode === 'tokens' ? 'Token consumption over time' : 'Cost over time (USD)'}
            </h3>
            <div className="h-56">
              <TokenTimeSeriesChart data={data.by_day} showCost={chartMode === 'cost'} />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Donut breakdown */}
            <div className="card h-72">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">
                {chartMode === 'tokens' ? 'Tokens by model' : 'Cost by model'}
              </h3>
              <div className="h-56">
                <CostByModelChart data={data.by_model} mode={chartMode} />
              </div>
            </div>

            {/* Model comparison bar */}
            <div className="card h-72">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">Model comparison</h3>
              <div className="h-56">
                <ModelComparisonChart data={data.by_model} />
              </div>
            </div>
          </div>

          {/* Heatmap */}
          <div className="card" style={{ height: '220px' }}>
            <h3 className="text-xs font-semibold text-slate-400 mb-3">Daily activity heatmap</h3>
            <div className="h-44">
              <UsageHeatmap data={data.by_day} />
            </div>
          </div>

          {/* Model breakdown table */}
          <div className="card overflow-x-auto">
            <h3 className="text-xs font-semibold text-slate-400 mb-3">Breakdown by model</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 border-b border-surface-border">
                  <th className="text-left pb-2 font-medium">Model</th>
                  <th className="text-right pb-2 font-medium">Input</th>
                  <th className="text-right pb-2 font-medium">Output</th>
                  <th className="text-right pb-2 font-medium">Total tokens</th>
                  <th className="text-right pb-2 font-medium">Cost (USD)</th>
                  <th className="text-right pb-2 font-medium">% cost</th>
                </tr>
              </thead>
              <tbody>
                {data.by_model.map(row => (
                  <tr key={row.model} className="border-b border-surface-border/40 hover:bg-surface-border/10">
                    <td className="py-2 text-slate-200 font-mono text-xs" title={row.model}>{formatModelName(row.model)}</td>
                    <td className="py-2 text-right text-slate-400 text-xs">{row.input_tokens.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-400 text-xs">{row.output_tokens.toLocaleString()}</td>
                    <td className="py-2 text-right text-slate-300">{row.tokens.toLocaleString()}</td>
                    <td className="py-2 text-right text-violet-300">${row.cost.toFixed(4)}</td>
                    <td className="py-2 text-right text-slate-400">
                      {data.total_cost_usd > 0 ? ((row.cost / data.total_cost_usd) * 100).toFixed(1) + '%' : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="text-xs font-semibold text-slate-400">
                  <td className="py-2">Total</td>
                  <td className="py-2 text-right">{data.input_tokens.toLocaleString()}</td>
                  <td className="py-2 text-right">{data.output_tokens.toLocaleString()}</td>
                  <td className="py-2 text-right">{data.total_tokens.toLocaleString()}</td>
                  <td className="py-2 text-right text-violet-300">${data.total_cost_usd.toFixed(4)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Project breakdown */}
          {data.by_project.length > 0 && (
            <div className="card overflow-x-auto">
              <h3 className="text-xs font-semibold text-slate-400 mb-3">Breakdown by project</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-slate-500 border-b border-surface-border">
                    <th className="text-left pb-2 font-medium">Project</th>
                    <th className="text-right pb-2 font-medium">Input tokens</th>
                    <th className="text-right pb-2 font-medium">Output tokens</th>
                    <th className="text-right pb-2 font-medium">Total tokens</th>
                    <th className="text-right pb-2 font-medium">Cost (USD)</th>
                    <th className="text-right pb-2 font-medium">% of total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.by_project.map(p => (
                    <tr key={p.project_id} className="border-b border-surface-border/40 hover:bg-surface-border/10">
                      <td className="py-2"><ProjectCell row={p} /></td>
                      <td className="py-2 text-right text-slate-400 text-xs">{p.input_tokens.toLocaleString()}</td>
                      <td className="py-2 text-right text-slate-400 text-xs">{p.output_tokens.toLocaleString()}</td>
                      <td className="py-2 text-right text-slate-300">{p.tokens.toLocaleString()}</td>
                      <td className="py-2 text-right text-violet-300">${p.cost.toFixed(4)}</td>
                      <td className="py-2 text-right text-slate-400">
                        {data.total_tokens > 0 ? ((p.tokens / data.total_tokens) * 100).toFixed(1) + '%' : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="text-xs font-semibold text-slate-400">
                    <td className="py-2">Total</td>
                    <td className="py-2 text-right">{data.input_tokens.toLocaleString()}</td>
                    <td className="py-2 text-right">{data.output_tokens.toLocaleString()}</td>
                    <td className="py-2 text-right">{data.total_tokens.toLocaleString()}</td>
                    <td className="py-2 text-right text-violet-300">${data.total_cost_usd.toFixed(4)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>

              {/* Per-project cost bars */}
              <div className="mt-4 space-y-2">
                {data.by_project.map(p => {
                  const pct = data.total_tokens > 0 ? (p.tokens / data.total_tokens) * 100 : 0
                  return (
                    <div key={p.project_id}>
                      <div className="flex justify-between text-xs mb-1">
                        <ProjectCell row={p} />
                        <span className="text-slate-500 ml-2 flex-shrink-0">{pct.toFixed(1)}%</span>
                      </div>
                      <div className="h-2 bg-surface-border rounded-full overflow-hidden">
                        <div className="h-full bg-accent-dim rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Project × Model pivot ──────────────────────────────────────── */}
          {data.projects_by_model.length > 0 && (
            <div className="card overflow-x-auto">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xs font-semibold text-slate-400">Project × Model usage</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Which models each project consumes</p>
                </div>
                <div className="flex items-center gap-1 bg-surface border border-surface-border rounded-lg p-1">
                  {([
                    ['project-rows', 'By project'],
                    ['model-rows', 'By model'],
                  ] as const).map(([v, label]) => (
                    <button
                      key={v}
                      onClick={() => setPivotMode(v)}
                      className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                        pivotMode === v ? 'bg-accent-dim text-white' : 'text-slate-400 hover:text-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {pivotMode === 'project-rows' ? (
                <PivotByProject rows={data.projects_by_model} chartMode={chartMode} />
              ) : (
                <PivotByModel rows={data.projects_by_model} chartMode={chartMode} />
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Pivot: projects as rows, models as columns ─────────────────────────────────
function PivotByProject({ rows, chartMode }: { rows: ProjectModelRow[]; chartMode: ChartMode }) {
  const projectMap = new Map<string, { name: string; models: Map<string, { tokens: number; cost: number }> }>()
  const allModels = new Set<string>()

  for (const r of rows) {
    allModels.add(r.model)
    if (!projectMap.has(r.project_id)) {
      projectMap.set(r.project_id, { name: r.project_name, models: new Map() })
    }
    projectMap.get(r.project_id)!.models.set(r.model, { tokens: r.tokens, cost: r.cost })
  }

  const modelList = [...allModels]
  const projectList = [...projectMap.entries()]
  const totalByModel = new Map<string, number>()
  for (const m of modelList) {
    totalByModel.set(m, rows.filter(r => r.model === m).reduce((s, r) => s + (chartMode === 'cost' ? r.cost : r.tokens), 0))
  }
  // Sort models by total desc
  modelList.sort((a, b) => (totalByModel.get(b) ?? 0) - (totalByModel.get(a) ?? 0))

  const grandTotal = rows.reduce((s, r) => s + (chartMode === 'cost' ? r.cost : r.tokens), 0)

  return (
    <table className="w-full text-xs min-w-max">
      <thead>
        <tr className="text-slate-500 border-b border-surface-border">
          <th className="text-left pb-2 font-medium pr-4">Project</th>
          {modelList.map(m => { const n = formatModelName(m); return (
            <th key={m} className="text-right pb-2 font-medium px-2 max-w-28 truncate" title={m}>
              {n.length > 14 ? n.slice(0, 12) + '…' : n}
            </th>
          )}}
          <th className="text-right pb-2 font-medium px-2">Total</th>
        </tr>
      </thead>
      <tbody>
        {projectList.map(([pid, { name, models }]) => {
          const rowTotal = modelList.reduce((s, m) => {
            const v = models.get(m)
            return s + (v ? (chartMode === 'cost' ? v.cost : v.tokens) : 0)
          }, 0)
          return (
            <tr key={pid} className="border-b border-surface-border/30 hover:bg-surface-border/10">
              <td className="py-2 pr-4">
                <span className="group relative inline-block cursor-default">
                  <span className={name === 'unknown' ? 'text-slate-500 italic' : 'text-slate-200'}>
                    {name}
                  </span>
                  {name !== pid && (
                    <span className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-slate-800 border border-surface-border rounded px-2 py-1 font-mono whitespace-nowrap shadow-lg">
                      {pid}
                    </span>
                  )}
                </span>
              </td>
              {modelList.map(m => {
                const v = models.get(m)
                const val = v ? (chartMode === 'cost' ? v.cost : v.tokens) : 0
                const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0
                return (
                  <td key={m} className="py-2 px-2 text-right">
                    {val > 0 ? (
                      <span
                        className="inline-block rounded px-1 text-slate-200"
                        style={{ backgroundColor: `rgba(99,102,241,${Math.min(0.8, pct / 10 + 0.05)})` }}
                      >
                        {chartMode === 'cost' ? `$${val.toFixed(3)}` : fmtK(val)}
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                )
              })}
              <td className="py-2 px-2 text-right font-medium text-slate-300">
                {chartMode === 'cost' ? `$${rowTotal.toFixed(3)}` : fmtK(rowTotal)}
              </td>
            </tr>
          )
        })}
      </tbody>
      <tfoot>
        <tr className="text-slate-500 font-semibold border-t border-surface-border">
          <td className="py-2 pr-4">Total</td>
          {modelList.map(m => (
            <td key={m} className="py-2 px-2 text-right text-slate-400">
              {chartMode === 'cost'
                ? `$${(totalByModel.get(m) ?? 0).toFixed(3)}`
                : fmtK(totalByModel.get(m) ?? 0)}
            </td>
          ))}
          <td className="py-2 px-2 text-right text-slate-300">
            {chartMode === 'cost' ? `$${grandTotal.toFixed(3)}` : fmtK(grandTotal)}
          </td>
        </tr>
      </tfoot>
    </table>
  )
}

// ── Pivot: models as rows, projects as columns ─────────────────────────────────
function PivotByModel({ rows, chartMode }: { rows: ProjectModelRow[]; chartMode: ChartMode }) {
  const modelMap = new Map<string, Map<string, { tokens: number; cost: number }>>()
  const allProjects = new Map<string, string>()  // id → name

  for (const r of rows) {
    allProjects.set(r.project_id, r.project_name)
    if (!modelMap.has(r.model)) modelMap.set(r.model, new Map())
    modelMap.get(r.model)!.set(r.project_id, { tokens: r.tokens, cost: r.cost })
  }

  const projectList = [...allProjects.entries()]
  const modelList = [...modelMap.entries()]
  const grandTotal = rows.reduce((s, r) => s + (chartMode === 'cost' ? r.cost : r.tokens), 0)

  // Sort models by total desc
  modelList.sort((a, b) => {
    const ta = [...a[1].values()].reduce((s, v) => s + (chartMode === 'cost' ? v.cost : v.tokens), 0)
    const tb = [...b[1].values()].reduce((s, v) => s + (chartMode === 'cost' ? v.cost : v.tokens), 0)
    return tb - ta
  })

  return (
    <table className="w-full text-xs min-w-max">
      <thead>
        <tr className="text-slate-500 border-b border-surface-border">
          <th className="text-left pb-2 font-medium pr-4">Model</th>
          {projectList.map(([pid, name]) => (
            <th key={pid} className="text-right pb-2 font-medium px-2 max-w-28" title={pid}>
              {name !== pid
                ? <span className="group relative inline-block cursor-default">
                    <span>{name.length > 12 ? name.slice(0, 10) + '…' : name}</span>
                    <span className="absolute left-0 top-full mt-1 z-50 hidden group-hover:block bg-slate-800 border border-surface-border rounded px-2 py-1 font-mono whitespace-nowrap shadow-lg">{pid}</span>
                  </span>
                : pid.slice(-8)
              }
            </th>
          ))}
          <th className="text-right pb-2 font-medium px-2">Total</th>
        </tr>
      </thead>
      <tbody>
        {modelList.map(([model, projects]) => {
          const rowTotal = [...projects.values()].reduce((s, v) => s + (chartMode === 'cost' ? v.cost : v.tokens), 0)
          return (
            <tr key={model} className="border-b border-surface-border/30 hover:bg-surface-border/10">
              <td className="py-2 pr-4 font-mono text-slate-300" title={model}>{formatModelName(model)}</td>
              {projectList.map(([pid]) => {
                const v = projects.get(pid)
                const val = v ? (chartMode === 'cost' ? v.cost : v.tokens) : 0
                const pct = grandTotal > 0 ? (val / grandTotal) * 100 : 0
                return (
                  <td key={pid} className="py-2 px-2 text-right">
                    {val > 0 ? (
                      <span
                        className="inline-block rounded px-1 text-slate-200"
                        style={{ backgroundColor: `rgba(99,102,241,${Math.min(0.8, pct / 10 + 0.05)})` }}
                      >
                        {chartMode === 'cost' ? `$${val.toFixed(3)}` : fmtK(val)}
                      </span>
                    ) : (
                      <span className="text-slate-700">—</span>
                    )}
                  </td>
                )
              })}
              <td className="py-2 px-2 text-right font-medium text-slate-300">
                {chartMode === 'cost' ? `$${rowTotal.toFixed(3)}` : fmtK(rowTotal)}
              </td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function fmtK(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`
  return String(Math.round(n))
}
