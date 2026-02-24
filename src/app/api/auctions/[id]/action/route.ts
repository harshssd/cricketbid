import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{ id: string }>
}

type ActionType = 'SOLD' | 'UNSOLD' | 'DEFER' | 'UNDO'

interface QueueState {
  auctionQueue: string[]
  auctionIndex: number
  auctionStarted: boolean
  unsoldPlayers: string[]
  deferredPlayers: string[]
  auctionHistory: Array<{
    player: string
    team: string
    price: number
    action: string
  }>
}

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params
    const body = await request.json()
    const { action, teamId, amount } = body as {
      action: ActionType
      teamId?: string
      amount?: number
    }

    if (!['SOLD', 'UNSOLD', 'DEFER', 'UNDO'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // 1. Read current state
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, name, status, budget_per_team, queue_state')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError || !auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }
    if (auction.status !== 'LIVE') {
      return NextResponse.json({ error: 'Auction is not live' }, { status: 400 })
    }

    const qs = (auction.queue_state || {}) as QueueState
    const auctionQueue = [...(qs.auctionQueue || [])]
    let auctionIndex = qs.auctionIndex ?? 0
    const auctionStarted = qs.auctionStarted ?? false
    let unsoldPlayers = [...(qs.unsoldPlayers || [])]
    let deferredPlayers = [...(qs.deferredPlayers || [])]
    let auctionHistory = [...(qs.auctionHistory || [])]

    const currentPlayerName = auctionQueue[auctionIndex]

    // Look up all players for this auction (needed for ID lookups)
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, name, tier_id')
      .eq('auction_id', auctionId)

    const playerByName = new Map((allPlayers || []).map(p => [p.name, p]))

    // 2. Apply action
    if (action === 'SOLD') {
      if (!teamId || !amount) {
        return NextResponse.json(
          { error: 'teamId and amount required for SOLD' },
          { status: 400 }
        )
      }
      if (!currentPlayerName) {
        return NextResponse.json(
          { error: 'No current player in queue' },
          { status: 400 }
        )
      }

      const player = playerByName.get(currentPlayerName)
      if (!player) {
        return NextResponse.json(
          { error: `Player "${currentPlayerName}" not found in database` },
          { status: 400 }
        )
      }

      // Create auction_result
      const { error: resultError } = await supabase
        .from('auction_results')
        .upsert(
          {
            auction_id: auctionId,
            player_id: player.id,
            team_id: teamId,
            winning_bid_amount: amount,
            assigned_at: new Date().toISOString(),
          },
          { onConflict: 'auction_id, player_id' }
        )

      if (resultError) {
        console.error('[action/SOLD] Failed to create auction_result:', resultError)
        return NextResponse.json(
          { error: 'Failed to record sale', details: resultError.message },
          { status: 500 }
        )
      }

      // Mark winning bid on the open round
      const { data: openRound } = await supabase
        .from('rounds')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('player_id', player.id)
        .eq('status', 'OPEN')
        .maybeSingle()

      if (openRound) {
        await supabase
          .from('bids')
          .update({ is_winning_bid: true })
          .eq('round_id', openRound.id)
          .eq('team_id', teamId)
      }

      // Get team name for history
      const { data: team } = await supabase
        .from('teams')
        .select('name')
        .eq('id', teamId)
        .maybeSingle()

      auctionHistory = [...auctionHistory, {
        player: currentPlayerName,
        team: team?.name || '',
        price: amount,
        action: 'SOLD',
      }]
      auctionIndex++

    } else if (action === 'UNSOLD') {
      if (!currentPlayerName) {
        return NextResponse.json(
          { error: 'No current player in queue' },
          { status: 400 }
        )
      }

      unsoldPlayers = [...unsoldPlayers, currentPlayerName]
      auctionHistory = [...auctionHistory, {
        player: currentPlayerName,
        team: '',
        price: 0,
        action: 'UNSOLD',
      }]
      auctionIndex++

    } else if (action === 'DEFER') {
      if (!currentPlayerName) {
        return NextResponse.json(
          { error: 'No current player in queue' },
          { status: 400 }
        )
      }

      // Remove from queue at current index (don't advance — array shifted)
      auctionQueue.splice(auctionIndex, 1)
      deferredPlayers = [...deferredPlayers, currentPlayerName]
      auctionHistory = [...auctionHistory, {
        player: currentPlayerName,
        team: '',
        price: 0,
        action: 'DEFERRED',
      }]

    } else if (action === 'UNDO') {
      if (auctionHistory.length === 0) {
        return NextResponse.json({ error: 'Nothing to undo' }, { status: 400 })
      }

      const lastAction = auctionHistory[auctionHistory.length - 1]
      auctionHistory = auctionHistory.slice(0, -1)

      if (lastAction.action === 'SOLD') {
        const player = playerByName.get(lastAction.player)
        if (player) {
          await supabase
            .from('auction_results')
            .delete()
            .eq('auction_id', auctionId)
            .eq('player_id', player.id)
        }
        auctionIndex--

      } else if (lastAction.action === 'UNSOLD') {
        unsoldPlayers = unsoldPlayers.filter(p => p !== lastAction.player)
        auctionIndex--

      } else if (lastAction.action === 'DEFERRED') {
        // Remove player from wherever it might be in the queue (could have been auto-returned)
        const existingIdx = auctionQueue.lastIndexOf(lastAction.player)
        if (existingIdx !== -1) {
          auctionQueue.splice(existingIdx, 1)
        }
        // Re-insert at current position
        auctionQueue.splice(auctionIndex, 0, lastAction.player)
        // Remove from deferred list (might already be empty if auto-return happened)
        deferredPlayers = deferredPlayers.filter(p => p !== lastAction.player)
      }
    }

    // 3. Handle deferred auto-return: if we've reached the end and there are deferred players
    if (auctionIndex >= auctionQueue.length && deferredPlayers.length > 0) {
      auctionQueue.push(...deferredPlayers)
      deferredPlayers = []
    }

    // 4. Close all OPEN rounds for this auction
    await supabase
      .from('rounds')
      .update({ status: 'CLOSED', closed_at: new Date().toISOString() })
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')

    // 5. If next player exists in queue, open a new round
    let currentRound = null
    if (auctionIndex < auctionQueue.length) {
      const nextPlayerName = auctionQueue[auctionIndex]
      const nextPlayer = playerByName.get(nextPlayerName)
      if (nextPlayer) {
        const { data: round } = await supabase
          .from('rounds')
          .insert({
            auction_id: auctionId,
            player_id: nextPlayer.id,
            tier_id: nextPlayer.tier_id || null,
            status: 'OPEN',
            opened_at: new Date().toISOString(),
          })
          .select('id, player_id, status, opened_at')
          .single()

        if (round) {
          currentRound = {
            id: round.id,
            playerId: round.player_id,
            playerName: nextPlayerName,
            tierId: nextPlayer.tier_id || '',
            status: round.status,
            openedAt: round.opened_at,
            closedAt: null,
          }
        }
      }
    }

    // 6. Write updated queue_state to DB
    const updatedQueueState: QueueState = {
      auctionQueue,
      auctionIndex,
      auctionStarted,
      unsoldPlayers,
      deferredPlayers,
      auctionHistory,
    }

    await supabase
      .from('auctions')
      .update({ queue_state: updatedQueueState })
      .eq('id', auctionId)

    // 7. Query canonical state: teams + budgets + results
    const { data: teams } = await supabase
      .from('teams')
      .select('id, name')
      .eq('auction_id', auctionId)
      .order('name')

    const { data: teamBudgets } = await supabase
      .from('team_budgets')
      .select('team_id, total_budget, spent, budget_remaining')
      .eq('auction_id', auctionId)

    const budgetMap = new Map(
      (teamBudgets || []).map(b => [b.team_id, b])
    )

    const { data: results } = await supabase
      .from('auction_results')
      .select('player_id, team_id, winning_bid_amount, player:players(name), team:teams(name)')
      .eq('auction_id', auctionId)

    const teamPlayersMap = new Map<string, Array<{ id: string; name: string; price: number }>>()
    const soldPlayers: Array<{
      playerId: string
      playerName: string
      teamId: string
      teamName: string
      price: number
    }> = []

    for (const r of results || []) {
      const teamPlayers = teamPlayersMap.get(r.team_id) || []
      const playerName = (r.player as any)?.name || 'Unknown'
      teamPlayers.push({ id: r.player_id, name: playerName, price: r.winning_bid_amount })
      teamPlayersMap.set(r.team_id, teamPlayers)

      soldPlayers.push({
        playerId: r.player_id,
        playerName,
        teamId: r.team_id,
        teamName: (r.team as any)?.name || 'Unknown',
        price: r.winning_bid_amount,
      })
    }

    const teamStates = (teams || []).map(t => {
      const budget = budgetMap.get(t.id)
      return {
        id: t.id,
        name: t.name,
        coins: budget?.budget_remaining ?? auction.budget_per_team,
        originalCoins: budget?.total_budget ?? auction.budget_per_team,
        players: teamPlayersMap.get(t.id) || [],
      }
    })

    // 8. Return canonical response
    return NextResponse.json({
      id: auction.id,
      name: auction.name,
      status: auction.status,
      teams: teamStates,
      soldPlayers,
      unsoldPlayers,
      deferredPlayers,
      auctionHistory,
      auctionQueue,
      auctionIndex,
      auctionStarted,
      currentRound,
      lastUpdated: new Date().toISOString(),
    })

  } catch (error) {
    console.error('[action/POST] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
