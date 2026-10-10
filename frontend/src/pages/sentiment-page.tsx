import type { ReactNode } from 'react'

import { BarChartCard, DataCard, DataTable, StatCard, StatGrid, type Column } from '@/components/data'
import { formatNumber, formatPercent } from '@/lib/format'
import { useApi } from '@/lib/use-api'

/** Cap on how many reviews a transformer scores per request. */
interface Inference {
  limit: number
  used: number
  total: number
  capped: boolean
}

interface ConfusionMatrix {
  /** Row and column order; rows are the actual labels, columns the predicted ones. */
  labels: string[]
  matrix: number[][]
}

interface ModelScores {
  model: string
  accuracy: number
  precision: number
  recall: number
  f1: number
  average: string
  confusion_matrix: ConfusionMatrix
}

/** Response of GET /api/sentiment. */
interface SentimentResult {
  reviews_analysed: number
  labelled: number
  dropped: number
  label_counts: Record<string, number>
  train_size: number
  test_size: number
  evaluated: number
  capped: boolean
  baseline: ModelScores
  transformer: ModelScores
  inference: Inference
  notes: string[]
}

interface EmotionRow {
  emotion: string
  count: number
  share: number
  example: string | null
}

/** Response of GET /api/emotion. */
interface EmotionResult {
  reviews_analysed: number
  model: string
  emotions: EmotionRow[]
  inference: Inference
  notes: string[]
}

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1)
const percent0 = (value: number) => formatPercent(value, 0)

export function SentimentPage() {
  return (
    <div className="space-y-8 p-4 sm:space-y-10 sm:p-6">
      <SentimentSection />
      <EmotionSection />
    </div>
  )
}

function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="space-y-4 sm:space-y-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </section>
  )
}

/** One card for the whole section when its request fails, instead of an error in every tile. */
function SectionError({ title, error, onRetry }: { title: string; error: string; onRetry: () => void }) {
  return (
    <DataCard title={title} bodyHeight={160} error={error} onRetry={onRetry}>
      {null}
    </DataCard>
  )
}

function NotesCard({ notes, loading, error, onRetry }: { notes?: string[]; loading: boolean; error: string | null; onRetry: () => void }) {
  return (
    <DataCard
      title="Notes"
      subtitle="What was skipped, dropped or capped for this run."
      bodyHeight={96}
      loading={loading}
      error={error}
      onRetry={onRetry}
      empty={notes?.length === 0}
      emptyTitle="No notes"
      emptyMessage="Every review was used."
    >
      <ul className="list-disc space-y-1.5 pl-5 text-sm">
        {notes?.map((note, i) => (
          <li key={i}>{note}</li>
        ))}
      </ul>
    </DataCard>
  )
}

// ---- Sentiment ----

interface ModelRow {
  id: 'baseline' | 'transformer'
  role: string
  scores: ModelScores
}

const modelColumns: Column<ModelRow>[] = [
  {
    id: 'model',
    header: 'Model',
    className: 'whitespace-normal',
    cell: (r) => (
      <div className="py-1">
        <p className="font-medium">{r.role}</p>
        <p className="text-xs text-muted-foreground">{r.scores.model}</p>
      </div>
    ),
  },
  { id: 'accuracy', header: 'Accuracy', align: 'right', cell: (r) => formatPercent(r.scores.accuracy) },
  { id: 'precision', header: 'Precision', align: 'right', cell: (r) => formatPercent(r.scores.precision) },
  { id: 'recall', header: 'Recall', align: 'right', cell: (r) => formatPercent(r.scores.recall) },
  { id: 'f1', header: 'F1', align: 'right', cell: (r) => formatPercent(r.scores.f1) },
  { id: 'average', header: 'Averaging', align: 'right', cell: (r) => <span className="text-muted-foreground">{r.scores.average}</span> },
]

interface MetricRow {
  metric: string
  baseline: number
  transformer: number
}

interface ConfusionRow {
  actual: string
  counts: number[]
}

