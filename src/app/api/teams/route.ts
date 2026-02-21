import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().optional(),
  maxMembers: z.number().min(1).default(11),

  // Context association - exactly one must be provided
  clubId: z.string().optional(),
  leagueId: z.string().optional(),
  auctionId: z.string().optional(),

  // Auction-specific fields
  budgetRemaining: z.number().optional(),
})

const updateTeamSchema = createTeamSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

// Create a new team
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const teamData = createTeamSchema.parse(body)

    // Validate that exactly one context is provided
    const contexts = [teamData.clubId, teamData.leagueId, teamData.auctionId].filter(Boolean)
    if (contexts.length !== 1) {
      return NextResponse.json(
        { error: 'Exactly one of clubId, leagueId, or auctionId must be provided' },
        { status: 400 }
      )
    }

    // Validate context exists
    if (teamData.clubId) {
      const { data: club } = await supabase
        .from('clubs')
        .select('id')
        .eq('id', teamData.clubId)
        .maybeSingle()
      if (!club) {
        return NextResponse.json(
          { error: 'Club not found' },
          { status: 404 }
        )
      }
    } else if (teamData.leagueId) {
      const { data: league } = await supabase
        .from('leagues')
        .select('id')
        .eq('id', teamData.leagueId)
        .maybeSingle()
      if (!league) {
        return NextResponse.json(
          { error: 'League not found' },
          { status: 404 }
        )
      }
    } else if (teamData.auctionId) {
      const { data: auction } = await supabase
        .from('auctions')
        .select('id')
        .eq('id', teamData.auctionId)
        .maybeSingle()
      if (!auction) {
        return NextResponse.json(
          { error: 'Auction not found' },
          { status: 404 }
        )
      }
    }

    // Validate captain if provided
    if (teamData.captainId) {
      const { data: captain } = await supabase
        .from('users')
        .select('id')
        .eq('id', teamData.captainId)
        .maybeSingle()
      if (!captain) {
        return NextResponse.json(
          { error: 'Captain not found' },
          { status: 404 }
        )
      }
    }

    // Create the team
    const { data: team, error: createError } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        description: teamData.description,
        primary_color: teamData.primaryColor,
        secondary_color: teamData.secondaryColor,
        logo: teamData.logo,
        captain_id: teamData.captainId,
        max_members: teamData.maxMembers,
        club_id: teamData.clubId,
        league_id: teamData.leagueId,
        auction_id: teamData.auctionId,
        budget_remaining: teamData.budgetRemaining,
      })
      .select(`
        *,
        captain:users!captain_id(id, name, email, image),
        club:clubs!club_id(id, name, logo),
        league:leagues!league_id(id, name, logo),
        auction:auctions!auction_id(id, name),
        team_members(id)
      `)
      .single()

    if (createError) throw createError

    // Transform to match expected shape
    const { team_members, ...rest } = team
    const result = {
      ...rest,
      _count: { members: team_members?.length ?? 0 }
    }

    return NextResponse.json({
      success: true,
      team: result
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create team:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get teams with optional filtering
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const clubId = searchParams.get('clubId')
    const leagueId = searchParams.get('leagueId')
    const auctionId = searchParams.get('auctionId')
    const includeInactive = searchParams.get('includeInactive') === 'true'

    // Build query
    let query = supabase
      .from('teams')
      .select(`
        *,
        captain:users!captain_id(id, name, email, image),
        club:clubs!club_id(id, name, logo),
        league:leagues!league_id(id, name, logo),
        auction:auctions!auction_id(id, name),
        team_members(id)
      `)

    if (clubId) query = query.eq('club_id', clubId)
    if (leagueId) query = query.eq('league_id', leagueId)
    if (auctionId) query = query.eq('auction_id', auctionId)
    if (!includeInactive) query = query.eq('is_active', true)

    query = query.order('is_active', { ascending: false }).order('created_at', { ascending: false })

    const { data: teamsRaw, error } = await query

    if (error) throw error

    // Transform to match expected shape with _count
    const teams = (teamsRaw ?? []).map(({ team_members, ...rest }) => ({
      ...rest,
      _count: { members: team_members?.length ?? 0 }
    }))

    return NextResponse.json({ teams })

  } catch (error) {
    console.error('Failed to fetch teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// Update multiple teams
export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()
    const { teams } = body

    if (!Array.isArray(teams)) {
      return NextResponse.json(
        { error: 'Teams must be an array' },
        { status: 400 }
      )
    }

    // Validate all teams
    const validatedTeams = teams.map(team => updateTeamSchema.parse(team))

    // Process updates sequentially (replacing $transaction)
    const updatedTeams = []

    for (const teamData of validatedTeams) {
      const { id, ...updateData } = teamData

      const snakeCaseData: Record<string, unknown> = {}
      if (updateData.name !== undefined) snakeCaseData.name = updateData.name
      if (updateData.description !== undefined) snakeCaseData.description = updateData.description
      if (updateData.primaryColor !== undefined) snakeCaseData.primary_color = updateData.primaryColor
      if (updateData.secondaryColor !== undefined) snakeCaseData.secondary_color = updateData.secondaryColor
      if (updateData.logo !== undefined) snakeCaseData.logo = updateData.logo
      if (updateData.captainId !== undefined) snakeCaseData.captain_id = updateData.captainId
      if (updateData.maxMembers !== undefined) snakeCaseData.max_members = updateData.maxMembers
      if (updateData.clubId !== undefined) snakeCaseData.club_id = updateData.clubId
      if (updateData.leagueId !== undefined) snakeCaseData.league_id = updateData.leagueId
      if (updateData.auctionId !== undefined) snakeCaseData.auction_id = updateData.auctionId
      if (updateData.budgetRemaining !== undefined) snakeCaseData.budget_remaining = updateData.budgetRemaining
      if (updateData.isActive !== undefined) snakeCaseData.is_active = updateData.isActive

      const { data: updatedTeam, error: updateError } = await supabase
        .from('teams')
        .update(snakeCaseData)
        .eq('id', id)
        .select(`
          *,
          captain:users!captain_id(id, name, email, image),
          club:clubs!club_id(id, name, logo),
          league:leagues!league_id(id, name, logo),
          auction:auctions!auction_id(id, name),
          team_members(id)
        `)
        .single()

      if (updateError) throw updateError

      const { team_members, ...rest } = updatedTeam
      updatedTeams.push({
        ...rest,
        _count: { members: team_members?.length ?? 0 }
      })
    }

    return NextResponse.json({
      success: true,
      teams: updatedTeams
    })

  } catch (error) {
    console.error('Failed to update teams:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to update teams',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
