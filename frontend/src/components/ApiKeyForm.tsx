import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiKeyApi } from '../api/client'
import { Eye, EyeOff, Loader2, CheckCircle, XCircle } from 'lucide-react'
import clsx from 'clsx'

const PROVIDERS = ['openai', 'anthropic', 'gemini', 'glm'] as const
const INTERVALS = [
  { label: '30 seconds (live)', value: 30 },
  { label: '1 minute', value: 60 },
  { label: '5 minutes', value: 300 },
  { label: '15 minutes', value: 900 },
  { label: '30 minutes', value: 1800 },
  { label: '1 hour', value: 3600 },
  { label: '6 hours', value: 21600 },
  { label: '12 hours', value: 43200 },
  { label: '24 hours', value: 86400 },
]

interface Props {
  workspaceId: string
  onSuccess?: () => void
  onCancel?: () => void
}

export default function ApiKeyForm({ workspaceId, onSuccess, onCancel }: Props) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    provider: 'openai' as typeof PROVIDERS[number],
    label: '',
    api_key: '',
    poll_interval_seconds: 3600,
  })
  const [showKey, setShowKey] = useState(false)

  const mutation = useMutation({
    mutationFn: () => apiKeyApi.create({ workspace_id: workspaceId, ...form }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['api-keys'] })
      onSuccess?.()
    },
  })

  const isStub = form.provider !== 'openai'

  return (
    <form
      onSubmit={e => { e.preventDefault(); mutation.mutate() }}
      className="space-y-4"
    >
      <div>
        <label className="label">Provider</label>
        <div className="flex gap-2 flex-wrap">
          {PROVIDERS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => setForm(f => ({ ...f, provider: p }))}
              className={clsx(
                'px-3 py-1.5 text-xs rounded-lg border transition-colors capitalize',
                form.provider === p
                  ? 'border-indigo-500 bg-indigo-600/20 text-indigo-300'
                  : 'border-surface-border text-slate-400 hover:text-slate-200'
              )}
            >
              {p}
            </button>
          ))}
        </div>
        {isStub && (
          <p className="text-xs text-amber-500 mt-1">
            {form.provider} provider is not yet implemented (coming soon).
          </p>
        )}
      </div>

      <div>
        <label className="label">Label</label>
        <input
          className="input"
          placeholder="e.g. Production Key"
          value={form.label}
          onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
          required
        />
      </div>

      <div>
        <label className="label">API Key</label>
        <div className="relative">
          <input
            className="input pr-10"
            type={showKey ? 'text' : 'password'}
            placeholder={form.provider === 'openai' ? 'sk-...' : 'API key'}
            value={form.api_key}
            onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
            required
          />
          <button
            type="button"
            onClick={() => setShowKey(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
          >
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
        <p className="text-xs text-slate-500 mt-1">Stored encrypted locally. Never sent to any server except the provider.</p>
      </div>

      <div>
        <label className="label">Poll interval</label>
        <select
          className="input"
          value={form.poll_interval_seconds}
          onChange={e => setForm(f => ({ ...f, poll_interval_seconds: Number(e.target.value) }))}
        >
          {INTERVALS.map(i => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
        {form.poll_interval_seconds === 30 && (
          <p className="text-xs text-amber-500 mt-1">
            Frequent polling (30s) will make many API requests. Use only for temporary monitoring.
          </p>
        )}
      </div>

      {mutation.isError && (
        <div className="flex items-center gap-2 text-red-400 text-sm">
          <XCircle size={14} />
          Failed to save key. Check the label and API key.
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2">
        {onCancel && (
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary flex items-center gap-2" disabled={mutation.isPending || isStub}>
          {mutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
          {mutation.isPending ? 'Saving…' : 'Save & backfill'}
        </button>
      </div>
    </form>
  )
}
