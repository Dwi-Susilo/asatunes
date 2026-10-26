import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { describeError } from '../lib/errors.js'
import { addFavorite, fetchAllFavorites, removeFavorite } from '../lib/favorites.js'
import { useAuthStore } from '../store/authStore.js'
import { usePlayerStore } from '../store/playerStore.js'

export function useFavorites() {
  const userId = useAuthStore((s) => s.user?.id)
  const queryClient = useQueryClient()
  const key = ['favorites', userId]

  const query = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => fetchAllFavorites(signal),
    enabled: userId != null,
    staleTime: 5 * 60 * 1000,
    retry: false,
  })

  const ids = useMemo(() => new Set((query.data ?? []).map((s) => s.id)), [query.data])

  const mutation = useMutation({
    mutationFn: ({ songId, makeFavorite }) =>
      makeFavorite ? addFavorite(songId) : removeFavorite(songId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
    onError: (err) =>
      usePlayerStore.getState().notify(describeError(err).message || 'Gagal mengubah favorit.'),
  })

  return {
    favorites: query.data ?? [], // daftar Lagu (punya id), terbaru di atas
    ids, // himpunan song_id
    isPending: query.isPending,
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
    isToggling: mutation.isPending,
    toggle: (songId, makeFavorite) => mutation.mutate({ songId, makeFavorite }),
  }
}