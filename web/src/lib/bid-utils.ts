import { SupabaseClient } from '@supabase/supabase-js'

interface ValidateAndSubmitBidParams {
  supabase: SupabaseClient
  auctionId: string
  teamId: string
  roundId: string
  playerId: string
  amount: number
}

interface BidResult {
  success: boolean
  bid?: {
    id: string
    amount: number
    submittedAt: string
    team: any
    player: any
  }
  playerName?: string
  error?: string
  status?: number
}

export async function validateAndSubmitBid(params: ValidateAndSubmitBidParams): Promise<BidResult> {
  const { supabase, auctionId, teamId, roundId, playerId, amount } = params

  // Get team and auction info
  const { data: team, error: teamError } = await supabase
    .from('teams')
    .select('id, auction_id, auction:auctions!auction_id(id, status, budget_per_team)')
    .eq('id', teamId)
    .maybeSingle()

  if (teamError || !team) {
    return { success: false, error: 'Team not found', status: 404 }
  }

  const teamAuction = team.auction as unknown as { id: string; status: string; budget_per_team: number } | null

  if (teamAuction?.id !== auctionId) {
    return { success: false, error: 'Team does not belong to this auction', status: 400 }
  }

  if (teamAuction.status !== 'LIVE') {
    return { success: false, error: 'Auction is not live', status: 400 }
  }

  // Verify round is active
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('id, tier_id, status, closed_at, tier:tiers!tier_id(base_price)')
    .eq('id', roundId)
    .eq('auction_id', auctionId)
    .eq('status', 'OPEN')
    .maybeSingle()

  if (roundError || !round) {
    return { success: false, error: 'Round not found or not active', status: 404 }
  }

  // Get player information
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('id, name, tier_id')
    .eq('id', playerId)
    .maybeSingle()

  if (playerError || !player) {
    return { success: false, error: 'Player not found', status: 404 }
  }

  // Note: tier check removed — auctioneer controls which player is up for bidding,
  // and rounds may be created on-the-fly with different tier context

  // Check if bid meets minimum requirements
  const roundTier = round.tier as unknown as { base_price: number } | null
  const basePrice = roundTier?.base_price ?? 0
  if (amount < basePrice) {
    return { success: false, error: `Minimum bid is ${basePrice}`, status: 400 }
  }

  // Check if team has sufficient budget (computed from auction_results)
  const { data: teamBudget } = await supabase
    .from('team_budgets')
    .select('budget_remaining')
    .eq('team_id', teamId)
    .maybeSingle()

  const remainingBudget = teamBudget?.budget_remaining ?? teamAuction.budget_per_team
  if (amount > remainingBudget) {
    return { success: false, error: 'Insufficient budget', status: 400 }
  }

  // Check if round is still open (time-based)
  if (round.closed_at && new Date() > new Date(round.closed_at)) {
    return { success: false, error: 'Bidding time has expired for this round', status: 400 }
  }

  // Upsert the bid (one bid per team per round per player, sealed tender only)
  const { data: bid, error: bidError } = await supabase
    .from('bids')
    .upsert(
      {
        round_id: roundId,
        team_id: teamId,
        player_id: playerId,
        amount: amount,
        submitted_at: new Date().toISOString(),
        rejection_reason: null,
        sequence_number: null, // sealed tender bids have no sequence
      },
      { onConflict: 'round_id, team_id, player_id' }
    )
    .select('*, team:teams!team_id(id, name), player:players!player_id(id, name)')
    .single()

  if (bidError) {
    throw bidError
  }

  return {
    success: true,
    bid: {
      id: bid.id,
      amount: bid.amount,
      submittedAt: bid.submitted_at,
      team: bid.team,
      player: bid.player,
    },
    playerName: player.name,
  }
}
