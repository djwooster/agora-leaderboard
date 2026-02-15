export interface Challenge {
  id: string
  name: string
  description: string | null
  start_date: string
  end_date: string
  share_token: string
  admin_token: string
  is_active: boolean
  created_at: string
}

export interface Metric {
  id: string
  challenge_id: string
  name: string
  unit: string
  points_per_unit: number
  daily_max: number | null
  sort_order: number
  created_at: string
}

export interface Participant {
  id: string
  challenge_id: string
  name: string
  avatar_emoji: string
  created_at: string
}

export interface Log {
  id: string
  participant_id: string
  metric_id: string
  value: number
  log_date: string
  created_at: string
}

export interface LeaderboardEntry {
  participant: Participant
  totalPoints: number
  todayPoints: number
  todayLogged: boolean
  streak: number
  rank: number
  dailyLogs: Record<string, Record<string, number>> // date -> metricId -> value
}

export interface ChallengeWithMetrics extends Challenge {
  metrics: Metric[]
}

export interface NewChallengeFormData {
  name: string
  description: string
  start_date: string
  end_date: string
  metrics: NewMetricFormData[]
}

export interface NewMetricFormData {
  name: string
  unit: string
  points_per_unit: number
  daily_max: string
}