function confusionColumns({ labels }: ConfusionMatrix): Column<ConfusionRow>[] {
  return [
    { id: 'actual', header: 'Actual \\ Predicted', cell: (r) => <span className="font-medium">{capitalise(r.actual)}</span> },
    ...labels.map((label, column) => ({
      id: label,
      header: capitalise(label),
      align: 'right' as const,
      // The diagonal holds the correct predictions.
      cell: (r: ConfusionRow) => (
        <span className={r.actual === label ? 'font-semibold' : 'text-muted-foreground'}>{formatNumber(r.counts[column])}</span>
      ),
    })),
  ]
}

function confusionRows({ labels, matrix }: ConfusionMatrix): ConfusionRow[] {
  return labels.map((actual, i) => ({ actual, counts: matrix[i] }))
}

function SentimentSection() {
  const { data, error, loading, reload } = useApi<SentimentResult>('/sentiment')
  const title = 'Sentiment'
  const subtitle = 'A TF-IDF baseline and a transformer, both scored on the same held-out reviews. Labels come from star ratings.'

  if (error) {
    return (
      <Section title={title} subtitle={subtitle}>
        <SectionError title="Sentiment comparison" error={error} onRetry={reload} />
      </Section>
    )
  }

  const state = { loading, error, onRetry: reload }
  const models: ModelRow[] | null = data && [
    { id: 'baseline', role: 'Baseline', scores: data.baseline },
    { id: 'transformer', role: 'Transformer', scores: data.transformer },
  ]
  const metrics: MetricRow[] | null = data && [
    { metric: 'Accuracy', baseline: data.baseline.accuracy, transformer: data.transformer.accuracy },
    { metric: 'Precision', baseline: data.baseline.precision, transformer: data.transformer.precision },
    { metric: 'Recall', baseline: data.baseline.recall, transformer: data.transformer.recall },
    { metric: 'F1', baseline: data.baseline.f1, transformer: data.transformer.f1 },
  ]
  const labelCounts = data && Object.entries(data.label_counts).map(([label, count]) => ({ label: capitalise(label), count, key: label }))

  return (
    <Section title={title} subtitle={subtitle}>
      <StatGrid>
        <StatCard label="Reviews analysed" value={data && formatNumber(data.reviews_analysed)} caption="English reviews" {...state} />
        <StatCard label="Labelled" value={data && formatNumber(data.labelled)} caption="Rated 1-2 or 4-5 stars" {...state} />
        <StatCard label="Dropped" value={data && formatNumber(data.dropped)} caption="Rated 2-4 stars or unrated" {...state} />
        <StatCard label="Train size" value={data && formatNumber(data.train_size)} caption="Baseline training set" {...state} />
        <StatCard label="Test size" value={data && formatNumber(data.test_size)} caption="Held-out reviews" {...state} />
        <StatCard label="Evaluated" value={data && formatNumber(data.evaluated)} caption="Scored by both models" {...state} />
        <StatCard
          label="Inference cap"
          value={data && formatNumber(data.inference.limit)}
          caption={data ? `${formatNumber(data.inference.used)} of ${formatNumber(data.inference.total)} test reviews scored` : undefined}
          {...state}
        />
        <StatCard
          label="Capped"
          value={data && (data.capped ? 'Yes' : 'No')}
          caption={data?.capped ? 'Only part of the test set was scored' : 'The whole test set was scored'}
          {...state}
        />
      </StatGrid>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Label counts"
          subtitle="Labelled reviews per class, before the train/test split."
          data={labelCounts}
          xKey="label"
          series={[{ key: 'count', label: 'Reviews' }]}
          toneOf={(row) => (row.key === 'positive' ? 'positive' : row.key === 'negative' ? 'negative' : 'neutral')}
          {...state}
        />
        <BarChartCard
          title="Model scores"
          subtitle="Higher is better; precision, recall and F1 are macro-averaged."
          data={metrics}
          xKey="metric"
          series={[
            { key: 'baseline', label: 'Baseline' },
            { key: 'transformer', label: 'Transformer' },
          ]}
          format={percent0}
          {...state}
        />
      </div>

      <DataCard title="Model comparison" subtitle="Scores on the held-out reviews." bodyHeight={150} {...state}>
        <DataTable
          columns={modelColumns}
          rows={models}
          rowKey={(r) => r.id}
          caption="Accuracy, precision, recall and F1 for each sentiment model"
          pageSizes={[5]}
        />
      </DataCard>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {(['baseline', 'transformer'] as const).map((id) => {
          const scores = data?.[id]
          return (
            <DataCard
              key={id}
              title={`${capitalise(id)} confusion matrix`}
              subtitle="Rows are the actual labels, columns the predicted ones."
              bodyHeight={150}
              {...state}
            >
              {scores && (
                <DataTable
                  columns={confusionColumns(scores.confusion_matrix)}
                  rows={confusionRows(scores.confusion_matrix)}
                  rowKey={(r) => r.actual}
                  caption={`Confusion matrix of the ${id} model`}
                  pageSizes={[5]}
                />
              )}
            </DataCard>
          )
        })}
      </div>

      <NotesCard notes={data?.notes} {...state} />
    </Section>
  )
}

