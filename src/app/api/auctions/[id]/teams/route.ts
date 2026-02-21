import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string }>
}

const updateTeamsSchema = z.array(z.object({
  id: z.string().optional(), // Optional for new teams
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().nullable().optional(),
  budgetRemaining: z.number().optional(),
}))

export async function PUT(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params
    const body = await request.json()

    // Validate the request body
    const teams = updateTeamsSchema.parse(body.teams || body)

    // Check if auction exists and is editable
    const { data: auction } = await supabase
      .from('auctions')
      .select('*, teams:teams(*)')
      .eq('id', auctionId)
      .maybeSingle()

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    if (auction.status !== 'DRAFT' && auction.status !== 'LOBBY') {
      return NextResponse.json(
        { error: 'Cannot modify teams - auction must be in DRAFT or LOBBY status' },
        { status: 400 }
      )
    }

    // Get existing team IDs
    const existingTeamIds = (auction.teams || []).map((team: { id: string }) => team.id)

    // Process team updates/creations
    const updatedTeams = []
    const providedTeamIds = teams
      .filter(team => team.id)
      .map(team => team.id!)

    const selectQuery = `
      *,
      captain:users!captain_id(id, name, email, image),
      players(id, name, playing_role),
      team_members(id)
    `

    // Update or create teams sequentially (replacing $transaction)
    for (const teamData of teams) {
      if (teamData.id && existingTeamIds.includes(teamData.id)) {
        // Update existing team
        const updateData: Record<string, unknown> = {
          name: teamData.name,
          description: teamData.description,
          primary_color: teamData.primaryColor,
          secondary_color: teamData.secondaryColor,
          logo: teamData.logo,
        }
        if (teamData.captainId !== undefined) {
          updateData.captain_id = teamData.captainId
        }
        if (teamData.budgetRemaining !== undefined) {
          updateData.budget_remaining = teamData.budgetRemaining
        }

        const { data: updatedTeam, error: updateError } = await supabase
          .from('teams')
          .update(updateData)
          .eq('id', teamData.id)
          .select(selectQuery)
          .single()

        if (updateError) throw updateError

        const { players: playersRaw, team_members, ...rest } = updatedTeam
        updatedTeams.push({
          ...rest,
          players: playersRaw ?? [],
          _count: {
            players: playersRaw?.length ?? 0,
            members: team_members?.length ?? 0
          }
        })
      } else {
        // Create new team
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            auction_id: auctionId,
            name: teamData.name,
            description: teamData.description,
            primary_color: teamData.primaryColor,
            secondary_color: teamData.secondaryColor,
            logo: teamData.logo,
            captain_id: teamData.captainId || undefined,
            budget_remaining: teamData.budgetRemaining || auction.budget_per_team,
          })
          .select(selectQuery)
          .single()

        if (createError) throw createError

        const { players: playersRaw, team_members, ...rest } = newTeam
        updatedTeams.push({
          ...rest,
          players: playersRaw ?? [],
          _count: {
            players: playersRaw?.length ?? 0,
            members: team_members?.length ?? 0
          }
        })
      }
    }

    // Delete teams that are no longer in the list
    const teamsToDelete = existingTeamIds.filter((id: string) => !providedTeamIds.includes(id))
    if (teamsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('teams')
        .delete()
        .in('id', teamsToDelete)
        .eq('auction_id', auctionId)

      if (deleteError) throw deleteError
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

// Get teams for an auction
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const supabase = await createClient()
    const { id: auctionId } = await params

    const { data: auction } = await supabase
      .from('auctions')
      .select('status, budget_per_team')
      .eq('id', auctionId)
      .maybeSingle()

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const { data: teamsRaw, error } = await supabase
      .from('teams')
      .select(`
        *,
        captain:users!captain_id(id, name, email, image),
        players(
          id,
          name,
          image,
          playing_role,
          tier_id,
          status,
          tier:tiers!tier_id(name, color)
        ),
        team_members(id),
        auction_participations(id)
      `)
      .eq('auction_id', auctionId)
      .order('name', { ascending: true })

    if (error) throw error

    // Transform to match expected shape with _count
    const teams = (teamsRaw ?? []).map(({ team_members, auction_participations, ...rest }) => ({
      ...rest,
      _count: {
        players: rest.players?.length ?? 0,
        members: team_members?.length ?? 0,
        participations: auction_participations?.length ?? 0
      }
    }))

    return NextResponse.json({
      teams,
      auctionStatus: auction.status,
      budgetPerTeam: auction.budget_per_team
    })

  } catch (error) {
    console.error('Failed to fetch teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}
