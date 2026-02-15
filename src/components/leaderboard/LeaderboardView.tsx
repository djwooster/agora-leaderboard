"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Separator } from "@/components/ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { supabase } from "@/lib/supabase"
import { computeLeaderboard } from "@/lib/leaderboard"
import { LogDayModal } from "./LogDayModal"
import { IdentifyModal } from "./IdentifyModal"
import { Challenge, Metric, Participant, Log, LeaderboardEntry } from "@/types"
import { format, differenceInDays, parseISO, isAfter, isBefore } from "date-fns"

const STORAGE_KEY_PREFIX = "agora_participant_"

interface LeaderboardViewProps {
  challenge: Challenge
  metrics: Metric[]
}

export function LeaderboardView({ challenge, metrics }: LeaderboardViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([])
  const [logs, setLogs] = useState<Log[]>([])
  const [loading, setLoading] = useState(true)
  const [currentParticipant, setCurrentParticipant] = useState<Participant | null>(null)
  const [showIdentify, setShowIdentify] = useState(false)
  const [showLog, setShowLog] = useState(false)

  const storageKey = `${STORAGE_KEY_PREFIX}${challenge.id}`

  // Load persisted identity
  useEffect(() => {
    const stored = localStorage.getItem(storageKey)
    if (stored) {
      try {
        setCurrentParticipant(JSON.parse(stored))
      } catch {
        localStorage.removeItem(storageKey)
      }
    }
  }, [storageKey])

  const fetchData = useCallback(async () => {
    const [{ data: pData }, { data: lData }] = await Promise.all([
      supabase.from("participants").select("*").eq("challenge_id", challenge.id).order("created_at"),
      supabase.from("logs").select("*").in(
        "participant_id",
        // placeholder — we re-fetch after participants load
        ["00000000-0000-0000-0000-000000000000"]
      ),
    ])

    const participantList = (pData ?? []) as Participant[]

    // Now fetch logs for real participant IDs
    if (participantList.length > 0) {
      const { data: realLogs } = await supabase
        .from("logs")
        .select("*")
        .in("participant_id", participantList.map((p) => p.id))
      setLogs((realLogs ?? []) as Log[])
    } else {
      setLogs([])
    }

    setParticipants(participantList)
    setLoading(false)
  }, [challenge.id])

  useEffect(() => {
    fetchData()

    // Realtime subscriptions
    const participantSub = supabase
      .channel(`participants-${challenge.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants" }, fetchData)
      .subscribe()

    const logSub = supabase
      .channel(`logs-${challenge.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "logs" }, fetchData)
      .subscribe()

    return () => {
      supabase.removeChannel(participantSub)
      supabase.removeChannel(logSub)
    }
  }, [challenge.id, fetchData])

  function handleIdentified(participant: Participant) {
    setCurrentParticipant(participant)
    localStorage.setItem(storageKey, JSON.stringify(participant))
    setShowIdentify(false)
    setShowLog(true)
  }

  function handleLogClick() {
    if (!currentParticipant) {
      setShowIdentify(true)
    } else {
      setShowLog(true)
    }
  }

  function handleLogged() {
    fetchData()
  }

  const entries = computeLeaderboard(participants, metrics, logs)
  const today = format(new Date(), "yyyy-MM-dd")
  const todayExistingLogs = currentParticipant
    ? logs
        .filter((l) => l.participant_id === currentParticipant.id && l.log_date === today)
        .reduce((acc, l) => ({ ...acc, [l.metric_id]: l.value }), {} as Record<string, number>)
    : {}

  const challengeStart = parseISO(challenge.start_date)
  const challengeEnd = parseISO(challenge.end_date)
  const todayDate = new Date()
  const isActive = !isBefore(todayDate, challengeStart) && !isAfter(todayDate, challengeEnd)
  const dayNumber = isActive ? differenceInDays(todayDate, challengeStart) + 1 : null
  const totalDays = differenceInDays(challengeEnd, challengeStart) + 1

  return (
    <div className="mx-auto max-w-2xl px-4 pb-16">
      {/* Challenge meta */}
      <div className="py-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground flex-wrap">
          {isActive ? (
            <>
              <Badge variant="secondary" className="text-xs font-normal">
                Day {dayNumber} of {totalDays}
              </Badge>
              <span>·</span>
              <span>{format(challengeEnd, "MMM d")} ends</span>
            </>
          ) : isAfter(todayDate, challengeEnd) ? (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Ended {format(challengeEnd, "MMM d, yyyy")}
            </Badge>
          ) : (
            <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
              Starts {format(challengeStart, "MMM d, yyyy")}
            </Badge>
          )}
          <span className="hidden sm:inline">·</span>
          <span className="hidden sm:inline">{participants.length} participants</span>
        </div>

        {isActive && (
          <Button size="sm" onClick={handleLogClick} className="shrink-0">
            Log today
          </Button>
        )}
      </div>

      <Separator />

      {/* Leaderboard */}
      {loading ? (
        <div className="pt-3 space-y-px">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3 px-1">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-8 w-8 rounded-full" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-muted-foreground text-sm">No participants yet.</p>
          <p className="text-muted-foreground text-sm mt-1">
            Be the first to log your activity!
          </p>
          {isActive && (
            <Button size="sm" onClick={handleLogClick} className="mt-4">
              Join &amp; log today
            </Button>
          )}
        </div>
      ) : (
        <div className="pt-1">
          {/* Column headers */}
          <div className="flex items-center gap-3 px-1 py-2 text-xs text-muted-foreground">
            <span className="w-6 text-right shrink-0">#</span>
            <span className="flex-1 pl-11">Name</span>
            <span className="w-16 text-right hidden sm:block">Today</span>
            <span className="w-12 text-right hidden sm:block">Streak</span>
            <span className="w-16 text-right">Score</span>
          </div>
          <Separator />
          <div className="divide-y divide-border/50">
            {entries.map((entry) => (
              <LeaderboardRow
                key={entry.participant.id}
                entry={entry}
                metrics={metrics}
                isCurrentUser={currentParticipant?.id === entry.participant.id}
              />
            ))}
          </div>
        </div>
      )}

      {/* Metrics legend */}
      {metrics.length > 0 && (
        <div className="mt-8 pt-4 border-t">
          <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">
            Scoring
          </p>
          <div className="flex flex-wrap gap-2">
            {metrics.map((m) => (
              <div key={m.id} className="text-xs text-muted-foreground border rounded px-2 py-1">
                {m.name}: {m.points_per_unit} pt per {m.unit}
                {m.daily_max ? ` (max ${m.daily_max})` : ""}
              </div>
            ))}
          </div>
        </div>
      )}

      <IdentifyModal
        open={showIdentify}
        challengeId={challenge.id}
        participants={participants}
        onIdentified={handleIdentified}
      />

      {currentParticipant && (
        <LogDayModal
          open={showLog}
          onOpenChange={setShowLog}
          participant={currentParticipant}
          metrics={metrics}
          challengeId={challenge.id}
          existingLogs={todayExistingLogs}
          onLogged={handleLogged}
        />
      )}
    </div>
  )
}

