import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import clsx from 'clsx'

const PRESETS = [
  { label: '1D', value: '1d' },
  { label: '7D', value: '7d' },
  { label: '30D', value: '30d' },
  { label: '90D', value: '90d' },
]

export default function TimeFramePicker() {
  const { timeRange, customStart, customEnd, setTimeRange } = useStore(useShallow(s => ({
    timeRange: s.timeRange,
    customStart: s.customStart,
    customEnd: s.customEnd,
    setTimeRange: s.setTimeRange,
  })))

  const isCustom = timeRange === 'custom'

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 bg-surface-card border border-surface-border rounded-lg p-1">
        {PRESETS.map(r => (
          <button
            key={r.value}
            onClick={() => setTimeRange(r.value)}
            className={clsx(
              'px-3 py-1 text-xs font-medium rounded transition-colors',
              timeRange === r.value
                ? 'bg-indigo-600 text-white'
                : 'text-slate-400 hover:text-slate-100'
            )}
          >
            {r.label}
          </button>
        ))}
        <button
          onClick={() => {
            const today = new Date().toISOString().slice(0, 10)
            const d30 = new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10)
            setTimeRange('custom', customStart ?? d30, customEnd ?? today)
          }}
          className={clsx(
            'px-3 py-1 text-xs font-medium rounded transition-colors',
            isCustom ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-100'
          )}
        >
          Custom
        </button>
      </div>

      {isCustom && (
        <div className="flex items-center gap-1.5 text-xs">
          <input
            type="date"
            className="input py-1 px-2 text-xs w-34"
            value={customStart ?? ''}
            max={customEnd ?? undefined}
            onChange={e => setTimeRange('custom', e.target.value, customEnd ?? undefined)}
          />
          <span className="text-slate-500">–</span>
          <input
            type="date"
            className="input py-1 px-2 text-xs w-34"
            value={customEnd ?? ''}
            min={customStart ?? undefined}
            onChange={e => setTimeRange('custom', customStart ?? undefined, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
