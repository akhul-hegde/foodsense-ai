import { BarChartCard, DataCard, DataTable, StatCard, StatGrid, toneOfNumber, type Column } from '@/components/data'
import { formatNumber, formatPercent } from '@/lib/format'
import { useApi } from '@/lib/use-api'
import { cn } from '@/lib/utils'

interface AspectRow {
  aspect: string
  /** Sentences that mention the aspect. */
  mentions: number
  /** Reviews with at least one such sentence. */
  reviews: number
  positive: number
  negative: number
  neutral: number
  /** Mean sentence score from -1 to 1; null when the aspect is never mentioned. */
  avg_score: number | null
  /** (positive - negative) / mentions; null when the aspect is never mentioned. */
  net_sentiment: number | null
  /** The most positive and most negative sentences; null when there is none of that kind. */
  examples: { positive: string | null; negative: string | null }
}

/** Response of GET /api/aspects. */
interface AspectsResult {
  reviews_analysed: number
  sentence_count: number
  sentences_without_aspect: number
  scorer: string
  aspects: AspectRow[]
  notes: string[]
}

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)

function signed(value: number): string {
  return `${value > 0 ? '+' : ''}${value.toFixed(2)}`
}

/** A signed score in the tone of its sign; the sign itself carries the meaning too. */
function scoreCell(value: number | null) {
  if (value === null) return <span className="text-muted-foreground">-</span>
  const tone = toneOfNumber(value)
  return <span className={cn(tone === 'positive' && 'text-positive', tone === 'negative' && 'text-negative')}>{signed(value)}</span>
}

const aspectColumns: Column<AspectRow>[] = [
  { id: 'aspect', header: 'Aspect', cell: (r) => <span className="font-medium">{capitalise(r.aspect)}</span> },
  { id: 'mentions', header: 'Mentions', align: 'right', cell: (r) => formatNumber(r.mentions) },
  { id: 'reviews', header: 'Reviews', align: 'right', cell: (r) => formatNumber(r.reviews) },
  { id: 'positive', header: 'Positive', align: 'right', cell: (r) => formatNumber(r.positive) },
  { id: 'negative', header: 'Negative', align: 'right', cell: (r) => formatNumber(r.negative) },
  { id: 'neutral', header: 'Neutral', align: 'right', cell: (r) => formatNumber(r.neutral) },
  { id: 'avg', header: 'Avg score', align: 'right', cell: (r) => scoreCell(r.avg_score) },
  { id: 'net', header: 'Net sentiment', align: 'right', cell: (r) => scoreCell(r.net_sentiment) },
]

function example(text: string | null) {
  return text ? <span className="block py-1.5">{text}</span> : <span className="text-muted-foreground">None</span>
}

const exampleColumns: Column<AspectRow>[] = [
  { id: 'aspect', header: 'Aspect', className: 'align-top', cell: (r) => <span className="font-medium">{capitalise(r.aspect)}</span> },
  { id: 'positive', header: 'Most positive sentence', className: 'min-w-56 whitespace-normal', cell: (r) => example(r.examples.positive) },
  { id: 'negative', header: 'Most negative sentence', className: 'min-w-56 whitespace-normal', cell: (r) => example(r.examples.negative) },
]

export function AspectsPage() {
  const { data, error, loading, reload } = useApi<AspectsResult>('/aspects')
  const state = { loading, error, onRetry: reload }

  const withMentions = data?.aspects.filter((a) => a.net_sentiment !== null)
  const netData = withMentions?.map((a) => ({ label: capitalise(a.aspect), net: a.net_sentiment as number }))
  const mixData = data?.aspects.map((a) => ({ label: capitalise(a.aspect), positive: a.positive, negative: a.negative, neutral: a.neutral }))
  const withoutShare = data && data.sentence_count > 0 ? data.sentences_without_aspect / data.sentence_count : null

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <StatGrid>
        <StatCard label="Reviews analysed" value={data && formatNumber(data.reviews_analysed)} caption="English reviews" {...state} />
        <StatCard label="Sentences" value={data && formatNumber(data.sentence_count)} caption="Scored one by one" {...state} />
        <StatCard
          label="Without an aspect"
          value={data && formatNumber(data.sentences_without_aspect)}
          caption={withoutShare === null ? undefined : `${formatPercent(withoutShare)} of sentences`}
          {...state}
        />
        <StatCard
          label="Aspects found"
          value={data && formatNumber(data.aspects.filter((a) => a.mentions > 0).length)}
          caption={data ? `of ${formatNumber(data.aspects.length)} tracked` : undefined}
          {...state}
        />
      </StatGrid>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Net sentiment"
          subtitle="Positive minus negative sentences, divided by mentions. +1 is all praise, -1 all complaints."
          data={netData}
          xKey="label"
          series={[{ key: 'net', label: 'Net sentiment' }]}
          toneOf={(row) => toneOfNumber(row.net)}
          format={signed}
          emptyMessage="No aspect is mentioned in these reviews."
          {...state}
        />
        <BarChartCard
          title="Sentences by sentiment"
          subtitle="How many sentences about each aspect are positive, negative or neutral."
          data={mixData}
          xKey="label"
          series={[
            { key: 'positive', label: 'Positive', tone: 'positive' },
            { key: 'negative', label: 'Negative', tone: 'negative' },
            { key: 'neutral', label: 'Neutral', tone: 'lightGray' },
          ]}
          {...state}
        />
      </div>

      <DataCard
        title="Aspect summary"
        subtitle="A sentence that mentions two aspects counts toward both."
        bodyHeight={216}
        {...state}
      >
        <DataTable
          columns={aspectColumns}
          rows={data?.aspects}
          rowKey={(r) => r.aspect}
          caption="Mentions, sentiment counts and scores for each aspect"
          pageSizes={[5, 10]}
        />
      </DataCard>

      <DataCard
        title="Examples"
        subtitle="The sentence with the highest and the lowest score for each aspect."
        bodyHeight={216}
        {...state}
      >
        <DataTable
          columns={exampleColumns}
          rows={data?.aspects}
          rowKey={(r) => r.aspect}
          caption="The most positive and most negative sentence for each aspect"
          pageSizes={[5, 10]}
        />
      </DataCard>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <DataCard title="Scoring method" subtitle="How each sentence gets its sentiment." bodyHeight={96} {...state}>
          <p className="text-sm">{data?.scorer}</p>
        </DataCard>
        <DataCard
          title="Notes"
          subtitle="What was skipped for this run."
          bodyHeight={96}
          empty={data?.notes.length === 0}
          emptyTitle="No notes"
          emptyMessage="Every review was used."
          {...state}
        >
          <ul className="list-disc space-y-1.5 pl-5 text-sm">
            {data?.notes.map((note, i) => (
              <li key={i}>{note}</li>
            ))}
          </ul>
        </DataCard>
      </div>
    </div>
  )
}
