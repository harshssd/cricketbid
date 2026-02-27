import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { updateFixtureSchema } from '@/lib/validations/tournament'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; fixtureId: string }>
}

// PUT /api/leagues/[id]/fixtures/[fixtureId] - Update a fixture
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: leagueId, fixtureId } = await params
    const body = await request.json()
    const validated = updateFixtureSchema.parse(body)

    const supabase = await createClient()

    // Verify ownership
    const { data: league } = await supabase
      .from('leagues')
      .select('owner_id')
      .eq('id', leagueId)
      .maybeSingle()

    if (!league || league.owner_id !== userId) {
      return NextResponse.json({ error: 'Only tournament owners can update fixtures' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}
    if (validated.matchNumber !== undefined) updateData.match_number = validated.matchNumber
    if (validated.teamAName !== undefined) updateData.team_a_name = validated.teamAName
    if (validated.teamBName !== undefined) updateData.team_b_name = validated.teamBName
    if (validated.teamAId !== undefined) updateData.team_a_id = validated.teamAId
    if (validated.teamBId !== undefined) updateData.team_b_id = validated.teamBId
    if (validated.venue !== undefined) updateData.venue = validated.venue
    if (validated.scheduledAt !== undefined) updateData.scheduled_at = validated.scheduledAt
    if (validated.result !== undefined) updateData.result = validated.result
    if (validated.winner !== undefined) updateData.winner = validated.winner
    if (validated.notes !== undefined) updateData.notes = validated.notes

    const { data: fixture, error } = await supabase
      .from('fixtures')
      .update(updateData)
      .eq('id', fixtureId)
      .eq('league_id', leagueId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ fixture })
  } catch (error) {
    console.error('Failed to update fixture:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update fixture' }, { status: 500 })
  }
}

// DELETE /api/leagues/[id]/fixtures/[fixtureId] - Delete a fixture
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: leagueId, fixtureId } = await params
    const supabase = await createClient()

    const { data: league } = await supabase
      .from('leagues')
      .select('owner_id')
      .eq('id', leagueId)
      .maybeSingle()

    if (!league || league.owner_id !== userId) {
      return NextResponse.json({ error: 'Only tournament owners can delete fixtures' }, { status: 403 })
    }

    const { error } = await supabase
      .from('fixtures')
      .delete()
      .eq('id', fixtureId)
      .eq('league_id', leagueId)

    if (error) throw error

    return NextResponse.json({ message: 'Fixture deleted' })
  } catch (error) {
    console.error('Failed to delete fixture:', error)
    return NextResponse.json({ error: 'Failed to delete fixture' }, { status: 500 })
  }
}
