import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: clubId } = await params
    const supabase = await createClient()

    // Fetch the club
    const { data: club, error: clubError } = await supabase
      .from('clubs')
      .select('id, name, visibility, max_members')
      .eq('id', clubId)
      .maybeSingle()

    if (clubError || !club) {
      return NextResponse.json({ error: 'Club not found' }, { status: 404 })
    }

    // Only public clubs can be joined directly
    if (club.visibility !== 'PUBLIC') {
      return NextResponse.json(
        { error: 'This club requires an invitation to join' },
        { status: 403 }
      )
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from('club_memberships')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Already a member' }, { status: 200 })
    }

    // Check member limit
    const { count } = await supabase
      .from('club_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('club_id', clubId)

    if (club.max_members && count !== null && count >= club.max_members) {
      return NextResponse.json(
        { error: 'This club has reached its member limit' },
        { status: 409 }
      )
    }

    // Insert membership
    const { error: insertError } = await supabase
      .from('club_memberships')
      .insert({
        club_id: clubId,
        user_id: userId,
        role: 'MEMBER',
      })

    if (insertError) {
      throw insertError
    }

    return NextResponse.json(
      { message: 'Successfully joined club', clubName: club.name },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to join club:', error)
    return NextResponse.json(
      { error: 'Failed to join club' },
      { status: 500 }
    )
  }
}
