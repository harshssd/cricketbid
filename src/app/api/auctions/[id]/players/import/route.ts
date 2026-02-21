import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const playerSchema = z.object({
  name: z.string().min(1, 'Player name is required'),
  image: z.string().url().optional(),
  playingRole: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  customTags: z.string().optional(),
  tierId: z.string().min(1, 'Tier is required'),
  email: z.string().email().optional(),
  userId: z.string().optional(),
})

const importPlayersSchema = z.object({
  players: z.array(playerSchema).min(1, 'At least one player is required'),
  overwrite: z.boolean().default(false),
  autoLinkUsers: z.boolean().default(true),
})

export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()

    const { id: auctionId } = await params
    const body = await request.json()
    const validatedData = importPlayersSchema.parse(body)

    // Check if auction exists and is in DRAFT status
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select(`
        *,
        tiers:tiers!auction_id(id, name)
      `)
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) {
      throw auctionError
    }

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    if (auction.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Players can only be imported in DRAFT status' },
        { status: 400 }
      )
    }

    // Validate all tier IDs exist
    const tierIds = new Set(auction.tiers.map((t: any) => t.id))
    const invalidTierIds = validatedData.players
      .map(p => p.tierId)
      .filter(tierId => !tierIds.has(tierId))

    if (invalidTierIds.length > 0) {
      return NextResponse.json(
        {
          error: 'Invalid tier IDs found',
          details: { invalidTierIds: Array.from(new Set(invalidTierIds)) }
        },
        { status: 400 }
      )
    }

    // If overwrite is true, delete existing players
    if (validatedData.overwrite) {
      const { error: deleteError } = await supabase
        .from('players')
        .delete()
        .eq('auction_id', auctionId)

      if (deleteError) {
        throw deleteError
      }
    }

    // Create players sequentially with user linking
    const players = []
    const linkingResults = {
      linked: 0,
      unlinked: 0,
      errors: [] as string[]
    }

    for (const playerData of validatedData.players) {
      let resolvedUserId: string | null = null

      if (playerData.userId) {
        const { data: user } = await supabase
          .from('users')
          .select('id, email')
          .eq('id', playerData.userId)
          .maybeSingle()

        if (user) {
          resolvedUserId = playerData.userId
          linkingResults.linked++
        } else {
          linkingResults.errors.push(`User not found for ID: ${playerData.userId} (player: ${playerData.name})`)
        }
      } else if (validatedData.autoLinkUsers && playerData.email) {
        const { data: user } = await supabase
          .from('users')
          .select('id, email')
          .eq('email', playerData.email)
          .maybeSingle()

        if (user) {
          resolvedUserId = user.id
          linkingResults.linked++
        } else {
          linkingResults.unlinked++
        }
      } else {
        linkingResults.unlinked++
      }

      // Remove email from playerData before creating (not a Player field)
      const { email: _email, ...playerCreateData } = playerData

      // Map camelCase fields to snake_case for insert
      const insertData: any = {
        name: playerCreateData.name,
        playing_role: playerCreateData.playingRole,
        tier_id: playerCreateData.tierId,
        auction_id: auctionId,
        league_id: auction.league_id,
        status: 'AVAILABLE',
        user_id: resolvedUserId,
      }

      if (playerCreateData.image) insertData.image = playerCreateData.image
      if (playerCreateData.battingStyle) insertData.batting_style = playerCreateData.battingStyle
      if (playerCreateData.bowlingStyle) insertData.bowling_style = playerCreateData.bowlingStyle
      if (playerCreateData.customTags) insertData.custom_tags = playerCreateData.customTags

      const { data: player, error: createError } = await supabase
        .from('players')
        .insert(insertData)
        .select(`
          *,
          tier:tiers!tier_id(id, name, base_price, color),
          linked_user:users!user_id(id, name, email, image)
        `)
        .single()

      if (createError) {
        throw createError
      }

      players.push(player)
    }

    // Get total player count for this auction
    const { count: playerCount, error: countError } = await supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('auction_id', auctionId)

    if (countError) {
      throw countError
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${players.length} players`,
      players,
      totalPlayers: playerCount ?? 0,
      overwritten: validatedData.overwrite,
      linking: {
        enabled: validatedData.autoLinkUsers,
        results: linkingResults,
        summary: `${linkingResults.linked} linked, ${linkingResults.unlinked} unlinked${linkingResults.errors.length > 0 ? `, ${linkingResults.errors.length} errors` : ''}`
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid player data',
          details: error.issues
        },
        { status: 400 }
      )
    }

    console.error('Failed to import players:', error)
    return NextResponse.json(
      { error: 'Failed to import players' },
      { status: 500 }
    )
  }
}

// Get current players for preview/validation
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()

    const { id: auctionId } = await params

    const { data: players, error } = await supabase
      .from('players')
      .select(`
        *,
        tier:tiers!tier_id(id, name, base_price, color),
        assigned_team:teams!assigned_team_id(id, name, primary_color),
        linked_user:users!user_id(id, name, email, image)
      `)
      .eq('auction_id', auctionId)
      .order('status', { ascending: true })
      .order('name', { ascending: true })

    if (error) {
      throw error
    }

    const playerStats = {
      total: players.length,
      available: players.filter(p => p.status === 'AVAILABLE').length,
      sold: players.filter(p => p.status === 'SOLD').length,
      unsold: players.filter(p => p.status === 'UNSOLD').length,
      linked: players.filter(p => p.user_id != null).length,
      unlinked: players.filter(p => p.user_id == null).length,
    }

    return NextResponse.json({
      players,
      playerStats
    })

  } catch (error) {
    console.error('Failed to fetch players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}
