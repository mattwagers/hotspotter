import { create } from 'zustand'
import type { AppState, TranscriptWord, Hotspot } from '../types'

interface Actions {
  setWords: (words: TranscriptWord[]) => void
  setHotspots: (hotspots: Hotspot[]) => void
  addHotspot: (hotspot: Hotspot) => void
  updateHotspot: (hid: string, updates: Partial<Hotspot>) => void
  removeHotspot: (hid: string) => void
  setSelection: (selection: AppState['selection']) => void
  setServerStatus: (status: AppState['serverStatus']) => void
  setDisplayMode: (updates: Partial<AppState['displayMode']>) => void
}

export const useStore = create<AppState & Actions>((set) => ({
  words: [],
  hotspots: [],
  selection: null,
  serverStatus: 'unknown',
  displayMode: {
    sparklines: false,
    ribbon: true,
    kernelSize: 5,
  },

  setWords: (words) => set({ words }),
  setHotspots: (hotspots) => set({ hotspots }),
  addHotspot: (hotspot) =>
    set((s) => ({ hotspots: [...s.hotspots, hotspot] })),
  updateHotspot: (hid, updates) =>
    set((s) => ({
      hotspots: s.hotspots.map((h) => (h.hid === hid ? { ...h, ...updates } : h)),
    })),
  removeHotspot: (hid) =>
    set((s) => ({ hotspots: s.hotspots.filter((h) => h.hid !== hid) })),
  setSelection: (selection) => set({ selection }),
  setServerStatus: (serverStatus) => set({ serverStatus }),
  setDisplayMode: (updates) =>
    set((s) => ({ displayMode: { ...s.displayMode, ...updates } })),
}))
