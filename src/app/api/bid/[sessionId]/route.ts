import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface RouteParams {
  params: Promise<{ sessionId: string }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { sessionId } = await params

    // Parse sessionId: "auctionId_teamId"
    const separatorIdx = sessionId.indexOf('_')
    if (separatorIdx === -1) {
      return NextResponse.json(
        { error: 'Invalid session ID format. Use auctionId_teamId.' },
        { status: 400 }
      )
    }

    const auctionId = sessionId.slice(0, separatorIdx)
    const teamId = sessionId.slice(separatorIdx + 1)

    if (!auctionId || !teamId) {
      return NextResponse.json(
        { error: 'Invalid session ID format. Use auctionId_teamId.' },
        { status: 400 }
      )
    }

    // ── Fetch auction details ──────────────────────────────────
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id, name, status, currency_name, currency_icon, budget_per_team, squad_size')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError || !auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // ── Fetch team details ─────────────────────────────────────
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name, captain_user_id')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError || !team) {
      console.error('Team lookup failed:', { teamId, auctionId, teamError })
      return NextResponse.json(
        { error: 'Team not found in this auction' },
        { status: 404 }
      )
    }

    // ── Fetch all tiers ────────────────────────────────────────
    const { data: tiers } = await supabase
      .from('tiers')
      .select('*')
      .eq('auction_id', auctionId)
      .order('sort_order', { ascending: true })

    // ── Fetch all players for this auction ─────────────────────
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, name, image, playing_role, batting_style, bowling_style, custom_tags, tier_id')
      .eq('auction_id', auctionId)

    // ── Fetch all teams (for captain IDs + all-squads view) ─────
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name, captain_player_id')
      .eq('auction_id', auctionId)
      .order('name')

    const captainPlayerIds = new Set(
      (allTeams || []).map(t => t.captain_player_id).filter(Boolean)
    )

    // ── Fetch team's acquired players (via auction_results) ────
    const { data: auctionResults } = await supabase
      .from('auction_results')
      .select('id, player_id, winning_bid_amount, assigned_at')
      .eq('auction_id', auctionId)
      .eq('team_id', teamId)

    // ── Fetch ALL teams' auction results (for all-squads view) ──
    const { data: allAuctionResults } = await supabase
      .from('auction_results')
      .select('player_id, team_id, winning_bid_amount')
      .eq('auction_id', auctionId)

    // ── Fetch open round (admin client bypasses RLS) ───────────
    const adminDb = createAdminClient()

    const { data: openRounds } = await adminDb
      .from('rounds')
      .select('id, tier_id, player_id, status, closed_at, timer_seconds, opened_at')
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)

    // ── Fetch all rounds for progress tracking ─────────────────
    const { data: allRounds } = await adminDb
      .from('rounds')
      .select('id, status')
      .eq('auction_id', auctionId)

    // ── Build current round data ───────────────────────────────
    const currentRound = openRounds?.[0]
    let currentRoundData = null

    if (currentRound) {
      const tier = tiers?.find(t => t.id === currentRound.tier_id)

      let currentPlayer: any = null
      if (currentRound.player_id) {
        const { data: playerData } = await supabase
          .from('players')
          .select('id, name, image, playing_role, batting_style, bowling_style, custom_tags')
          .eq('id', currentRound.player_id)
          .maybeSingle()
        currentPlayer = playerData
      }

      const { count: totalBids } = await supabase
        .from('bids')
        .select('*', { count: 'exact', head: true })
        .eq('round_id', currentRound.id)

      const { data: highestBidResult } = await supabase
        .from('bids')
        .select('amount')
        .eq('round_id', currentRound.id)
        .order('amount', { ascending: false })
        .limit(1)
        .maybeSingle()

      // Check if this team has already bid
      let myBid: { amount: number; submittedAt: string; status: string } | undefined
      if (currentPlayer) {
        const { data: teamBid } = await adminDb
          .from('bids')
          .select('amount, submitted_at, is_winning_bid')
          .eq('round_id', currentRound.id)
          .eq('team_id', team.id)
          .eq('player_id', currentPlayer.id)
          .maybeSingle()

        if (teamBid) {
          myBid = {
            amount: teamBid.amount,
            submittedAt: teamBid.submitted_at,
            status: teamBid.is_winning_bid ? 'WINNING' : 'SUBMITTED',
          }
        }
      }

      currentRoundData = {
        id: currentRound.id,
        playerId: currentPlayer?.id,
        tierId: currentRound.tier_id,
        status: currentRound.status,
        timeRemaining: currentRound.closed_at
          ? Math.max(0, Math.floor((new Date(currentRound.closed_at).getTime() - Date.now()) / 1000))
          : null,
        maxTime: currentRound.timer_seconds || 300,
        player: currentPlayer ? {
          id: currentPlayer.id,
          name: currentPlayer.name,
          image: currentPlayer.image,
          playingRole: currentPlayer.playing_role,
          battingStyle: currentPlayer.batting_style,
          bowlingStyle: currentPlayer.bowling_style,
          customTags: currentPlayer.custom_tags,
          tier: tier ? { id: tier.id, name: tier.name, basePrice: tier.base_price, color: tier.color } : null,
        } : null,
        tier: tier ? {
          id: tier.id,
          name: tier.name,
          basePrice: tier.base_price,
          color: tier.color,
        } : null,
        myBid,
        highestBid: highestBidResult?.amount,
        totalBids: totalBids ?? 0,
      }
    }

    // ── Build squad list ───────────────────────────────────────
    const squad = (auctionResults || []).map(result => {
      const player = allPlayers?.find(p => p.id === result.player_id)
      const tier = tiers?.find(t => t.id === player?.tier_id)
      return {
        id: player?.id || result.player_id,
        name: player?.name || 'Unknown',
        image: player?.image,
        playingRole: player?.playing_role || 'BATSMAN',
        tier: tier ? { id: tier.id, name: tier.name, basePrice: tier.base_price, color: tier.color } : null,
        acquiredPrice: result.winning_bid_amount,
      }
    })

    // ── Fetch computed budget from view ─────────────────────────
    const { data: teamBudget } = await supabase
      .from('team_budgets')
      .select('total_budget, spent, budget_remaining')
      .eq('team_id', teamId)
      .maybeSingle()

    // ── Budget analytics ───────────────────────────────────────
    const totalBudget = auction.budget_per_team
    const remaining = teamBudget?.budget_remaining ?? totalBudget
    const spent = teamBudget?.spent ?? 0
    const numTeams = (allTeams || []).length || 1
    const auctionableCount = (allPlayers || []).filter(p => !captainPlayerIds.has(p.id)).length
    // Display squad size = max slots any team could fill (ceil)
    const maxAuctionSlots = Math.ceil(auctionableCount / numTeams)
    const squadSize = Math.max(auction.squad_size || 0, maxAuctionSlots)
    const slotsRemaining = Math.max(0, squadSize - squad.length)
    // For budget reserve, use min guaranteed slots (floor) so maxAllowableBid isn't too conservative
    const minAuctionSlots = Math.floor(auctionableCount / numTeams)
    const minSlotsToFill = Math.max(0, minAuctionSlots - squad.length)

    const minBasePrice = tiers && tiers.length > 0
      ? Math.min(...tiers.map(t => t.base_price))
      : 0
    const mandatoryReserve = Math.max(0, (minSlotsToFill - 1)) * minBasePrice
    const maxAllowableBid = Math.max(0, remaining - mandatoryReserve)

    const budgetSummary = {
      totalBudget,
      spent,
      remaining,
      percentRemaining: totalBudget > 0 ? Math.round((remaining / totalBudget) * 100) : 0,
      slotsRemaining,
      maxAllowableBid,
    }

    // ── Auction progress ───────────────────────────────────────
    // Exclude captain-assigned players — they're pre-assigned to teams, not available for auction
    const allSoldPlayerIds = new Set(
      (allAuctionResults || []).map(r => r.player_id)
    )
    const auctionablePlayers = allPlayers?.filter(p => !captainPlayerIds.has(p.id)) || []
    const auctionProgress = {
      totalPlayers: auctionablePlayers.length,
      soldPlayers: auctionablePlayers.filter(p => allSoldPlayerIds.has(p.id)).length,
      availablePlayers: auctionablePlayers.filter(p => !allSoldPlayerIds.has(p.id)).length,
      currentRoundNumber: allRounds?.filter(r => r.status === 'CLOSED').length || 0,
      totalRounds: allRounds?.length || 0,
    }

    // ── Fetch all team budgets ─────────────────────────────────
    const { data: allTeamBudgets } = await supabase
      .from('team_budgets')
      .select('team_id, budget_remaining')
      .eq('auction_id', auctionId)

    const budgetMap = new Map(
      (allTeamBudgets || []).map(b => [b.team_id, b.budget_remaining])
    )

    // ── Build all-teams squads ─────────────────────────────────
    const allTeamSquads = (allTeams || []).map(t => {
      const captainPlayer = t.captain_player_id
        ? allPlayers?.find(p => p.id === t.captain_player_id)
        : null

      const teamResults = (allAuctionResults || []).filter(r => r.team_id === t.id)
      const players = teamResults.map(r => {
        const p = allPlayers?.find(pl => pl.id === r.player_id)
        return {
          id: p?.id || r.player_id,
          name: p?.name || 'Unknown',
          playingRole: p?.playing_role || 'BATSMAN',
          acquiredPrice: r.winning_bid_amount,
        }
      })

      return {
        id: t.id,
        name: t.name,
        budgetRemaining: budgetMap.get(t.id) ?? totalBudget,
        captainPlayer: captainPlayer
          ? { id: captainPlayer.id, name: captainPlayer.name, playingRole: captainPlayer.playing_role }
          : null,
        players,
        playerCount: players.length + (captainPlayer ? 1 : 0),
        isCurrentTeam: t.id === teamId,
      }
    })

    // ── Build response ─────────────────────────────────────────
    return NextResponse.json({
      auction: {
        id: auction.id,
        name: auction.name,
        status: auction.status,
        currencyName: auction.currency_name,
        currencyIcon: auction.currency_icon,
        squadSize: squadSize,
      },
      team: {
        id: team.id,
        name: team.name,
        captainId: team.captain_user_id,
      },
      currentRound: currentRoundData,
      budgetSummary,
      squad,
      auctionProgress,
      allTeamSquads,
    })
  } catch (error) {
    console.error('Failed to fetch bidder session:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch bidder session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
