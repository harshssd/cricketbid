import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, verifyTeamAdminAccess } from '@/lib/auth'

/**
 * Test endpoint to demonstrate team admin authentication
 * Usage: POST /api/test-captain-auth
 * Body: { sessionId: "auctionId-teamId" }
 *
 * Tests multi-admin access: team captain, team members with admin roles, auction admins
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { sessionId } = body

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      )
    }

    // Parse session ID
    const [auctionId, teamId] = sessionId.split('-')
    if (!auctionId || !teamId) {
      return NextResponse.json(
        { error: 'Invalid session ID format. Expected: auctionId-teamId' },
        { status: 400 }
      )
    }

    // Get authenticated user
    const { userId, userEmail } = getAuthenticatedUser(request)

    if (!userId || !userEmail) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Verify team admin access
    const authResult = await verifyTeamAdminAccess(userId, userEmail, teamId, auctionId)

    if (!authResult.success) {
      return NextResponse.json(
        {
          error: authResult.error,
          details: authResult.details,
          currentUser: authResult.currentUser,
          expectedCaptain: authResult.expectedCaptain
        },
        { status: authResult.statusCode || 403 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Captain authentication verified successfully',
      sessionId,
      authenticatedUser: userEmail,
      accessGranted: true
    })

  } catch (error) {
    console.error('Captain auth test failed:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Captain Authentication Test Endpoint',
    usage: 'POST /api/test-captain-auth with body: { sessionId: "auctionId-teamId" }',
    description: 'Tests the captain authentication system for the given session ID'
  })
}