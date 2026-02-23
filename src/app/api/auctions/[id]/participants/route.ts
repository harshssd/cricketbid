import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

const addParticipantsSchema = z.object({
  participants: z.array(z.object({
    name: z.string().min(1),
    email: z.string().email(),
    role: z.enum(['CAPTAIN', 'MODERATOR', 'VIEWER']).default('CAPTAIN'),
    teamId: z.string().optional(),
  })).min(1, 'At least one participant is required'),
  skipExisting: z.boolean().default(true),
})

// GET - List participants
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const supabase = await createClient()

    const { data: participations, error } = await supabase
      .from('auction_participations')
      .select(`
        *,
        user:users!user_id(id, name, email, image),
        team:teams!team_id(id, name)
      `)
      .eq('auction_id', auctionId)
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true })

    if (error) {
      throw error
    }

    // Transform to camelCase for the consumer
    const transformedParticipations = (participations || []).map((p: any) => ({
      id: p.id,
      auctionId: p.auction_id,
      userId: p.user_id,
      teamId: p.team_id,
      role: p.role,
      joinedAt: p.joined_at,
      user: p.user,
      team: p.team ? {
        id: p.team.id,
        name: p.team.name,
      } : null,
    }))

    return NextResponse.json({
      participations: transformedParticipations,
      stats: {
        total: transformedParticipations.length,
        owners: transformedParticipations.filter((p: any) => p.role === 'OWNER').length,
        moderators: transformedParticipations.filter((p: any) => p.role === 'MODERATOR').length,
        captains: transformedParticipations.filter((p: any) => p.role === 'CAPTAIN').length,
        viewers: transformedParticipations.filter((p: any) => p.role === 'VIEWER').length,
      }
    })
  } catch (error) {
    console.error('Failed to fetch participants:', error)
    return NextResponse.json(
      { error: 'Failed to fetch participants' },
      { status: 500 }
    )
  }
}

// POST - Add participants (from CSV upload or manual add)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const { id: auctionId } = await params
    const body = await request.json()
    const { participants, skipExisting } = addParticipantsSchema.parse(body)
    const supabase = await createClient()

    // Verify auction exists
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id')
      .eq('id', auctionId)
      .maybeSingle()

    if (auctionError) {
      throw auctionError
    }

    if (!auction) {
      return NextResponse.json(
        { error: 'Auction not found' },
        { status: 404 }
      )
    }

    const results = {
      added: 0,
      skipped: 0,
      created: 0,
      errors: [] as string[],
      details: [] as { name: string; email: string; status: string }[],
    }

    for (const participant of participants) {
      try {
        // Find user by email
        const { data: existingUser, error: findError } = await supabase
          .from('users')
          .select('id, name, email')
          .eq('email', participant.email)
          .maybeSingle()

        if (findError) {
          throw findError
        }

        let user = existingUser

        if (!user) {
          // Create new user
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
              name: participant.name,
              email: participant.email,
            })
            .select('id, name, email')
            .single()

          if (createError) {
            throw createError
          }

          user = newUser
          results.created++
        }

        // Check if already a participant
        const { data: existing, error: checkError } = await supabase
          .from('auction_participations')
          .select('*')
          .eq('auction_id', auctionId)
          .eq('user_id', user.id)
          .maybeSingle()

        if (checkError) {
          throw checkError
        }

        if (existing) {
          if (skipExisting) {
            results.skipped++
            results.details.push({
              name: participant.name,
              email: participant.email,
              status: `Skipped (already ${existing.role})`
            })
            continue
          }
          const { error: updateError } = await supabase
            .from('auction_participations')
            .update({
              role: participant.role,
              team_id: participant.teamId || existing.team_id,
            })
            .eq('id', existing.id)

          if (updateError) {
            throw updateError
          }

          results.added++
          results.details.push({
            name: participant.name,
            email: participant.email,
            status: `Updated to ${participant.role}`
          })
          continue
        }

        // Create new participation
        const { error: insertError } = await supabase
          .from('auction_participations')
          .insert({
            auction_id: auctionId,
            user_id: user.id,
            role: participant.role,
            team_id: participant.teamId || null,
          })

        if (insertError) {
          throw insertError
        }

        results.added++
        results.details.push({
          name: participant.name,
          email: participant.email,
          status: `Added as ${participant.role}`
        })

      } catch (err) {
        const msg = `Failed to add ${participant.name} (${participant.email}): ${err instanceof Error ? err.message : 'Unknown error'}`
        results.errors.push(msg)
        results.details.push({
          name: participant.name,
          email: participant.email,
          status: 'Error'
        })
      }
    }

    return NextResponse.json({
      success: true,
      message: `Added ${results.added} participant(s)${results.skipped > 0 ? `, skipped ${results.skipped} existing` : ''}${results.created > 0 ? `, created ${results.created} new user(s)` : ''}`,
      results,
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid data', details: error.issues },
        { status: 400 }
      )
    }
    console.error('Failed to add participants:', error)
    return NextResponse.json(
      { error: 'Failed to add participants' },
      { status: 500 }
    )
  }
}
