import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

import { formatNumber } from '@/lib/format'

import { ChartLegend, ChartSkeleton, ChartTooltip } from './chart-parts'
import { axisProps, colorOf, gridProps, type Series, type ValueFormat } from './chart-theme'
import { DataCard, type DataCardProps } from './data-card'

export interface AreaChartCardProps<T> extends Omit<DataCardProps, 'children' | 'skeleton'> {
  data: T[] | null | undefined
  xKey: keyof T & string
  series: Series<T>[]
  curve?: 'monotone' | 'linear' | 'step'
  stacked?: boolean
  format?: ValueFormat
  height?: number
}

export function AreaChartCard<T>({
  data,
  xKey,
  series,
  curve = 'monotone',
  stacked = false,
  format = formatNumber,
  height = 240,
  empty,
  ...card
}: AreaChartCardProps<T>) {
  const legendHeight = series.length > 1 ? 28 : 0
  return (
    <DataCard
      {...card}
      bodyHeight={height + legendHeight}
      empty={empty || !data || data.length === 0}
      skeleton={<ChartSkeleton />}
    >
      <ChartLegend series={series} />
      <div style={{ height }} role="img" aria-label={`${card.title} area chart`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data ?? []} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey={xKey as string} {...axisProps} minTickGap={16} />
            <YAxis {...axisProps} width="auto" tickFormatter={format} />
            <Tooltip
              cursor={{ stroke: '#D1D5DB', strokeWidth: 1 }}
              content={({ active, label, payload }) => (
                <ChartTooltip active={active} label={label} payload={payload} format={format} />
              )}
            />
            {series.map((s, i) => {
              const color = colorOf(s, i)
              return (
                <Area
                  key={s.key}
                  dataKey={s.key as string}
                  name={s.label}
                  type={curve}
                  stackId={stacked ? 'stack' : undefined}
                  stroke={color}
                  strokeWidth={2}
                  fill={color}
                  fillOpacity={0.08}
                  dot={false}
                  activeDot={{ r: 4, stroke: '#FFFFFF', strokeWidth: 2 }}
                />
              )
            })}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </DataCard>
  )
}
