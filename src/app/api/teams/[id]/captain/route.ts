import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const assignCaptainSchema = z.object({
  captainId: z.string().optional(),
})

// Assign or update team captain
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId } = await params
    const body = await request.json()
    const { captainId } = assignCaptainSchema.parse(body)

    // Get the team to determine its context
    const { data: team } = await supabase
      .from('teams')
      .select(`
        *,
        members:team_members(
          *,
          user:users(*)
        )
      `)
      .eq('id', teamId)
      .maybeSingle()

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Validate captain exists and is eligible
    if (captainId) {
      const { data: captain } = await supabase
        .from('users')
        .select('id')
        .eq('id', captainId)
        .maybeSingle()

      if (!captain) {
        return NextResponse.json(
          { error: 'Captain not found' },
          { status: 404 }
        )
      }

      // Check if captain is a member of the team
      const isMember = team.members.some((member: { user_id: string }) => member.user_id === captainId)

      // For auction teams, also check auction participation
      if (!isMember && team.auction_id) {
        const { data: participation } = await supabase
          .from('auction_participations')
          .select('id')
          .eq('auction_id', team.auction_id)
          .eq('user_id', captainId)
          .maybeSingle()

        if (!participation) {
          return NextResponse.json(
            { error: 'Captain must be a member of the team or auction participant' },
            { status: 400 }
          )
        }
      } else if (!isMember) {
        return NextResponse.json(
          { error: 'Captain must be a member of the team' },
          { status: 400 }
        )
      }
    }

    // Update team captain (replacing $transaction with sequential calls)
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({ captain_id: captainId })
      .eq('id', teamId)
      .select(`
        *,
        captain:users!captain_id(id, name, email, image),
        club:clubs!club_id(id, name),
        league:leagues!league_id(id, name),
        auction:auctions!auction_id(id, name),
        team_members(id)
      `)
      .single()

    if (updateError) throw updateError

    // Update member roles
    if (team.members.length > 0) {
      // Reset all members to MEMBER role
      const { error: resetError } = await supabase
        .from('team_members')
        .update({ role: 'MEMBER' })
        .eq('team_id', teamId)

      if (resetError) throw resetError

      // Set new captain role if captain is assigned
      if (captainId) {
        const { error: captainRoleError } = await supabase
          .from('team_members')
          .update({ role: 'CAPTAIN' })
          .eq('team_id', teamId)
          .eq('user_id', captainId)

        if (captainRoleError) throw captainRoleError
      }
    }

    // Transform to match expected shape with _count
    const { team_members, ...rest } = updatedTeam
    const result = {
      ...rest,
      _count: { members: team_members?.length ?? 0 }
    }

    return NextResponse.json({
      success: true,
      team: result,
      message: captainId ? 'Captain assigned successfully' : 'Captain removed successfully'
    })

  } catch (error) {
    console.error('Failed to assign captain:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to assign captain',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get captain assignment options
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id: teamId } = await params

    // Get team with its members
    const { data: team } = await supabase
      .from('teams')
      .select(`
        *,
        captain:users!captain_id(id, name, email, image),
        members:team_members(
          *,
          user:users(id, name, email, image)
        ),
        club:clubs!club_id(id, name),
        league:leagues!league_id(id, name),
        auction:auctions!auction_id(id, name)
      `)
      .eq('id', teamId)
      .maybeSingle()

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Get eligible members
    let eligibleMembers = team.members.map((member: { user: { id: string; name: string; email: string; image: string }; role: string }) => ({
      ...member.user,
      currentRole: member.role
    }))

    // For auction teams, also include auction participants
    if (team.auction_id && team.members.length === 0) {
      const { data: auctionParticipants, error: participantsError } = await supabase
        .from('auction_participations')
        .select(`
          *,
          user:users(id, name, email, image)
        `)
        .eq('auction_id', team.auction_id)

      if (participantsError) throw participantsError

      eligibleMembers = (auctionParticipants ?? []).map((participation: { user: { id: string; name: string; email: string; image: string }; user_id: string }) => ({
        ...participation.user,
        currentRole: participation.user_id === team.captain_id ? 'CAPTAIN' as const : 'MEMBER' as const
      }))
    }

    const teamType = team.club_id ? 'CLUB' :
                    team.league_id ? 'LEAGUE' :
                    team.auction_id ? 'AUCTION' : 'UNKNOWN'

    return NextResponse.json({
      success: true,
      eligibleMembers,
      currentCaptain: team.captain,
      teamInfo: {
        id: team.id,
        name: team.name,
        type: teamType,
        context: team.club || team.league || team.auction
      }
    })

  } catch (error) {
    console.error('Failed to get captain options:', error)
    return NextResponse.json(
      { error: 'Failed to get captain options' },
      { status: 500 }
    )
  }
}
