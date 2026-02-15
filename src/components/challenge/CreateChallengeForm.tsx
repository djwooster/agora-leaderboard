"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { supabase } from "@/lib/supabase"
import { generateShareToken, generateAdminToken } from "@/lib/tokens"
import { NewChallengeFormData, NewMetricFormData } from "@/types"
import { format, addDays } from "date-fns"

const DEFAULT_METRICS: NewMetricFormData[] = [
  { name: "Workouts", unit: "sessions", points_per_unit: 10, daily_max: "" },
  { name: "Steps", unit: "steps", points_per_unit: 0.001, daily_max: "20000" },
]

type Step = "basics" | "metrics" | "review"

export function CreateChallengeForm() {
  const router = useRouter()
  const [step, setStep] = useState<Step>("basics")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const todayStr = format(new Date(), "yyyy-MM-dd")
  const thirtyDaysStr = format(addDays(new Date(), 30), "yyyy-MM-dd")

  const [form, setForm] = useState<NewChallengeFormData>({
    name: "",
    description: "",
    start_date: todayStr,
    end_date: thirtyDaysStr,
    metrics: DEFAULT_METRICS,
  })

  function updateField<K extends keyof NewChallengeFormData>(key: K, value: NewChallengeFormData[K]) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  function addMetric() {
    setForm((prev) => ({
      ...prev,
      metrics: [
        ...prev.metrics,
        { name: "", unit: "", points_per_unit: 1, daily_max: "" },
      ],
    }))
  }

  function removeMetric(index: number) {
    setForm((prev) => ({
      ...prev,
      metrics: prev.metrics.filter((_, i) => i !== index),
    }))
  }

  function updateMetric(index: number, key: keyof NewMetricFormData, value: string | number) {
    setForm((prev) => {
      const metrics = [...prev.metrics]
      metrics[index] = { ...metrics[index], [key]: value }
      return { ...prev, metrics }
    })
  }

  function validateBasics() {
    if (!form.name.trim()) return "Challenge name is required."
    if (!form.start_date) return "Start date is required."
    if (!form.end_date) return "End date is required."
    if (form.end_date <= form.start_date) return "End date must be after start date."
    return null
  }

  function validateMetrics() {
    if (form.metrics.length === 0) return "Add at least one metric."
    for (const m of form.metrics) {
      if (!m.name.trim()) return "All metrics need a name."
      if (!m.unit.trim()) return "All metrics need a unit."
      if (!m.points_per_unit || isNaN(Number(m.points_per_unit))) return "Points per unit must be a number."
    }
    return null
  }

  function handleNextFromBasics() {
    const err = validateBasics()
    if (err) { setError(err); return }
    setError("")
    setStep("metrics")
  }

  function handleNextFromMetrics() {
    const err = validateMetrics()
    if (err) { setError(err); return }
    setError("")
    setStep("review")
  }

  async function handleCreate() {
    setSubmitting(true)
    setError("")

    const shareToken = generateShareToken()
    const adminToken = generateAdminToken()

    const { data: challengeData, error: challengeErr } = await supabase
      .from("challenges")
      .insert({
        name: form.name.trim(),
        description: form.description.trim() || null,
        start_date: form.start_date,
        end_date: form.end_date,
        share_token: shareToken,
        admin_token: adminToken,
        is_active: true,
      })
      .select()
      .single()

    if (challengeErr || !challengeData) {
      setError(challengeErr?.message ?? "Failed to create challenge. Please try again.")
      setSubmitting(false)
      return
    }

    const metricsToInsert = form.metrics.map((m, i) => ({
      challenge_id: challengeData.id,
      name: m.name.trim(),
      unit: m.unit.trim(),
      points_per_unit: Number(m.points_per_unit),
      daily_max: m.daily_max ? Number(m.daily_max) : null,
      sort_order: i,
    }))

    const { error: metricsErr } = await supabase.from("metrics").insert(metricsToInsert)

    if (metricsErr) {
      setError("Challenge created but metrics failed. Contact support.")
      setSubmitting(false)
      return
    }

    // Store admin token in localStorage
    localStorage.setItem(`agora_admin_${challengeData.id}`, adminToken)

    router.push(`/challenge/${shareToken}/admin?key=${adminToken}&created=true`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 pb-16 pt-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {(["basics", "metrics", "review"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                step === s
                  ? "bg-foreground text-background"
                  : ["basics", "metrics", "review"].indexOf(step) > i
                  ? "bg-foreground/20 text-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {i + 1}
            </div>
            <span className={`text-sm capitalize hidden sm:block ${step === s ? "text-foreground font-medium" : "text-muted-foreground"}`}>
              {s === "basics" ? "Details" : s === "metrics" ? "Metrics" : "Review"}
            </span>
            {i < 2 && <span className="text-muted-foreground/30 mx-1">→</span>}
          </div>
        ))}
      </div>

      {/* Basics step */}
      {step === "basics" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold mb-1">Challenge details</h2>
            <p className="text-sm text-muted-foreground">Give your challenge a name and set the date range.</p>
          </div>
          <Separator />

          <div className="space-y-1.5">
            <Label htmlFor="name">Challenge name <span className="text-destructive">*</span></Label>
            <Input
              id="name"
              placeholder="e.g. January Fitness Blitz"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description <span className="text-muted-foreground text-xs font-normal">(optional)</span></Label>
            <Textarea
              id="description"
              placeholder="What's this challenge about? Any rules?"
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="start_date">Start date</Label>
              <Input
                id="start_date"
                type="date"
                value={form.start_date}
                onChange={(e) => updateField("start_date", e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="end_date">End date</Label>
              <Input
                id="end_date"
                type="date"
                value={form.end_date}
                onChange={(e) => updateField("end_date", e.target.value)}
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button onClick={handleNextFromBasics} className="w-full">
            Next: Set up metrics →
          </Button>
        </div>
      )}

      {/* Metrics step */}
      {step === "metrics" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold mb-1">Metrics</h2>
            <p className="text-sm text-muted-foreground">
              Define what participants track each day and how it scores.
            </p>
          </div>
          <Separator />

          <div className="space-y-3">
            {form.metrics.map((metric, i) => (
              <div key={i} className="border rounded-md p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Metric {i + 1}
                  </span>
                  {form.metrics.length > 1 && (
                    <button
                      onClick={() => removeMetric(i)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Name</Label>
                    <Input
                      placeholder="e.g. Workouts"
                      value={metric.name}
                      onChange={(e) => updateMetric(i, "name", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Input
                      placeholder="e.g. sessions"
                      value={metric.unit}
                      onChange={(e) => updateMetric(i, "unit", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Points per unit</Label>
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="1"
                      value={metric.points_per_unit}
                      onChange={(e) => updateMetric(i, "points_per_unit", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Daily cap <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="no cap"
                      value={metric.daily_max}
                      onChange={(e) => updateMetric(i, "daily_max", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={addMetric}
            className="w-full border border-dashed rounded-md py-2.5 text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          >
            + Add metric
          </button>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("basics")} className="flex-1">
              ← Back
            </Button>
            <Button onClick={handleNextFromMetrics} className="flex-1">
              Review →
            </Button>
          </div>
        </div>
      )}

      {/* Review step */}
      {step === "review" && (
        <div className="space-y-5">
          <div>
            <h2 className="text-base font-semibold mb-1">Review & create</h2>
            <p className="text-sm text-muted-foreground">Everything look right?</p>
          </div>
          <Separator />

          <div className="space-y-1 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Name</span>
              <span className="font-medium">{form.name}</span>
            </div>
            {form.description && (
              <div className="flex justify-between py-2 border-b">
                <span className="text-muted-foreground">Description</span>
                <span className="text-right max-w-[60%]">{form.description}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Dates</span>
              <span>{format(new Date(form.start_date + "T00:00:00"), "MMM d")} – {format(new Date(form.end_date + "T00:00:00"), "MMM d, yyyy")}</span>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Metrics</p>
            {form.metrics.map((m, i) => (
              <div key={i} className="flex items-baseline justify-between text-sm py-1.5 border-b last:border-0">
                <span className="font-medium">{m.name}</span>
                <span className="text-muted-foreground text-xs">
                  {m.points_per_unit} pt / {m.unit}
                  {m.daily_max ? ` · max ${m.daily_max}` : ""}
                </span>
              </div>
            ))}
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setStep("metrics")} className="flex-1">
              ← Back
            </Button>
            <Button onClick={handleCreate} disabled={submitting} className="flex-1">
              {submitting ? "Creating..." : "Create challenge"}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
