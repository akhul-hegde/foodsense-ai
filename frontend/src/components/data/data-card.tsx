import type { ReactNode } from 'react'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

import { CardStateView, type CardStateProps } from './card-state'

export interface DataCardProps extends CardStateProps {
  title: string
  subtitle?: string
  /** Top-right control, usually a SegmentedControl. */
  action?: ReactNode
  /** Height of the body in every state. */
  bodyHeight?: number
  skeleton?: ReactNode
  footer?: ReactNode
  className?: string
  children: ReactNode
}

/** The card frame shared by charts and other analysis panels: title, muted subtitle, action, stateful body. */
export function DataCard({
  title,
  subtitle,
  action,
  bodyHeight = 240,
  skeleton,
  footer,
  className,
  children,
  ...state
}: DataCardProps) {
  return (
    <Card className={cn('gap-5 py-5 [--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(5)]', className)}>
      <CardHeader className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="min-w-0 space-y-1">
          <CardTitle className="text-base font-semibold">{title}</CardTitle>
          {subtitle && <CardDescription>{subtitle}</CardDescription>}
        </div>
        {action && <CardAction className="col-auto row-auto self-auto">{action}</CardAction>}
      </CardHeader>
      <CardContent>
        <CardStateView minHeight={bodyHeight} skeleton={skeleton} {...state}>
          {children}
        </CardStateView>
      </CardContent>
      {footer && <div className="px-(--card-spacing) text-sm text-muted-foreground">{footer}</div>}
    </Card>
  )
}
