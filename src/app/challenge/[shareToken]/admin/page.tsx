"use client"

import { useState, useEffect, useCallback } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { Challenge, Metric, Participant } from "@/types"
import { format, parseISO } from "date-fns"

interface PageProps {
  params: Promise<{ shareToken: string }>
}

export default function AdminPage({ params }: PageProps) {
  const searchParams = useSearchParams()
  const adminKey = searchParams.get("key")

  const [shareToken, setShareToken] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [participants, setParticipants] = useState<Participant[]>([])
  const [loading, setLoading] = useState(true)
  const [unauthorized, setUnauthorized] = useState(false)
  const [copied, setCopied] = useState<"share" | "admin" | null>(null)
  const [created, setCreated] = useState(false)

  useEffect(() => {
    params.then(({ shareToken: token }) => setShareToken(token))
  }, [params])

  useEffect(() => {
    const isCreated = new URLSearchParams(window.location.search).get("created") === "true"
    setCreated(isCreated)
  }, [])

  const load = useCallback(async () => {
    if (!shareToken || !adminKey) return

    const { data: challengeData } = await supabase
      .from("challenges")
      .select("*")
      .eq("share_token", shareToken)
      .single()

    if (!challengeData || challengeData.admin_token !== adminKey) {
      setUnauthorized(true)
      setLoading(false)
      return
    }

    const [{ data: metricsData }, { data: participantsData }] = await Promise.all([
      supabase.from("metrics").select("*").eq("challenge_id", challengeData.id).order("sort_order"),
      supabase.from("participants").select("*").eq("challenge_id", challengeData.id).order("created_at"),
    ])

    setChallenge(challengeData as Challenge)
    setMetrics((metricsData ?? []) as Metric[])
    setParticipants((participantsData ?? []) as Participant[])
    setLoading(false)
  }, [shareToken, adminKey])

  useEffect(() => {
    load()
  }, [load])

  async function removeParticipant(participantId: string) {
    if (!confirm("Remove this participant? Their logs will also be deleted.")) return
    await supabase.from("participants").delete().eq("id", participantId)
    setParticipants((prev) => prev.filter((p) => p.id !== participantId))
  }

  function copyToClipboard(text: string, type: "share" | "admin") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <Skeleton className="h-5 w-40" />
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pt-6 space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      </div>
    )
  }

  if (unauthorized || !challenge) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center px-4">
          <p className="text-sm font-medium mb-1">Access denied</p>
          <p className="text-sm text-muted-foreground mb-4">
            The admin key is invalid or missing.
          </p>
          <Button variant="outline" size="sm" asChild>
            <Link href="/">Go home</Link>
          </Button>
        </div>
      </div>
    )
  }

  const origin = typeof window !== "undefined" ? window.location.origin : ""
  const shareUrl = `${origin}/challenge/${challenge.share_token}`
  const adminUrl = `${origin}/challenge/${challenge.share_token}/admin?key=${challenge.admin_token}`
  const dateRange = `${format(parseISO(challenge.start_date), "MMM d")} – ${format(parseISO(challenge.end_date), "MMM d, yyyy")}`

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={challenge.name}
        subtitle={`Admin · ${dateRange}`}
        backHref={`/challenge/${challenge.share_token}`}
        backLabel="Back to leaderboard"
      />

      <div className="mx-auto max-w-2xl px-4 pb-16 pt-6 space-y-8">

        {/* Created banner */}
        {created && (
          <div className="border border-green-200 bg-green-50 rounded-md px-4 py-3 text-sm text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200">
            🎉 Challenge created! Share the link below with your group.
          </div>
        )}

        {/* Links section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Share links</h2>
          <Separator />

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Participant link (share this)</Label>
              <div className="flex gap-2">
                <Input value={shareUrl} readOnly className="text-xs font-mono" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(shareUrl, "share")}
                  className="shrink-0"
                >
                  {copied === "share" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">
                Admin link{" "}
                <span className="text-destructive/70">(keep private)</span>
              </Label>
              <div className="flex gap-2">
                <Input value={adminUrl} readOnly className="text-xs font-mono" />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(adminUrl, "admin")}
                  className="shrink-0"
                >
                  {copied === "admin" ? "Copied!" : "Copy"}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Metrics</h2>
          <Separator />
          <div className="divide-y divide-border/50">
            {metrics.map((m) => (
              <div key={m.id} className="flex items-baseline justify-between py-3 text-sm">
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-muted-foreground ml-1.5">({m.unit})</span>
                </div>
                <span className="text-muted-foreground text-xs">
                  {m.points_per_unit} pt / {m.unit}
                  {m.daily_max ? ` · max ${m.daily_max}/day` : ""}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Metrics cannot be edited after creation to preserve existing log data.
          </p>
        </div>

        {/* Participants section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Participants{" "}
              <span className="text-muted-foreground font-normal">({participants.length})</span>
            </h2>
          </div>
          <Separator />
          {participants.length === 0 ? (
            <p className="text-sm text-muted-foreground py-3">
              No one has joined yet. Share the participant link above!
            </p>
          ) : (
            <div className="divide-y divide-border/50">
              {participants.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{p.avatar_emoji}</span>
                    <span className="text-sm font-medium">{p.name}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground">
                      Joined {format(parseISO(p.created_at), "MMM d")}
                    </span>
                    <button
                      onClick={() => removeParticipant(p.id)}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Challenge info */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold">Challenge info</h2>
          <Separator />
          <div className="space-y-1 text-sm">
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={challenge.is_active ? "default" : "secondary"} className="text-xs font-normal">
                {challenge.is_active ? "Active" : "Archived"}
              </Badge>
            </div>
            <div className="flex justify-between py-2 border-b">
              <span className="text-muted-foreground">Date range</span>
              <span>{dateRange}</span>
            </div>
            {challenge.description && (
              <div className="flex justify-between py-2">
                <span className="text-muted-foreground">Description</span>
                <span className="text-right max-w-[60%]">{challenge.description}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
