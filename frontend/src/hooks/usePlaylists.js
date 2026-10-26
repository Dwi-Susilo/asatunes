import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createPlaylist, deletePlaylist, fetchPlaylists, updatePlaylist } from '../lib/playlists.js'
import { useAuthStore } from '../store/authStore.js'

export function usePlaylists() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const key = ['playlists', userId]

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchPlaylists(signal),
    enabled: userId != null,
    staleTime: 60 * 1000,
    retry: false,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: key })

  const create = useMutation({ mutationFn: createPlaylist, onSuccess: refresh })
  const update = useMutation({
    mutationFn: ({ id, ...body }) => updatePlaylist(id, body),
    onSuccess: refresh,
  })
  const remove = useMutation({ mutationFn: deletePlaylist, onSuccess: refresh })

  return {
    playlists: query.data?.items ?? [],
    hasMorePages: (query.data?.lastPage ?? 1) > 1,
    isPending: query.isPending,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
    create,
    update,
    remove,
  }
}