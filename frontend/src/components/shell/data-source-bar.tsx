import { useRef, useState, type FormEvent } from 'react'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useDataset } from '@/lib/dataset'
import { formatNumber } from '@/lib/format'

/** Choose what to analyse: a restaurant from the corpus, an uploaded CSV, pasted text or a review page URL. */
export function DataSourceBar() {
  const dataset = useDataset()
  const { current, restaurants, loading, loadError, pending, actionError } = dataset
  const fileInput = useRef<HTMLInputElement>(null)
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)

  const busy = pending !== null
  const unavailable = loadError !== null && !current
  const selected = restaurants?.some((r) => r.name === current?.name) ? current!.name : null

  async function onFile(file: File | undefined) {
    if (fileInput.current) fileInput.current.value = '' // let the same file be chosen again
    if (file) await dataset.upload(file)
  }

  async function onUrlSubmit(event: FormEvent) {
    event.preventDefault()
    const value = url.trim()
    if (!/^https?:\/\/\S+\.\S+/i.test(value)) {
      setUrlError('Enter a full address starting with http:// or https://.')
      return
    }
    setUrlError(null)
    if (await dataset.scrape(value)) setUrl('')
  }

  const message = urlError ?? (pasteOpen ? null : actionError) ?? loadError

  return (
    <section aria-label="Data source" className="border-b bg-subtle px-4 py-3 sm:px-6">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={selected}
          onValueChange={(name) => name && dataset.select(name)}
          disabled={busy || loading || !restaurants?.length}
        >
          <SelectTrigger className="h-8 w-full bg-background sm:w-60" aria-label="Restaurant">
            <SelectValue placeholder={pending === 'select' ? 'Loading restaurant...' : 'Choose a restaurant'} />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false} align="start" className="max-h-80 min-w-64">
            {restaurants?.map((r) => (
              <SelectItem key={r.name} value={r.name}>
                <span className="truncate">{r.name}</span>
                <span className="ml-auto pl-3 text-xs text-muted-foreground tabular-nums">
                  {formatNumber(r.review_count)}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInput}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(event) => onFile(event.target.files?.[0])}
        />
        <Button
          variant="outline"
          className="h-8 flex-1 sm:flex-none"
          disabled={busy || unavailable}
          onClick={() => fileInput.current?.click()}
        >
          {pending === 'upload' ? 'Uploading...' : 'Upload CSV'}
        </Button>
        <Button
          variant="outline"
          className="h-8 flex-1 sm:flex-none"
          disabled={busy || unavailable}
          onClick={() => {
            dataset.clearActionError()
            setPasteOpen(true)
          }}
        >
          Paste text
        </Button>

        <form onSubmit={onUrlSubmit} noValidate className="flex w-full min-w-0 gap-2 lg:w-auto lg:flex-1">
          <Input
            type="url"
            inputMode="url"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value)
              setUrlError(null)
            }}
            placeholder="Review page URL"
            aria-label="Review page URL"
            aria-invalid={urlError ? true : undefined}
            disabled={busy || unavailable}
            className="h-8 min-w-0 flex-1 bg-background"
          />
          <Button type="submit" variant="outline" className="h-8" disabled={busy || unavailable || !url.trim()}>
            {pending === 'scrape' ? 'Fetching...' : 'Fetch'}
          </Button>
        </form>
      </div>

      {message && (
        <div role="alert" className="mt-2 flex items-center gap-3 text-sm text-negative">
          <p className="min-w-0">{message}</p>
          {message === loadError && (
            <Button variant="link" size="xs" className="h-auto shrink-0 px-0 text-brand" onClick={dataset.refresh}>
              Try again
            </Button>
          )}
        </div>
      )}

      <PasteDialog open={pasteOpen} onOpenChange={setPasteOpen} />
    </section>
  )
}

function PasteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { paste, pending, actionError } = useDataset()
  const [text, setText] = useState('')
  const lines = text.split('\n').filter((line) => line.trim()).length

  async function onSubmit(event: FormEvent) {
    event.preventDefault()
    if (await paste(text)) {
      setText('')
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="sm:max-w-lg">
        <form onSubmit={onSubmit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Paste reviews</DialogTitle>
            <DialogDescription>Put one review on each line. Blank lines are ignored.</DialogDescription>
          </DialogHeader>
          <Textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={8}
            aria-label="Reviews, one per line"
            className="max-h-72 min-h-40"
          />
          <p className="-mt-2 text-xs text-muted-foreground tabular-nums">
            {lines} {lines === 1 ? 'review' : 'reviews'}
          </p>
          {actionError && (
            <p role="alert" className="text-sm text-negative">
              {actionError}
            </p>
          )}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={lines === 0 || pending === 'paste'}>
              {pending === 'paste' ? 'Analysing...' : 'Use this text'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
