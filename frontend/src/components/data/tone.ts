/**
 * Value tones. Green and red sit close together for protan/deutan readers, so anything that uses
 * both also carries the meaning another way: a sign, a text label, or the side of a zero line.
 */
export type Tone = 'positive' | 'negative' | 'neutral'

export const toneText: Record<Tone, string> = {
  positive: 'text-positive',
  negative: 'text-negative',
  neutral: 'text-foreground',
}

export const toneDot: Record<Tone, string> = {
  positive: 'bg-positive',
  negative: 'bg-negative',
  neutral: 'bg-gray-400',
}

/** Tone for a signed number: above zero is positive, below is negative. */
export function toneOfNumber(value: number): Tone {
  return value > 0 ? 'positive' : value < 0 ? 'negative' : 'neutral'
}
