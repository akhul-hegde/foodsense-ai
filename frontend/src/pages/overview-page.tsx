import { BarChartCard, DataCard, DataTable, StatCard, StatGrid, type Column } from '@/components/data'
import { formatNumber, formatPercent } from '@/lib/format'
import { useApi } from '@/lib/use-api'

/** Response of GET /api/overview. */
interface Overview {
  review_count: number
  word_count: number
  unique_words: number
  sentence_count: number
  avg_words_per_review: number
  language: { code: string; share: number }
  /** Reviews per detected language code, most common first. */
  review_languages: Record<string, number>
  tokenization_sample: { text: string; sentences: string[]; tokens: string[] }
}

interface LanguageRow {
  code: string
  name: string
  reviews: number
  share: number
}

interface SentenceRow {
  index: number
  text: string
}

const TOP_LANGUAGES = 8

const languageNames = new Intl.DisplayNames(['en'], { type: 'language' })

/** "en" -> "English"; codes the browser does not know (such as "unknown") are shown as they are. */
function languageName(code: string): string {
  try {
    return languageNames.of(code) ?? code
  } catch {
    return code
  }
}

function languageRows(overview: Overview | null): LanguageRow[] {
  if (!overview) return []
  return Object.entries(overview.review_languages).map(([code, reviews]) => ({
    code,
    name: languageName(code),
    reviews,
    share: reviews / overview.review_count,
  }))
}

const languageColumns: Column<LanguageRow>[] = [
  { id: 'name', header: 'Language', cell: (r) => <span className="font-medium">{r.name}</span> },
  { id: 'code', header: 'Code', cell: (r) => <span className="text-muted-foreground">{r.code}</span> },
  { id: 'reviews', header: 'Reviews', align: 'right', cell: (r) => formatNumber(r.reviews) },
  { id: 'share', header: 'Share', align: 'right', cell: (r) => formatPercent(r.share) },
]

const sentenceColumns: Column<SentenceRow>[] = [
  { id: 'index', header: '#', className: 'w-12 text-muted-foreground', cell: (r) => r.index },
  { id: 'text', header: 'Sentence', className: 'whitespace-normal', cell: (r) => r.text },
]

export function OverviewPage() {
  const { data, error, loading, reload } = useApi<Overview>('/overview')
  const state = { loading, error, onRetry: reload }

  const languages = languageRows(data)
  const sample = data?.tokenization_sample
  const sentences: SentenceRow[] = (sample?.sentences ?? []).map((text, i) => ({ index: i + 1, text }))

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-6">
      <StatGrid>
        <StatCard label="Reviews" value={data && formatNumber(data.review_count)} {...state} />
        <StatCard label="Words" value={data && formatNumber(data.word_count)} {...state} />
        <StatCard label="Unique words" value={data && formatNumber(data.unique_words)} {...state} />
        <StatCard label="Sentences" value={data && formatNumber(data.sentence_count)} {...state} />
        <StatCard
          label="Average words per review"
          value={data && formatNumber(data.avg_words_per_review)}
          {...state}
        />
        <StatCard
          label="Main language"
          value={data && languageName(data.language.code)}
          caption={data ? `${formatPercent(data.language.share)} of reviews (${data.language.code})` : undefined}
          {...state}
        />
      </StatGrid>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <BarChartCard
          title="Review languages"
          subtitle={`Reviews per detected language, top ${TOP_LANGUAGES}.`}
          data={languages.slice(0, TOP_LANGUAGES)}
          xKey="name"
          series={[{ key: 'reviews', label: 'Reviews' }]}
          orientation="rows"
          {...state}
        />
        <DataCard
          title="All languages"
          subtitle="Every language detected across the reviews."
          bodyHeight={216}
          {...state}
        >
          <DataTable
            columns={languageColumns}
            rows={languages}
            rowKey={(r) => r.code}
            caption="Reviews per detected language"
            pageSizes={[5, 10, 20]}
          />
        </DataCard>
      </div>

      <DataCard
        title="Tokenization sample"
        subtitle="The first review, split into sentences and tokens."
        bodyHeight={320}
        {...state}
      >
        {sample && (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Review text</h3>
              <p className="rounded-md border bg-subtle p-3 text-sm whitespace-pre-wrap">{sample.text}</p>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Sentences ({formatNumber(sentences.length)})</h3>
              <DataTable
                columns={sentenceColumns}
                rows={sentences}
                rowKey={(r) => String(r.index)}
                caption="Sentences found in the first review"
                pageSizes={[5, 10, 20]}
              />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Tokens ({formatNumber(sample.tokens.length)})</h3>
              <ul className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto" aria-label="Tokens of the first review">
                {sample.tokens.map((token, i) => (
                  <li key={i} className="rounded-md border px-2 py-0.5 text-sm text-muted-foreground">
                    {token}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </DataCard>
    </div>
  )
}
