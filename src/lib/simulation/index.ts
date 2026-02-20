import { FAMOUS_CRICKETERS } from '../famous-cricketers'
import { PlayingRole } from '../types'
import { SeededRNG } from './rng'
import {
  SimPlayer, TeamState, Personality, SimTier,
  TeamResult, AuctionLog, SimulationResult, PickedPlayer,
} from './types'
import {
  SIM_TIERS, DEFAULT_TEAM_NAMES, NUM_TEAMS,
  BUDGET_PER_TEAM, PICKS_PER_TEAM, SNIPER_TARGET_COUNTS,
} from './constants'
import { generateBid } from './bid-generator'
import { resolveBids } from './bid-resolver'
import { scoreBalance } from './balance-scorer'

const PERSONALITIES: Personality[] = ['AGGRESSIVE', 'BALANCED', 'SNIPER', 'VALUE_HUNTER']

/**
 * Run a complete closed sealed-bid auction simulation.
 * Pure in-memory, deterministic given the same seed.
 */
export function runSimulation(seed: number = 42): SimulationResult {
  const rng = new SeededRNG(seed)

  // 1. Build player pool: 6 Platinum + 7 Gold + 16 Silver + 16 Bronze = 45
  const players = buildPlayerPool(rng)

  // 2. Shuffle into random auction order
  rng.shuffle(players)

  // 3. Initialize teams
  const teams = initTeams(rng, players)

  // 4. Run auction
  const auctionLog: AuctionLog[] = []
  const unsoldPlayers: SimPlayer[] = []
  const remainingPlayers = [...players]

  for (let round = 0; round < players.length; round++) {
    const player = players[round]
    // Remove current player from remaining pool (for budget calculations)
    const idx = remainingPlayers.indexOf(player)
    if (idx !== -1) remainingPlayers.splice(idx, 1)

    // Each captain generates a sealed bid
    const bids = teams.map(team =>
      generateBid(team, player, remainingPlayers, teams, rng),
    )

    // Resolve winner
    const resolution = resolveBids(player, bids, teams, rng)

    auctionLog.push({
      round: round + 1,
      player,
      bids,
      winnerId: resolution.winningTeamId,
      winningBid: resolution.winningBid,
    })

    if (resolution.winningTeamId !== null) {
      const winner = teams.find(t => t.id === resolution.winningTeamId)!
      winner.budget -= resolution.winningBid
      winner.squad.push({ player, paidPrice: resolution.winningBid })
      winner.tierCounts[player.tier] = (winner.tierCounts[player.tier] || 0) + 1
    } else {
      unsoldPlayers.push(player)
    }
  }

  // 4b. Supplemental fill round — distribute unsold players to teams that
  // still need players, at base price. This mirrors real auction rules where
  // teams must reach minimum squad size.
  fillSquads(teams, unsoldPlayers, rng)

  // 5. Build results
  const teamResults: TeamResult[] = teams.map(t => ({
    id: t.id,
    name: t.name,
    personality: t.personality,
    totalSpent: BUDGET_PER_TEAM - t.budget,
    remainingBudget: t.budget,
    squad: t.squad,
    tierCounts: { ...t.tierCounts },
    roleCounts: countRoles(t.squad),
  }))

  // 6. Score balance
  const balanceReport = scoreBalance(teamResults, SIM_TIERS)

  return {
    seed,
    teams: teamResults,
    auctionLog,
    unsoldPlayers,
    balanceReport,
  }
}

function buildPlayerPool(rng: SeededRNG): SimPlayer[] {
  const platinum = FAMOUS_CRICKETERS.filter(c => c.tier === 'PLATINUM')
  const gold = FAMOUS_CRICKETERS.filter(c => c.tier === 'GOLD')
  const silver = FAMOUS_CRICKETERS.filter(c => c.tier === 'SILVER')
  const bronze = FAMOUS_CRICKETERS.filter(c => c.tier === 'BRONZE')

  const tierMap: Record<string, { simTier: SimTier; basePrice: number }> = {
    PLATINUM: { simTier: 'TIER_0', basePrice: 150 },
    GOLD:     { simTier: 'TIER_1', basePrice: 100 },
    SILVER:   { simTier: 'TIER_2', basePrice: 50 },
    BRONZE:   { simTier: 'TIER_3', basePrice: 20 },
  }

  const selected = [
    ...rng.sample(platinum, 6),
    ...rng.sample(gold, 7),
    ...silver,
    ...bronze,
  ]

  return selected.map(c => ({
    name: c.name,
    playingRole: c.playingRole,
    battingStyle: c.battingStyle,
    bowlingStyle: c.bowlingStyle,
    tier: tierMap[c.tier].simTier,
    basePrice: tierMap[c.tier].basePrice,
  }))
}

function initTeams(rng: SeededRNG, players: SimPlayer[]): TeamState[] {
  return PERSONALITIES.map((personality, i) => {
    const team: TeamState = {
      id: i,
      name: DEFAULT_TEAM_NAMES[personality],
      personality,
      budget: BUDGET_PER_TEAM,
      squad: [],
      tierCounts: { TIER_0: 0, TIER_1: 0, TIER_2: 0, TIER_3: 0 },
    }

    // Pre-select sniper targets
    if (personality === 'SNIPER') {
      const targets: string[] = []
      for (const [tier, count] of Object.entries(SNIPER_TARGET_COUNTS)) {
        const tierPlayers = players.filter(p => p.tier === tier)
        const picked = rng.sample(tierPlayers, count!)
        targets.push(...picked.map(p => p.name))
      }
      team.sniperTargets = targets
    }

    return team
  })
}

/**
 * Supplemental fill: distribute unsold players to teams that still need them.
 *
 * Uses "clearance" pricing (LOWEST_BASE_PRICE) and relaxes tier caps, because
 * at this point we must guarantee every team reaches PICKS_PER_TEAM. This mirrors
 * real auction rules where teams in need get remaining players at minimum price.
 *
 * Rotates through neediest teams first.
 * Mutates teams and unsoldPlayers in place.
 */
function fillSquads(teams: TeamState[], unsoldPlayers: SimPlayer[], _rng: SeededRNG): void {
  const CLEARANCE_PRICE = 20 // Minimum price in fill round

  let changed = true
  while (changed) {
    changed = false
    const needy = teams
      .filter(t => t.squad.length < PICKS_PER_TEAM)
      .sort((a, b) => a.squad.length - b.squad.length)

    for (const team of needy) {
      if (unsoldPlayers.length === 0) break
      if (team.squad.length >= PICKS_PER_TEAM) continue

      // Find first player the team can afford at clearance price
      const idx = unsoldPlayers.findIndex(() => team.budget >= CLEARANCE_PRICE)
      if (idx !== -1) {
        const player = unsoldPlayers.splice(idx, 1)[0]
        team.budget -= CLEARANCE_PRICE
        team.squad.push({ player, paidPrice: CLEARANCE_PRICE })
        team.tierCounts[player.tier] = (team.tierCounts[player.tier] || 0) + 1
        changed = true
      }
    }
  }
}

function countRoles(squad: PickedPlayer[]): Record<PlayingRole, number> {
  const counts: Record<PlayingRole, number> = {
    BATSMAN: 0,
    BOWLER: 0,
    ALL_ROUNDER: 0,
    WICKETKEEPER: 0,
  }
  for (const { player } of squad) {
    counts[player.playingRole]++
  }
  return counts
}
