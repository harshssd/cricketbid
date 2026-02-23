import { ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock } from 'lucide-react'
import { OrganizationRole } from '@/lib/types'

interface PermissionGateProps {
  userRole: OrganizationRole | null | undefined
  requiredRole?: OrganizationRole
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean
  errorMessage?: string
}

/**
 * PermissionGate component that conditionally renders children based on user role.
 * With the simplified role model (OWNER | MEMBER), access is granted if the user's
 * role matches or exceeds the required role (OWNER > MEMBER).
 */
export function PermissionGate({
  userRole,
  requiredRole,
  children,
  fallback = null,
  showError = false,
  errorMessage = "You don't have permission to view this content."
}: PermissionGateProps) {
  const hasAccess = checkAccess(userRole, requiredRole)

  if (hasAccess) {
    return <>{children}</>
  }

  if (showError) {
    return (
      <Alert variant="destructive">
        <Lock className="h-4 w-4" />
        <AlertDescription>{errorMessage}</AlertDescription>
      </Alert>
    )
  }

  return <>{fallback}</>
}

interface PermissionButtonProps {
  userRole: OrganizationRole | null | undefined
  requiredRole?: OrganizationRole
  children: ReactNode
  fallback?: ReactNode
  disabledTooltip?: string
}

/**
 * PermissionButton that shows/hides buttons based on role
 */
export function PermissionButton({
  userRole,
  requiredRole,
  children,
  fallback = null,
  disabledTooltip = "You don't have permission to perform this action."
}: PermissionButtonProps) {
  const hasAccess = checkAccess(userRole, requiredRole)

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoleBasedRenderProps {
  userRole: OrganizationRole | null | undefined
  ownerContent?: ReactNode
  memberContent?: ReactNode
  fallback?: ReactNode
}

/**
 * RoleBasedRender component that renders different content based on user role
 */
export function RoleBasedRender({
  userRole,
  ownerContent,
  memberContent,
  fallback = null
}: RoleBasedRenderProps) {
  switch (userRole) {
    case 'OWNER':
      return <>{ownerContent || memberContent || fallback}</>
    case 'MEMBER':
      return <>{memberContent || fallback}</>
    default:
      return <>{fallback}</>
  }
}

interface PermissionAlertProps {
  userRole: OrganizationRole | null | undefined
  requiredRole: OrganizationRole
  action: string
  className?: string
}

/**
 * PermissionAlert that shows an informative message about required permissions
 */
export function PermissionAlert({
  userRole,
  requiredRole,
  action,
  className
}: PermissionAlertProps) {
  return (
    <Alert className={`text-muted-foreground bg-muted border-border ${className}`}>
      <Shield className="h-4 w-4" />
      <AlertDescription>
        <span className="font-medium">{requiredRole} role required</span> to {action}.
        {userRole && (
          <span className="block text-sm mt-1">
            Your current role: <span className="font-medium">{userRole}</span>
          </span>
        )}
      </AlertDescription>
    </Alert>
  )
}

// Helper to check if a user role meets the required role
function checkAccess(
  userRole: OrganizationRole | null | undefined,
  requiredRole?: OrganizationRole
): boolean {
  // If no required role specified, allow access
  if (!requiredRole) return true
  // If user has no role, deny access
  if (!userRole) return false
  // OWNER has access to everything
  if (userRole === 'OWNER') return true
  // MEMBER only has access if the required role is MEMBER
  return userRole === requiredRole
}

// Export commonly used permission checks as utility components
export const OwnerOnly = ({ userRole, children, fallback }: {
  userRole: OrganizationRole | null | undefined
  children: ReactNode
  fallback?: ReactNode
}) => (
  <PermissionGate
    userRole={userRole}
    requiredRole="OWNER"
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)

export const MemberOrAbove = ({ userRole, children, fallback }: {
  userRole: OrganizationRole | null | undefined
  children: ReactNode
  fallback?: ReactNode
}) => (
  <PermissionGate
    userRole={userRole}
    requiredRole="MEMBER"
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)
