import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { runUserAction } from '../lib/admin.js'
import { describeError } from '../lib/errors.js'
import { useAuthStore } from '../store/authStore.js'

// Menjalankan block / unblock / promote / demote / remove.
// Untuk empat yang pertama, User terbaru (res.data) ditempelkan ke cache daftar.
// Untuk remove, respons tidak memuat User: baris dibuang menurut id yang diklik,
// lalu daftar dan statistik dimuat ulang (meta.total ikut berubah).
export function useUserActions() {
  const queryClient = useQueryClient()
  const meId = useAuthStore((s) => s.user.id)
  const [feedback, setFeedback] = useState(null) // { type: 'success' | 'error', text }

  const mutation = useMutation({
    mutationFn: ({ user, action }) => runUserAction(user.id, action),
    onMutate: () => setFeedback(null),
    onSuccess: (res, { user, action }) => {
      if (action === 'remove') {
        queryClient.setQueriesData({ queryKey: ['admin', 'users', meId] }, (old) =>
          old ? { ...old, data: old.data.filter((u) => u.id !== user.id) } : old,
        )
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
        queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] })
      } else {
        const updated = res.data
        queryClient.setQueriesData({ queryKey: ['admin', 'users', meId] }, (old) =>
          old ? { ...old, data: old.data.map((u) => (u.id === updated.id ? updated : u)) } : old,
        )
      }
      setFeedback({ type: 'success', text: res.message ?? 'Berhasil.' })
    },
    onError: (err) => {
      const { message, fields } = describeError(err)
      setFeedback({ type: 'error', text: fields.role || message || 'Aksi gagal.' })
      // Pengguna sudah tidak ada (404): muat ulang daftar supaya baris basi hilang.
      if (err?.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['admin', 'users'] })
      }
    },
  })

  return {
    run: mutation.mutate, // run({ user, action })
    isPending: mutation.isPending,
    feedback,
    clearFeedback: () => setFeedback(null),
  }
}