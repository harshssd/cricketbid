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

    // Get the team
    const { data: team } = await supabase
      .from('teams')
      .select('*, captain:users!captain_user_id(id, name, email, image)')
      .eq('id', teamId)
      .maybeSingle()

    if (!team) {
      return NextResponse.json(
        { error: 'Team not found' },
        { status: 404 }
      )
    }

    // Validate captain exists
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

      // For auction teams, check auction participation
      if (team.auction_id) {
        const { data: participation } = await supabase
          .from('auction_participations')
          .select('id')
          .eq('auction_id', team.auction_id)
          .eq('user_id', captainId)
          .maybeSingle()

        if (!participation) {
          return NextResponse.json(
            { error: 'Captain must be an auction participant' },
            { status: 400 }
          )
        }
      }
    }

    // Update team captain
    const { data: updatedTeam, error: updateError } = await supabase
      .from('teams')
      .update({ captain_user_id: captainId })
      .eq('id', teamId)
      .select(`
        *,
        captain:users!captain_user_id(id, name, email, image),
        club:clubs!club_id(id, name),
        league:leagues!league_id(id, name),
        auction:auctions!auction_id(id, name)
      `)
      .single()

    if (updateError) throw updateError

    const result = {
      ...updatedTeam,
      _count: { members: 0 }
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

    // Get team with captain
    const { data: team } = await supabase
      .from('teams')
      .select(`
        *,
        captain:users!captain_user_id(id, name, email, image),
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

    // Get eligible members from auction participations
    let eligibleMembers: Array<{ id: string; name: string; email: string; image: string | null; currentRole: string }> = []

    if (team.auction_id) {
      const { data: auctionParticipants, error: participantsError } = await supabase
        .from('auction_participations')
        .select(`
          *,
          user:users(id, name, email, image)
        `)
        .eq('auction_id', team.auction_id)

      if (participantsError) throw participantsError

      eligibleMembers = (auctionParticipants ?? []).map((participation: any) => ({
        ...participation.user,
        currentRole: participation.user_id === team.captain_user_id ? 'CAPTAIN' as const : 'MEMBER' as const
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
