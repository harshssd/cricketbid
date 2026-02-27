import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const visibility = searchParams.get('visibility')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const skip = (page - 1) * limit

    // Build the query with embedded relations for owner, league, and IDs for counting
    let query = supabase
      .from('auctions')
      .select(`
        *,
        owner:users!owner_id(id, name, email, image),
        league:leagues!league_id(id, name),
        teams(id),
        players(id),
        auction_participations(id)
      `)

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status.toUpperCase())
    }

    if (visibility && visibility !== 'all') {
      query = query.eq('visibility', visibility.toUpperCase())
    }

    // Apply ordering and pagination
    query = query
      .order('status', { ascending: true })
      .order('created_at', { ascending: true })
      .range(skip, skip + limit - 1)

    const { data: auctions, error } = await query

    if (error) throw error

    // Build count query with same filters
    let countQuery = supabase
      .from('auctions')
      .select('*', { count: 'exact', head: true })

    if (status && status !== 'all') {
      countQuery = countQuery.eq('status', status.toUpperCase())
    }

    if (visibility && visibility !== 'all') {
      countQuery = countQuery.eq('visibility', visibility.toUpperCase())
    }

    const { count: totalCount, error: countError } = await countQuery

    if (countError) throw countError

    const total = totalCount ?? 0

    const transformedAuctions = (auctions ?? []).map((auction: any) => ({
      id: auction.id,
      name: auction.name,
      description: auction.description,
      status: auction.status,
      visibility: auction.visibility,
      budgetPerTeam: auction.budget_per_team,
      currencyName: auction.currency_name,
      currencyIcon: auction.currency_icon,
      squadSize: auction.squad_size,
      teamCount: auction.teams?.length ?? 0,
      playerCount: auction.players?.length ?? 0,
      participantCount: auction.auction_participations?.length ?? 0,
      owner: auction.owner,
      league: auction.league,
    }))

    return NextResponse.json({
      auctions: transformedAuctions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    })

  } catch (error) {
    console.error('Failed to fetch auctions:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch auctions',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
