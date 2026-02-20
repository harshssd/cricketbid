import { runSimulation } from '../src/lib/simulation'
import { SimTier, TeamResult, AuctionLog, SimulationResult } from '../src/lib/simulation/types'
import { SIM_TIERS } from '../src/lib/simulation/constants'

// Parse --seed=N from CLI args
const seedArg = process.argv.find(a => a.startsWith('--seed='))
const seed = seedArg ? parseInt(seedArg.split('=')[1], 10) : 42

const result = runSimulation(seed)

printResults(result)

// ── Formatters ──────────────────────────────────────────────────

function printResults(r: SimulationResult) {
  const totalPlayers = r.auctionLog.length
  const totalSold = totalPlayers - r.unsoldPlayers.length

  console.log(`\n=== CLOSED AUCTION DRY RUN (Seed: ${r.seed}) ===\n`)
  console.log(`${totalPlayers} players | ${r.teams.length} teams | 1000 coins budget | 11 picks each\n`)

  for (const team of r.teams) {
    printTeam(team, r.auctionLog)
  }

  printUnsold(r.unsoldPlayers)
  printBalanceReport(r)
}

function printTeam(team: TeamResult, log: AuctionLog[]) {
  console.log(`--- ${team.name} (${team.personality}) ---`)
  console.log(`  Budget: ${team.totalSpent} spent / ${team.remainingBudget} remaining`)

  const tierLabels: Record<SimTier, string> = {
    TIER_0: 'Tier 0 (Elite)',
    TIER_1: 'Tier 1 (Gold)',
    TIER_2: 'Tier 2 (Mid)',
    TIER_3: 'Tier 3 (Base)',
  }

  for (const tier of ['TIER_0', 'TIER_1', 'TIER_2', 'TIER_3'] as SimTier[]) {
    const tierPlayers = team.squad.filter(p => p.player.tier === tier)
    if (tierPlayers.length === 0) continue
    const count = tierPlayers.length
    const playerList = tierPlayers
      .sort((a, b) => b.paidPrice - a.paidPrice)
      .map(p => `${p.player.name} [${p.paidPrice}]`)
      .join(', ')
    console.log(`  ${tierLabels[tier]} (${count}): ${playerList}`)
  }

  const roles = team.roleCounts
  console.log(
    `  Roles: ${roles.BATSMAN} BAT, ${roles.BOWLER} BOWL, ` +
    `${roles.ALL_ROUNDER} AR, ${roles.WICKETKEEPER} WK`,
  )
  console.log()
}

function printUnsold(unsold: SimulationResult['unsoldPlayers']) {
  if (unsold.length > 0) {
    const tierLabel = (t: SimTier) => SIM_TIERS.find(c => c.tier === t)?.label ?? t
    console.log(`--- Unsold Players (${unsold.length}) ---`)
    for (const p of unsold) {
      console.log(`  ${p.name} (${tierLabel(p.tier)}, ${p.playingRole})`)
    }
    console.log()
  }
}

function printBalanceReport(r: SimulationResult) {
  const b = r.balanceReport
  console.log(`=== BALANCE REPORT ===`)
  console.log(`Overall Score: ${b.overallScore}/100`)

  const counts = r.teams.map(t => t.squad.length)
  console.log(`  Player Count: ${counts.join('-')}${counts.every(c => c === 11) ? ' (perfect)' : ''}`)
  console.log(`  Tier 0 Distribution: ${b.tier0Distribution.join('-')}`)
  console.log(`  Tier 1 Distribution: ${b.tier1Distribution.join('-')}`)
  console.log(`  Spending: ${b.spending.join('-')}`)

  console.log(`  Breakdown:`)
  console.log(`    Player Count Variance: ${b.metrics.playerCountVariance}/100`)
  console.log(`    Top-Tier Distribution: ${b.metrics.topTierDistribution}/100`)
  console.log(`    Spend Variance:        ${b.metrics.spendVariance}/100`)
  console.log(`    Role Balance:          ${b.metrics.roleBalance}/100`)

  console.log(`Recommendations:`)
  for (const rec of b.recommendations) {
    console.log(`  - ${rec}`)
  }
  console.log()
}
