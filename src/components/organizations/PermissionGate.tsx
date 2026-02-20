import { ReactNode } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Shield, Lock } from 'lucide-react'
import { OrganizationRole } from '@/lib/types'
import { Permission, hasPermission, hasAnyPermission, hasAllPermissions } from '@/lib/permissions'

interface PermissionGateProps {
  userRole: OrganizationRole | null | undefined
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  children: ReactNode
  fallback?: ReactNode
  showError?: boolean
  errorMessage?: string
}

/**
 * PermissionGate component that conditionally renders children based on user permissions
 */
export function PermissionGate({
  userRole,
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
  showError = false,
  errorMessage = "You don't have permission to view this content."
}: PermissionGateProps) {
  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(userRole, permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(userRole, permissions)
      : hasAnyPermission(userRole, permissions)
  } else {
    // If no permissions specified, allow access
    hasAccess = true
  }

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
  permission?: Permission
  permissions?: Permission[]
  requireAll?: boolean
  children: ReactNode
  fallback?: ReactNode
  disabledTooltip?: string
}

/**
 * PermissionButton that shows/hides or disables buttons based on permissions
 */
export function PermissionButton({
  userRole,
  permission,
  permissions,
  requireAll = false,
  children,
  fallback = null,
  disabledTooltip = "You don't have permission to perform this action."
}: PermissionButtonProps) {
  let hasAccess = false

  if (permission) {
    hasAccess = hasPermission(userRole, permission)
  } else if (permissions && permissions.length > 0) {
    hasAccess = requireAll
      ? hasAllPermissions(userRole, permissions)
      : hasAnyPermission(userRole, permissions)
  } else {
    hasAccess = true
  }

  if (!hasAccess) {
    return <>{fallback}</>
  }

  return <>{children}</>
}

interface RoleBasedRenderProps {
  userRole: OrganizationRole | null | undefined
  ownerContent?: ReactNode
  adminContent?: ReactNode
  moderatorContent?: ReactNode
  memberContent?: ReactNode
  fallback?: ReactNode
}

/**
 * RoleBasedRender component that renders different content based on user role
 */
export function RoleBasedRender({
  userRole,
  ownerContent,
  adminContent,
  moderatorContent,
  memberContent,
  fallback = null
}: RoleBasedRenderProps) {
  switch (userRole) {
    case 'OWNER':
      return <>{ownerContent || adminContent || moderatorContent || memberContent || fallback}</>
    case 'ADMIN':
      return <>{adminContent || moderatorContent || memberContent || fallback}</>
    case 'MODERATOR':
      return <>{moderatorContent || memberContent || fallback}</>
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
  const getRoleColor = (role: OrganizationRole) => {
    switch (role) {
      case 'OWNER':
        return 'text-yellow-700 bg-yellow-50 border-yellow-200'
      case 'ADMIN':
        return 'text-blue-700 bg-blue-50 border-blue-200'
      case 'MODERATOR':
        return 'text-green-700 bg-green-50 border-green-200'
      case 'MEMBER':
        return 'text-gray-700 bg-gray-50 border-gray-200'
    }
  }

  return (
    <Alert className={`${getRoleColor(requiredRole)} ${className}`}>
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

// Export commonly used permission checks as utility components
export const CanInviteMembers = ({ userRole, children, fallback }: {
  userRole: OrganizationRole | null | undefined
  children: ReactNode
  fallback?: ReactNode
}) => (
  <PermissionGate
    userRole={userRole}
    permission={Permission.INVITE_MEMBERS}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)

export const CanManageMembers = ({ userRole, children, fallback }: {
  userRole: OrganizationRole | null | undefined
  children: ReactNode
  fallback?: ReactNode
}) => (
  <PermissionGate
    userRole={userRole}
    permission={Permission.REMOVE_MEMBERS}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)

export const CanCreateAuctions = ({ userRole, children, fallback }: {
  userRole: OrganizationRole | null | undefined
  children: ReactNode
  fallback?: ReactNode
}) => (
  <PermissionGate
    userRole={userRole}
    permission={Permission.CREATE_AUCTIONS}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)

export const CanManageOrganization = ({ userRole, children, fallback }: {
  userRole: OrganizationRole | null | undefined
  children: ReactNode
  fallback?: ReactNode
}) => (
  <PermissionGate
    userRole={userRole}
    permission={Permission.MANAGE_ORGANIZATION}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)

export const AdminOnly = ({ userRole, children, fallback }: {
  userRole: OrganizationRole | null | undefined
  children: ReactNode
  fallback?: ReactNode
}) => (
  <PermissionGate
    userRole={userRole}
    permissions={[Permission.MANAGE_ORGANIZATION, Permission.UPDATE_ORGANIZATION_SETTINGS]}
    requireAll={false}
    fallback={fallback}
  >
    {children}
  </PermissionGate>
)