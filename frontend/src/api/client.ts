import axios from 'axios'

export const api = axios.create({ baseURL: '/api' })

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string
  name: string
  color: string
  created_at: string
}

export interface APIKey {
  id: string
  workspace_id: string
  provider: 'openai' | 'anthropic' | 'gemini' | 'glm'
  label: string
  key_hint: string
  is_active: boolean
  poll_interval_seconds: number
  created_at: string
}

export interface UsageRecord {
  id: string
  api_key_id: string
  fetched_at: string
  usage_date: string
  model: string
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  total_tokens: number
  cost_usd: number
  source: string
}

export interface BalanceRecord {
  id: string
  api_key_id: string
  fetched_at: string
  balance_usd: number
  expiry_date: string | null
}

export interface ProjectRecord {
  id: string
  name: string
  status: 'active' | 'archived'
}

export interface ModelRow {
  model: string
  tokens: number
  cost: number
  input_tokens: number
  output_tokens: number
}

export interface ProjectRow {
  project_id: string
  project_name: string
  project_status: string | null
  tokens: number
  cost: number
  input_tokens: number
  output_tokens: number
}

export interface ProjectModelRow {
  project_id: string
  project_name: string
  model: string
  tokens: number
  cost: number
  input_tokens: number
  output_tokens: number
}

export interface AnalyticsSummary {
  total_tokens: number
  total_cost_usd: number
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  by_model: ModelRow[]
  by_day: { date: string; tokens: number; cost: number; input_tokens: number; output_tokens: number }[]
  by_project: ProjectRow[]
  projects_by_model: ProjectModelRow[]
  latest_balance: BalanceRecord | null
}

// ── API calls ─────────────────────────────────────────────────────────────────

export const workspaceApi = {
  list: () => api.get<Workspace[]>('/workspaces').then(r => r.data),
  create: (name: string, color: string) => api.post<Workspace>('/workspaces', { name, color }).then(r => r.data),
  update: (id: string, data: { name?: string; color?: string }) =>
    api.patch<Workspace>(`/workspaces/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/workspaces/${id}`),
}

export const apiKeyApi = {
  list: (workspace_id?: string) =>
    api.get<APIKey[]>('/api-keys', { params: { workspace_id } }).then(r => r.data),
  create: (data: {
    workspace_id: string
    provider: string
    label: string
    api_key: string
    poll_interval_seconds: number
  }) => api.post<APIKey>('/api-keys', data).then(r => r.data),
  update: (id: string, data: { label?: string; is_active?: boolean; poll_interval_seconds?: number }) =>
    api.patch<APIKey>(`/api-keys/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api-keys/${id}`),
  validate: (id: string) => api.post<{ valid: boolean | null }>(`/api-keys/${id}/validate`).then(r => r.data),
}

export const usageApi = {
  list: (params: { api_key_id?: string; workspace_id?: string; start?: string; end?: string }) =>
    api.get<UsageRecord[]>('/usage', { params }).then(r => r.data),
  fetch: (api_key_id: string, start?: string, end?: string) =>
    api.post('/usage/fetch', null, { params: { api_key_id, start, end } }).then(r => r.data),
  backfill: (api_key_id: string, days = 90) =>
    api.post('/usage/backfill', null, { params: { api_key_id, days }, timeout: 120_000 }).then(r => r.data),
  balance: (params: { api_key_id?: string; workspace_id?: string }) =>
    api.get<BalanceRecord[]>('/usage/balance', { params }).then(r => r.data),
}

export const analyticsApi = {
  summary: (params: {
    workspace_id?: string
    api_key_id?: string
    range?: string
    start?: string
    end?: string
  }) => api.get<AnalyticsSummary>('/analytics/summary', { params }).then(r => r.data),
}

export const settingsApi = {
  getPrices: (activeOnly = false) =>
    api.get<Record<string, { input: number; output: number; cached: number }>>(
      '/settings/prices',
      { params: { active_only: activeOnly } }
    ).then(r => r.data),
  getActiveModels: () =>
    api.get<{ model: string; has_price: boolean }[]>('/settings/active-models').then(r => r.data),
  updatePrice: (model: string, input: number, output: number, cached: number) =>
    api.post('/settings/prices', { model, input, output, cached }),
  deletePrice: (model: string) => api.delete(`/settings/prices/${encodeURIComponent(model)}`),
  getUnknownModels: () => api.get<{ models: string[] }>('/settings/unknown-models').then(r => r.data),
  getProjects: () =>
    api.get<{ projects: ProjectRecord[] }>('/settings/projects').then(r => r.data),
  refreshProjects: (workspace_id?: string) =>
    api.post<{ projects: ProjectRecord[]; count: number }>(
      '/settings/projects/refresh',
      null,
      { params: { workspace_id } }
    ).then(r => r.data),
  patchProject: (project_id: string, name: string) =>
    api.patch(`/settings/projects/${project_id}`, { name }),
}
