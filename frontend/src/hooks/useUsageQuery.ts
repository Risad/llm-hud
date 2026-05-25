import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { workspaceApi, apiKeyApi, analyticsApi, usageApi, settingsApi } from '../api/client'
import { useStore } from '../store'
import { useShallow } from 'zustand/react/shallow'

export function useWorkspaces() {
  const setWorkspaces = useStore(s => s.setWorkspaces)
  return useQuery({
    queryKey: ['workspaces'],
    queryFn: async () => {
      const data = await workspaceApi.list()
      setWorkspaces(data)
      return data
    },
    staleTime: 60_000,
  })
}

export function useAPIKeys(workspaceId: string | null) {
  const setApiKeys = useStore(s => s.setApiKeys)
  return useQuery({
    queryKey: ['api-keys', workspaceId],
    queryFn: async () => {
      const data = await apiKeyApi.list(workspaceId ?? undefined)
      setApiKeys(data)
      return data
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
  })
}

export function useAnalytics() {
  const { activeWorkspaceId, timeRange, customStart, customEnd } = useStore(useShallow(s => ({
    activeWorkspaceId: s.activeWorkspaceId,
    timeRange: s.timeRange,
    customStart: s.customStart,
    customEnd: s.customEnd,
  })))

  return useQuery({
    queryKey: ['analytics', activeWorkspaceId, timeRange, customStart, customEnd],
    queryFn: () =>
      analyticsApi.summary({
        workspace_id: activeWorkspaceId ?? undefined,
        range: timeRange,
        start: customStart ?? undefined,
        end: customEnd ?? undefined,
      }),
    enabled: !!activeWorkspaceId,
    refetchInterval: 60_000,
  })
}

export interface FetchResult {
  api_key_id: string
  records_saved: number
  balance_updated: boolean
  error: string | null
}

export function useBackfill() {
  const queryClient = useQueryClient()
  return useMutation<FetchResult, Error, { apiKeyId: string; days?: number }>({
    mutationFn: ({ apiKeyId, days }) => usageApi.backfill(apiKeyId, days),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}

export function useTriggerFetch() {
  const queryClient = useQueryClient()
  return useMutation<FetchResult, Error, string>({
    mutationFn: (apiKeyId: string) => usageApi.fetch(apiKeyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
      queryClient.invalidateQueries({ queryKey: ['usage'] })
    },
  })
}

export function useBalance(workspaceId: string | null) {
  return useQuery({
    queryKey: ['balance', workspaceId],
    queryFn: () => usageApi.balance({ workspace_id: workspaceId ?? undefined }),
    enabled: !!workspaceId,
    refetchInterval: 5 * 60_000,
  })
}

export function useProjects() {
  return useQuery({
    queryKey: ['projects'],
    queryFn: () => settingsApi.getProjects(),
    staleTime: 5 * 60_000,
  })
}

export function useRefreshProjects() {
  const queryClient = useQueryClient()
  const activeWorkspaceId = useStore(s => s.activeWorkspaceId)
  return useMutation({
    mutationFn: () => settingsApi.refreshProjects(activeWorkspaceId ?? undefined),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: ['analytics'] })
    },
  })
}

export function useActiveModels() {
  return useQuery({
    queryKey: ['active-models'],
    queryFn: () => settingsApi.getActiveModels(),
    staleTime: 60_000,
  })
}
