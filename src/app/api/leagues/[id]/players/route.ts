import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const createPlayerSchema = z.object({
  name: z.string().min(1, 'Player name is required'),
  playingRole: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']),
  tierId: z.string().min(1, 'Tier is required'),
  image: z.string().optional(),
  battingStyle: z.string().optional(),
  bowlingStyle: z.string().optional(),
  customTags: z.string().optional(),
  userId: z.string().optional(),
})

// GET - List all players registered in a league
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { id: leagueId } = await params
    const { searchParams } = new URL(request.url)

    const playingRole = searchParams.get('playingRole')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const skip = (page - 1) * limit

    // Verify league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id')
      .eq('id', leagueId)
      .maybeSingle()

    if (leagueError) {
      throw leagueError
    }

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Build query for league pool players (auction_id is null)
    let query = supabase
      .from('players')
      .select(`
        *,
        tier:tiers!tier_id(id, name, base_price, color),
        linked_user:users!user_id(id, name, email, image)
      `)
      .eq('league_id', leagueId)
      .is('auction_id', null)

    // Build count query
    let countQuery = supabase
      .from('players')
      .select('*', { count: 'exact', head: true })
      .eq('league_id', leagueId)
      .is('auction_id', null)

    if (playingRole) {
      query = query.eq('playing_role', playingRole)
      countQuery = countQuery.eq('playing_role', playingRole)
    }

    if (status) {
      query = query.eq('status', status)
      countQuery = countQuery.eq('status', status)
    }

    if (search) {
      query = query.ilike('name', `%${search}%`)
      countQuery = countQuery.ilike('name', `%${search}%`)
    }

    // Apply sorting and pagination
    query = query.order('name', { ascending: true }).range(skip, skip + limit - 1)

    const [playersResult, countResult] = await Promise.all([
      query,
      countQuery
    ])

    if (playersResult.error) {
      throw playersResult.error
    }

    if (countResult.error) {
      throw countResult.error
    }

    const players = playersResult.data
    const total = countResult.count ?? 0

    return NextResponse.json({
      players,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })

  } catch (error) {
    console.error('Failed to fetch league players:', error)
    return NextResponse.json(
      { error: 'Failed to fetch players' },
      { status: 500 }
    )
  }
}

// POST - Create a new player in the league pool
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()

    const { id: leagueId } = await params
    const body = await request.json()

    // Validate request body
    const validatedData = createPlayerSchema.parse(body)

    // Check if league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id')
      .eq('id', leagueId)
      .maybeSingle()

    if (leagueError) {
      throw leagueError
    }

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Validate tier exists
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

    // Validate userId if provided
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

    // Create the player in the league pool (auction_id is null)
    const insertData: any = {
      name: validatedData.name,
      playing_role: validatedData.playingRole,
      tier_id: validatedData.tierId,
      league_id: leagueId,
      auction_id: null,
    }

    if (validatedData.image) insertData.image = validatedData.image
    if (validatedData.battingStyle) insertData.batting_style = validatedData.battingStyle
    if (validatedData.bowlingStyle) insertData.bowling_style = validatedData.bowlingStyle
    if (validatedData.customTags) insertData.custom_tags = validatedData.customTags
    if (validatedData.userId) insertData.user_id = validatedData.userId

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

    return NextResponse.json({
      success: true,
      player,
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create league player:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues,
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create player',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
