import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; teamId: string }>
}

const updateTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required').optional(),
  description: z.string().nullable().optional(),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  logo: z.string().nullable().optional(),
  captainId: z.string().nullable().optional(),
  captainPlayerId: z.string().nullable().optional(),
  budgetRemaining: z.number().optional(),
})

// Update a single team
export async function PATCH(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId, teamId } = await params
    const body = await request.json()
    const data = updateTeamSchema.parse(body)

    // Verify auction exists and is editable
    const { data: auction } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', auctionId)
      .maybeSingle()

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot modify team - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Verify team belongs to this auction
    const { data: existingTeam } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (!existingTeam) {
      return NextResponse.json({ error: 'Team not found in this auction' }, { status: 404 })
    }

    // Build snake_case update data
    const updateData: Record<string, unknown> = {}
    if (data.name !== undefined) updateData.name = data.name
    if (data.description !== undefined) updateData.description = data.description
    if (data.captainId !== undefined) updateData.captain_user_id = data.captainId
    if (data.captainPlayerId !== undefined) updateData.captain_player_id = data.captainPlayerId
    // budget_remaining is now computed from team_budgets view

    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update(updateData)
      .eq('id', teamId)
      .select(`
        *,
        captain:users!teams_captain_user_id_fkey(id, name, email, image),
        auction_results(
          player:players(
            id,
            name,
            image,
            playing_role,
            tier:tiers!tier_id(name, color)
          )
        )
      `)
      .single()

    if (updateError) throw updateError

    // Resolve captain_player manually (FK join unreliable in PostgREST schema cache)
    let captainPlayer = null
    if (updatedTeam.captain_player_id) {
      const { data: cp } = await supabase
        .from('players')
        .select('id, name, image, playing_role')
        .eq('id', updatedTeam.captain_player_id)
        .maybeSingle()
      captainPlayer = cp
    }

    // Transform to camelCase shape with _count
    const { auction_results: ar, ...rest } = updatedTeam
    const players = (ar ?? []).map((r: any) => r.player).filter(Boolean)
    const result = {
      id: rest.id,
      auctionId: rest.auction_id,
      name: rest.name,
      description: rest.description,
      captainId: rest.captain_user_id,
      captainPlayerId: rest.captain_player_id,
      // budgetRemaining is computed from team_budgets view
      captain: rest.captain,
      captainPlayer: captainPlayer ? {
        id: captainPlayer.id,
        name: captainPlayer.name,
        image: captainPlayer.image,
        playingRole: captainPlayer.playing_role,
      } : null,
      players,
      _count: {
        players: players.length,
      }
    }

    return NextResponse.json({ success: true, team: result })

  } catch (error) {
    console.error('Failed to update team:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to update team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Delete a single team
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId, teamId } = await params

    // Verify auction exists and is editable
    const { data: auction } = await supabase
      .from('auctions')
      .select('status')
      .eq('id', auctionId)
      .maybeSingle()

    if (!auction) {
      return NextResponse.json({ error: 'Auction not found' }, { status: 404 })
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot delete team - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Verify team belongs to this auction
    const { data: team } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('auction_id', auctionId)
      .maybeSingle()

    if (!team) {
      return NextResponse.json({ error: 'Team not found in this auction' }, { status: 404 })
    }

    // Delete team — ON DELETE CASCADE handles cleanup
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId)

    if (deleteError) throw deleteError

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to delete team:', error)
    return NextResponse.json({
      error: 'Failed to delete team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
