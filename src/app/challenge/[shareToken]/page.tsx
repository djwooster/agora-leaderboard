"use client"

import { useState, useEffect } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"
import { PageHeader } from "@/components/layout/PageHeader"
import { LeaderboardView } from "@/components/leaderboard/LeaderboardView"
import { Skeleton } from "@/components/ui/skeleton"
import { supabase } from "@/lib/supabase"
import { Challenge, Metric } from "@/types"
import { format, parseISO } from "date-fns"

interface PageProps {
  params: Promise<{ shareToken: string }>
}

export default function ChallengePage({ params }: PageProps) {
  const [shareToken, setShareToken] = useState<string | null>(null)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [metrics, setMetrics] = useState<Metric[]>([])
  const [loading, setLoading] = useState(true)
  const [notFoundError, setNotFoundError] = useState(false)

  useEffect(() => {
    params.then(({ shareToken: token }) => setShareToken(token))
  }, [params])

  useEffect(() => {
    if (!shareToken) return

    async function load() {
      const { data: challengeData } = await supabase
        .from("challenges")
        .select("*")
        .eq("share_token", shareToken)
        .single()

      if (!challengeData) {
        setNotFoundError(true)
        setLoading(false)
        return
      }

      const { data: metricsData } = await supabase
        .from("metrics")
        .select("*")
        .eq("challenge_id", challengeData.id)
        .order("sort_order")

      setChallenge(challengeData as Challenge)
      setMetrics((metricsData ?? []) as Metric[])

      // Track in recent challenges
      const stored = localStorage.getItem("agora_recent_challenges")
      const recent = stored ? JSON.parse(stored) : []
      const filtered = recent.filter((c: { id: string }) => c.id !== challengeData.id)
      filtered.unshift({
        id: challengeData.id,
        name: challengeData.name,
        share_token: challengeData.share_token,
        start_date: challengeData.start_date,
        end_date: challengeData.end_date,
        visitedAt: new Date().toISOString(),
      })
      localStorage.setItem("agora_recent_challenges", JSON.stringify(filtered.slice(0, 20)))

      setLoading(false)
    }

    load()
  }, [shareToken])

  if (notFoundError) {
    notFound()
  }

  if (loading || !challenge) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b">
          <div className="mx-auto max-w-2xl px-4 py-4">
            <Skeleton className="h-5 w-48 mb-1" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <div className="mx-auto max-w-2xl px-4 pt-6 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  const dateRange = `${format(parseISO(challenge.start_date), "MMM d")} – ${format(parseISO(challenge.end_date), "MMM d, yyyy")}`

  // Check if current user is admin
  const adminToken = typeof window !== "undefined"
    ? localStorage.getItem(`agora_admin_${challenge.id}`)
    : null

  const adminAction = adminToken ? (
    <Link
      href={`/challenge/${shareToken}/admin?key=${adminToken}`}
      className="text-xs text-muted-foreground hover:text-foreground transition-colors"
    >
      Admin
    </Link>
  ) : null

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title={challenge.name}
        subtitle={dateRange}
        backHref="/"
        backLabel="Challenges"
        action={adminAction ?? undefined}
      />
      <LeaderboardView challenge={challenge} metrics={metrics} />
    </div>
  )
}
