import { SeededRNG } from './rng'
import {
  SimPlayer, TeamState, SealedBid, SimTier,
} from './types'
import {
  BID_MULTIPLIERS,
  SNIPER_TARGET_MULTIPLIER,
  DESPERATION_MULTIPLIER,
  DESPERATION_THRESHOLD,
  PICKS_PER_TEAM,
  BUDGET_PER_TEAM,
} from './constants'

/**
 * Compute the maximum a captain can bid while guaranteeing they can still
 * fill all remaining slots.
 *
 * Uses actual cheapest available players' base prices as the reserve floor
 * (smarter than the naive `(slotsRemaining-1) * LOWEST_BASE_PRICE`).
 *
 * Mild competition adjustment when demand genuinely exceeds supply.
 */
export function computeMaxAllowedBid(
  team: TeamState,
  remainingPlayers: SimPlayer[],
  allTeams: TeamState[],
): number {
  const slotsNeeded = PICKS_PER_TEAM - team.squad.length
  if (slotsNeeded <= 0) return 0

  const futureSlots = slotsNeeded - 1
  if (futureSlots === 0) return team.budget

  // Sort remaining players by base price ascending to find cheapest options
  const sortedByPrice = [...remainingPlayers].sort((a, b) => a.basePrice - b.basePrice)
  const cheapest = sortedByPrice.slice(0, futureSlots)

  // Base reserve: sum of cheapest available players' base prices
  let baseReserve = 0
  for (let i = 0; i < futureSlots; i++) {
    baseReserve += i < cheapest.length ? cheapest[i].basePrice : 20
  }

  // Mild competition adjustment — only when supply is truly scarce
  const totalSlotsNeeded = allTeams.reduce(
    (sum, t) => sum + Math.max(0, PICKS_PER_TEAM - t.squad.length), 0,
  )
  const playersLeft = remainingPlayers.length

  if (playersLeft > 0) {
    const demandSupplyRatio = totalSlotsNeeded / playersLeft
    if (demandSupplyRatio > 1.0) {
      const inflation = Math.min(1.15, 1 + (demandSupplyRatio - 1.0) * 0.3)
      baseReserve = Math.ceil(baseReserve * inflation)
    }
  }

  return Math.max(0, team.budget - baseReserve)
}

/**
 * Compute how much "flexible budget" the team has left.
 *
 * Flexible budget = total budget minus the minimum needed to fill all 11 slots
 * at base price. As the team spends above base price, the flexibility shrinks.
 * Returns a ratio from 0 (tapped out) to 1 (fully flexible).
 *
 * This prevents AGGRESSIVE and SNIPER from blowing their entire premium
 * budget on the first few picks, then being unable to compete for any
 * remaining players.
 */
function computeFlexibility(team: TeamState, remainingPlayers: SimPlayer[]): number {
  const slotsNeeded = PICKS_PER_TEAM - team.squad.length
  if (slotsNeeded <= 0) return 0

  // Minimum cost to fill remaining slots at base prices
  const sorted = [...remainingPlayers].sort((a, b) => a.basePrice - b.basePrice)
  let minCostToFill = 0
  for (let i = 0; i < slotsNeeded && i < sorted.length; i++) {
    minCostToFill += sorted[i].basePrice
  }

  const flexibleBudget = team.budget - minCostToFill
  // Original flexible budget at the start (rough estimate)
  const originalFlexible = BUDGET_PER_TEAM - PICKS_PER_TEAM * 20
  if (originalFlexible <= 0) return 0

  return Math.max(0, Math.min(1, flexibleBudget / originalFlexible))
}

/**
 * Generate a sealed bid for a single captain on a single player.
 */
export function generateBid(
  team: TeamState,
  player: SimPlayer,
  remainingPlayers: SimPlayer[],
  allTeams: TeamState[],
  rng: SeededRNG,
): SealedBid {
  const slotsNeeded = PICKS_PER_TEAM - team.squad.length

  // Can't bid if squad is full
  if (slotsNeeded <= 0) {
    return { teamId: team.id, amount: 0 }
  }

  // Can't bid if can't afford base price
  if (team.budget < player.basePrice) {
    return { teamId: team.id, amount: 0 }
  }

  // Tier cap check
  const tierConfig = getTierMaxPerTeam(player.tier)
  if (tierConfig !== undefined && team.tierCounts[player.tier] >= tierConfig) {
    return { teamId: team.id, amount: 0 }
  }

  const maxAllowed = computeMaxAllowedBid(team, remainingPlayers, allTeams)

  // Can't afford even base price after reserve
  if (maxAllowed < player.basePrice) {
    return { teamId: team.id, amount: 0 }
  }

  // Determine multiplier range based on personality
  let [minMul, maxMul] = getMultiplierRange(team, player)

  // Flexibility dampening: scale down the "above 1.0x" portion of the multiplier
  // as the team's flexible budget depletes. This prevents front-loaded strategies
  // from spending so aggressively that they can't compete later.
  // scale ranges from 0.2 (nearly tapped out) to 1.0 (fully flexible).
  const flex = computeFlexibility(team, remainingPlayers)
  const scale = Math.max(0.2, flex)
  minMul = 1 + (minMul - 1) * scale
  maxMul = 1 + (maxMul - 1) * scale

  // Squad-deficit catch-up: if this team has notably fewer players than average,
  // boost bids so it doesn't fall hopelessly behind
  const avgSquadSize = allTeams.reduce((sum, t) => sum + t.squad.length, 0) / allTeams.length
  const squadDeficit = avgSquadSize - team.squad.length
  if (squadDeficit >= 2) {
    const catchUp = 1 + squadDeficit * 0.1
    minMul *= catchUp
    maxMul *= catchUp
  }

  // End-of-auction desperation: if very few players remain relative to slots needed
  const playersLeft = remainingPlayers.length
  if (playersLeft - slotsNeeded < DESPERATION_THRESHOLD && slotsNeeded > 2) {
    const [despMin, despMax] = DESPERATION_MULTIPLIER
    minMul *= rng.nextFloat(despMin, despMax)
    maxMul *= rng.nextFloat(despMin, despMax)
  }

  const multiplier = rng.nextFloat(minMul, maxMul)
  let bidAmount = Math.round(player.basePrice * multiplier)

  // Clamp to allowed range
  bidAmount = Math.max(player.basePrice, Math.min(bidAmount, maxAllowed))

  return { teamId: team.id, amount: bidAmount }
}

function getMultiplierRange(team: TeamState, player: SimPlayer): [number, number] {
  if (team.personality === 'SNIPER' && team.sniperTargets?.includes(player.name)) {
    return SNIPER_TARGET_MULTIPLIER[player.tier]
  }
  return BID_MULTIPLIERS[team.personality][player.tier]
}

function getTierMaxPerTeam(tier: SimTier): number | undefined {
  if (tier === 'TIER_0') return 2
  if (tier === 'TIER_1') return 2
  return undefined
}
