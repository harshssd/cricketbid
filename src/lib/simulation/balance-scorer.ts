import { PlayingRole } from '../types'
import { TeamResult, BalanceReport, BalanceMetrics, SimTierConfig } from './types'
import { PICKS_PER_TEAM } from './constants'

/**
 * Score the balance of auction results on a 0-100 scale.
 *
 * Metrics and weights:
 *   - Player count variance  (25%) — Are team sizes equal?
 *   - Top-tier distribution  (30%) — Are Tier 0 + Tier 1 spread evenly?
 *   - Spend variance         (25%) — Did all teams spend roughly the same?
 *   - Role balance           (20%) — Does each team have BAT, BOWL, AR, WK?
 */
export function scoreBalance(
  teams: TeamResult[],
  tiers: SimTierConfig[],
): BalanceReport {
  const playerCountScore = scorePlayerCounts(teams)
  const topTierScore = scoreTopTierDistribution(teams)
  const spendScore = scoreSpendVariance(teams)
  const roleScore = scoreRoleBalance(teams)

  const metrics: BalanceMetrics = {
    playerCountVariance: playerCountScore,
    topTierDistribution: topTierScore,
    spendVariance: spendScore,
    roleBalance: roleScore,
  }

  const overallScore = Math.round(
    playerCountScore * 0.25 +
    topTierScore * 0.30 +
    spendScore * 0.25 +
    roleScore * 0.20,
  )

  const tier0Dist = teams.map(t => t.tierCounts['TIER_0'] || 0)
  const tier1Dist = teams.map(t => t.tierCounts['TIER_1'] || 0)
  const spending = teams.map(t => t.totalSpent)

  return {
    overallScore,
    metrics,
    tier0Distribution: tier0Dist,
    tier1Distribution: tier1Dist,
    spending,
    recommendations: generateRecommendations(metrics, tier0Dist, tier1Dist, spending, teams),
  }
}

function scorePlayerCounts(teams: TeamResult[]): number {
  const counts = teams.map(t => t.squad.length)
  const target = PICKS_PER_TEAM
  const maxDeviation = target // worst case: one team has 0
  const totalDeviation = counts.reduce((sum, c) => sum + Math.abs(c - target), 0)
  return Math.round(Math.max(0, 100 - (totalDeviation / (maxDeviation * teams.length)) * 100))
}

function scoreTopTierDistribution(teams: TeamResult[]): number {
  // Ideal: Tier 0 players spread as evenly as possible (6 across 4 teams = 2-2-1-1)
  //        Tier 1 players spread evenly (7 across 4 teams = 2-2-2-1)
  const tier0 = teams.map(t => t.tierCounts['TIER_0'] || 0)
  const tier1 = teams.map(t => t.tierCounts['TIER_1'] || 0)

  const tier0Score = scoreDistribution(tier0, 6)
  const tier1Score = scoreDistribution(tier1, 7)

  return Math.round((tier0Score + tier1Score) / 2)
}

function scoreDistribution(counts: number[], total: number): number {
  const n = counts.length
  const ideal = total / n
  const maxDeviation = total // worst case: all on one team
  const totalDeviation = counts.reduce((sum, c) => sum + Math.abs(c - ideal), 0)
  return Math.max(0, 100 - (totalDeviation / maxDeviation) * 100)
}

function scoreSpendVariance(teams: TeamResult[]): number {
  const spends = teams.map(t => t.totalSpent)
  const avg = spends.reduce((a, b) => a + b, 0) / spends.length
  if (avg === 0) return 100
  // Coefficient of variation — lower is better
  const variance = spends.reduce((sum, s) => sum + (s - avg) ** 2, 0) / spends.length
  const cv = Math.sqrt(variance) / avg
  // cv=0 → perfect (100), cv>=0.5 → bad (0)
  return Math.round(Math.max(0, 100 - cv * 200))
}

function scoreRoleBalance(teams: TeamResult[]): number {
  const roles: PlayingRole[] = ['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']
  let totalScore = 0

  for (const team of teams) {
    let teamRoleScore = 0
    for (const role of roles) {
      const count = team.roleCounts[role] || 0
      // Each team should have at least 1 of each role; bonus for 2+
      if (count >= 2) teamRoleScore += 25
      else if (count === 1) teamRoleScore += 20
      else teamRoleScore += 0 // missing a role is a big penalty
    }
    totalScore += teamRoleScore
  }

  return Math.round(totalScore / teams.length)
}

function generateRecommendations(
  metrics: BalanceMetrics,
  tier0Dist: number[],
  tier1Dist: number[],
  spending: number[],
  teams: TeamResult[],
): string[] {
  const recs: string[] = []

  if (metrics.playerCountVariance < 80) {
    const counts = teams.map(t => t.squad.length)
    recs.push(`Uneven squad sizes: ${counts.join('-')}. Consider adjusting pool size.`)
  }

  if (metrics.topTierDistribution < 70) {
    recs.push(
      `Top-tier distribution is skewed (T0: ${tier0Dist.join('-')}, T1: ${tier1Dist.join('-')}). ` +
      `Consider tighter maxPerTeam caps.`,
    )
  }

  if (metrics.spendVariance < 60) {
    const sorted = [...spending].sort((a, b) => b - a)
    recs.push(
      `Spending gap: highest ${sorted[0]} vs lowest ${sorted[sorted.length - 1]}. ` +
      `Consider adjusting base prices to reduce variance.`,
    )
  }

  if (metrics.roleBalance < 70) {
    for (const team of teams) {
      const missing = (['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER'] as PlayingRole[])
        .filter(r => (team.roleCounts[r] || 0) === 0)
      if (missing.length > 0) {
        recs.push(`${team.name} is missing: ${missing.join(', ')}.`)
      }
    }
  }

  if (recs.length === 0) {
    recs.push('Excellent balance! Configuration produces fair teams.')
  }

  return recs
}
