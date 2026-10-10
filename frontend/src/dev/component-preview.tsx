/**
 * Development-only gallery (#/preview) showing every shared component in each of its states.
 * The numbers are synthetic placeholders, not results from the API.
 */
import { useState } from 'react'

import {
  AreaChartCard,
  BarChartCard,
  DataTable,
  SegmentedControl,
  StatCard,
  StatGrid,
  StatusPill,
  TableTabs,
  toneOfNumber,
  type Column,
} from '@/components/data'
import { formatNumber } from '@/lib/format'

const periods = ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10', 'P11', 'P12']
const trend = periods.map((period, i) => ({
  period,
  primary: Math.round(120 + 60 * Math.sin(i / 1.8) + i * 6),
  secondary: Math.round(70 + 30 * Math.cos(i / 2.2) + i * 3),
}))

const ranked = ['alpha', 'bravo', 'charlie', 'delta', 'echo', 'foxtrot', 'golf'].map((term, i) => ({
  term,
  score: Number((0.42 - i * 0.045).toFixed(3)),
}))

const signed = ['Group A', 'Group B', 'Group C', 'Group D', 'Group E'].map((group, i) => ({
  group,
  net: [0.32, 0.12, -0.08, 0.21, -0.27][i],
}))

interface Row {
  id: number
  item: string
  kind: string
  status: 'Complete' | 'Running' | 'Failed'
  count: number
  share: number
}

const statuses: Row['status'][] = ['Complete', 'Complete', 'Running', 'Complete', 'Failed']
const rows: Row[] = Array.from({ length: 37 }, (_, i) => ({
  id: i + 1,
  item: `Placeholder item ${i + 1}`,
  kind: i % 3 === 0 ? 'Type one' : i % 3 === 1 ? 'Type two' : 'Type three',
  status: statuses[i % statuses.length],
  count: 1200 - i * 29,
  share: (i % 7) / 10 - 0.2,
}))

const columns: Column<Row>[] = [
  { id: 'item', header: 'Item', cell: (r) => <span className="font-medium">{r.item}</span> },
  { id: 'kind', header: 'Kind', cell: (r) => <span className="text-muted-foreground">{r.kind}</span> },
  {
    id: 'status',
    header: 'Status',
    cell: (r) => (
      <StatusPill tone={r.status === 'Complete' ? 'positive' : r.status === 'Failed' ? 'negative' : 'neutral'}>
        {r.status}
      </StatusPill>
    ),
  },
  { id: 'count', header: 'Count', align: 'right', cell: (r) => formatNumber(r.count) },
  {
    id: 'share',
    header: 'Change',
    align: 'right',
    cell: (r) => {
      const tone = toneOfNumber(r.share)
      const color = tone === 'positive' ? 'text-positive' : tone === 'negative' ? 'text-negative' : ''
      return <span className={color}>{`${r.share > 0 ? '+' : ''}${(r.share * 100).toFixed(0)}%`}</span>
    },
  },
]

type Curve = 'monotone' | 'linear' | 'step'
type TableView = 'all' | 'running' | 'failed' | 'empty' | 'loading' | 'error'

export default function ComponentPreview() {
  const [curve, setCurve] = useState<Curve>('monotone')
  const [view, setView] = useState<TableView>('all')
  const tableRows =
    view === 'running' ? rows.filter((r) => r.status === 'Running')
    : view === 'failed' ? rows.filter((r) => r.status === 'Failed')
    : view === 'empty' ? []
    : rows

  return (
    <div className="space-y-6">
      <StatGrid>
        <StatCard label="Ready, positive" value="1,240" caption="Caption on a single line" delta={{ label: '+12.5%', tone: 'positive' }} />
        <StatCard label="Ready, negative" value="0.62" caption="A caption long enough that it has to be truncated at the end" delta={{ label: '-4.0%', tone: 'negative' }} />
        <StatCard label="Loading" loading />
        <StatCard label="Error" error="The analysis server is not reachable." onRetry={() => {}} />
      </StatGrid>
      <StatGrid>
        <StatCard label="Empty" />
        <StatCard label="Positive value" value="+0.31" tone="positive" caption="Value colored by its sign" />
        <StatCard label="Negative value" value="-0.18" tone="negative" caption="Value colored by its sign" />
        <StatCard label="Neutral value" value="48%" caption="Plain gray value" />
      </StatGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <AreaChartCard
          title="Area chart"
          subtitle="Single series with a curve switch"
          data={trend}
          xKey="period"
          series={[{ key: 'primary', label: 'Primary' }]}
          curve={curve}
          action={
            <SegmentedControl
              aria-label="Curve"
              value={curve}
              onChange={setCurve}
              options={[
                { value: 'monotone', label: 'Smooth' },
                { value: 'linear', label: 'Linear' },
                { value: 'step', label: 'Step' },
              ]}
            />
          }
        />
        <AreaChartCard
          title="Area chart, two series"
          subtitle="Legend appears for two or more series"
          data={trend}
          xKey="period"
          series={[
            { key: 'primary', label: 'Primary' },
            { key: 'secondary', label: 'Secondary' },
          ]}
        />
        <BarChartCard
          title="Bar chart, rows"
          subtitle="Ranked list with category labels"
          data={ranked}
          xKey="term"
          series={[{ key: 'score', label: 'Score' }]}
          orientation="rows"
          format={(v) => v.toFixed(2)}
        />
        <BarChartCard
          title="Bar chart, signed"
          subtitle="Bars colored by sign, either side of zero"
          data={signed}
          xKey="group"
          series={[{ key: 'net', label: 'Net score' }]}
          toneOf={(row) => toneOfNumber(row.net)}
          format={(v) => v.toFixed(2)}
        />
        <AreaChartCard title="Loading state" subtitle="Skeleton while data loads" data={null} xKey="period" series={[]} loading />
        <BarChartCard
          title="Error state"
          subtitle="Message and retry"
          data={null}
          xKey="term"
          series={[]}
          error="Too few reviews to fit this model."
          onRetry={() => {}}
        />
        <BarChartCard title="Empty state" subtitle="No rows returned" data={[]} xKey="term" series={[]} />
      </div>

      <TableTabs
        value={view}
        onValueChange={setView}
        tabs={[
          { value: 'all', label: 'All', count: rows.length },
          { value: 'running', label: 'Running', count: rows.filter((r) => r.status === 'Running').length },
          { value: 'failed', label: 'Failed', count: rows.filter((r) => r.status === 'Failed').length },
          { value: 'empty', label: 'Empty' },
          { value: 'loading', label: 'Loading' },
          { value: 'error', label: 'Error' },
        ]}
      >
        <DataTable
          caption="Placeholder rows"
          columns={columns}
          rows={tableRows}
          rowKey={(r) => String(r.id)}
          loading={view === 'loading'}
          error={view === 'error' ? 'The request timed out.' : null}
          onRetry={() => setView('all')}
          emptyMessage="No rows match this tab."
        />
      </TableTabs>
    </div>
  )
}
