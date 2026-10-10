import { useState, type ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { CardStateView, type CardStateProps } from './card-state'

export interface Column<T> {
  id: string
  header: string
  cell: (row: T) => ReactNode
  /** Right-align numbers so their digits line up. */
  align?: 'left' | 'right'
  className?: string
}

export interface DataTableProps<T> extends CardStateProps {
  columns: Column<T>[]
  rows: T[] | null | undefined
  rowKey: (row: T, index: number) => string
  /** Screen-reader caption describing the table. */
  caption: string
  pageSizes?: number[]
}

const ROW_HEIGHT = 36

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  caption,
  pageSizes = [10, 20, 50],
  empty,
  ...state
}: DataTableProps<T>) {
  const [pageSize, setPageSize] = useState(pageSizes[0])
  const [requestedPage, setPage] = useState(0)

  const all = rows ?? []
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize))
  // Clamp rather than reset in an effect, so shrinking data never shows an empty page.
  const page = Math.min(requestedPage, pageCount - 1)
  const visible = all.slice(page * pageSize, (page + 1) * pageSize)
  const bodyHeight = ROW_HEIGHT * Math.min(pageSize, 6)

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="p-px">
        <CardStateView
          {...state}
          empty={empty || all.length === 0}
          minHeight={bodyHeight}
          skeleton={<TableSkeleton columns={columns.length} />}
        >
          <Table className="tabular-nums">
            <caption className="sr-only">{caption}</caption>
            <TableHeader className="bg-muted [&_tr]:border-b">
              <TableRow className="hover:bg-transparent">
                {columns.map((column) => (
                  <TableHead
                    key={column.id}
                    scope="col"
                    className={cn('h-9 px-3 text-[13px]', column.align === 'right' && 'text-right', column.className)}
                  >
                    {column.header}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {visible.map((row, index) => (
                <TableRow key={rowKey(row, page * pageSize + index)} className="h-9">
                  {columns.map((column) => (
                    <TableCell
                      key={column.id}
                      className={cn('h-9 px-3 py-0', column.align === 'right' && 'text-right', column.className)}
                    >
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardStateView>
      </div>
      {!state.loading && !state.error && all.length > 0 && (
        <Pagination
          total={all.length}
          page={page}
          pageCount={pageCount}
          pageSize={pageSize}
          pageSizes={pageSizes}
          onPage={setPage}
          onPageSize={(size) => {
            setPageSize(size)
            setPage(0)
          }}
        />
      )}
    </div>
  )
}

interface PaginationProps {
  total: number
  page: number
  pageCount: number
  pageSize: number
  pageSizes: number[]
  onPage: (page: number) => void
  onPageSize: (size: number) => void
}

function Pagination({ total, page, pageCount, pageSize, pageSizes, onPage, onPageSize }: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t px-3 py-2.5 text-sm">
      <p className="text-muted-foreground tabular-nums">
        {formatNumber(total)} {total === 1 ? 'row' : 'rows'}
      </p>
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="hidden items-center gap-2 sm:flex">
          <span className="font-medium">Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(value) => value && onPageSize(Number(value))}>
            <SelectTrigger size="sm" className="w-18" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizes.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="font-medium whitespace-nowrap tabular-nums">
          Page {page + 1} of {pageCount}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page === 0} onClick={() => onPage(page - 1)}>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </div>
  )
}

function TableSkeleton({ columns }: { columns: number }) {
  return (
    <div>
      <div className="flex h-9 items-center gap-6 bg-muted px-3">
        {Array.from({ length: columns }, (_, i) => (
          <Skeleton key={i} className="h-3 flex-1 bg-gray-200" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, row) => (
        <div key={row} className="flex h-9 items-center gap-6 border-b px-3 last:border-0">
          {Array.from({ length: columns }, (_, i) => (
            <Skeleton key={i} className="h-3 flex-1" />
          ))}
        </div>
      ))}
    </div>
  )
}
