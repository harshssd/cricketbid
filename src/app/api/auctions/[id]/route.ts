import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const supabase = await createClient()

    const { data: auction, error } = await supabase
      .from('auctions')
      .select(`
        *,
        owner:users!owner_id(id, name, email, image),
        league:leagues!league_id(id, name, logo, primary_color),
        teams(
          *,
          captain:users!captain_id(id, name, email, image),
          players(id, name, playing_role, status),
          team_members(id)
        ),
        tiers(
          *,
          players(id)
        ),
        players(
          *,
          tier:tiers!tier_id(id, name, base_price, color),
          assigned_team:teams!assigned_team_id(id, name, primary_color)
        ),
        auction_participations(
          *,
          user:users!user_id(id, name, email, image),
          team:teams!team_id(id, name, primary_color)
        ),
        rounds(
          *,
          tier:tiers!tier_id(*),
          bids(id)
        )
      `)
      .eq('id', auctionId)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    // Sort teams by name asc
    const sortedTeams = [...(auction.teams || [])].sort((a: any, b: any) =>
      (a.name || '').localeCompare(b.name || '')
    )

    // Sort tiers by sort_order asc
    const sortedTiers = [...(auction.tiers || [])].sort((a: any, b: any) =>
      (a.sort_order ?? 0) - (b.sort_order ?? 0)
    )

    // Sort players by status asc, then name asc
    const sortedPlayers = [...(auction.players || [])].sort((a: any, b: any) => {
      const statusCmp = (a.status || '').localeCompare(b.status || '')
      if (statusCmp !== 0) return statusCmp
      return (a.name || '').localeCompare(b.name || '')
    })

    // Sort participations by role asc, then joined_at asc
    const sortedParticipations = [...(auction.auction_participations || [])].sort((a: any, b: any) => {
      const roleCmp = (a.role || '').localeCompare(b.role || '')
      if (roleCmp !== 0) return roleCmp
      return new Date(a.joined_at || 0).getTime() - new Date(b.joined_at || 0).getTime()
    })

    // Sort rounds by id desc
    const sortedRounds = [...(auction.rounds || [])].sort((a: any, b: any) =>
      (b.id || '').localeCompare(a.id || '')
    )

    const playerStats = {
      total: sortedPlayers.length,
      available: sortedPlayers.filter((p: any) => p.status === 'AVAILABLE').length,
      sold: sortedPlayers.filter((p: any) => p.status === 'SOLD').length,
      unsold: sortedPlayers.filter((p: any) => p.status === 'UNSOLD').length,
    }

    const teamStats = sortedTeams.map((team: any) => ({
      id: team.id,
      name: team.name,
      primaryColor: team.primary_color,
      secondaryColor: team.secondary_color,
      logo: team.logo,
      captain: team.captain,
      budgetRemaining: team.budget_remaining ?? auction.budget_per_team,
      budgetSpent: auction.budget_per_team - (team.budget_remaining ?? auction.budget_per_team),
      playerCount: (team.players || []).length,
      players: (team.players || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        playingRole: p.playing_role,
        status: p.status,
      })),
    }))

    const tierStats = sortedTiers.map((tier: any) => ({
      id: tier.id,
      name: tier.name,
      basePrice: tier.base_price,
      color: tier.color,
      icon: tier.icon,
      sortOrder: tier.sort_order,
      minPerTeam: tier.min_per_team,
      maxPerTeam: tier.max_per_team,
      playerCount: (tier.players || []).length,
    }))

    // Transform players to camelCase
    const transformedPlayers = sortedPlayers.map((p: any) => ({
      id: p.id,
      name: p.name,
      image: p.image,
      playingRole: p.playing_role,
      battingStyle: p.batting_style,
      bowlingStyle: p.bowling_style,
      status: p.status,
      auctionId: p.auction_id,
      tierId: p.tier_id,
      assignedTeamId: p.assigned_team_id,
      customTags: p.custom_tags,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      tier: p.tier ? {
        id: p.tier.id,
        name: p.tier.name,
        basePrice: p.tier.base_price,
        color: p.tier.color,
      } : null,
      assignedTeam: p.assigned_team ? {
        id: p.assigned_team.id,
        name: p.assigned_team.name,
        primaryColor: p.assigned_team.primary_color,
      } : null,
    }))

    // Transform participations to camelCase
    const transformedParticipations = sortedParticipations.map((p: any) => ({
      id: p.id,
      auctionId: p.auction_id,
      userId: p.user_id,
      teamId: p.team_id,
      role: p.role,
      joinedAt: p.joined_at,
      user: p.user,
      team: p.team ? {
        id: p.team.id,
        name: p.team.name,
        primaryColor: p.team.primary_color,
      } : null,
    }))

    // Transform rounds to camelCase
    const transformedRounds = sortedRounds.map((r: any) => ({
      id: r.id,
      auctionId: r.auction_id,
      tierId: r.tier_id,
      status: r.status,
      runtimeState: r.runtime_state,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      tier: r.tier ? {
        id: r.tier.id,
        name: r.tier.name,
        basePrice: r.tier.base_price,
        color: r.tier.color,
        icon: r.tier.icon,
        sortOrder: r.tier.sort_order,
        minPerTeam: r.tier.min_per_team,
        maxPerTeam: r.tier.max_per_team,
        auctionId: r.tier.auction_id,
        createdAt: r.tier.created_at,
        updatedAt: r.tier.updated_at,
      } : null,
      _count: {
        bids: (r.bids || []).length,
      },
    }))

    const participationStats = {
      total: transformedParticipations.length,
      owners: sortedParticipations.filter((p: any) => p.role === 'OWNER').length,
      moderators: sortedParticipations.filter((p: any) => p.role === 'MODERATOR').length,
      captains: sortedParticipations.filter((p: any) => p.role === 'CAPTAIN').length,
      viewers: sortedParticipations.filter((p: any) => p.role === 'VIEWER').length,
    }

    // Transform league to camelCase
    const transformedLeague = auction.league ? {
      id: auction.league.id,
      name: auction.league.name,
      logo: auction.league.logo,
      primaryColor: auction.league.primary_color,
    } : null

    return NextResponse.json({
      id: auction.id,
      name: auction.name,
      description: auction.description,
      ownerId: auction.owner_id,
      status: auction.status,
      visibility: auction.visibility,
      budgetPerTeam: auction.budget_per_team,
      currencyName: auction.currency_name,
      currencyIcon: auction.currency_icon,
      squadSize: auction.squad_size,
      logo: auction.logo,
      primaryColor: auction.primary_color,
      secondaryColor: auction.secondary_color,
      leagueId: auction.league_id,
      createdAt: auction.created_at,
      updatedAt: auction.updated_at,
      owner: auction.owner,
      league: transformedLeague,
      teams: teamStats,
      tiers: tierStats,
      players: transformedPlayers,
      participations: transformedParticipations,
      rounds: transformedRounds,
      playerStats,
      participationStats,
      _count: {
        teams: sortedTeams.length,
        players: sortedPlayers.length,
        participations: sortedParticipations.length,
        rounds: sortedRounds.length,
      },
    })

  } catch (error) {
    console.error('Failed to fetch auction details:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch auction details',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Update auction (for settings, status changes, etc.)
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const updates = await request.json()
    const supabase = await createClient()

    // Map camelCase input keys to snake_case for Supabase
    const keyMap: Record<string, string> = {
      budgetPerTeam: 'budget_per_team',
      currencyName: 'currency_name',
      currencyIcon: 'currency_icon',
      squadSize: 'squad_size',
      primaryColor: 'primary_color',
      secondaryColor: 'secondary_color',
      leagueId: 'league_id',
      ownerId: 'owner_id',
      runtimeState: 'runtime_state',
      isActive: 'is_active',
      maxMembers: 'max_members',
    }

    const snakeCaseUpdates: Record<string, any> = {}
    for (const [key, value] of Object.entries(updates)) {
      const snakeKey = keyMap[key] || key
      snakeCaseUpdates[snakeKey] = value
    }

    // Update the auction
    const { data: auction, error: updateError } = await supabase
      .from('auctions')
      .update(snakeCaseUpdates)
      .eq('id', auctionId)
      .select(`
        *,
        owner:users!owner_id(id, name, email, image),
        teams(
          *,
          captain:users!captain_id(id, name, email, image),
          players(id)
        )
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    // If budgetPerTeam was updated, also update all team budgetRemaining
    if (updates.budgetPerTeam !== undefined) {
      const { error: teamUpdateError } = await supabase
        .from('teams')
        .update({ budget_remaining: updates.budgetPerTeam })
        .eq('auction_id', auctionId)

      if (teamUpdateError) {
        throw teamUpdateError
      }
    }

    // Transform response to camelCase to match original API shape
    const transformedTeams = (auction.teams || []).map((team: any) => ({
      id: team.id,
      name: team.name,
      auctionId: team.auction_id,
      primaryColor: team.primary_color,
      secondaryColor: team.secondary_color,
      logo: team.logo,
      captainId: team.captain_id,
      budgetRemaining: team.budget_remaining,
      createdAt: team.created_at,
      updatedAt: team.updated_at,
      captain: team.captain,
      _count: {
        players: (team.players || []).length,
      },
    }))

    // Count participations separately
    const { count: participationsCount } = await supabase
      .from('auction_participations')
      .select('id', { count: 'exact', head: true })
      .eq('auction_id', auctionId)

    return NextResponse.json({
      id: auction.id,
      name: auction.name,
      description: auction.description,
      ownerId: auction.owner_id,
      status: auction.status,
      visibility: auction.visibility,
      budgetPerTeam: auction.budget_per_team,
      currencyName: auction.currency_name,
      currencyIcon: auction.currency_icon,
      squadSize: auction.squad_size,
      logo: auction.logo,
      primaryColor: auction.primary_color,
      secondaryColor: auction.secondary_color,
      leagueId: auction.league_id,
      createdAt: auction.created_at,
      updatedAt: auction.updated_at,
      owner: auction.owner,
      teams: transformedTeams,
      _count: {
        teams: transformedTeams.length,
        players: transformedTeams.reduce((sum: number, t: any) => sum + t._count.players, 0),
        participations: participationsCount ?? 0,
      },
    })

  } catch (error) {
    console.error('Failed to update auction:', error)
    return NextResponse.json(
      {
        error: 'Failed to update auction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Delete auction
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const supabase = await createClient()

    // Fetch auction with counts for the response
    const { data: auction, error: fetchError } = await supabase
      .from('auctions')
      .select(`
        id, name, owner_id, status,
        teams(id),
        players(id),
        auction_participations(id),
        rounds(id)
      `)
      .eq('id', auctionId)
      .maybeSingle()

    if (fetchError) {
      throw fetchError
    }

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    if (auction.status === 'LIVE') {
      return NextResponse.json(
        { error: 'Cannot delete a live auction. Please end the auction first.' },
        { status: 400 }
      )
    }

    const deletedCounts = {
      teams: (auction.teams || []).length,
      players: (auction.players || []).length,
      participations: (auction.auction_participations || []).length,
      rounds: (auction.rounds || []).length,
    }

    const { error: deleteError } = await supabase
      .from('auctions')
      .delete()
      .eq('id', auctionId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: `Auction "${auction.name}" has been deleted successfully`,
      deletedAuction: {
        id: auction.id,
        name: auction.name,
        deletedCounts,
      }
    })

  } catch (error) {
    console.error('Failed to delete auction:', error)
    return NextResponse.json(
      {
        error: 'Failed to delete auction',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
