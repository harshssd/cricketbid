import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
    playerId: string
  }>
}

const updatePlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required').optional(),
  playingRole: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']).optional(),
  tierId: z.string().optional(),
  image: z.string().nullable().optional(),
  battingStyle: z.string().nullable().optional(),
  bowlingStyle: z.string().nullable().optional(),
  customTags: z.string().nullable().optional(),
  userId: z.string().nullable().optional(),
})

// GET - Get a single league player by ID
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()

    const { id: leagueId, playerId } = await params

    const { data: player, error } = await supabase
      .from('players')
      .select(`
        *,
        tier:tiers!tier_id(id, name, base_price, color),
        linked_user:users!user_id(id, name, email, image)
      `)
      .eq('id', playerId)
      .eq('league_id', leagueId)
      .is('auction_id', null)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!player) {
      return NextResponse.json(
        { error: 'Player not found in this league' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      player,
    })

  } catch (error) {
    console.error('Failed to get league player:', error)
    return NextResponse.json(
      { error: 'Failed to get player details' },
      { status: 500 }
    )
  }
}

// PUT - Update a league player
export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()

    const { id: leagueId, playerId } = await params
    const body = await request.json()

    // Validate request body
    const validatedData = updatePlayerSchema.parse(body)

    // Check if player exists and belongs to this league pool
    const { data: existingPlayer, error: findError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .eq('league_id', leagueId)
      .is('auction_id', null)
      .maybeSingle()

    if (findError) {
      throw findError
    }

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player not found in this league' },
        { status: 404 }
      )
    }

    // Validate tier if provided
    if (validatedData.tierId) {
      const { data: tier, error: tierError } = await supabase
        .from('tiers')
        .select('id')
        .eq('id', validatedData.tierId)
        .maybeSingle()

      if (tierError) {
        throw tierError
      }

      if (!tier) {
        return NextResponse.json(
          { error: 'Invalid tier ID' },
          { status: 400 }
        )
      }
    }

    // Validate userId if provided and not null
    if (validatedData.userId) {
      const { data: user, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('id', validatedData.userId)
        .maybeSingle()

      if (userError) {
        throw userError
      }

      if (!user) {
        return NextResponse.json(
          { error: 'Invalid user ID' },
          { status: 400 }
        )
      }
    }

    // Build update data with snake_case columns
    const updateData: any = {}
    if (validatedData.name !== undefined) updateData.name = validatedData.name
    if (validatedData.playingRole !== undefined) updateData.playing_role = validatedData.playingRole
    if (validatedData.tierId !== undefined) updateData.tier_id = validatedData.tierId
    if (validatedData.image !== undefined) updateData.image = validatedData.image
    if (validatedData.battingStyle !== undefined) updateData.batting_style = validatedData.battingStyle
    if (validatedData.bowlingStyle !== undefined) updateData.bowling_style = validatedData.bowlingStyle
    if (validatedData.customTags !== undefined) updateData.custom_tags = validatedData.customTags
    if (validatedData.userId !== undefined) updateData.user_id = validatedData.userId

    // Update the player
    const { data: updatedPlayer, error: updateError } = await supabase
      .from('players')
      .update(updateData)
      .eq('id', playerId)
      .select(`
        *,
        tier:tiers!tier_id(id, name, base_price, color),
        linked_user:users!user_id(id, name, email, image)
      `)
      .single()

    if (updateError) {
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: `Player ${updatedPlayer.name} updated successfully`,
      player: updatedPlayer,
    })

  } catch (error) {
    console.error('Failed to update league player:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      )
    }

    return NextResponse.json({
      error: 'Failed to update player',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}

// DELETE - Delete a league player
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()

    const { id: leagueId, playerId } = await params

    // Check if player exists and belongs to this league
    const { data: existingPlayer, error: findError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .eq('league_id', leagueId)
      .maybeSingle()

    if (findError) {
      throw findError
    }

    if (!existingPlayer) {
      return NextResponse.json(
        { error: 'Player not found in this league' },
        { status: 404 }
      )
    }

    // Only allow deletion if player is not assigned to an auction or is in AVAILABLE status
    if (existingPlayer.auction_id !== null && existingPlayer.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: 'Cannot delete player that is assigned to an auction and not in AVAILABLE status' },
        { status: 400 }
      )
    }

    // Delete the player
    const { error: deleteError } = await supabase
      .from('players')
      .delete()
      .eq('id', playerId)

    if (deleteError) {
      throw deleteError
    }

    return NextResponse.json({
      success: true,
      message: `Player ${existingPlayer.name} deleted successfully`,
    })

  } catch (error) {
    console.error('Failed to delete league player:', error)
    return NextResponse.json({
      error: 'Failed to delete player',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
