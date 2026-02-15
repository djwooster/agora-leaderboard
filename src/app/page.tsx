"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { format, parseISO, isAfter, isBefore } from "date-fns"

interface StoredChallenge {
  id: string
  name: string
  share_token: string
  end_date: string
  start_date: string
  visitedAt: string
}

export default function HomePage() {
  const [recentChallenges, setRecentChallenges] = useState<StoredChallenge[]>([])

  useEffect(() => {
    const stored = localStorage.getItem("agora_recent_challenges")
    if (stored) {
      try {
        setRecentChallenges(JSON.parse(stored))
      } catch {
        // ignore
      }
    }
  }, [])

  function getChallengeStatus(start: string, end: string) {
    const now = new Date()
    const startDate = parseISO(start)
    const endDate = parseISO(end)
    if (isBefore(now, startDate)) return "upcoming"
    if (isAfter(now, endDate)) return "ended"
    return "active"
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Agora</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Group fitness challenges, simplified.
          </p>
        </div>
        <Button size="sm" asChild>
          <Link href="/challenge/new">New challenge</Link>
        </Button>
      </div>

      <Separator className="mb-6" />

      {recentChallenges.length === 0 ? (
        <div className="py-16 text-center">
          <div className="text-4xl mb-4">🏆</div>
          <p className="text-sm text-muted-foreground">No challenges yet.</p>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Create one or ask someone for their challenge link.
          </p>
          <Button asChild>
            <Link href="/challenge/new">Create a challenge</Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-px">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Recent challenges
          </p>
          {recentChallenges
            .sort((a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime())
            .map((c) => {
              const status = getChallengeStatus(c.start_date, c.end_date)
              return (
                <Link
                  key={c.id}
                  href={`/challenge/${c.share_token}`}
                  className="flex items-center justify-between py-3 px-2 rounded-md hover:bg-muted transition-colors -mx-2"
                >
                  <div>
                    <p className="text-sm font-medium">{c.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(parseISO(c.start_date), "MMM d")} –{" "}
                      {format(parseISO(c.end_date), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge
                    variant={status === "active" ? "default" : "secondary"}
                    className="text-xs font-normal"
                  >
                    {status}
                  </Badge>
                </Link>
              )
            })}
        </div>
      )}

      <div className="mt-16 pt-6 border-t text-center">
        <p className="text-xs text-muted-foreground">
          Have a challenge link? Just open it to join.
        </p>
      </div>
    </div>
  )
}
