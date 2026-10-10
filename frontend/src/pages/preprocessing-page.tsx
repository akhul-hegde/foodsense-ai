import { useState } from 'react'

import { BarChartCard, DataCard, DataTable, StatCard, StatGrid, type Column } from '@/components/data'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDataset } from '@/lib/dataset'
import { formatNumber } from '@/lib/format'
import { useApi } from '@/lib/use-api'

/** Response of GET /api/preprocess. */
interface Preprocessed {
  /** Zero-based position of the review in the dataset. */
  index: number
  /** Number of reviews in the dataset. */
  count: number
  original: string
  cleaned: string
  stemmed: string
  lemmatized: string
  tokens: TokenRow[]
}

interface TokenRow {
  token: string
  stem: string
  lemma: string
}

interface FormRow {
  step: string
  distinct: number
}

const steps: { key: 'cleaned' | 'stemmed' | 'lemmatized'; label: string; note: string }[] = [
  { key: 'cleaned', label: 'Cleaned', note: 'Lowercased, URLs and punctuation removed, stopwords dropped (negations kept).' },
  { key: 'stemmed', label: 'Stemmed', note: 'Each word cut to its Porter stem.' },
  { key: 'lemmatized', label: 'Lemmatized', note: 'Each word reduced to its dictionary form.' },
]

/** Unchanged forms are muted so the words each step rewrote stand out. */
function formCell(form: string, token: string) {
  return <span className={form === token ? 'text-muted-foreground' : 'font-medium'}>{form}</span>
}

const tokenColumns: Column<TokenRow>[] = [
  { id: 'token', header: 'Token', cell: (r) => r.token },
  { id: 'stem', header: 'Stem', cell: (r) => formCell(r.stem, r.token) },
  { id: 'lemma', header: 'Lemma', cell: (r) => formCell(r.lemma, r.token) },
]

export function PreprocessingPage() {
  // A new dataset can have fewer reviews, so start again from the first one.
  const { version } = useDataset()
  return <ReviewPreprocessing key={version} />
}

function ReviewPreprocessing() {
  const [index, setIndex] = useState(0)
  const { data, error, loading, reload } = useApi<Preprocessed>(`/preprocess?i=${index}`)
  const state = { loading, error, onRetry: reload }

  const last = data ? data.count - 1 : undefined
  const forms: FormRow[] | null = data && [
    { step: 'Tokens', distinct: new Set(data.tokens.map((t) => t.token)).size },
    { step: 'Stems', distinct: new Set(data.tokens.map((t) => t.stem)).size },
    { step: 'Lemmas', distinct: new Set(data.tokens.map((t) => t.lemma)).size },
  ]

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <DataCard
        title="Original review"
        subtitle="Pick a review to see each cleaning step applied to it."
        action={<ReviewPicker index={index} last={last} onChange={setIndex} />}
        bodyHeight={96}
        {...state}
      >
        <p className="rounded-md border bg-subtle p-3 text-sm whitespace-pre-wrap">{data?.original}</p>
      </DataCard>

      <StatGrid>
        <StatCard label="Review" value={data && `#${formatNumber(data.index + 1)}`} caption="Position in the dataset" {...state} />
        <StatCard label="Reviews in dataset" value={data && formatNumber(data.count)} {...state} />
        <StatCard
          label="Tokens kept"
          value={data && formatNumber(data.tokens.length)}
          caption="After cleaning"
          empty={data?.tokens.length === 0}
          emptyMessage="No words left after cleaning"
          {...state}
        />
        <StatCard
          label="Distinct lemmas"
          value={data && formatNumber(forms?.[2].distinct ?? 0)}
          empty={data?.tokens.length === 0}
          emptyMessage="No words left after cleaning"
          {...state}
        />
      </StatGrid>

      <DataCard
        title="Text after each step"
        subtitle="The same review as it moves through cleaning, stemming and lemmatization."
        bodyHeight={240}
        {...state}
      >
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.key} className="space-y-1.5">
              <h3 className="text-sm font-medium">{step.label}</h3>
              <p className="text-sm text-muted-foreground">{step.note}</p>
              <p className="rounded-md border bg-subtle p-3 text-sm whitespace-pre-wrap">
                {data?.[step.key] || <span className="text-muted-foreground">Nothing left after cleaning.</span>}
              </p>
            </div>
          ))}
        </div>
      </DataCard>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Distinct forms per step"
          subtitle="Stemming and lemmatizing merge word forms, so fewer distinct ones remain."
          data={data?.tokens.length ? forms : undefined}
          xKey="step"
          series={[{ key: 'distinct', label: 'Distinct forms' }]}
          emptyMessage="No words left after cleaning."
          {...state}
        />
        <DataCard
          title="Token by token"
          subtitle="Bold forms differ from the cleaned token."
          bodyHeight={216}
          {...state}
        >
          <DataTable
            columns={tokenColumns}
            rows={data?.tokens}
            rowKey={(_, i) => String(i)}
            caption="Each cleaned token with its stem and lemma"
            pageSizes={[10, 20, 50]}
            emptyMessage="No words left after cleaning."
          />
        </DataCard>
      </div>
    </div>
  )
}

interface ReviewPickerProps {
  index: number
  /** Index of the final review; unknown until the first response arrives. */
  last: number | undefined
  onChange: (index: number) => void
}

function ReviewPicker({ index, last, onChange }: ReviewPickerProps) {
  const commit = (value: string) => {
    const number = Math.trunc(Number(value))
    if (!Number.isFinite(number) || number < 1) return onChange(index)
    onChange(last === undefined ? number - 1 : Math.min(number - 1, last))
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" disabled={index === 0} onClick={() => onChange(index - 1)}>
        Previous
      </Button>
      <label className="flex items-center gap-2 text-sm">
        <span className="sr-only sm:not-sr-only">Review</span>
        {/* Uncontrolled and keyed by index so typing is free and Previous/Next update the field. */}
        <Input
          key={index}
          type="number"
          min={1}
          max={last === undefined ? undefined : last + 1}
          defaultValue={index + 1}
          className="h-7 w-20 tabular-nums"
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commit(e.currentTarget.value)}
        />
        {last !== undefined && <span className="text-muted-foreground tabular-nums">of {formatNumber(last + 1)}</span>}
      </label>
      <Button variant="outline" size="sm" disabled={last !== undefined && index >= last} onClick={() => onChange(index + 1)}>
        Next
      </Button>
    </div>
  )
}
