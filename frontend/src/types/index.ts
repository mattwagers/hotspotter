export interface TranscriptWord {
  index: number
  text: string
  surprisal: number | null
}

export interface Hotspot {
  hid: string
  startWord: number      // inclusive, index into TranscriptWord[]
  endWord: number        // inclusive
  noChange: string       // span text (derived, not editable)
  loSwap: string
  hiSwap: string
  deltaLo: number | null // mean bits/word change vs baseline
  deltaHi: number | null
  notes: string
  _cache: {
    loSwapSurp: number[] | null
    hiSwapSurp: number[] | null
  }
}

export interface DisplayMode {
  sparklines: boolean
  ribbon: boolean
  kernelSize: number     // words, for smoothing
}

export interface AppState {
  words: TranscriptWord[]
  hotspots: Hotspot[]
  selection: { start: number; end: number } | null
  serverStatus: 'unknown' | 'online' | 'offline'
  displayMode: DisplayMode
}

export interface SurprisalResponse {
  words: string[]
  surprisals: (number | null)[]
}
