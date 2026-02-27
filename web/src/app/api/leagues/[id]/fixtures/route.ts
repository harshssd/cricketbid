import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createFixtureSchema } from '@/lib/validations/tournament'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// GET /api/leagues/[id]/fixtures - List fixtures for a tournament
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const supabase = await createClient()

    const { data: fixtures, error } = await supabase
      .from('fixtures')
      .select('*')
      .eq('league_id', leagueId)
      .order('match_number', { ascending: true })

    if (error) throw error

    return NextResponse.json({ fixtures: fixtures || [] })
  } catch (error) {
    console.error('Failed to fetch fixtures:', error)
    return NextResponse.json({ error: 'Failed to fetch fixtures' }, { status: 500 })
  }
}

// POST /api/leagues/[id]/fixtures - Create a fixture
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: leagueId } = await params
    const body = await request.json()
    const validated = createFixtureSchema.parse(body)

    const supabase = await createClient()

    // Verify user is the league owner
    const { data: league } = await supabase
      .from('leagues')
      .select('owner_id')
      .eq('id', leagueId)
      .maybeSingle()

    if (!league) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }
    if (league.owner_id !== userId) {
      return NextResponse.json({ error: 'Only tournament owners can create fixtures' }, { status: 403 })
    }

    const { data: fixture, error } = await supabase
      .from('fixtures')
      .insert({
        league_id: leagueId,
        match_number: validated.matchNumber,
        team_a_name: validated.teamAName,
        team_b_name: validated.teamBName,
        team_a_id: validated.teamAId,
        team_b_id: validated.teamBId,
        venue: validated.venue,
        scheduled_at: validated.scheduledAt,
        notes: validated.notes,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ fixture }, { status: 201 })
  } catch (error) {
    console.error('Failed to create fixture:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create fixture' }, { status: 500 })
  }
}
