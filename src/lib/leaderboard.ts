import { Log, Metric, Participant, LeaderboardEntry } from '@/types'
import { format } from 'date-fns'

export function computeLeaderboard(
  participants: Participant[],
  metrics: Metric[],
  logs: Log[]
): LeaderboardEntry[] {
  const today = format(new Date(), 'yyyy-MM-dd')

  // Build lookup: participantId -> date -> metricId -> value
  const logMap: Record<string, Record<string, Record<string, number>>> = {}
  for (const log of logs) {
    if (!logMap[log.participant_id]) logMap[log.participant_id] = {}
    if (!logMap[log.participant_id][log.log_date]) logMap[log.participant_id][log.log_date] = {}
    logMap[log.participant_id][log.log_date][log.metric_id] = log.value
  }

  // Build metric lookup for points
  const metricMap: Record<string, Metric> = {}
  for (const m of metrics) {
    metricMap[m.id] = m
  }

  const entries: LeaderboardEntry[] = participants.map((participant) => {
    const dailyLogs = logMap[participant.id] ?? {}

    // Total points across all days and metrics
    let totalPoints = 0
    for (const [, metricValues] of Object.entries(dailyLogs)) {
      for (const [metricId, value] of Object.entries(metricValues)) {
        const metric = metricMap[metricId]
        if (!metric) continue
        const cappedValue = metric.daily_max ? Math.min(value, metric.daily_max) : value
        totalPoints += cappedValue * metric.points_per_unit
      }
    }

    // Today's points
    let todayPoints = 0
    const todayLog = dailyLogs[today] ?? {}
    for (const [metricId, value] of Object.entries(todayLog)) {
      const metric = metricMap[metricId]
      if (!metric) continue
      const cappedValue = metric.daily_max ? Math.min(value, metric.daily_max) : value
      todayPoints += cappedValue * metric.points_per_unit
    }

    const todayLogged = Object.keys(todayLog).length > 0

    // Streak: consecutive days ending today (or yesterday) where anything was logged
    const streak = computeStreak(dailyLogs, today)

    return {
      participant,
      totalPoints: Math.round(totalPoints * 10) / 10,
      todayPoints: Math.round(todayPoints * 10) / 10,
      todayLogged,
      streak,
      rank: 0,
      dailyLogs,
    }
  })

  // Sort by totalPoints descending
  entries.sort((a, b) => b.totalPoints - a.totalPoints)

  // Assign ranks (tied participants share rank)
  let currentRank = 1
  for (let i = 0; i < entries.length; i++) {
    if (i > 0 && entries[i].totalPoints < entries[i - 1].totalPoints) {
      currentRank = i + 1
    }
    entries[i].rank = currentRank
  }

  return entries
}

function computeStreak(dailyLogs: Record<string, Record<string, number>>, today: string): number {
  const loggedDates = new Set(
    Object.entries(dailyLogs)
      .filter(([, metrics]) => Object.values(metrics).some((v) => v > 0))
      .map(([date]) => date)
  )

  if (loggedDates.size === 0) return 0

  let streak = 0
  const date = new Date(today)

  // If not logged today, check if streak was active yesterday
  if (!loggedDates.has(today)) {
    date.setDate(date.getDate() - 1)
  }

  while (true) {
    const dateStr = format(date, 'yyyy-MM-dd')
    if (!loggedDates.has(dateStr)) break
    streak++
    date.setDate(date.getDate() - 1)
  }

  return streak
}
