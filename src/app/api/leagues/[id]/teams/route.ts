import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createLeagueTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().optional(),
  maxMembers: z.number().min(1).default(11),
})

const updateLeagueTeamSchema = createLeagueTeamSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

// Create a new league team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: leagueId } = await params
    const body = await request.json()

    // Validate the request body
    const teamData = createLeagueTeamSchema.parse(body)

    // Check if league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id')
      .eq('id', leagueId)
      .maybeSingle()

    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Create the team
    const { data: team, error: createError } = await supabase
      .from('teams')
      .insert({
        name: teamData.name,
        description: teamData.description,
        primary_color: teamData.primaryColor || '#3B82F6',
        secondary_color: teamData.secondaryColor || '#1B2A4A',
        logo: teamData.logo,
        captain_user_id: teamData.captainId,
        max_members: teamData.maxMembers || 11,
        is_active: true,
        league_id: leagueId,
      })
      .select('*, captain:users!captain_user_id(id, name, email, image)')
      .single()

    if (createError) {
      throw createError
    }

    // Transform to match expected response shape
    const transformedTeam = {
      ...team,
      primaryColor: team.primary_color,
      secondaryColor: team.secondary_color,
      captainId: team.captain_user_id,
      maxMembers: team.max_members,
      isActive: team.is_active,
      leagueId: team.league_id,
      createdAt: team.created_at,
      _count: { members: 0 },
    }

    return NextResponse.json({
      success: true,
      team: transformedTeam
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create league team:', error)

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

// Get all teams for a league
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: leagueId } = await params
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('teams')
      .select('*, captain:users!captain_user_id(id, name, email, image)')
      .eq('league_id', leagueId)
      .order('is_active', { ascending: false })
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data: teams, error } = await query

    if (error) {
      throw error
    }

    // Transform to match expected response shape
    const transformedTeams = (teams || []).map(team => ({
      ...team,
      primaryColor: team.primary_color,
      secondaryColor: team.secondary_color,
      captainId: team.captain_user_id,
      maxMembers: team.max_members,
      isActive: team.is_active,
      leagueId: team.league_id,
      createdAt: team.created_at,
      _count: { members: 0 },
    }))

    return NextResponse.json({ teams: transformedTeams })

  } catch (error) {
    console.error('Failed to fetch league teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// Import teams from club
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: leagueId } = await params
    const body = await request.json()
    const { action, clubTeamIds } = body

    if (action !== 'import_from_club' || !Array.isArray(clubTeamIds)) {
      return NextResponse.json(
        { error: 'Invalid action or clubTeamIds' },
        { status: 400 }
      )
    }

    // Check if league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id')
      .eq('id', leagueId)
      .maybeSingle()

    if (leagueError || !league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Get club teams to import
    const { data: clubTeams, error: clubTeamsError } = await supabase
      .from('teams')
      .select('*, captain:users!captain_user_id(id, name, email, image), club:clubs!club_id(name)')
      .in('id', clubTeamIds)
      .eq('is_active', true)
      .not('club_id', 'is', null)

    if (clubTeamsError) {
      throw clubTeamsError
    }

    if (!clubTeams || clubTeams.length === 0) {
      return NextResponse.json(
        { error: 'No valid club teams found' },
        { status: 404 }
      )
    }

    // Import teams sequentially (replacing $transaction)
    const importedTeams = []

    for (const clubTeam of clubTeams) {
      // Check if already imported - skip if team with same name exists in league
      const { data: existingImport } = await supabase
        .from('teams')
        .select('id')
        .eq('league_id', leagueId)
        .eq('name', clubTeam.name)
        .maybeSingle()

      if (existingImport) {
        continue // Skip if already imported
      }

      // Create league team from club team
      const { data: leagueTeam, error: createError } = await supabase
        .from('teams')
        .insert({
          league_id: leagueId,
          name: clubTeam.name,
          description: clubTeam.description,
          primary_color: clubTeam.primary_color,
          secondary_color: clubTeam.secondary_color,
          logo: clubTeam.logo,
          captain_user_id: clubTeam.captain_user_id,
          max_members: clubTeam.max_members,
          is_active: true,
        })
        .select('*, captain:users!captain_user_id(id, name, email, image)')
        .single()

      if (createError) {
        throw createError
      }

      // Transform to match expected response shape
      importedTeams.push({
        ...leagueTeam,
        primaryColor: leagueTeam.primary_color,
        secondaryColor: leagueTeam.secondary_color,
        captainId: leagueTeam.captain_user_id,
        maxMembers: leagueTeam.max_members,
        isActive: leagueTeam.is_active,
        leagueId: leagueTeam.league_id,
        createdAt: leagueTeam.created_at,
        _count: { members: leagueTeam.members?.length ?? 0 },
        members: undefined,
      })
    }

    return NextResponse.json({
      success: true,
      importedTeams,
      message: `Successfully imported ${importedTeams.length} teams from clubs`
    })

  } catch (error) {
    console.error('Failed to import teams:', error)
    return NextResponse.json({
      error: 'Failed to import teams',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
