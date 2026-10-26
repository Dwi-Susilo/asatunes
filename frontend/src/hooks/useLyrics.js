import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { fetchLyrics } from '../lib/music.js'
import { parseLrc } from '../lib/lrc.js'

// `song` = Kandidat lagu yang sedang diputar (title, artist, duration_sec).
// title dan artist dikirim apa adanya; pembersihan dilakukan server (SRS 3.3).
export function useLyrics(song) {
  const title = song?.title
  const artist = song?.artist
  const duration = song?.duration_sec

  const query = useQuery({
    queryKey: ['lyrics', title, artist, duration],
    queryFn: ({ signal }) => fetchLyrics({ title, artist, duration }, signal),
    enabled: Boolean(title && artist),
    staleTime: 30 * 60 * 1000,
    retry: false, // 502 tidak pulih dalam hitungan detik; ada tombol coba lagi
  })

  const lines = useMemo(() => parseLrc(query.data?.synced), [query.data])

  return {
    lines, // baris berstempel ([] bila tidak ada)
    plain: query.data?.plain ?? null,
    instrumental: Boolean(query.data?.instrumental),
    notFound: query.data === null, // 404
    isPending: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}