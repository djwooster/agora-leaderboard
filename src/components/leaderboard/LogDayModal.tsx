"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { supabase } from "@/lib/supabase"
import { Metric, Participant } from "@/types"
import { format } from "date-fns"

interface LogDayModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  participant: Participant
  metrics: Metric[]
  challengeId: string
  existingLogs?: Record<string, number> // metricId -> value
  onLogged: () => void
}

export function LogDayModal({
  open,
  onOpenChange,
  participant,
  metrics,
  existingLogs = {},
  onLogged,
}: LogDayModalProps) {
  const today = format(new Date(), "yyyy-MM-dd")
  const displayDate = format(new Date(), "EEEE, MMMM d")

  const [values, setValues] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  // Pre-fill with existing logs when modal opens
  useEffect(() => {
    if (open) {
      const prefilled: Record<string, string> = {}
      for (const metric of metrics) {
        prefilled[metric.id] = existingLogs[metric.id]?.toString() ?? ""
      }
      setValues(prefilled)
      setError("")
    }
  }, [open, metrics, existingLogs])

  async function handleSubmit() {
    setError("")
    setSubmitting(true)

    const upserts = metrics
      .filter((m) => {
        const raw = values[m.id]
        return raw !== "" && raw !== undefined && !isNaN(parseFloat(raw))
      })
      .map((m) => ({
        participant_id: participant.id,
        metric_id: m.id,
        value: parseFloat(values[m.id]),
        log_date: today,
      }))

    if (upserts.length === 0) {
      setError("Enter at least one value to log.")
      setSubmitting(false)
      return
    }

    const { error: dbError } = await supabase
      .from("logs")
      .upsert(upserts, { onConflict: "participant_id,metric_id,log_date" })

    if (dbError) {
      setError("Failed to save. Please try again.")
      setSubmitting(false)
      return
    }

    setSubmitting(false)
    onLogged()
    onOpenChange(false)
  }

  const sortedMetrics = [...metrics].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {participant.avatar_emoji} Log for {participant.name}
          </DialogTitle>
          <DialogDescription>{displayDate}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {sortedMetrics.map((metric) => (
            <div key={metric.id} className="space-y-1.5">
              <Label htmlFor={`metric-${metric.id}`} className="flex items-baseline gap-1.5">
                <span>{metric.name}</span>
                <span className="text-xs text-muted-foreground font-normal">{metric.unit}</span>
                {metric.daily_max && (
                  <span className="text-xs text-muted-foreground font-normal ml-auto">
                    max {metric.daily_max}
                  </span>
                )}
              </Label>
              <Input
                id={`metric-${metric.id}`}
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={values[metric.id] ?? ""}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, [metric.id]: e.target.value }))
                }
              />
            </div>
          ))}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Saving..." : "Save log"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