// ---- Emotion ----

const emotionColumns: Column<EmotionRow>[] = [
  { id: 'emotion', header: 'Emotion', cell: (r) => <span className="font-medium">{capitalise(r.emotion)}</span> },
  { id: 'count', header: 'Reviews', align: 'right', cell: (r) => formatNumber(r.count) },
  { id: 'share', header: 'Share', align: 'right', cell: (r) => formatPercent(r.share) },
  {
    id: 'example',
    header: 'Most confident example',
    className: 'min-w-64 whitespace-normal',
    cell: (r) => (r.example ? <span className="block py-1.5">{r.example}</span> : <span className="text-muted-foreground">-</span>),
  },
]

function EmotionSection() {
  const { data, error, loading, reload } = useApi<EmotionResult>('/emotion')
  const title = 'Emotion'
  const subtitle = 'The top emotion of each review, from a DistilRoBERTa model (six emotions plus neutral).'

  if (error) {
    return (
      <Section title={title} subtitle={subtitle}>
        <SectionError title="Emotion counts" error={error} onRetry={reload} />
      </Section>
    )
  }

  const state = { loading, error, onRetry: reload }
  const inference = data?.inference
  const chartData = data?.emotions.map((e) => ({ ...e, label: capitalise(e.emotion) }))

  return (
    <Section title={title} subtitle={subtitle}>
      <StatGrid>
        <StatCard label="Reviews analysed" value={data && formatNumber(data.reviews_analysed)} caption="Reviews the model scored" {...state} />
        <StatCard
          label="Reviews available"
          value={inference && formatNumber(inference.total)}
          caption="English reviews in the dataset"
          {...state}
        />
        <StatCard
          label="Inference cap"
          value={inference && formatNumber(inference.limit)}
          caption={inference ? `${formatNumber(inference.used)} of ${formatNumber(inference.total)} reviews scored` : undefined}
          {...state}
        />
        <StatCard
          label="Capped"
          value={inference && (inference.capped ? 'Yes' : 'No')}
          caption={inference?.capped ? 'A random sample was scored' : 'Every review was scored'}
          {...state}
        />
      </StatGrid>

      <BarChartCard
        title="Emotion counts"
        subtitle={data ? `Reviews per top emotion. Model: ${data.model}` : 'Reviews per top emotion.'}
        data={chartData}
        xKey="label"
        series={[{ key: 'count', label: 'Reviews' }]}
        orientation="rows"
        {...state}
      />

      <DataCard
        title="Emotion breakdown"
        subtitle={data ? `Each emotion's count, share and its most confident example. Model: ${data.model}` : undefined}
        bodyHeight={216}
        {...state}
      >
        <DataTable
          columns={emotionColumns}
          rows={data?.emotions}
          rowKey={(r) => r.emotion}
          caption="Reviews per emotion with an example of each"
          pageSizes={[7, 10]}
        />
      </DataCard>

      <NotesCard notes={data?.notes} {...state} />
    </Section>
  )
}
