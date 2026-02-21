import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const createClubTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().optional(),
  maxMembers: z.number().min(1).default(11),
})

const updateClubTeamSchema = createClubTeamSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

// Create a new club team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: clubId } = await params
    const body = await request.json()

    // Validate the request body
    const teamData = createClubTeamSchema.parse(body)

    // Check if club exists
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('id', clubId)
      .maybeSingle()

    if (clubError || !club) {
      return NextResponse.json(
        { error: 'Club not found' },
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
        captain_id: teamData.captainId,
        max_members: teamData.maxMembers || 11,
        club_id: clubId,
      })
      .select('*, captain:users!captain_id(id, name, email, image), members:team_members(id)')
      .single()

    if (createError) {
      throw createError
    }

    // Transform to match expected response shape
    const transformedTeam = {
      ...team,
      primaryColor: team.primary_color,
      secondaryColor: team.secondary_color,
      captainId: team.captain_id,
      maxMembers: team.max_members,
      isActive: team.is_active,
      clubId: team.club_id,
      createdAt: team.created_at,
      _count: { members: team.members?.length ?? 0 },
      members: undefined,
    }

    return NextResponse.json({
      success: true,
      team: transformedTeam
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create club team:', error)

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

// Get all teams for a club
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: clubId } = await params
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    let query = supabase
      .from('teams')
      .select('*, captain:users!captain_id(id, name, email, image), members:team_members(id)')
      .eq('club_id', clubId)
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
      captainId: team.captain_id,
      maxMembers: team.max_members,
      isActive: team.is_active,
      clubId: team.club_id,
      createdAt: team.created_at,
      _count: { members: team.members?.length ?? 0 },
      members: undefined,
    }))

    return NextResponse.json({ teams: transformedTeams })

  } catch (error) {
    console.error('Failed to fetch club teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// Update multiple teams or create/update/delete teams
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: clubId } = await params
    const body = await request.json()
    const { teams } = body

    if (!Array.isArray(teams)) {
      return NextResponse.json(
        { error: 'Teams must be an array' },
        { status: 400 }
      )
    }

    // Validate all teams
    const validatedTeams = teams.map(team => updateClubTeamSchema.parse(team))

    // Check if club exists and get existing teams
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id')
      .eq('id', clubId)
      .maybeSingle()

    if (clubError || !club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      )
    }

    const { data: existingTeams, error: existingTeamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('club_id', clubId)

    if (existingTeamsError) {
      throw existingTeamsError
    }

    const existingTeamIds = (existingTeams || []).map(team => team.id)
    const providedTeamIds = validatedTeams
      .filter(team => team.id)
      .map(team => team.id!)

    // Process updates sequentially (replacing $transaction)
    const updatedTeams = []

    for (const teamData of validatedTeams) {
      const { id, ...updateData } = teamData

      if (id && existingTeamIds.includes(id)) {
        // Update existing team
        const { data: updatedTeam, error: updateError } = await supabase
          .from('teams')
          .update({
            ...(updateData.name !== undefined && { name: updateData.name }),
            ...(updateData.description !== undefined && { description: updateData.description }),
            ...(updateData.primaryColor !== undefined && { primary_color: updateData.primaryColor }),
            ...(updateData.secondaryColor !== undefined && { secondary_color: updateData.secondaryColor }),
            ...(updateData.logo !== undefined && { logo: updateData.logo }),
            ...(updateData.captainId !== undefined && { captain_id: updateData.captainId }),
            ...(updateData.maxMembers !== undefined && { max_members: updateData.maxMembers }),
            ...(updateData.isActive !== undefined && { is_active: updateData.isActive }),
          })
          .eq('id', id)
          .select('*, captain:users!captain_id(id, name, email, image), members:team_members(id)')
          .single()

        if (updateError) {
          throw updateError
        }

        updatedTeams.push({
          ...updatedTeam,
          primaryColor: updatedTeam.primary_color,
          secondaryColor: updatedTeam.secondary_color,
          captainId: updatedTeam.captain_id,
          maxMembers: updatedTeam.max_members,
          isActive: updatedTeam.is_active,
          clubId: updatedTeam.club_id,
          createdAt: updatedTeam.created_at,
          _count: { members: updatedTeam.members?.length ?? 0 },
          members: undefined,
        })
      } else if (!id) {
        // Create new team - ensure required fields are present
        if (!updateData.name) {
          throw new Error('Team name is required when creating a new team')
        }

        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            name: updateData.name,
            description: updateData.description,
            primary_color: updateData.primaryColor || '#3B82F6',
            secondary_color: updateData.secondaryColor || '#1B2A4A',
            logo: updateData.logo,
            captain_id: updateData.captainId,
            max_members: updateData.maxMembers || 11,
            is_active: updateData.isActive ?? true,
            club_id: clubId,
          })
          .select('*, captain:users!captain_id(id, name, email, image), members:team_members(id)')
          .single()

        if (createError) {
          throw createError
        }

        updatedTeams.push({
          ...newTeam,
          primaryColor: newTeam.primary_color,
          secondaryColor: newTeam.secondary_color,
          captainId: newTeam.captain_id,
          maxMembers: newTeam.max_members,
          isActive: newTeam.is_active,
          clubId: newTeam.club_id,
          createdAt: newTeam.created_at,
          _count: { members: newTeam.members?.length ?? 0 },
          members: undefined,
        })
      }
    }

    // Deactivate teams that are no longer in the list (soft delete)
    const teamsToDeactivate = existingTeamIds.filter(id => !providedTeamIds.includes(id))
    if (teamsToDeactivate.length > 0) {
      const { error: deactivateError } = await supabase
        .from('teams')
        .update({ is_active: false })
        .in('id', teamsToDeactivate)

      if (deactivateError) {
        throw deactivateError
      }
    }

    return NextResponse.json({
      success: true,
      teams: updatedTeams
    })

  } catch (error) {
    console.error('Failed to update club teams:', error)

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
