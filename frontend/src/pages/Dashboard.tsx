import React from 'react'
import { RefreshCw, TrendingUp, Zap, DollarSign, Archive, Wallet } from 'lucide-react'
import { useAnalytics, useAPIKeys, useBalance, useTriggerFetch } from '../hooks/useUsageQuery'
import { useStore } from '../store'
import TimeFramePicker from '../components/TimeFramePicker'
import TokenTimeSeriesChart from '../components/charts/TokenTimeSeriesChart'
import CostByModelChart from '../components/charts/CostByModelChart'
import BalanceTrendChart from '../components/charts/BalanceTrendChart'
import type { ProjectRow } from '../api/client'

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

// Project name with hover tooltip showing the project ID
function ProjectName({ row }: { row: ProjectRow }) {
  const name = row.project_name
  const pid  = row.project_id
  const isDifferent = name !== pid && name !== 'unknown'
  return (
    <span className="group relative inline-block cursor-default">
      <span className={`font-mono text-xs ${name === 'unknown' ? 'text-slate-500 italic' : 'text-slate-300'}`}>
        {name}
      </span>
      {isDifferent && (
        <span className="absolute left-0 top-full mt-1 z-50 hidden group-hover:flex flex-col gap-0.5 bg-slate-800 border border-surface-border rounded-lg px-2 py-1.5 text-xs whitespace-nowrap shadow-lg">
          <span className="text-slate-400 font-mono">{pid}</span>
          {row.project_status && (
            <span className={row.project_status === 'active' ? 'text-emerald-400' : 'text-slate-500'}>
              {row.project_status}
            </span>
          )}
        </span>
      )}
    </span>
  )
}

export default function Dashboard() {
  const activeWorkspaceId = useStore(s => s.activeWorkspaceId)
  const { data: analytics, isLoading, error, refetch } = useAnalytics()
  const { data: keys } = useAPIKeys(activeWorkspaceId)
  const { data: balances } = useBalance(activeWorkspaceId)
  const triggerFetch = useTriggerFetch()

  const latestBalance = analytics?.latest_balance
  const activeKeys = keys?.filter(k => k.is_active) ?? []

  const handleManualFetch = () => {
    activeKeys.forEach(k => triggerFetch.mutate(k.id))
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-100">Dashboard</h1>
          <p className="text-xs text-slate-400 mt-0.5">Token usage overview</p>
        </div>
        <div className="flex items-center gap-3">
          <TimeFramePicker />
          <button
            onClick={handleManualFetch}
            disabled={triggerFetch.isPending || activeKeys.length === 0}
            className="btn-ghost flex items-center gap-1.5 text-xs"
          >
            <RefreshCw size={13} className={triggerFetch.isPending ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="card border-red-900/50 bg-red-900/10 text-red-400 text-sm">
          Failed to load analytics. Check that the backend is running.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<Zap size={16} className="text-accent" />}
          label="Total tokens"
          value={isLoading ? '…' : fmt(analytics?.total_tokens ?? 0)}
          sub={`In: ${fmt(analytics?.input_tokens ?? 0)}  Out: ${fmt(analytics?.output_tokens ?? 0)}`}
        />
        <StatCard
          icon={<DollarSign size={16} className="text-violet-400" />}
          label="Total cost"
          value={isLoading ? '…' : `$${analytics?.total_cost_usd?.toFixed(4) ?? '0.0000'}`}
          sub={`${analytics?.by_model?.length ?? 0} models used`}
        />
        <StatCard
          icon={<Archive size={16} className="text-cyan-400" />}
          label="Cached tokens"
          value={isLoading ? '…' : fmt(analytics?.cached_tokens ?? 0)}
          sub="Input cache hits"
        />
        <StatCard
          icon={<Wallet size={16} className="text-emerald-400" />}
          label="Balance"
          value={latestBalance ? `$${latestBalance.balance_usd.toFixed(2)}` : '—'}
          sub={latestBalance?.expiry_date ? `Expires ${new Date(latestBalance.expiry_date).toLocaleDateString()}` : 'Pay-as-you-go'}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="card lg:col-span-2 h-72">
          <h3 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
            <TrendingUp size={13} /> Token consumption
          </h3>
          <div className="h-56">
            {analytics ? (
              <TokenTimeSeriesChart data={analytics.by_day} />
            ) : (
              <Skeleton />
            )}
          </div>
        </div>

        <div className="card h-72">
          <h3 className="text-xs font-semibold text-slate-400 mb-3">Cost by model</h3>
          <div className="h-56">
            {analytics ? (
              <CostByModelChart data={analytics.by_model} mode="cost" />
            ) : (
              <Skeleton />
            )}
          </div>
        </div>
      </div>

      {/* Balance trend */}
      {balances && balances.length > 1 && (
        <div className="card h-52">
          <h3 className="text-xs font-semibold text-slate-400 mb-3 flex items-center gap-1.5">
            <Wallet size={13} /> Balance trend
          </h3>
          <div className="h-36">
            <BalanceTrendChart data={balances} />
          </div>
        </div>
      )}

      {/* Project breakdown */}
      {analytics && analytics.by_project.length > 0 && (
        <div className="card">
          <h3 className="text-xs font-semibold text-slate-400 mb-3">Token consumption by project</h3>
          <div className="space-y-2">
            {analytics.by_project.map(p => {
              const pct = analytics.total_tokens > 0
                ? (p.tokens / analytics.total_tokens) * 100
                : 0
              return (
                <div key={p.project_id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <ProjectName row={p} />
                    <span className="text-slate-400 ml-2 flex-shrink-0">
                      {fmt(p.tokens)} tokens · ${p.cost.toFixed(4)}
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-border rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-dim rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Active keys table */}
      <div className="card">
        <h3 className="text-xs font-semibold text-slate-400 mb-3">Active API keys</h3>
        {activeKeys.length === 0 ? (
          <p className="text-sm text-slate-500">No active keys in this workspace.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 border-b border-surface-border">
                <th className="text-left pb-2 font-medium">Label</th>
                <th className="text-left pb-2 font-medium">Provider</th>
                <th className="text-left pb-2 font-medium">Key</th>
                <th className="text-right pb-2 font-medium">Poll interval</th>
              </tr>
            </thead>
            <tbody>
              {activeKeys.map(k => (
                <tr key={k.id} className="border-b border-surface-border/50 hover:bg-surface-border/10">
                  <td className="py-2 text-slate-200">{k.label}</td>
                  <td className="py-2 text-slate-400 capitalize">{k.provider}</td>
                  <td className="py-2 text-slate-500 font-mono">…{k.key_hint}</td>
                  <td className="py-2 text-right text-slate-400">
                    {k.poll_interval_seconds < 60 ? `${k.poll_interval_seconds}s` :
                     k.poll_interval_seconds < 3600 ? `${k.poll_interval_seconds / 60}m` :
                     `${k.poll_interval_seconds / 3600}h`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <div className="stat-card">
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="stat-label">{label}</span>
      </div>
      <span className="stat-value">{value}</span>
      {sub && <span className="text-xs text-slate-500">{sub}</span>}
    </div>
  )
}

function Skeleton() {
  return <div className="w-full h-full rounded-lg bg-surface-border/30 animate-pulse" />
}
