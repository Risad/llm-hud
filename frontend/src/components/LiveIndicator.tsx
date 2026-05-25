import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'
import { useMemo } from 'react'
import clsx from 'clsx'

export default function LiveIndicator() {
  const { liveMode, setLiveMode, lastEvent } = useStore(useShallow(s => ({
    liveMode: s.liveMode,
    setLiveMode: s.setLiveMode,
    lastEvent: s.lastEvent,
  })))

  const lastEventLabel = useMemo(() => {
    if (!lastEvent) return null
    const e = lastEvent as { event?: string; records_saved?: number }
    if (e.event === 'usage_update') return `+${e.records_saved ?? 0} records`
    if (e.event === 'backfill_complete') return `Backfill: +${e.records_saved ?? 0}`
    return null
  }, [lastEvent])

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={() => setLiveMode(!liveMode)}
        className={clsx(
          'flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-colors w-full',
          liveMode ? 'bg-emerald-900/40 text-emerald-400' : 'text-slate-500 hover:bg-surface-border/20'
        )}
      >
        <span className={clsx('w-2 h-2 rounded-full', liveMode ? 'bg-emerald-400 animate-pulse' : 'bg-slate-600')} />
        {liveMode ? 'Live mode on' : 'Live mode off'}
      </button>
      {lastEventLabel && (
        <p className="text-xs text-slate-500 px-2 truncate">{lastEventLabel}</p>
      )}
    </div>
  )
}
