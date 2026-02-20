import { SeededRNG } from './rng'
import { SimPlayer, SealedBid, BidResolution, TeamState } from './types'

/**
 * Resolve a sealed-bid round for a single player.
 *
 * Tie-breaking:
 *   1. Higher remaining budget wins (signals stronger financial position)
 *   2. Random via seeded RNG
 */
export function resolveBids(
  player: SimPlayer,
  bids: SealedBid[],
  teams: TeamState[],
  rng: SeededRNG,
): BidResolution {
  // Filter to non-zero bids
  const activeBids = bids.filter(b => b.amount > 0)

  if (activeBids.length === 0) {
    return {
      player,
      winningTeamId: null,
      winningBid: 0,
      allBids: bids,
    }
  }

  // Find max bid amount
  const maxAmount = Math.max(...activeBids.map(b => b.amount))
  const topBidders = activeBids.filter(b => b.amount === maxAmount)

  let winner: SealedBid

  if (topBidders.length === 1) {
    winner = topBidders[0]
  } else {
    // Tie-break 1: higher remaining budget
    const teamBudgets = new Map(teams.map(t => [t.id, t.budget]))
    const maxBudget = Math.max(...topBidders.map(b => teamBudgets.get(b.teamId) ?? 0))
    const budgetTied = topBidders.filter(b => (teamBudgets.get(b.teamId) ?? 0) === maxBudget)

    if (budgetTied.length === 1) {
      winner = budgetTied[0]
    } else {
      // Tie-break 2: random
      const idx = rng.nextInt(0, budgetTied.length - 1)
      winner = budgetTied[idx]
    }
  }

  return {
    player,
    winningTeamId: winner.teamId,
    winningBid: winner.amount,
    allBids: bids,
  }
}
