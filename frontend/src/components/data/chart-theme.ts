/**
 * Series colors. Charts are gray unless a series is inherently positive or negative.
 * Neutral series step from dark to light gray in a fixed order, never cycled.
 */
export type SeriesTone = 'gray' | 'lightGray' | 'positive' | 'negative'

export const seriesColor: Record<SeriesTone, string> = {
  gray: '#4B5563',
  lightGray: '#9CA3AF',
  positive: '#166534',
  negative: '#B42318',
}

const defaultTones: SeriesTone[] = ['gray', 'lightGray']

export interface Series<T> {
  key: keyof T & string
  label: string
  tone?: SeriesTone
}

export function colorOf<T>(series: Series<T>, index: number): string {
  return seriesColor[series.tone ?? defaultTones[Math.min(index, defaultTones.length - 1)]]
}

/** Faint horizontal gridlines and quiet axes, shared by every chart. */
export const gridProps = { stroke: '#F3F4F6', vertical: false } as const

export const axisTick = { fill: '#6B7280', fontSize: 12 } as const

export const axisProps = {
  tick: axisTick,
  tickLine: false,
  axisLine: false,
  tickMargin: 8,
} as const

export type ValueFormat = (value: number) => string
