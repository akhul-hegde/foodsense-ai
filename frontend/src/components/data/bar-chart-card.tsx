import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatNumber } from '@/lib/format'

import { ChartLegend, ChartSkeleton, ChartTooltip } from './chart-parts'
import { axisProps, colorOf, gridProps, seriesColor, type Series, type ValueFormat } from './chart-theme'
import { DataCard, type DataCardProps } from './data-card'
import type { Tone } from './tone'

export interface BarChartCardProps<T> extends Omit<DataCardProps, 'children' | 'skeleton'> {
  data: T[] | null | undefined
  /** The category field: x axis for columns, y axis for rows. */
  xKey: keyof T & string
  series: Series<T>[]
  /** Rows suit ranked lists with long labels (keywords, phrases); columns suit ordered categories. */
  orientation?: 'columns' | 'rows'
  /** Color single-series bars per row, e.g. by sign. Keep the sign visible too (axis side or label). */
  toneOf?: (row: T) => Tone
  format?: ValueFormat
  height?: number
}

const toneFill: Record<Tone, string> = {
  positive: seriesColor.positive,
  negative: seriesColor.negative,
  neutral: seriesColor.lightGray,
}

export function BarChartCard<T>({
  data,
  xKey,
  series,
  orientation = 'columns',
  toneOf,
  format = formatNumber,
  height = 240,
  empty,
  ...card
}: BarChartCardProps<T>) {
  const rows = orientation === 'rows'
  const legendHeight = series.length > 1 ? 28 : 0
  const hasNegative = (data ?? []).some((row) => series.some((s) => Number(row[s.key]) < 0))
  // A lone neutral series reads lighter as solid bars than as a line, so it uses the light gray step.
  const singleFill = series.length === 1 && !series[0].tone ? seriesColor.lightGray : undefined

  return (
    <DataCard
      {...card}
      bodyHeight={height + legendHeight}
      empty={empty || !data || data.length === 0}
      skeleton={<ChartSkeleton />}
    >
      <ChartLegend series={series} />
      <div style={{ height }} role="img" aria-label={`${card.title} bar chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data ?? []}
            layout={rows ? 'vertical' : 'horizontal'}
            margin={{ top: 4, right: 8, bottom: 0, left: 0 }}
            barGap={2}
            barCategoryGap="24%"
          >
            <CartesianGrid {...gridProps} vertical={rows} horizontal={!rows} />
            {rows ? (
              <>
                <XAxis type="number" {...axisProps} tickFormatter={format} />
                <YAxis type="category" dataKey={xKey as string} {...axisProps} width="auto" interval={0} />
              </>
            ) : (
              <>
                <XAxis dataKey={xKey as string} {...axisProps} minTickGap={8} />
                <YAxis {...axisProps} width="auto" tickFormatter={format} />
              </>
            )}
            {hasNegative && (
              <ReferenceLine {...(rows ? { x: 0 } : { y: 0 })} stroke="#D1D5DB" />
            )}
            <Tooltip
              cursor={{ fill: '#F3F4F6' }}
              content={({ active, label, payload }) => (
                <ChartTooltip active={active} label={label} payload={payload} format={format} />
              )}
            />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key as string}
                name={s.label}
                fill={singleFill ?? colorOf(s, i)}
                radius={rows ? [0, 4, 4, 0] : [4, 4, 0, 0]}
                maxBarSize={rows ? 20 : 40}
              >
                {toneOf && series.length === 1 &&
                  (data ?? []).map((row, index) => <Cell key={index} fill={toneFill[toneOf(row)]} />)}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </DataCard>
  )
}