function LeaderboardRow({
  entry,
  metrics,
  isCurrentUser,
}: {
  entry: LeaderboardEntry
  metrics: Metric[]
  isCurrentUser: boolean
}) {
  const { participant, rank, totalPoints, todayPoints, todayLogged, streak } = entry

  return (
    <div
      className={`flex items-center gap-3 px-1 py-3 transition-colors ${
        isCurrentUser ? "bg-muted/50" : "hover:bg-muted/30"
      }`}
    >
      {/* Rank */}
      <span
        className={`w-6 text-right text-sm shrink-0 ${
          rank === 1
            ? "font-semibold"
            : rank === 2
            ? "text-muted-foreground"
            : "text-muted-foreground"
        }`}
      >
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
      </span>

      {/* Avatar + name */}
      <div className="flex items-center gap-2.5 flex-1 min-w-0">
        <span className="text-2xl leading-none">{participant.avatar_emoji}</span>
        <div className="min-w-0">
          <p className={`text-sm truncate ${isCurrentUser ? "font-semibold" : "font-medium"}`}>
            {participant.name}
            {isCurrentUser && (
              <span className="ml-1.5 text-xs text-muted-foreground font-normal">(you)</span>
            )}
          </p>
        </div>
      </div>

      {/* Today */}
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="w-16 text-right hidden sm:block">
            {todayLogged ? (
              <span className="text-sm text-muted-foreground">+{todayPoints}</span>
            ) : (
              <span className="text-xs text-muted-foreground/50">—</span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <div className="text-xs space-y-0.5">
            {metrics.map((m) => {
              const val = entry.dailyLogs[format(new Date(), "yyyy-MM-dd")]?.[m.id]
              return val != null ? (
                <div key={m.id}>
                  {m.name}: {val} {m.unit}
                </div>
              ) : null
            })}
            {!todayLogged && <span>Not logged today</span>}
          </div>
        </TooltipContent>
      </Tooltip>

      {/* Streak */}
      <div className="w-12 text-right hidden sm:block">
        {streak > 0 ? (
          <span className="text-xs text-muted-foreground">{streak}d 🔥</span>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </div>

      {/* Total score */}
      <div className="w-16 text-right">
        <span className="text-sm font-medium tabular-nums">{totalPoints.toLocaleString()}</span>
      </div>
    </div>
  )
}
