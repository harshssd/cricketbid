import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest, getUserAuctionPermissions } from '@/lib/auth'

export async function withAuth(
  request: NextRequest,
  handler: (request: NextRequest, user: any) => Promise<NextResponse>,
  options: { required?: boolean } = { required: true }
) {
  const user = await getUserFromRequest(request)

  if (options.required && !user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  return handler(request, user)
}

export async function withAuctionAccess(
  request: NextRequest,
  auctionId: string,
  handler: (request: NextRequest, user: any, permissions: any) => Promise<NextResponse>,
  requiredPermission: 'canView' | 'canJoin' | 'canModerate' | 'canManage' = 'canView'
) {
  const user = await getUserFromRequest(request)

  if (!user) {
    return NextResponse.json(
      { error: 'Authentication required' },
      { status: 401 }
    )
  }

  const permissions = await getUserAuctionPermissions(user.id, auctionId)

  if (!permissions[requiredPermission]) {
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    )
  }

  return handler(request, user, permissions)
}