import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

// Schema for searching players
const searchPlayersSchema = z.object({
  searchQuery: z.string().optional(),
  auctionId: z.string().optional(),
  leagueId: z.string().optional(),
  playingRole: z.enum(['BATSMAN', 'BOWLER', 'ALL_ROUNDER', 'WICKETKEEPER']).optional(),
  status: z.enum(['AVAILABLE', 'SOLD', 'UNSOLD']).optional(),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(['name', 'createdAt']).default('name'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
})

// Get players with search and filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const {
      searchQuery,
      auctionId,
      leagueId,
      playingRole,
      status,
      page,
      limit,
      sortBy,
      sortOrder
    } = searchPlayersSchema.parse({
      searchQuery: searchParams.get('searchQuery'),
      auctionId: searchParams.get('auctionId'),
      leagueId: searchParams.get('leagueId'),
      playingRole: searchParams.get('playingRole'),
      status: searchParams.get('status'),
      page: searchParams.get('page'),
      limit: searchParams.get('limit'),
      sortBy: searchParams.get('sortBy'),
      sortOrder: searchParams.get('sortOrder'),
    })

    // Calculate pagination
    const skip = (page - 1) * limit

    // Build query with relations
    let query = supabase
      .from('players')
      .select(`
        *,
        auction:auctions!auction_id(id, name, status),
        tier:tiers!tier_id(id, name, base_price, color),
        team_players(team:teams(id, name))
      `)

    // Apply filters
    if (auctionId) {
      query = query.eq('auction_id', auctionId)
    }

    if (leagueId) {
      query = query.eq('league_id', leagueId)
    }

    if (playingRole) {
      query = query.eq('playing_role', playingRole)
    }

    if (status) {
      query = query.eq('status', status)
    }

    if (searchQuery) {
      query = query.or(`name.ilike.%${searchQuery}%,custom_tags.ilike.%${searchQuery}%`)
    }

    // Apply sorting
    query = query.order(sortBy === 'createdAt' ? 'created_at' : 'name', { ascending: sortOrder === 'asc' })

    // Apply pagination
    query = query.range(skip, skip + limit - 1)

    // Build count query
    let countQuery = supabase
      .from('players')
      .select('*', { count: 'exact', head: true })

    if (auctionId) {
      countQuery = countQuery.eq('auction_id', auctionId)
    }

    if (leagueId) {
      countQuery = countQuery.eq('league_id', leagueId)
    }

    if (playingRole) {
      countQuery = countQuery.eq('playing_role', playingRole)
    }

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    if (searchQuery) {
      countQuery = countQuery.or(`name.ilike.%${searchQuery}%,custom_tags.ilike.%${searchQuery}%`)
    }

    // Execute both queries in parallel
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

    // Transform team_players → assigned_team for backward compat
    const players = (playersResult.data ?? []).map((p: any) => {
      const { team_players: tp, ...rest } = p
      return { ...rest, assigned_team: tp?.[0]?.team ?? null }
    })
    const totalCount = countResult.count ?? 0

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit)
    const hasNextPage = page < totalPages
    const hasPrevPage = page > 1

    return NextResponse.json({
      success: true,
      players,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage,
        hasPrevPage
      },
      filters: {
        searchQuery,
        auctionId,
        leagueId,
        playingRole,
        status
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    console.error('Failed to search players:', error)
    return NextResponse.json({
      error: 'Failed to search players',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Players are now created through the league players API
export async function POST() {
  return NextResponse.json({
    error: 'Use the league players API to create players',
    message: 'Players are now managed at the league level. Use /api/leagues/{leagueId}/players instead.',
  }, { status: 301 })
}
