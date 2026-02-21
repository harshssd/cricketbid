import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const assignPlayersSchema = z.object({
  playerIds: z.array(z.string()).min(1, 'At least one player ID is required'),
})

const removePlayersSchema = z.object({
  playerIds: z.array(z.string()).min(1, 'At least one player ID is required'),
})

// Assign players to a team (pre-auction)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()
    const { playerIds } = assignPlayersSchema.parse(body)

    const supabase = await createClient()

    // Verify auction exists and is editable
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('status, squad_size')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) throw auctionError

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot assign players - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Verify team belongs to this auction
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError) throw teamError

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this auction' }, { status: 404 })
    }

    // Count current players on team
    const { count: currentPlayerCount, error: countError } = await supabase
      .from('players')
      .select('id', { count: 'exact', head: true })
      .eq('assigned_team_id', teamId)

    if (countError) throw countError

    const playerCount = currentPlayerCount ?? 0

    // Check squad size limit
    if (playerCount + playerIds.length > auction.squad_size) {
      return NextResponse.json(
        { error: `Cannot assign ${playerIds.length} players. Squad size limit is ${auction.squad_size}, team already has ${playerCount} players.` },
        { status: 400 }
      )
    }

    // Verify all players belong to this auction and are available
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name, status, assigned_team_id')
      .in('id', playerIds)
      .eq('auction_id', auctionId)

    if (playersError) throw playersError

    if (!players || players.length !== playerIds.length) {
      return NextResponse.json(
        { error: 'Some players were not found in this auction' },
        { status: 400 }
      )
    }

    const alreadyAssigned = players.filter(p => p.assigned_team_id && p.assigned_team_id !== teamId)
    if (alreadyAssigned.length > 0) {
      const names = alreadyAssigned.map(p => p.name).join(', ')
      return NextResponse.json(
        { error: `Players already assigned to another team: ${names}` },
        { status: 400 }
      )
    }

    // Assign players to the team
    const { error: updateError } = await supabase
      .from('players')
      .update({ assigned_team_id: teamId })
      .in('id', playerIds)
      .eq('auction_id', auctionId)

    if (updateError) throw updateError

    // Fetch updated team with players
    const { data: updatedPlayers, error: updatedPlayersError } = await supabase
      .from('players')
      .select('id, name, image, playing_role, status, tier:tiers!tier_id(name, color)')
      .eq('assigned_team_id', teamId)

    if (updatedPlayersError) throw updatedPlayersError

    const updatedTeam = {
      ...team,
      players: (updatedPlayers ?? []).map(p => ({
        id: p.id,
        name: p.name,
        image: p.image,
        playingRole: p.playing_role,
        status: p.status,
        tier: p.tier
      })),
      _count: { players: updatedPlayers?.length ?? 0 }
    }

    return NextResponse.json({ success: true, team: updatedTeam })

  } catch (error) {
    console.error('Failed to assign players:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to assign players',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Remove players from a team (pre-auction)
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId, teamId } = await params
    const body = await request.json()
    const { playerIds } = removePlayersSchema.parse(body)

    const supabase = await createClient()

    // Verify auction exists and is editable
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) throw auctionError

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot remove players - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Verify team belongs to this auction
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (teamError) throw teamError

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this auction' }, { status: 404 })
    }

    // Unassign players from this team
    const { error: updateError } = await supabase
      .from('players')
      .update({ assigned_team_id: null })
      .in('id', playerIds)
      .eq('auction_id', auctionId)
      .eq('assigned_team_id', teamId)

    if (updateError) throw updateError

    // Fetch updated team with players
    const { data: updatedPlayers, error: updatedPlayersError } = await supabase
      .from('players')
      .select('id, name, image, playing_role, status, tier:tiers!tier_id(name, color)')
      .eq('assigned_team_id', teamId)

    if (updatedPlayersError) throw updatedPlayersError

    const updatedTeam = {
      ...team,
      players: (updatedPlayers ?? []).map(p => ({
        id: p.id,
        name: p.name,
        image: p.image,
        playingRole: p.playing_role,
        status: p.status,
        tier: p.tier
      })),
      _count: { players: updatedPlayers?.length ?? 0 }
    }

    return NextResponse.json({ success: true, team: updatedTeam })

  } catch (error) {
    console.error('Failed to remove players:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to remove players',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
