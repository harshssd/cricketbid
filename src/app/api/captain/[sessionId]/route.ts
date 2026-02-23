import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { verifyTeamAdminAccess, getAuthenticatedUser } from '@/lib/auth'

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

    // Get authenticated user from middleware headers
    const { userId, userEmail } = getAuthenticatedUser(request)

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse sessionId — supports two formats:
    //   1. "auctionId_teamId" (explicit team, underscore delimiter)
    //   2. "auctionId" (auto-detect team from authenticated user)
    let auctionId: string
    let teamId: string
    let switchableTeams: Array<{ id: string; name: string; primaryColor?: string; secondaryColor?: string; playerCount: number }> = []

    if (sessionId.includes('_')) {
      // Format: auctionId_teamId
      const parts = sessionId.split('_')
      auctionId = parts[0]
      teamId = parts[1]
    } else {
      // Format: just auctionId — auto-detect user's team
      auctionId = sessionId

      // Find the user's team: check captain_id first, then team_members, then participation
      const { data: captainTeam } = await supabase
        .from('teams')
        .select('id')
        .eq('auction_id', auctionId)
        .eq('captain_id', userId)
        .maybeSingle()

      if (captainTeam) {
        teamId = captainTeam.id
      } else {
        // Check team_members for CAPTAIN role
        const { data: memberTeam } = await supabase
          .from('team_members')
          .select('team_id, team:teams!team_id(auction_id)')
          .eq('user_id', userId)
          .eq('role', 'CAPTAIN')

        const matchingMember = memberTeam?.find((m: any) => {
          const t = m.team as any
          return t?.auction_id === auctionId
        })

        if (matchingMember) {
          teamId = matchingMember.team_id
        } else {
          // Check auction_participations with a team assignment
          const { data: participation } = await supabase
            .from('auction_participations')
            .select('team_id, role')
            .eq('auction_id', auctionId)
            .eq('user_id', userId)
            .not('team_id', 'is', null)
            .maybeSingle()

          if (participation?.team_id) {
            teamId = participation.team_id
          } else {
            // For auction OWNER/MODERATOR without a team, pick the first team
            const { data: ownerCheck } = await supabase
              .from('auctions')
              .select('owner_id')
              .eq('id', auctionId)
              .maybeSingle()

            const { data: adminParticipation } = await supabase
              .from('auction_participations')
              .select('role')
              .eq('auction_id', auctionId)
              .eq('user_id', userId)
              .in('role', ['OWNER', 'MODERATOR'])
              .maybeSingle()

            if (ownerCheck?.owner_id === userId || adminParticipation) {
              // Admin/owner with no specific team — get all teams and pick the first one
              const { data: allTeams, error: teamsError } = await supabase
                .from('teams')
                .select('id, name, primary_color, secondary_color, captain_id, auction_results(player_id)')
                .eq('auction_id', auctionId)
                .order('name')

              if (teamsError) {
                console.error('Failed to fetch teams for selection:', teamsError)
              }

              if (allTeams && allTeams.length > 0) {
                // Auto-select first team, include list of all teams for switching
                teamId = allTeams[0].id
                switchableTeams = allTeams.map((t: any) => ({
                  id: t.id,
                  name: t.name,
                  primaryColor: t.primary_color,
                  secondaryColor: t.secondary_color,
                  playerCount: t.auction_results?.length ?? 0,
                }))
              } else {
                return NextResponse.json(
                  { error: 'No teams found in this auction' },
                  { status: 404 }
                )
              }
            } else {
              return NextResponse.json(
                { error: 'No team found for this user in the auction. You may need a team assignment.' },
                { status: 404 }
              )
            }
          }
        }
      }
    }

    if (!auctionId || !teamId) {
      return NextResponse.json(
        { error: 'Invalid session ID format. Use auctionId_teamId or just auctionId.' },
        { status: 400 }
      )
    }

    // Verify team admin access (captain, vice-captain, or auction admin)
    const authResult = await verifyTeamAdminAccess(userId, userEmail, teamId, auctionId)

    if (!authResult.success) {
      return NextResponse.json(
        {
          error: authResult.error,
          details: authResult.details,
          currentUser: authResult.currentUser
        },
        { status: authResult.statusCode || 403 }
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
      .select(`
        id, name, primary_color, secondary_color, logo, budget_remaining, captain_id,
        captain:users!captain_id(id, name, email, image),
        auction_results(player_id)
      `)
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError || !team) {
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

    // ── Fetch all teams (for squad size calculation) ─────────
    const { data: auctionTeams } = await supabase
      .from('teams')
      .select('id, captain_player_id')
      .eq('auction_id', auctionId)

    // ── Fetch all players for this auction ─────────────────────
    const { data: allPlayers } = await supabase
      .from('players')
      .select('id, name, image, playing_role, batting_style, bowling_style, custom_tags, status, tier_id, user_id')
      .eq('auction_id', auctionId)

    // ── Fetch team's acquired players (via auction_results) ────
    const { data: auctionResults } = await supabase
      .from('auction_results')
      .select('id, player_id, winning_bid_amount, assigned_at')
      .eq('auction_id', auctionId)
      .eq('team_id', teamId)

    // ── Fetch bid history for this team's captain ──────────────
    const { data: bidHistory } = await supabase
      .from('bids')
      .select(`
        id, amount, submitted_at, is_winning_bid, rejection_reason,
        round:rounds!round_id(id, status, tier_id),
        player:players!player_id(id, name, playing_role, tier_id)
      `)
      .eq('captain_id', userId)
      .order('submitted_at', { ascending: false })
      .limit(50)

    // ── Fetch open round ───────────────────────────────────────
    const { data: openRounds } = await supabase
      .from('rounds')
      .select('id, tier_id, player_id, status, closed_at, timer_seconds, opened_at')
      .eq('auction_id', auctionId)
      .eq('status', 'OPEN')
      .order('opened_at', { ascending: false })
      .limit(1)

    // ── Fetch all rounds for progress tracking ─────────────────
    const { data: allRounds } = await supabase
      .from('rounds')
      .select('id, status')
      .eq('auction_id', auctionId)

    // ── Fetch other teams (limited info) ───────────────────────
    const { data: otherTeams } = await supabase
      .from('teams')
      .select('id, name, primary_color, auction_results(player_id)')
      .eq('auction_id', auctionId)
      .neq('id', teamId)

    // ── Build current round data ───────────────────────────────
    const currentRound = openRounds?.[0]
    let currentRoundData = null

    if (currentRound) {
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

      const { data: captainBid } = await supabase
        .from('bids')
        .select('amount, submitted_at, is_winning_bid')
        .eq('round_id', currentRound.id)
        .eq('captain_id', userId)
        .maybeSingle()

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
        myBid: captainBid ? {
          amount: captainBid.amount,
          submittedAt: captainBid.submitted_at,
          status: captainBid.is_winning_bid ? 'WINNING' : 'SUBMITTED',
        } : undefined,
        highestBid: highestBidResult?.amount,
        totalBids: totalBids ?? 0,
      }
    }

    // ── Build squad list ───────────────────────────────────────
    const squadPlayerIds = new Set((auctionResults || []).map(r => r.player_id))
    const squad = (auctionResults || []).map(result => {
      const player = allPlayers?.find(p => p.id === result.player_id)
      const tier = tiers?.find(t => t.id === player?.tier_id)
      return {
        id: player?.id || result.player_id,
        name: player?.name || 'Unknown',
        image: player?.image,
        playingRole: player?.playing_role || 'BATSMAN',
        battingStyle: player?.batting_style,
        bowlingStyle: player?.bowling_style,
        customTags: player?.custom_tags,
        status: 'SOLD' as const,
        tier: tier ? { id: tier.id, name: tier.name, basePrice: tier.base_price, color: tier.color } : { id: '', name: 'Unknown', basePrice: 0, color: '#888' },
        acquiredPrice: result.winning_bid_amount,
        acquiredAt: result.assigned_at,
        roundId: '',
      }
    })

    // ── Build tier requirements ────────────────────────────────
    const tierRequirements = (tiers || []).map(tier => {
      const playersInTier = allPlayers?.filter(p => p.tier_id === tier.id) || []
      const acquiredInTier = squad.filter(p => p.tier?.id === tier.id).length

      return {
        id: tier.id,
        name: tier.name,
        basePrice: tier.base_price,
        color: tier.color,
        icon: tier.icon,
        sortOrder: tier.sort_order,
        minPerTeam: tier.min_per_team || 0,
        maxPerTeam: tier.max_per_team || 99,
        totalPlayers: playersInTier.length,
        availablePlayers: playersInTier.filter(p => p.status === 'AVAILABLE').length,
        acquiredCount: acquiredInTier,
        fulfilled: acquiredInTier >= (tier.min_per_team || 0),
      }
    })

    // ── Budget analytics ───────────────────────────────────────
    const totalBudget = auction.budget_per_team
    const remaining = team.budget_remaining ?? totalBudget
    const spent = totalBudget - remaining
    const numTeams = (auctionTeams || []).length || 1
    const captainPlayerIds = new Set(
      (auctionTeams || []).map(t => t.captain_player_id).filter(Boolean)
    )
    const auctionableCount = (allPlayers || []).filter(p => !captainPlayerIds.has(p.id)).length
    // Display squad size = max slots any team could fill (ceil)
    const maxAuctionSlots = Math.ceil(auctionableCount / numTeams)
    const squadSize = Math.max(auction.squad_size || 0, maxAuctionSlots)
    const slotsRemaining = Math.max(0, squadSize - squad.length)
    // For budget reserve, use min guaranteed slots (floor) so maxAllowableBid isn't too conservative
    const minAuctionSlots = Math.floor(auctionableCount / numTeams)
    const minSlotsToFill = Math.max(0, minAuctionSlots - squad.length)

    // Reserve = minimum needed for remaining mandatory slots
    const minBasePrice = tiers && tiers.length > 0
      ? Math.min(...tiers.map(t => t.base_price))
      : 0
    const mandatoryReserve = Math.max(0, (minSlotsToFill - 1)) * minBasePrice
    const maxAllowableBid = Math.max(0, remaining - mandatoryReserve)
    const avgSpendPerPlayer = squad.length > 0 ? Math.round(spent / squad.length) : 0
    const avgRemainingPerSlot = slotsRemaining > 0 ? Math.round(remaining / slotsRemaining) : remaining

    const percentSpent = totalBudget > 0 ? Math.round((spent / totalBudget) * 100) : 0
    const percentRemaining = 100 - percentSpent

    let budgetHealth: 'healthy' | 'caution' | 'critical' = 'healthy'
    if (slotsRemaining > 0) {
      if (avgRemainingPerSlot < minBasePrice * 1.5) {
        budgetHealth = 'critical'
      } else if (avgRemainingPerSlot < minBasePrice * 3) {
        budgetHealth = 'caution'
      }
    }

    const budgetAnalytics = {
      totalBudget,
      spent,
      remaining,
      percentSpent,
      percentRemaining,
      slotsRemaining,
      mandatoryReserve,
      maxAllowableBid,
      avgSpendPerPlayer,
      avgRemainingPerSlot,
      budgetHealth,
    }

    // ── Squad composition ──────────────────────────────────────
    const squadComposition = {
      batsmen: squad.filter(p => p.playingRole === 'BATSMAN').length,
      bowlers: squad.filter(p => p.playingRole === 'BOWLER').length,
      allRounders: squad.filter(p => p.playingRole === 'ALL_ROUNDER').length,
      wicketkeepers: squad.filter(p => p.playingRole === 'WICKETKEEPER').length,
      total: squad.length,
      targetSize: squadSize,
    }

    // ── Auction progress ───────────────────────────────────────
    const auctionProgress = {
      totalPlayers: allPlayers?.length || 0,
      soldPlayers: allPlayers?.filter(p => p.status === 'SOLD').length || 0,
      unsoldPlayers: allPlayers?.filter(p => p.status === 'UNSOLD').length || 0,
      availablePlayers: allPlayers?.filter(p => p.status === 'AVAILABLE').length || 0,
      currentRoundNumber: allRounds?.filter(r => r.status === 'CLOSED').length || 0,
      totalRounds: allRounds?.length || 0,
    }

    // ── Build bid history ──────────────────────────────────────
    const formattedBidHistory = (bidHistory || []).map((bid: any) => {
      const player = bid.player as any
      const round = bid.round as any
      const tier = tiers?.find(t => t.id === round?.tier_id)

      return {
        roundId: round?.id,
        playerId: player?.id,
        playerName: player?.name || 'Unknown',
        playerRole: player?.playing_role || 'BATSMAN',
        tierName: tier?.name || 'Unknown',
        tierColor: tier?.color || '#888',
        bidAmount: bid.amount,
        wasWinning: bid.is_winning_bid || false,
        result: bid.is_winning_bid ? 'WON' : round?.status === 'CLOSED' ? 'LOST' : 'PENDING',
        submittedAt: bid.submitted_at,
      }
    })

    // ── Build response ─────────────────────────────────────────
    const isAdminViewing = authResult.accessRole === 'AUCTION_ADMIN' || authResult.accessRole === 'AUCTION_OWNER'

    const sessionResponse = {
      id: `${auctionId}_${teamId}`,
      accessRole: authResult.accessRole,
      isAdminViewing,
      switchableTeams: switchableTeams.length > 0 ? switchableTeams : undefined,
      auction: {
        id: auction.id,
        name: auction.name,
        status: auction.status,
        currencyName: auction.currency_name,
        currencyIcon: auction.currency_icon,
        squadSize: auction.squad_size || 11,
      },
      team: {
        id: team.id,
        name: team.name,
        primaryColor: team.primary_color,
        secondaryColor: team.secondary_color,
        logo: team.logo,
        remainingBudget: remaining,
        totalBudget: totalBudget,
        playerCount: squad.length,
        squadSize: squadSize,
        captain: team.captain,
      },
      currentRound: currentRoundData,
      squad,
      bidHistory: formattedBidHistory,
      tierRequirements,
      budgetAnalytics,
      squadComposition,
      auctionProgress,
      otherTeams: (otherTeams || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        playerCount: t.auction_results?.length ?? 0,
        primaryColor: t.primary_color,
      })),
      isConnected: true,
    }

    return NextResponse.json(sessionResponse)
  } catch (error) {
    console.error('Failed to fetch captain session:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch captain session',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
