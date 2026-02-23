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

    // Count current players on team via join table
    const { count: currentPlayerCount, error: countError } = await supabase
      .from('team_players')
      .select('id', { count: 'exact', head: true })
      .eq('team_id', teamId)

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
      .select('id, name, status')
      .in('id', playerIds)
      .eq('auction_id', auctionId)

    if (playersError) throw playersError

    if (!players || players.length !== playerIds.length) {
      return NextResponse.json(
        { error: 'Some players were not found in this auction' },
        { status: 400 }
      )
    }

    // Check if any players are already assigned to another team
    const { data: existingAssignments, error: existingError } = await supabase
      .from('team_players')
      .select('player_id, team_id')
      .in('player_id', playerIds)

    if (existingError) throw existingError

    const assignedToOtherTeam = (existingAssignments ?? []).filter(a => a.team_id !== teamId)
    if (assignedToOtherTeam.length > 0) {
      const assignedPlayerIds = assignedToOtherTeam.map(a => a.player_id)
      const names = players.filter(p => assignedPlayerIds.includes(p.id)).map(p => p.name).join(', ')
      return NextResponse.json(
        { error: `Players already assigned to another team: ${names}` },
        { status: 400 }
      )
    }

    // Filter out players already assigned to this team
    const alreadyOnTeam = new Set((existingAssignments ?? []).filter(a => a.team_id === teamId).map(a => a.player_id))
    const newPlayerIds = playerIds.filter(id => !alreadyOnTeam.has(id))

    // Insert into join table
    if (newPlayerIds.length > 0) {
      const { error: insertError } = await supabase
        .from('team_players')
        .insert(newPlayerIds.map(playerId => ({ team_id: teamId, player_id: playerId })))

      if (insertError) throw insertError
    }

    // Fetch updated team with players via join table
    const { data: teamPlayers, error: teamPlayersError } = await supabase
      .from('team_players')
      .select('player:players(id, name, image, playing_role, status, tier:tiers!tier_id(name, color))')
      .eq('team_id', teamId)

    if (teamPlayersError) throw teamPlayersError

    const updatedPlayers = (teamPlayers ?? []).map(tp => tp.player).filter(Boolean)

    const updatedTeam = {
      ...team,
      players: updatedPlayers.map((p: any) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        playingRole: p.playing_role,
        status: p.status,
        tier: p.tier
      })),
      _count: { players: updatedPlayers.length }
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

    // Remove from join table
    const { error: deleteError } = await supabase
      .from('team_players')
      .delete()
      .in('player_id', playerIds)
      .eq('team_id', teamId)

    if (deleteError) throw deleteError

    // Fetch updated team with players via join table
    const { data: teamPlayers, error: teamPlayersError } = await supabase
      .from('team_players')
      .select('player:players(id, name, image, playing_role, status, tier:tiers!tier_id(name, color))')
      .eq('team_id', teamId)

    if (teamPlayersError) throw teamPlayersError

    const updatedPlayers = (teamPlayers ?? []).map(tp => tp.player).filter(Boolean)

    const updatedTeam = {
      ...team,
      players: updatedPlayers.map((p: any) => ({
        id: p.id,
        name: p.name,
        image: p.image,
        playingRole: p.playing_role,
        status: p.status,
        tier: p.tier
      })),
      _count: { players: updatedPlayers.length }
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
