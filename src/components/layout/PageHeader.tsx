"use client"

import Link from "next/link"
import { Separator } from "@/components/ui/separator"

interface PageHeaderProps {
  title: string
  subtitle?: string
  action?: React.ReactNode
  backHref?: string
  backLabel?: string
}

export function PageHeader({ title, subtitle, action, backHref, backLabel }: PageHeaderProps) {
  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm">
      <div className="mx-auto max-w-2xl px-4 py-4">
        {backHref && (
          <Link
            href={backHref}
            className="mb-3 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>←</span>
            <span>{backLabel ?? "Back"}</span>
          </Link>
        )}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight truncate">{title}</h1>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </div>
      <Separator />
    </div>
  )
}
