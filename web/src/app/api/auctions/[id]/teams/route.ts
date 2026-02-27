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
  captainPlayerId: z.string().nullable().optional(),
  budgetRemaining: z.number().optional(),
}))

// Shared select query — excludes captain_player FK join (PostgREST schema cache
// doesn't reliably resolve it). We resolve captain_player manually afterwards.
const teamSelectQuery = `
  *,
  captain:users!teams_captain_user_id_fkey(id, name, email, image),
  auction_results(player:players(id, name, playing_role))
`

// Resolve captain_player for an array of teams by looking up from the players table
async function resolveCaptainPlayers(
  supabase: Awaited<ReturnType<typeof createClient>>,
  teams: any[]
): Promise<any[]> {
  const captainPlayerIds = teams
    .map(t => t.captain_player_id)
    .filter(Boolean)

  if (captainPlayerIds.length === 0) return teams

  const { data: captainPlayers } = await supabase
    .from('players')
    .select('id, name, image, playing_role')
    .in('id', captainPlayerIds)

  const captainMap = new Map(
    (captainPlayers ?? []).map(p => [p.id, p])
  )

  return teams.map(team => ({
    ...team,
    captain_player: team.captain_player_id
      ? captainMap.get(team.captain_player_id) ?? null
      : null,
  }))
}

// Transform a raw Supabase team row (with resolved captain_player and unwrapped
// auction_results) into the camelCase shape the frontend expects.
function transformTeam(raw: any, players: any[], participationCount?: number) {
  return {
    id: raw.id,
    auctionId: raw.auction_id,
    name: raw.name,
    description: raw.description,
    captainId: raw.captain_user_id,
    captainPlayerId: raw.captain_player_id,
    // budgetRemaining is computed from team_budgets view when needed
    captain: raw.captain,
    captainPlayer: raw.captain_player ? {
      id: raw.captain_player.id,
      name: raw.captain_player.name,
      image: raw.captain_player.image,
      playingRole: raw.captain_player.playing_role,
    } : null,
    players,
    _count: {
      players: players.length,
      ...(participationCount !== undefined && { participations: participationCount }),
    },
  }
}

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

    // Update or create teams sequentially (replacing $transaction)
    for (const teamData of teams) {
      if (teamData.id && existingTeamIds.includes(teamData.id)) {
        // Update existing team
        const updateData: Record<string, unknown> = {
          name: teamData.name,
          description: teamData.description,
        }
        if (teamData.captainId !== undefined) {
          updateData.captain_user_id = teamData.captainId
        }
        if (teamData.captainPlayerId !== undefined) {
          updateData.captain_player_id = teamData.captainPlayerId
        }
        if (teamData.budgetRemaining !== undefined) {
          // budget_remaining is now computed from team_budgets view
        }

        const { data: updatedTeam, error: updateError } = await supabase
          .from('teams')
          .update(updateData)
          .eq('id', teamData.id)
          .select(teamSelectQuery)
          .single()

        if (updateError) throw updateError

        const { auction_results: ar, ...rest } = updatedTeam
        const players = (ar ?? []).map((r: any) => r.player).filter(Boolean)
        updatedTeams.push(transformTeam(rest, players))
      } else {
        // Create new team
        const { data: newTeam, error: createError } = await supabase
          .from('teams')
          .insert({
            auction_id: auctionId,
            name: teamData.name,
            description: teamData.description,
            captain_user_id: teamData.captainId || undefined,
            captain_player_id: teamData.captainPlayerId || undefined,
            // budget_remaining is computed from team_budgets view
          })
          .select(teamSelectQuery)
          .single()

        if (createError) throw createError

        const { auction_results: ar, ...rest } = newTeam
        const players = (ar ?? []).map((r: any) => r.player).filter(Boolean)
        updatedTeams.push(transformTeam(rest, players))
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

    // Resolve captain_player manually
    const teamsWithCaptains = await resolveCaptainPlayers(supabase, updatedTeams)

    return NextResponse.json({
      success: true,
      teams: teamsWithCaptains
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
        captain:users!teams_captain_user_id_fkey(id, name, email, image),
        auction_results(
          player:players(
            id,
            name,
            image,
            playing_role,
            tier_id,
            tier:tiers!tier_id(name, color)
          )
        ),
        auction_participations(id)
      `)
      .eq('auction_id', auctionId)
      .order('name', { ascending: true })

    if (error) throw error

    // Resolve captain_player manually (FK join unreliable in PostgREST schema cache)
    const teamsWithCaptains = await resolveCaptainPlayers(supabase, teamsRaw ?? [])

    // Transform to camelCase shape with _count
    const teams = teamsWithCaptains.map(({ auction_results: ar, auction_participations, ...rest }) => {
      const players = (ar ?? []).map((r: any) => r.player).filter(Boolean)
      return transformTeam(rest, players, auction_participations?.length ?? 0)
    })

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
