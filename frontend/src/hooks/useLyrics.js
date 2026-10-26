import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { lyricsCandidates } from '../lib/lyricsQuery.js'
import { parseLrc } from '../lib/lrc.js'
import { fetchLyrics } from '../lib/music.js'

// Coba kandidat satu per satu; berhenti di yang pertama menemukan lirik.
// null (404) = coba berikutnya. Error lain dilempar apa adanya.
async function findLyrics(song, signal) {
  for (const c of lyricsCandidates(song)) {
    const data = await fetchLyrics({ ...c, duration: song.duration_sec }, signal)
    if (data) return data
  }
  return null
}

// `song` = Kandidat lagu yang sedang diputar (title, artist, duration_sec).
export function useLyrics(song) {
  const youtubeId = song?.youtube_id

  const query = useQuery({
    queryKey: ['lyrics', youtubeId],
    queryFn: ({ signal }) => findLyrics(song, signal),
    enabled: Boolean(youtubeId && song?.title && song?.artist),
    staleTime: 30 * 60 * 1000,
    retry: false, // 502/500 tidak pulih dalam hitungan detik; ada tombol coba lagi
  })

  const lines = useMemo(() => parseLrc(query.data?.synced), [query.data])

  return {
    lines,
    plain: query.data?.plain ?? null,
    instrumental: Boolean(query.data?.instrumental),
    notFound: query.data === null,
    isPending: query.isPending && query.fetchStatus !== 'idle',
    error: query.error,
    isFetching: query.isFetching,
    refetch: query.refetch,
  }
}