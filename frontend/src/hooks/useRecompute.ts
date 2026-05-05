import { useStore } from '../store'
import { computeDelta, computeSumDelta, computePeak } from '../utils/surprisalMath'
import { alignSurprisals } from '../utils/alignment'

const API = '/api'

export function useRecompute() {
  const words = useStore((s) => s.words)
  const hotspots = useStore((s) => s.hotspots)
  const updateHotspot = useStore((s) => s.updateHotspot)
  const setServerStatus = useStore((s) => s.setServerStatus)
  const setWords = useStore((s) => s.setWords)

  async function recomputeHotspot(hid: string) {
    const hotspot = hotspots.find((h) => h.hid === hid)
    if (!hotspot) return

    const baseline = words
      .slice(hotspot.startWord, hotspot.endWord + 1)
      .map((w) => w.surprisal)

    const [loRes, hiRes] = await Promise.all([
      fetchSurprisals(hotspot.loSwap),
      fetchSurprisals(hotspot.hiSwap),
    ])

    const deltaLo = loRes ? computeDelta(baseline, loRes.surprisals) : null
    const deltaHi = hiRes ? computeDelta(baseline, hiRes.surprisals) : null
    const sumDeltaLo = loRes ? computeSumDelta(baseline, loRes.surprisals) : null
    const sumDeltaHi = hiRes ? computeSumDelta(baseline, hiRes.surprisals) : null
    const peakLo = loRes ? computePeak(loRes.surprisals) : null
    const peakHi = hiRes ? computePeak(hiRes.surprisals) : null

    updateHotspot(hid, {
      deltaLo,
      deltaHi,
      sumDeltaLo,
      sumDeltaHi,
      peakLo,
      peakHi,
      _cache: {
        loSwapSurp: loRes?.surprisals ?? null,
        hiSwapSurp: hiRes?.surprisals ?? null,
      },
    })
  }

  async function recomputeAll() {
    for (const h of hotspots) {
      await recomputeHotspot(h.hid)
    }
  }

  // Compute word-level surprisals for the full transcript and store in words.
  async function computeTranscriptSurprisals(): Promise<boolean> {
    if (words.length === 0) return false
    const text = words.map((w) => w.text).join(' ')
    const res = await fetchSurprisals(text)
    if (!res) return false

    const mapped = (res.words as string[])
      .map((w: string, i: number) => ({
        word: w,
        surprisal: (res.surprisals as (number | null)[])[i] ?? null,
      }))
      .filter((r) => r.surprisal !== null) as { word: string; surprisal: number }[]

    setWords(alignSurprisals(words, mapped))
    return true
  }

  async function fetchSurprisals(text: string) {
    if (!text.trim()) return null
    try {
      const res = await fetch(`${API}/surprisals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })
      if (!res.ok) return null
      setServerStatus('online')
      return await res.json()
    } catch {
      setServerStatus('offline')
      return null
    }
  }

  async function checkHealth() {
    try {
      const res = await fetch(`${API}/health`)
      setServerStatus(res.ok ? 'online' : 'offline')
    } catch {
      setServerStatus('offline')
    }
  }

  return { recomputeHotspot, recomputeAll, computeTranscriptSurprisals, checkHealth }
}
