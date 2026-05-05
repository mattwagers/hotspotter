type MaybeSurp = number | null

// delta = mean(swap_surprisals) − mean(baseline_surprisals), in bits/word.
// Word counts may differ between baseline and swap, so means are computed independently.
export function computeDelta(
  baseline: MaybeSurp[],
  swap: MaybeSurp[]
): number | null {
  const validBaseline = baseline.filter((v): v is number => v !== null)
  const validSwap = swap.filter((v): v is number => v !== null)
  if (validBaseline.length === 0 || validSwap.length === 0) return null
  return mean(validSwap) - mean(validBaseline)
}

// sum(swap) − sum(baseline): total bits difference, sensitive to phrase length.
export function computeSumDelta(
  baseline: MaybeSurp[],
  swap: MaybeSurp[]
): number | null {
  const validBaseline = baseline.filter((v): v is number => v !== null)
  const validSwap = swap.filter((v): v is number => v !== null)
  if (validBaseline.length === 0 || validSwap.length === 0) return null
  return sum(validSwap) - sum(validBaseline)
}

// max surprisal in swap (absolute), useful for spotting a single high-surprisal word.
export function computePeak(swap: MaybeSurp[]): number | null {
  const valid = swap.filter((v): v is number => v !== null)
  if (valid.length === 0) return null
  return Math.max(...valid)
}

export function gaussianSmooth(values: MaybeSurp[], kernelSize: number): MaybeSurp[] {
  if (kernelSize <= 1) return values
  const half = Math.floor(kernelSize / 2)
  const kernel = gaussianKernel(kernelSize)

  return values.map((_, i) => {
    let weightSum = 0
    let valSum = 0
    for (let k = 0; k < kernelSize; k++) {
      const j = i - half + k
      if (j >= 0 && j < values.length && values[j] !== null) {
        valSum += (values[j] as number) * kernel[k]
        weightSum += kernel[k]
      }
    }
    return weightSum > 0 ? valSum / weightSum : null
  })
}

function gaussianKernel(size: number): number[] {
  const sigma = size / 6
  const half = Math.floor(size / 2)
  const raw = Array.from({ length: size }, (_, i) => {
    const x = i - half
    return Math.exp(-(x * x) / (2 * sigma * sigma))
  })
  const sum = raw.reduce((a, b) => a + b, 0)
  return raw.map((v) => v / sum)
}

function mean(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

function sum(vals: number[]): number {
  return vals.reduce((a, b) => a + b, 0)
}
